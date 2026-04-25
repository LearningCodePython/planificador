const crypto = require('crypto');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(String(password || ''), salt, 64);
  return `scrypt$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const value = String(stored || '');
  const [scheme, saltB64, hashB64] = value.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(String(password || ''), salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function sha256Base64(value) {
  return crypto.createHash('sha256').update(value).digest('base64');
}

function parseCookies(cookieHeader) {
  const out = {};
  const raw = String(cookieHeader || '');
  if (!raw) return out;
  raw.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) return;
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function buildSetCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAgeSeconds != null) parts.push(`Max-Age=${Math.floor(opts.maxAgeSeconds)}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

async function getUserAuthContext({ get, all }, userId) {
  const user = await get(`SELECT id, email, isActive FROM users WHERE id = ?`, [Number(userId)]);
  if (!user || !Number(user.isActive)) return null;

  const roles = await all(
    `SELECT r.name as name
     FROM roles r
     INNER JOIN user_roles ur ON ur.roleId = r.id
     WHERE ur.userId = ?`,
    [Number(userId)]
  );

  const permissions = await all(
    `SELECT DISTINCT p.name as name
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permissionId = p.id
     INNER JOIN roles r ON r.id = rp.roleId
     INNER JOIN user_roles ur ON ur.roleId = r.id
     WHERE ur.userId = ?`,
    [Number(userId)]
  );

  return {
    id: String(user.id),
    email: user.email,
    roles: roles.map((r) => r.name),
    permissions: permissions.map((p) => p.name),
  };
}

