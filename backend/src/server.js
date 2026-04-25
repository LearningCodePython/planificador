const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'planificador.sqlite');
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'upload');
const PDF_DIR = path.join(UPLOAD_ROOT, 'pdfs');

app.use(express.json());

fs.mkdirSync(PDF_DIR, { recursive: true });

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

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function maybeDeletePdfFile(filename) {
  if (!filename) return;
  try {
    const budgetsCount = await get('SELECT COUNT(*) as count FROM budgets WHERE pdfFilename = ?', [filename]);
    const acceptedCount = await get('SELECT COUNT(*) as count FROM accepted_budgets WHERE pdfFilename = ?', [filename]);
    const inUse = Number(budgetsCount?.count || 0) + Number(acceptedCount?.count || 0);
    if (inUse > 0) return;
    const filePath = path.join(PDF_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.warn('Warning deleting pdf file:', filename, error.message);
  }
}

async function initDb() {
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
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Lightweight migration for budgets to add ticket/pdf metadata.
  const budgetCols = await all(`PRAGMA table_info(budgets)`);
  const budgetColNames = new Set((budgetCols || []).map((c) => c.name));
  if (!budgetColNames.has('ticketRef')) {
    await run(`ALTER TABLE budgets ADD COLUMN ticketRef TEXT`);
  }
  if (!budgetColNames.has('pdfFilename')) {
    await run(`ALTER TABLE budgets ADD COLUMN pdfFilename TEXT`);
  }
  if (!budgetColNames.has('pdfOriginalName')) {
    await run(`ALTER TABLE budgets ADD COLUMN pdfOriginalName TEXT`);
  }

  // Lightweight migration for accepted_budgets to preserve planning data when returning items to the bag.
  const acceptedCols = await all(`PRAGMA table_info(accepted_budgets)`);
  const acceptedColNames = new Set((acceptedCols || []).map((c) => c.name));
  if (!acceptedColNames.has('ticketRef')) {
    await run(`ALTER TABLE accepted_budgets ADD COLUMN ticketRef TEXT`);
  }
  if (!acceptedColNames.has('pdfFilename')) {
    await run(`ALTER TABLE accepted_budgets ADD COLUMN pdfFilename TEXT`);
  }
  if (!acceptedColNames.has('pdfOriginalName')) {
    await run(`ALTER TABLE accepted_budgets ADD COLUMN pdfOriginalName TEXT`);
  }
  if (!acceptedColNames.has('totalHours')) {
    await run(`ALTER TABLE accepted_budgets ADD COLUMN totalHours REAL DEFAULT 0`);
  }
  if (!acceptedColNames.has('laborBreakdown')) {
    await run(`ALTER TABLE accepted_budgets ADD COLUMN laborBreakdown TEXT DEFAULT '[]'`);
  }
  if (!acceptedColNames.has('category')) {
    await run(`ALTER TABLE accepted_budgets ADD COLUMN category TEXT`);
  }
  if (!acceptedColNames.has('assignedPersonnel')) {
    await run(`ALTER TABLE accepted_budgets ADD COLUMN assignedPersonnel TEXT DEFAULT '[]'`);
  }
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
    totalHours: Number(row.totalHours || 0),
    laborBreakdown: JSON.parse(row.laborBreakdown || '[]'),
    assignedPersonnel: JSON.parse(row.assignedPersonnel || '[]'),
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
        name, budgetNumber, acceptanceDate, ticketRef, pdfFilename, pdfOriginalName, totalHours, laborBreakdown,
        startDate, endDate, status, category, assignedPersonnel, fromAcceptedBag,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        payload.name || '',
        payload.budgetNumber || '',
        payload.acceptanceDate || '',
        payload.ticketRef || '',
        payload.pdfFilename || null,
        payload.pdfOriginalName || null,
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
        ticketRef = ?,
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
        payload.ticketRef || '',
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
    const existing = await get('SELECT pdfFilename FROM budgets WHERE id = ?', [Number(req.params.id)]);
    await run('DELETE FROM budgets WHERE id = ?', [Number(req.params.id)]);
    await maybeDeletePdfFile(existing?.pdfFilename || null);
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
      `INSERT INTO accepted_budgets (
        name, budgetNumber, acceptanceDate, status,
        ticketRef, pdfFilename, pdfOriginalName,
        totalHours, laborBreakdown, category, assignedPersonnel,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        payload.name || '',
        payload.budgetNumber || '',
        payload.acceptanceDate || '',
        payload.status || 'Accepted',
        payload.ticketRef || '',
        payload.pdfFilename || null,
        payload.pdfOriginalName || null,
        Number(payload.totalHours || 0),
        JSON.stringify(payload.laborBreakdown || []),
        payload.category || '',
        JSON.stringify(payload.assignedPersonnel || []),
      ]
    );
    const created = await all('SELECT * FROM accepted_budgets WHERE id = ?', [result.id]);
    res.status(201).json(parseAcceptedRow(created[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/accepted-budgets/:id', async (req, res) => {
  try {
    const payload = req.body || {};
    await run(
      `UPDATE accepted_budgets SET
        name = ?,
        budgetNumber = ?,
        acceptanceDate = ?,
        ticketRef = ?,
        status = ?,
        totalHours = ?,
        laborBreakdown = ?,
        category = ?,
        assignedPersonnel = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        payload.name || '',
        payload.budgetNumber || '',
        payload.acceptanceDate || '',
        payload.ticketRef || '',
        payload.status || 'Accepted',
        Number(payload.totalHours || 0),
        JSON.stringify(payload.laborBreakdown || []),
        payload.category || '',
        JSON.stringify(payload.assignedPersonnel || []),
        Number(req.params.id),
      ]
    );
    const updated = await all('SELECT * FROM accepted_budgets WHERE id = ?', [Number(req.params.id)]);
    if (!updated[0]) {
      return res.status(404).json({ error: 'Accepted budget not found' });
    }
    res.json(parseAcceptedRow(updated[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/accepted-budgets/:id', async (req, res) => {
  try {
    const existing = await get('SELECT pdfFilename FROM accepted_budgets WHERE id = ?', [Number(req.params.id)]);
    await run('DELETE FROM accepted_budgets WHERE id = ?', [Number(req.params.id)]);
    await maybeDeletePdfFile(existing?.pdfFilename || null);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PDF_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ext === '.pdf' ? '.pdf' : '.pdf';
      cb(null, `${Date.now()}-${crypto.randomUUID()}${safeExt}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdfMime = (file.mimetype || '').toLowerCase() === 'application/pdf';
    const isPdfExt = path.extname(file.originalname || '').toLowerCase() === '.pdf';
    if (!isPdfMime && !isPdfExt) return cb(new Error('Only PDF files are allowed'));
    return cb(null, true);
  },
});

app.post('/api/accepted-budgets/:id/pdf', pdfUpload.single('file'), async (req, res) => {
  try {
    const acceptedId = Number(req.params.id);
    const existing = await get('SELECT * FROM accepted_budgets WHERE id = ?', [acceptedId]);
    if (!existing) {
      if (req.file?.filename) await maybeDeletePdfFile(req.file.filename);
      return res.status(404).json({ error: 'Accepted budget not found' });
    }

    const oldFilename = existing.pdfFilename || null;
    await run(
      `UPDATE accepted_budgets SET
        pdfFilename = ?,
        pdfOriginalName = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [req.file?.filename || null, req.file?.originalname || null, acceptedId]
    );
    await maybeDeletePdfFile(oldFilename);
    const updated = await all('SELECT * FROM accepted_budgets WHERE id = ?', [acceptedId]);
    res.json(parseAcceptedRow(updated[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/accepted-budgets/:id/pdf', async (req, res) => {
  try {
    const acceptedId = Number(req.params.id);
    const existing = await get('SELECT pdfFilename, pdfOriginalName FROM accepted_budgets WHERE id = ?', [acceptedId]);
    if (!existing) return res.status(404).json({ error: 'Accepted budget not found' });
    if (!existing.pdfFilename) return res.status(404).json({ error: 'No PDF available' });

    const filePath = path.join(PDF_DIR, existing.pdfFilename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'PDF file missing on server' });
    return res.download(filePath, existing.pdfOriginalName || 'presupuesto.pdf');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/accepted-budgets/:id/pdf', async (req, res) => {
  try {
    const acceptedId = Number(req.params.id);
    const existing = await get('SELECT pdfFilename FROM accepted_budgets WHERE id = ?', [acceptedId]);
    if (!existing) return res.status(404).json({ error: 'Accepted budget not found' });
    const oldFilename = existing.pdfFilename || null;
    await run(
      `UPDATE accepted_budgets SET
        pdfFilename = NULL,
        pdfOriginalName = NULL,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [acceptedId]
    );
    await maybeDeletePdfFile(oldFilename);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/budgets/:id/pdf', pdfUpload.single('file'), async (req, res) => {
  try {
    const budgetId = Number(req.params.id);
    const existing = await get('SELECT * FROM budgets WHERE id = ?', [budgetId]);
    if (!existing) {
      if (req.file?.filename) await maybeDeletePdfFile(req.file.filename);
      return res.status(404).json({ error: 'Budget not found' });
    }

    const oldFilename = existing.pdfFilename || null;
    await run(
      `UPDATE budgets SET
        pdfFilename = ?,
        pdfOriginalName = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [req.file?.filename || null, req.file?.originalname || null, budgetId]
    );
    await maybeDeletePdfFile(oldFilename);
    const updated = await all('SELECT * FROM budgets WHERE id = ?', [budgetId]);
    res.json(parseBudgetRow(updated[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/budgets/:id/pdf', async (req, res) => {
  try {
    const budgetId = Number(req.params.id);
    const existing = await get('SELECT pdfFilename, pdfOriginalName FROM budgets WHERE id = ?', [budgetId]);
    if (!existing) return res.status(404).json({ error: 'Budget not found' });
    if (!existing.pdfFilename) return res.status(404).json({ error: 'No PDF available' });

    const filePath = path.join(PDF_DIR, existing.pdfFilename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'PDF file missing on server' });
    return res.download(filePath, existing.pdfOriginalName || 'presupuesto.pdf');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/budgets/:id/pdf', async (req, res) => {
  try {
    const budgetId = Number(req.params.id);
    const existing = await get('SELECT pdfFilename FROM budgets WHERE id = ?', [budgetId]);
    if (!existing) return res.status(404).json({ error: 'Budget not found' });
    const oldFilename = existing.pdfFilename || null;
    await run(
      `UPDATE budgets SET
        pdfFilename = NULL,
        pdfOriginalName = NULL,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [budgetId]
    );
    await maybeDeletePdfFile(oldFilename);
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
