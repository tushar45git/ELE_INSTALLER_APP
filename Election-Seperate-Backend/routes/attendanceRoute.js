const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const multer = require('multer');

// Multer Config for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Attendance Routes
router.post('/punch-in', upload.single('photo'), attendanceController.punchIn);
router.post('/punch-out', upload.single('photo'), attendanceController.punchOut);
router.get('/list', attendanceController.getAttendanceList);
router.get('/today-status', attendanceController.getTodayStatus);
router.get('/report', attendanceController.generateReport);
router.delete('/delete/:id', attendanceController.deleteAttendance);
router.get('/incomplete-punch-ins', attendanceController.getIncompletePunchIns);
router.post('/complete-previous-punchout', upload.single('photo'), attendanceController.completePreviousPunchOut);

module.exports = router;
