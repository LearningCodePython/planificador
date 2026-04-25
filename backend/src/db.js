const sqlite3 = require('sqlite3').verbose();

function openDb(dbPath) {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('SQLite connected at:', dbPath);
    }
  });

  function run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  function all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  function get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  function close() {
    return new Promise((resolve) => db.close(() => resolve()));
  }

  return { db, run, all, get, close };
}

async function initDb({ run, all }) {
  await run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      budgetNumber TEXT,
      acceptanceDate TEXT,
      ticketRef TEXT,
      pdfFilename TEXT,
      pdfOriginalName TEXT,
      totalHours REAL DEFAULT 0,
      laborBreakdown TEXT DEFAULT '[]',
      startDate TEXT,
      endDate TEXT,
      status TEXT DEFAULT 'Accepted',
      category TEXT,
      assignedPersonnel TEXT DEFAULT '[]',
      fromAcceptedBag INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Lightweight migration for budgets to add ticket/pdf metadata on existing DBs.
  const budgetCols = await all(`PRAGMA table_info(budgets)`);
  const budgetColNames = new Set((budgetCols || []).map((c) => c.name));
  if (!budgetColNames.has('ticketRef')) await run(`ALTER TABLE budgets ADD COLUMN ticketRef TEXT`);
  if (!budgetColNames.has('pdfFilename')) await run(`ALTER TABLE budgets ADD COLUMN pdfFilename TEXT`);
  if (!budgetColNames.has('pdfOriginalName')) await run(`ALTER TABLE budgets ADD COLUMN pdfOriginalName TEXT`);

  await run(`
    CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      laborType TEXT NOT NULL,
      hoursPerDay REAL NOT NULL,
      daysPerWeek REAL NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS accepted_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      budgetNumber TEXT NOT NULL,
      acceptanceDate TEXT NOT NULL,
      ticketRef TEXT,
      pdfFilename TEXT,
      pdfOriginalName TEXT,
      status TEXT DEFAULT 'Accepted',
      totalHours REAL DEFAULT 0,
      laborBreakdown TEXT DEFAULT '[]',
      category TEXT,
      assignedPersonnel TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Lightweight migration for accepted_budgets on existing DBs.
  const acceptedCols = await all(`PRAGMA table_info(accepted_budgets)`);
  const acceptedColNames = new Set((acceptedCols || []).map((c) => c.name));
  if (!acceptedColNames.has('ticketRef')) await run(`ALTER TABLE accepted_budgets ADD COLUMN ticketRef TEXT`);
  if (!acceptedColNames.has('pdfFilename')) await run(`ALTER TABLE accepted_budgets ADD COLUMN pdfFilename TEXT`);
  if (!acceptedColNames.has('pdfOriginalName')) await run(`ALTER TABLE accepted_budgets ADD COLUMN pdfOriginalName TEXT`);
  if (!acceptedColNames.has('totalHours')) await run(`ALTER TABLE accepted_budgets ADD COLUMN totalHours REAL DEFAULT 0`);
  if (!acceptedColNames.has('laborBreakdown')) await run(`ALTER TABLE accepted_budgets ADD COLUMN laborBreakdown TEXT DEFAULT '[]'`);
  if (!acceptedColNames.has('category')) await run(`ALTER TABLE accepted_budgets ADD COLUMN category TEXT`);
  if (!acceptedColNames.has('assignedPersonnel')) await run(`ALTER TABLE accepted_budgets ADD COLUMN assignedPersonnel TEXT DEFAULT '[]'`);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS user_roles (
      userId INTEGER NOT NULL,
      roleId INTEGER NOT NULL,
      UNIQUE(userId, roleId),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(roleId) REFERENCES roles(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      roleId INTEGER NOT NULL,
      permissionId INTEGER NOT NULL,
      UNIQUE(roleId, permissionId),
      FOREIGN KEY(roleId) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY(permissionId) REFERENCES permissions(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      tokenHash TEXT NOT NULL UNIQUE,
      createdAt INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL,
      lastSeenAt INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`INSERT OR IGNORE INTO roles (name) VALUES (?), (?), (?)`, ['admin', 'editor', 'viewer']);

  const permissions = [
    'budgets:read',
    'budgets:write',
    'budgets:delete',
    'accepted_budgets:read',
    'accepted_budgets:write',
    'accepted_budgets:delete',
    'personnel:read',
    'personnel:write',
    'personnel:delete',
    'pdf:read',
    'pdf:write',
    'pdf:delete',
    'users:read',
    'users:write',
  ];

  for (const perm of permissions) {
    // eslint-disable-next-line no-await-in-loop
    await run(`INSERT OR IGNORE INTO permissions (name) VALUES (?)`, [perm]);
  }

  const roleRows = await all(`SELECT id, name FROM roles`);
  const permRows = await all(`SELECT id, name FROM permissions`);
  const roleIdByName = new Map(roleRows.map((r) => [r.name, r.id]));
  const permIdByName = new Map(permRows.map((p) => [p.name, p.id]));

  const allPermIds = Array.from(permIdByName.values());
  const editorPerms = [
    'budgets:read',
    'budgets:write',
    'budgets:delete',
    'accepted_budgets:read',
    'accepted_budgets:write',
    'accepted_budgets:delete',
    'personnel:read',
    'personnel:write',
    'personnel:delete',
    'pdf:read',
    'pdf:write',
    'pdf:delete',
  ].map((n) => permIdByName.get(n)).filter(Boolean);
  const viewerPerms = [
    'budgets:read',
    'accepted_budgets:read',
    'personnel:read',
    'pdf:read',
  ].map((n) => permIdByName.get(n)).filter(Boolean);

  async function seedRolePerms(roleName, permIds) {
    const roleId = roleIdByName.get(roleName);
    if (!roleId) return;
    for (const permId of permIds) {
      // eslint-disable-next-line no-await-in-loop
      await run(`INSERT OR IGNORE INTO role_permissions (roleId, permissionId) VALUES (?, ?)`, [roleId, permId]);
    }
  }

  await seedRolePerms('admin', allPermIds);
  await seedRolePerms('editor', editorPerms);
  await seedRolePerms('viewer', viewerPerms);
}

module.exports = { openDb, initDb };
