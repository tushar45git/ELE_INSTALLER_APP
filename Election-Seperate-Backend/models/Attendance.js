const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    userName: {
        type: String
    },
    userMobile: {
        type: String
    },
    date: {
        type: String,
        required: true
    },
    punchInTime: {
        type: Date,
        required: true
    },
    punchInLatitude: {
        type: Number,
        required: true
    },
    punchInLongitude: {
        type: Number,
        required: true
    },
    punchInPhotoUrl: {
        type: String
    },
    punchOutTime: {
        type: Date
    },
    punchOutPhotoUrl: {
        type: String
    },
    punchOutLatitude: {
        type: Number
    },
    punchOutLongitude: {
        type: Number
    },
    status: {
        type: String,
        enum: ['punched-in', 'punched-out'],
        default: 'punched-in'
    },
    workDuration: {
        type: String // formatted duration string (e.g., "43 min", "2 hr 15 min")
    }
}, { timestamps: true });

// Index for faster queries
attendanceSchema.index({ userId: 1, date: -1 });
attendanceSchema.index({ date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema, 'election-attendances');
