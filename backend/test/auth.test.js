const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const { openDb, initDb } = require('../src/db');
const { createAuth, _test } = require('../src/auth');

function mkTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

async function startTestApp() {
  const dir = mkTempDir('planificador-auth-');
  const dbPath = path.join(dir, 'test.sqlite');
  const { run, get, all, close } = openDb(dbPath);
  await initDb({ run, all });
  const auth = createAuth({ run, get, all }, { bootstrapAdminEmail: 'admin@test.local', bootstrapAdminPassword: 'passw0rd!' });
  await auth.ensureBootstrapAdmin();

  return { run, get, all, close, auth };
}

test('auth: bootstrap admin + roles/permisos seeded', async () => {
  const server = await startTestApp();
  try {
    const userRow = await server.get(`SELECT id, email, passwordHash FROM users WHERE email = ?`, ['admin@test.local']);
    assert.ok(userRow);
    assert.equal(userRow.email, 'admin@test.local');
    assert.equal(_test.verifyPassword('passw0rd!', userRow.passwordHash), true);

    const roles = await server.all(
      `SELECT r.name as name
       FROM roles r
       INNER JOIN user_roles ur ON ur.roleId = r.id
       WHERE ur.userId = ?`,
      [Number(userRow.id)]
    );
    assert.deepEqual(roles.map((r) => r.name).sort(), ['admin']);

    const ctx = await _test.getUserAuthContext({ get: server.get, all: server.all }, userRow.id);
    assert.ok(ctx);
    assert.ok(ctx.roles.includes('admin'));
    assert.ok(ctx.permissions.includes('budgets:write'));
  } finally {
    await server.close();
  }
});

test('auth: requirePermission bloquea viewer y deja pasar admin', async () => {
  const server = await startTestApp();
  try {
    const viewerPasswordHash = _test.hashPassword('passw0rd!');
    const created = await server.run(
      `INSERT INTO users (email, passwordHash, isActive, updatedAt) VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
      ['viewer@test.local', viewerPasswordHash]
    );
    const viewerRole = await server.get(`SELECT id FROM roles WHERE name = ?`, ['viewer']);
    await server.run(`INSERT OR IGNORE INTO user_roles (userId, roleId) VALUES (?, ?)`, [created.id, viewerRole.id]);

    const viewerCtx = await _test.getUserAuthContext({ get: server.get, all: server.all }, created.id);
    const adminRow = await server.get(`SELECT id FROM users WHERE email = ?`, ['admin@test.local']);
    const adminCtx = await _test.getUserAuthContext({ get: server.get, all: server.all }, adminRow.id);

    const mw = server.auth.requirePermission('budgets:write');
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    let nextCalled = false;
    await mw({ user: viewerCtx }, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);

    nextCalled = false;
    res.statusCode = 200;
    res.body = null;
    await mw({ user: adminCtx }, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  } finally {
    await server.close();
  }
});
