const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { 
  createRecord, 
  getAllRecords, 
  getRecordById,
  getRecordByCnic,
  deleteRecordById,
  deleteAllRecords,
  updateRecordPicture
} = require('../controllers/recordsController');

// POST /api/records - Create a new student record with optional file uploads
// Accepts 3 file fields: certificates, cnicDocuments, additionalDocuments
// Validation is handled in the controller
router.post('/', 
  upload.fields([
    { name: 'certificates', maxCount: 10 },
    { name: 'cnicDocuments', maxCount: 10 },
    { name: 'additionalDocuments', maxCount: 10 }
  ]), 
  createRecord
);

// GET /api/records - Retrieve all student records
router.get('/', getAllRecords);

// DELETE /api/records - Delete all student records
router.delete('/', deleteAllRecords);

// GET /api/records/check/:cnic - Check if CNIC exists
router.get('/check/:cnic', getRecordByCnic);

// GET /api/records/:id - Retrieve a specific student record
router.get('/:id', getRecordById);

// PATCH /api/records/:id/picture - Update only the picture for a record
router.patch('/:id/picture', 
  upload.fields([
    { name: 'additionalDocuments', maxCount: 10 }
  ]), 
  updateRecordPicture
);

// DELETE /api/records/:id - Delete a specific student record
router.delete('/:id', deleteRecordById);

module.exports = router;
