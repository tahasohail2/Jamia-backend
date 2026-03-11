const express = require('express');
const router = express.Router();
const { validateRecord } = require('../validators/recordValidator');
const { 
  createRecord, 
  getAllRecords, 
  getRecordById,
  getRecordByCnic,
  deleteRecordById,
  deleteAllRecords 
} = require('../controllers/recordsController');

// POST /api/records - Create a new student record
router.post('/', validateRecord, createRecord);

// GET /api/records - Retrieve all student records
router.get('/', getAllRecords);

// DELETE /api/records - Delete all student records
router.delete('/', deleteAllRecords);

// GET /api/records/check/:cnic - Check if CNIC exists
router.get('/check/:cnic', getRecordByCnic);

// GET /api/records/:id - Retrieve a specific student record
router.get('/:id', getRecordById);

// DELETE /api/records/:id - Delete a specific student record
router.delete('/:id', deleteRecordById);

module.exports = router;
