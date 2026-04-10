const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

// GET /api/admissions/status  (public – no auth required)
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT key, value FROM app_settings WHERE key IN ('is_admission_open', 'closure_reason')`
    );

    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }

    const isOpen = settings['is_admission_open'] !== 'false';
    const closureReason = settings['closure_reason'] || '';

    res.json({
      is_admission_open: isOpen,
      message: isOpen
        ? 'Registration is currently open.'
        : closureReason || 'Registration is currently closed.'
    });
  } catch (error) {
    console.error('Admission status fetch error:', error.message);
    res.status(500).json({ message: 'Failed to fetch admission status' });
  }
});

module.exports = router;
