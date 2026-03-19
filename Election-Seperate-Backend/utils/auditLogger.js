const AuditLog = require('../models/AuditLog');

/**
 * Log user actions to audit log
 * @param {Object} user - User object with name, mobile, role
 * @param {String} action - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param {String} resourceType - Type of resource (Vehicle, FsvData, etc.)
 * @param {String} resourceId - ID of the resource
 * @param {Object} changes - Changes made (for UPDATE actions)
 * @param {String} ipAddress - IP address of the request
 */
const logAction = async (user, action, resourceType, resourceId = null, changes = null, ipAddress = null) => {
    try {
        const logEntry = new AuditLog({
            userId: user._id || null,
            userName: user.name || 'Unknown',
            userMobile: user.mobile || 'Unknown',
            userRole: user.role || 'Unknown',
            action,
            resourceType,
            resourceId,
            changes,
            ipAddress
        });

        await logEntry.save();
        console.log(`Audit Log Created: ${action} on ${resourceType} by ${user.name || user.mobile}`);
    } catch (error) {
        console.error('Error creating audit log:', error);
        // Don't throw error - logging should not break the main operation
    }
};

module.exports = { logAction };
