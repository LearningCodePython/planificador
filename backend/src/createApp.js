const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const { openDb, initDb } = require('./db');
const { createAuth } = require('./auth');

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

function parseExecutedRow(row) {
  return {
    ...row,
    id: String(row.id),
    sourceBudgetId: row.sourceBudgetId == null ? null : String(row.sourceBudgetId),
    laborBreakdown: JSON.parse(row.laborBreakdown || '[]'),
    assignedPersonnel: JSON.parse(row.assignedPersonnel || '[]'),
    fromAcceptedBag: Boolean(row.fromAcceptedBag),
  };
}

function parsePersonnelRow(row) {
  return {
    ...row,
    id: String(row.id),
  };
}

async function createApp(options = {}) {
  const app = express();
  app.set('trust proxy', 1);

  const dbPath = options.dbPath || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'planificador.sqlite');
  const uploadRoot = options.uploadRoot || process.env.UPLOAD_DIR || path.join(__dirname, '..', 'upload');
  const pdfDir = path.join(uploadRoot, 'pdfs');

  app.use(express.json());
  fs.mkdirSync(pdfDir, { recursive: true });

  const { run, get, all, close } = openDb(dbPath);
  await initDb({ run, all });

  const auth = createAuth({ run, get, all }, options.auth || {});
  await auth.ensureBootstrapAdmin();
  app.use(auth.authMiddleware);
  auth.registerAuthRoutes(app);

  async function maybeDeletePdfFile(filename) {
    if (!filename) return;
    try {
      const budgetsCount = await get('SELECT COUNT(*) as count FROM budgets WHERE pdfFilename = ?', [filename]);
      const acceptedCount = await get('SELECT COUNT(*) as count FROM accepted_budgets WHERE pdfFilename = ?', [filename]);
      const executedCount = await get('SELECT COUNT(*) as count FROM executed_budgets WHERE pdfFilename = ?', [filename]);
      const inUse = Number(budgetsCount?.count || 0)
        + Number(acceptedCount?.count || 0)
        + Number(executedCount?.count || 0);
      if (inUse > 0) return;
      const filePath = path.join(pdfDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (error) {
      console.warn('Warning deleting pdf file:', filename, error.message);
    }
  }

  const pdfUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, pdfDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '.pdf') || '.pdf';
        const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        cb(null, name);
      },
    }),
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/budgets', auth.requirePermission('budgets:read'), async (_req, res) => {
    try {
      const rows = await all('SELECT * FROM budgets ORDER BY id DESC');
      res.json(rows.map(parseBudgetRow));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/executed-budgets', auth.requirePermission('executed_budgets:read'), async (_req, res) => {
    try {
      const rows = await all('SELECT * FROM executed_budgets ORDER BY id DESC');
      res.json(rows.map(parseExecutedRow));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/executed-budgets/:id', auth.requirePermission('executed_budgets:delete'), async (req, res) => {
    try {
      const existing = await get('SELECT pdfFilename FROM executed_budgets WHERE id = ?', [Number(req.params.id)]);
      await run('DELETE FROM executed_budgets WHERE id = ?', [Number(req.params.id)]);
      await maybeDeletePdfFile(existing?.pdfFilename || null);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/budgets', auth.requirePermission('budgets:write'), async (req, res) => {
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

  app.post('/api/budgets/:id/execute', auth.requirePermission('executed_budgets:write'), async (req, res) => {
    try {
      const budgetId = Number(req.params.id);
      const existing = await get('SELECT * FROM budgets WHERE id = ?', [budgetId]);
      if (!existing) return res.status(404).json({ error: 'Budget not found' });

      const payload = parseBudgetRow(existing);
      await run(
        `INSERT INTO executed_budgets (
          sourceBudgetId,
          name, budgetNumber, acceptanceDate, ticketRef, pdfFilename, pdfOriginalName, totalHours, laborBreakdown,
          startDate, endDate, status, category, assignedPersonnel, fromAcceptedBag,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          budgetId,
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
          payload.status || 'Executed',
          payload.category || '',
          JSON.stringify(payload.assignedPersonnel || []),
          payload.fromAcceptedBag ? 1 : 0,
          existing.createdAt || null,
          existing.updatedAt || null,
        ]
      );

      await run('DELETE FROM budgets WHERE id = ?', [budgetId]);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/budgets/:id', auth.requirePermission('budgets:write'), async (req, res) => {
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
      if (!updated[0]) return res.status(404).json({ error: 'Budget not found' });
      return res.json(parseBudgetRow(updated[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/budgets/:id', auth.requirePermission('budgets:delete'), async (req, res) => {
    try {
      const existing = await get('SELECT pdfFilename FROM budgets WHERE id = ?', [Number(req.params.id)]);
      await run('DELETE FROM budgets WHERE id = ?', [Number(req.params.id)]);
      await maybeDeletePdfFile(existing?.pdfFilename || null);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/personnel', auth.requirePermission('personnel:read'), async (_req, res) => {
    try {
      const rows = await all('SELECT * FROM personnel ORDER BY id DESC');
      res.json(rows.map(parsePersonnelRow));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/personnel', auth.requirePermission('personnel:write'), async (req, res) => {
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

  app.put('/api/personnel/:id', auth.requirePermission('personnel:write'), async (req, res) => {
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
      if (!updated[0]) return res.status(404).json({ error: 'Personnel not found' });
      return res.json(parsePersonnelRow(updated[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/personnel/:id', auth.requirePermission('personnel:delete'), async (req, res) => {
    try {
      await run('DELETE FROM personnel WHERE id = ?', [Number(req.params.id)]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/accepted-budgets', auth.requirePermission('accepted_budgets:read'), async (_req, res) => {
    try {
      const rows = await all('SELECT * FROM accepted_budgets ORDER BY id DESC');
      res.json(rows.map(parseAcceptedRow));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/accepted-budgets', auth.requirePermission('accepted_budgets:write'), async (req, res) => {
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

  app.put('/api/accepted-budgets/:id', auth.requirePermission('accepted_budgets:write'), async (req, res) => {
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
      if (!updated[0]) return res.status(404).json({ error: 'Accepted budget not found' });
      return res.json(parseAcceptedRow(updated[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/accepted-budgets/:id', auth.requirePermission('accepted_budgets:delete'), async (req, res) => {
    try {
      const existing = await get('SELECT pdfFilename FROM accepted_budgets WHERE id = ?', [Number(req.params.id)]);
      await run('DELETE FROM accepted_budgets WHERE id = ?', [Number(req.params.id)]);
      await maybeDeletePdfFile(existing?.pdfFilename || null);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/accepted-budgets/:id/pdf', auth.requirePermission('pdf:write'), pdfUpload.single('file'), async (req, res) => {
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
      return res.json(parseAcceptedRow(updated[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/accepted-budgets/:id/pdf', auth.requirePermission('pdf:read'), async (req, res) => {
    try {
      const acceptedId = Number(req.params.id);
      const existing = await get('SELECT pdfFilename, pdfOriginalName FROM accepted_budgets WHERE id = ?', [acceptedId]);
      if (!existing) return res.status(404).json({ error: 'Accepted budget not found' });
      if (!existing.pdfFilename) return res.status(404).json({ error: 'No PDF available' });

      const filePath = path.join(pdfDir, existing.pdfFilename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'PDF file missing on server' });
      return res.download(filePath, existing.pdfOriginalName || 'presupuesto.pdf');
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/accepted-budgets/:id/pdf', auth.requirePermission('pdf:delete'), async (req, res) => {
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
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/executed-budgets/:id/pdf', auth.requirePermission('pdf:read'), async (req, res) => {
    try {
      const executedId = Number(req.params.id);
      const existing = await get('SELECT pdfFilename, pdfOriginalName FROM executed_budgets WHERE id = ?', [executedId]);
      if (!existing) return res.status(404).json({ error: 'Executed budget not found' });
      if (!existing.pdfFilename) return res.status(404).json({ error: 'No PDF available' });

      const filePath = path.join(pdfDir, existing.pdfFilename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'PDF file missing on server' });
      return res.download(filePath, existing.pdfOriginalName || 'presupuesto.pdf');
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/budgets/:id/pdf', auth.requirePermission('pdf:write'), pdfUpload.single('file'), async (req, res) => {
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
      return res.json(parseBudgetRow(updated[0]));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/budgets/:id/pdf', auth.requirePermission('pdf:read'), async (req, res) => {
    try {
      const budgetId = Number(req.params.id);
      const existing = await get('SELECT pdfFilename, pdfOriginalName FROM budgets WHERE id = ?', [budgetId]);
      if (!existing) return res.status(404).json({ error: 'Budget not found' });
      if (!existing.pdfFilename) return res.status(404).json({ error: 'No PDF available' });

      const filePath = path.join(pdfDir, existing.pdfFilename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'PDF file missing on server' });
      return res.download(filePath, existing.pdfOriginalName || 'presupuesto.pdf');
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/budgets/:id/pdf', auth.requirePermission('pdf:delete'), async (req, res) => {
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
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  return { app, shutdown: close };
}

module.exports = { createApp };