function createAuth({ run, get, all }, options = {}) {
  const cookieName = options.cookieName || process.env.AUTH_COOKIE_NAME || 'planificador_session';
  const sessionTtlSeconds = Number(options.sessionTtlSeconds || process.env.AUTH_SESSION_TTL_SECONDS || 60 * 60 * 24 * 7);
  const cookieSecure = String(options.cookieSecure ?? process.env.AUTH_COOKIE_SECURE ?? (process.env.NODE_ENV === 'production'))
    .toLowerCase() === 'true';

  async function createSession(res, userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = sha256Base64(token);
    const now = Date.now();
    const expiresAt = now + sessionTtlSeconds * 1000;
    await run(
      `INSERT INTO sessions (userId, tokenHash, createdAt, expiresAt, lastSeenAt)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(userId), tokenHash, now, expiresAt, now]
    );
    res.setHeader(
      'Set-Cookie',
      buildSetCookie(cookieName, token, {
        httpOnly: true,
        sameSite: 'Lax',
        secure: cookieSecure,
        path: '/',
        maxAgeSeconds: sessionTtlSeconds,
      })
    );
  }

  async function clearSession(res, token) {
    if (token) {
      await run(`DELETE FROM sessions WHERE tokenHash = ?`, [sha256Base64(token)]);
    }
    res.setHeader(
      'Set-Cookie',
      buildSetCookie(cookieName, '', {
        httpOnly: true,
        sameSite: 'Lax',
        secure: cookieSecure,
        path: '/',
        maxAgeSeconds: 0,
      })
    );
  }

  async function authMiddleware(req, _res, next) {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies[cookieName];
      if (!token) {
        req.user = null;
        return next();
      }

      const tokenHash = sha256Base64(token);
      const session = await get(`SELECT id, userId, expiresAt FROM sessions WHERE tokenHash = ?`, [tokenHash]);
      if (!session) {
        req.user = null;
        return next();
      }

      if (Number(session.expiresAt) <= Date.now()) {
        await run(`DELETE FROM sessions WHERE id = ?`, [Number(session.id)]);
        req.user = null;
        return next();
      }

      await run(`UPDATE sessions SET lastSeenAt = ? WHERE id = ?`, [Date.now(), Number(session.id)]);
      req.user = await getUserAuthContext({ get, all }, session.userId);
      return next();
    } catch (error) {
      return next(error);
    }
  }

  function requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      if (req.user.roles.includes('admin')) return next();
      if (req.user.permissions.includes(permission)) return next();
      return res.status(403).json({ error: 'Forbidden' });
    };
  }

  async function ensureBootstrapAdmin() {
    const countRow = await get(`SELECT COUNT(*) as count FROM users`);
    const count = Number(countRow?.count || 0);
    if (count > 0) return;

    const email = normalizeEmail(options.bootstrapAdminEmail || process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@planificador.local');
    const envPassword = options.bootstrapAdminPassword || process.env.BOOTSTRAP_ADMIN_PASSWORD;
    const password = envPassword || crypto.randomBytes(9).toString('base64url');
    const passwordHash = hashPassword(password);

    const created = await run(
      `INSERT INTO users (email, passwordHash, isActive, updatedAt) VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
      [email, passwordHash]
    );

    const adminRole = await get(`SELECT id FROM roles WHERE name = ?`, ['admin']);
    if (adminRole) {
      await run(`INSERT OR IGNORE INTO user_roles (userId, roleId) VALUES (?, ?)`, [created.id, adminRole.id]);
    }

    if (!envPassword) {
      console.log('BOOTSTRAP admin creado automáticamente:');
      console.log(`  email: ${email}`);
      console.log(`  password: ${password}`);
      console.log('Define BOOTSTRAP_ADMIN_PASSWORD para fijar una contraseña estable.');
    }
  }

  function registerAuthRoutes(app) {
    app.get('/api/auth/me', async (req, res) => {
      res.json({ user: req.user || null });
    });

    app.post('/api/auth/signup', async (req, res) => {
      try {
        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password || '');
        if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

        const existing = await get(`SELECT id FROM users WHERE email = ?`, [email]);
        if (existing) return res.status(409).json({ error: 'El email ya existe' });

        const created = await run(
          `INSERT INTO users (email, passwordHash, isActive, updatedAt) VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
          [email, hashPassword(password)]
        );

        const editorRole = await get(`SELECT id FROM roles WHERE name = ?`, ['editor']);
        if (editorRole) {
          await run(`INSERT OR IGNORE INTO user_roles (userId, roleId) VALUES (?, ?)`, [created.id, editorRole.id]);
        }

        await createSession(res, created.id);
        const user = await getUserAuthContext({ get, all }, created.id);
        return res.status(201).json({ user });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/auth/login', async (req, res) => {
      try {
        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password || '');
        if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios' });

        const userRow = await get(`SELECT id, passwordHash, isActive FROM users WHERE email = ?`, [email]);
        if (!userRow || !Number(userRow.isActive)) return res.status(401).json({ error: 'Credenciales inválidas' });
        if (!verifyPassword(password, userRow.passwordHash)) return res.status(401).json({ error: 'Credenciales inválidas' });

        await createSession(res, userRow.id);
        const user = await getUserAuthContext({ get, all }, userRow.id);
        return res.json({ user });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/auth/logout', async (req, res) => {
      try {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies[cookieName];
        await clearSession(res, token);
        return res.status(204).send();
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/auth/users', requirePermission('users:read'), async (_req, res) => {
      try {
        const users = await all(`SELECT id, email, isActive, createdAt, updatedAt FROM users ORDER BY id ASC`);
        return res.json(users.map((u) => ({ ...u, id: String(u.id), isActive: Boolean(u.isActive) })));
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/auth/users', requirePermission('users:write'), async (req, res) => {
      try {
        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password || '');
        const roles = Array.isArray(req.body?.roles) ? req.body.roles.map((r) => String(r)) : [];
        if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

        const existing = await get(`SELECT id FROM users WHERE email = ?`, [email]);
        if (existing) return res.status(409).json({ error: 'El email ya existe' });

        const created = await run(
          `INSERT INTO users (email, passwordHash, isActive, updatedAt) VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
          [email, hashPassword(password)]
        );

        for (const roleName of roles.length ? roles : ['viewer']) {
          // eslint-disable-next-line no-await-in-loop
          const role = await get(`SELECT id FROM roles WHERE name = ?`, [String(roleName)]);
          if (!role) continue;
          // eslint-disable-next-line no-await-in-loop
          await run(`INSERT OR IGNORE INTO user_roles (userId, roleId) VALUES (?, ?)`, [created.id, role.id]);
        }

        const user = await getUserAuthContext({ get, all }, created.id);
        return res.status(201).json({ user });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    });
  }

  return {
    cookieName,
    authMiddleware,
    requirePermission,
    ensureBootstrapAdmin,
    registerAuthRoutes,
  };
}

module.exports = { createAuth };

module.exports._test = {
  normalizeEmail,
  hashPassword,
  verifyPassword,
  parseCookies,
  buildSetCookie,
  getUserAuthContext,
};
