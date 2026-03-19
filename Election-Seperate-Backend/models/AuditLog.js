const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'election-users'
    },
    userName: {
        type: String,
        required: true
    },
    userMobile: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'PUNCH_IN', 'PUNCH_OUT', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT']
    },
    resourceType: {
        type: String,
        required: true
    },
    resourceId: {
        type: String
    },
    changes: {
        type: mongoose.Schema.Types.Mixed
    },
    ipAddress: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true 
});

// Index for faster queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema, 'audit-logs');
