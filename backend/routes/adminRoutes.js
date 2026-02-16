const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');


// Optional: Add admin role check middleware
// const { adminOnly } = require('../middleware/adminMiddleware');

/**
 * Admin Health Analytics Routes
 * All routes require authentication
 * Add adminOnly middleware if you have role-based access
 */

// Get detailed farm information
router.get('/farms/:id/details', adminController.getFarmDetails);

// Flag farm for review
router.put('/farms/:id/flag-review', adminController.flagFarmForReview);

// Resolve single alert
router.put('/alerts/:id/resolve', adminController.resolveAlert);

// Bulk resolve alerts
router.post('/alerts/bulk-resolve', adminController.bulkResolveAlerts);

// Schedule inspection
router.post('/farms/:id/inspection', adminController.scheduleInspection);

// Send notification to farmer
router.post('/notifications', adminController.sendNotification);

// Get admin activity log
router.get('/activity-log', adminController.getActivityLog);

// Get system statistics
router.get('/statistics', adminController.getSystemStatistics);

// Mark animal as reviewed
router.put('/animals/:id/mark-reviewed', adminController.markAnimalReviewed);

module.exports = router;