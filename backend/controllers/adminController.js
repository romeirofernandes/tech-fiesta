const Farm = require('../models/Farm');
const Animal = require('../models/Animal');
const Alert = require('../models/Alert');
const HealthSnapshot = require('../models/HealthSnapshot');
const VaccinationEvent = require('../models/VaccinationEvent');
const Farmer = require('../models/Farmer');

/**
 * Admin Action Logger
 * Tracks all admin actions for audit trail
 */
const logAdminAction = async (adminId, action, targetType, targetId, details) => {
    // Simple logging to console for now
    // You can create an AdminAction model later if needed
    console.log('[ADMIN ACTION]', {
        adminId,
        action,
        targetType,
        targetId,
        details,
        timestamp: new Date()
    });
};

/**
 * Get detailed farm information with all animals and health data
 * GET /api/admin/farms/:id/details
 */
exports.getFarmDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        const farm = await Farm.findById(id);
        if (!farm) {
            return res.status(404).json({ message: 'Farm not found' });
        }

        // Get all animals in this farm
        const animals = await Animal.find({ farmId: id });
        const animalIds = animals.map(a => a._id);

        // Get health snapshots for all animals
        const healthSnapshots = await HealthSnapshot.find({ 
            animalId: { $in: animalIds } 
        }).sort({ calculatedOn: -1 });

        // Get alerts for all animals in farm
        const alerts = await Alert.find({ 
            animalId: { $in: animalIds },
            isResolved: false 
        }).populate('animalId', 'name rfid species');

        // Get vaccination events
        const vaccinations = await VaccinationEvent.find({
            animalId: { $in: animalIds }
        }).populate('animalId', 'name rfid');

        // Calculate farm statistics
        const criticalAnimals = animals.filter(animal => {
            const latestSnapshot = healthSnapshots.find(
                s => (s.animalId?._id || s.animalId).toString() === animal._id.toString()
            );
            return latestSnapshot && latestSnapshot.score < 40;
        });

        const avgHealthScore = healthSnapshots.length > 0
            ? Math.round(healthSnapshots.reduce((sum, s) => sum + s.score, 0) / healthSnapshots.length)
            : null;

        // Organize animals with their latest health data
        const animalsWithHealth = animals.map(animal => {
            const latestSnapshot = healthSnapshots.find(
                s => (s.animalId?._id || s.animalId).toString() === animal._id.toString()
            );
            const animalAlerts = alerts.filter(
                a => (a.animalId?._id || a.animalId).toString() === animal._id.toString()
            );
            
            return {
                ...animal.toObject(),
                latestHealthScore: latestSnapshot?.score || null,
                lastCheckDate: latestSnapshot?.calculatedOn || null,
                activeAlerts: animalAlerts.length,
                alerts: animalAlerts
            };
        });

        res.status(200).json({
            farm,
            animals: animalsWithHealth,
            statistics: {
                totalAnimals: animals.length,
                criticalCount: criticalAnimals.length,
                avgHealthScore,
                activeAlerts: alerts.length,
                totalHealthChecks: healthSnapshots.length
            },
            recentAlerts: alerts.slice(0, 10),
            upcomingVaccinations: vaccinations
                .filter(v => v.eventType === 'scheduled' && new Date(v.date) > new Date())
                .slice(0, 10)
        });

    } catch (error) {
        console.error('Error fetching farm details:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Get all farmers with detailed farm information
 * GET /api/admin/farmers
 */
exports.getAllFarmers = async (req, res) => {
    try {
        // Exclude the admin from the list if ADMIN_EMAIL is set
        const adminEmail = process.env.ADMIN_EMAIL;
        const query = adminEmail ? { email: { $ne: adminEmail } } : {};

        const farmers = await Farmer.find(query)
            .populate('farms', 'name location')
            .sort({ createdAt: -1 });

        res.status(200).json(farmers);
    } catch (error) {
        console.error('Error fetching farmers:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Flag farm for review
 * PUT /api/admin/farms/:id/flag-review
 */
exports.flagFarmForReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, priority } = req.body;

        const farm = await Farm.findById(id);
        if (!farm) {
            return res.status(404).json({ message: 'Farm not found' });
        }

        // Get all animals in this farm
        const animals = await Animal.find({ farmId: id });
        
        if (animals.length === 0) {
            return res.status(400).json({ message: 'No animals found in this farm to create alert' });
        }

        // Create alert for the first animal in the farm (as a farm-level notification)
        await Alert.create({
            animalId: animals[0]._id,
            type: 'health', // Use valid enum value
            severity: priority || 'high',
            message: `Farm "${farm.name}" flagged for review: ${reason || 'Administrative review required'}`,
            isResolved: false
        });

        // Log admin action
        await logAdminAction(
            req.user?.id || 'admin',
            'FLAG_FARM',
            'farm',
            id,
            { reason, priority }
        );

        res.status(200).json({ 
            message: 'Farm flagged for review successfully',
            farm 
        });

    } catch (error) {
        console.error('Error flagging farm:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Resolve alert
 * PUT /api/admin/alerts/:id/resolve
 */
exports.resolveAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution, notes } = req.body;

        const alert = await Alert.findById(id);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        alert.isResolved = true;
        alert.resolvedAt = new Date();
        alert.resolvedBy = req.user?.id || 'admin';
        alert.resolutionNotes = notes || resolution;
        await alert.save();

        // Log admin action
        await logAdminAction(
            req.user?.id || 'admin',
            'RESOLVE_ALERT',
            'alert',
            id,
            { resolution, notes }
        );

        res.status(200).json({ 
            message: 'Alert resolved successfully',
            alert 
        });

    } catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Bulk resolve alerts
 * POST /api/admin/alerts/bulk-resolve
 */
exports.bulkResolveAlerts = async (req, res) => {
    try {
        const { alertIds, resolution } = req.body;

        if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
            return res.status(400).json({ message: 'Alert IDs are required' });
        }

        const result = await Alert.updateMany(
            { _id: { $in: alertIds } },
            { 
                isResolved: true,
                resolvedAt: new Date(),
                resolvedBy: req.user?.id || 'admin',
                resolutionNotes: resolution
            }
        );

        // Log admin action
        await logAdminAction(
            req.user?.id || 'admin',
            'BULK_RESOLVE_ALERTS',
            'alerts',
            alertIds.join(','),
            { count: alertIds.length, resolution }
        );

        res.status(200).json({ 
            message: `${result.modifiedCount} alerts resolved successfully`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Error bulk resolving alerts:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Schedule inspection
 * POST /api/admin/farms/:id/inspection
 */
exports.scheduleInspection = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, type, assignedTo, notes } = req.body;

        const farm = await Farm.findById(id);
        if (!farm) {
            return res.status(404).json({ message: 'Farm not found' });
        }

        // Get all animals in this farm
        const animals = await Animal.find({ farmId: id });
        
        if (animals.length === 0) {
            return res.status(400).json({ message: 'No animals found in this farm to create inspection alert' });
        }

        // Create an alert/notification for the scheduled inspection
        const alert = await Alert.create({
            animalId: animals[0]._id,
            type: 'health', // Use valid enum value
            severity: 'medium',
            message: `Inspection scheduled for ${new Date(date).toLocaleDateString()}: ${type || 'General inspection'} at ${farm.name}`,
            isResolved: false
        });

        // Log admin action
        await logAdminAction(
            req.user?.id || 'admin',
            'SCHEDULE_INSPECTION',
            'farm',
            id,
            { date, type, assignedTo, notes }
        );

        res.status(201).json({ 
            message: 'Inspection scheduled successfully',
            inspection: { date, type, assignedTo, notes, farmId: id },
            alert
        });

    } catch (error) {
        console.error('Error scheduling inspection:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Send notification to farmer
 * POST /api/admin/notifications
 */
exports.sendNotification = async (req, res) => {
    try {
        const { farmId, message, priority, type } = req.body;

        if (!farmId || !message) {
            return res.status(400).json({ message: 'Farm ID and message are required' });
        }

        const farm = await Farm.findById(farmId);
        if (!farm) {
            return res.status(404).json({ message: 'Farm not found' });
        }

        // Get all animals in this farm
        const animals = await Animal.find({ farmId });
        
        if (animals.length === 0) {
            return res.status(400).json({ message: 'No animals found in this farm to send notification' });
        }

        // Create alert as notification
        const notification = await Alert.create({
            animalId: animals[0]._id,
            type: type || 'health', // Use valid enum value
            severity: priority || 'medium',
            message,
            isResolved: false
        });

        // Log admin action
        await logAdminAction(
            req.user?.id || 'admin',
            'SEND_NOTIFICATION',
            'farm',
            farmId,
            { message, priority, type }
        );

        res.status(201).json({ 
            message: 'Notification sent successfully',
            notification
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Get admin activity log
 * GET /api/admin/activity-log
 */
exports.getActivityLog = async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        
        // Return recent health alerts as activity log
        const activities = await Alert.find({ 
            type: { $in: ['health', 'vaccination', 'vitals'] } 
        })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('animalId', 'name rfid');

        const total = await Alert.countDocuments({ 
            type: { $in: ['health', 'vaccination', 'vitals'] } 
        });

        res.status(200).json({
            activities,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching activity log:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Get system statistics for admin dashboard
 * GET /api/admin/statistics
 */
exports.getSystemStatistics = async (req, res) => {
    try {
        const { timeRange = 30 } = req.query;
        const daysBack = parseInt(timeRange);
        const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

        // Parallel queries for performance
        const [
            totalFarms,
            totalAnimals,
            recentAlerts,
            recentSnapshots,
            unresolvedAlerts
        ] = await Promise.all([
            Farm.countDocuments(),
            Animal.countDocuments(),
            Alert.countDocuments({ createdAt: { $gte: cutoffDate } }),
            HealthSnapshot.countDocuments({ calculatedOn: { $gte: cutoffDate } }),
            Alert.countDocuments({ isResolved: false })
        ]);

        res.status(200).json({
            totalFarms,
            totalAnimals,
            recentAlerts,
            recentHealthChecks: recentSnapshots,
            unresolvedAlerts,
            timeRange: daysBack
        });

    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Mark animal as reviewed
 * PUT /api/admin/animals/:id/mark-reviewed
 */
exports.markAnimalReviewed = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const animal = await Animal.findById(id);
        if (!animal) {
            return res.status(404).json({ message: 'Animal not found' });
        }

        // You can add a lastReviewedAt field to Animal model later
        // For now, resolve any alerts for this animal
        await Alert.updateMany(
            { animalId: id, isResolved: false },
            { 
                isResolved: true,
                resolvedAt: new Date(),
                resolvedBy: req.user?.id || 'admin',
                resolutionNotes: notes || 'Reviewed by admin'
            }
        );

        // Log admin action
        await logAdminAction(
            req.user?.id || 'admin',
            'REVIEW_ANIMAL',
            'animal',
            id,
            { notes }
        );

        res.status(200).json({ 
            message: 'Animal marked as reviewed',
            animal
        });

    } catch (error) {
        console.error('Error marking animal as reviewed:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};