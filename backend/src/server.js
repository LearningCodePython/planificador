const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'planificador.sqlite');

app.use(express.json());

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('SQLite connected at:', DB_PATH);
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

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      budgetNumber TEXT,
      acceptanceDate TEXT,
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
      status TEXT DEFAULT 'Accepted',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function parseBudgetRow(row) {
  return {
    ...row,
    id: String(row.id),
    laborBreakdown: JSON.parse(row.laborBreakdown || '[]'),
    assignedPersonnel: JSON.parse(row.assignedPersonnel || '[]'),
    fromAcceptedBag: Boolean(row.fromAcceptedBag),
  };
}

function parseAcceptedRow(row) {
  return {
    ...row,
    id: String(row.id),
  };
}

function parsePersonnelRow(row) {
  return {
    ...row,
    id: String(row.id),
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/budgets', async (_req, res) => {
  try {
    const rows = await all('SELECT * FROM budgets ORDER BY id DESC');
    res.json(rows.map(parseBudgetRow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/budgets', async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await run(
      `INSERT INTO budgets (
        name, budgetNumber, acceptanceDate, totalHours, laborBreakdown,
        startDate, endDate, status, category, assignedPersonnel, fromAcceptedBag,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        payload.name || '',
        payload.budgetNumber || '',
        payload.acceptanceDate || '',
        Number(payload.totalHours || 0),
        JSON.stringify(payload.laborBreakdown || []),
        payload.startDate || '',
        payload.endDate || '',
        payload.status || 'Accepted',
        payload.category || '',
        JSON.stringify(payload.assignedPersonnel || []),
        payload.fromAcceptedBag ? 1 : 0,
      ]
    );
    const created = await all('SELECT * FROM budgets WHERE id = ?', [result.id]);
    res.status(201).json(parseBudgetRow(created[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/budgets/:id', async (req, res) => {
  try {
    const payload = req.body || {};
    await run(
      `UPDATE budgets SET
        name = ?,
        budgetNumber = ?,
        acceptanceDate = ?,
        totalHours = ?,
        laborBreakdown = ?,
        startDate = ?,
        endDate = ?,
        status = ?,
        category = ?,
        assignedPersonnel = ?,
        fromAcceptedBag = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        payload.name || '',
        payload.budgetNumber || '',
        payload.acceptanceDate || '',
        Number(payload.totalHours || 0),
        JSON.stringify(payload.laborBreakdown || []),
        payload.startDate || '',
        payload.endDate || '',
        payload.status || 'Accepted',
        payload.category || '',
        JSON.stringify(payload.assignedPersonnel || []),
        payload.fromAcceptedBag ? 1 : 0,
        Number(req.params.id),
      ]
    );
    const updated = await all('SELECT * FROM budgets WHERE id = ?', [Number(req.params.id)]);
    if (!updated[0]) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json(parseBudgetRow(updated[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/budgets/:id', async (req, res) => {
  try {
    await run('DELETE FROM budgets WHERE id = ?', [Number(req.params.id)]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/personnel', async (_req, res) => {
  try {
    const rows = await all('SELECT * FROM personnel ORDER BY id DESC');
    res.json(rows.map(parsePersonnelRow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/personnel', async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await run(
      `INSERT INTO personnel (name, laborType, hoursPerDay, daysPerWeek, updatedAt)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        payload.name || '',
        payload.laborType || '',
        Number(payload.hoursPerDay || 0),
        Number(payload.daysPerWeek || 0),
      ]
    );
    const created = await all('SELECT * FROM personnel WHERE id = ?', [result.id]);
    res.status(201).json(parsePersonnelRow(created[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/personnel/:id', async (req, res) => {
  try {
    const payload = req.body || {};
    await run(
      `UPDATE personnel SET
        name = ?,
        laborType = ?,
        hoursPerDay = ?,
        daysPerWeek = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        payload.name || '',
        payload.laborType || '',
        Number(payload.hoursPerDay || 0),
        Number(payload.daysPerWeek || 0),
        Number(req.params.id),
      ]
    );
    const updated = await all('SELECT * FROM personnel WHERE id = ?', [Number(req.params.id)]);
    if (!updated[0]) {
      return res.status(404).json({ error: 'Personnel not found' });
    }
    res.json(parsePersonnelRow(updated[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/personnel/:id', async (req, res) => {
  try {
    await run('DELETE FROM personnel WHERE id = ?', [Number(req.params.id)]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/accepted-budgets', async (_req, res) => {
  try {
    const rows = await all('SELECT * FROM accepted_budgets ORDER BY id DESC');
    res.json(rows.map(parseAcceptedRow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/accepted-budgets', async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await run(
      `INSERT INTO accepted_budgets (name, budgetNumber, acceptanceDate, status, updatedAt)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        payload.name || '',
        payload.budgetNumber || '',
        payload.acceptanceDate || '',
        payload.status || 'Accepted',
      ]
    );
    const created = await all('SELECT * FROM accepted_budgets WHERE id = ?', [result.id]);
    res.status(201).json(parseAcceptedRow(created[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/accepted-budgets/:id', async (req, res) => {
  try {
    await run('DELETE FROM accepted_budgets WHERE id = ?', [Number(req.params.id)]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error initializing DB:', error);
    process.exit(1);
  });

process.on('SIGINT', () => {
  db.close(() => process.exit(0));
});
