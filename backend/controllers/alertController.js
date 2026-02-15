const Alert = require('../models/Alert');
const VaccinationEvent = require('../models/VaccinationEvent');

/**
 * Check for missed vaccinations and auto-create alerts.
 * Called before fetching alerts to ensure they're up-to-date.
 */
async function checkMissedVaccinations() {
    const now = new Date();
    // Find all overdue scheduled vaccination events
    const overdueEvents = await VaccinationEvent.find({
        eventType: 'scheduled',
        date: { $lt: now }
    }).populate('animalId', 'name rfid');

    if (overdueEvents.length === 0) return;

    // Batch update to 'missed'
    const overdueIds = overdueEvents.map(e => e._id);
    await VaccinationEvent.updateMany(
        { _id: { $in: overdueIds } },
        { $set: { eventType: 'missed' } }
    );

    // Create alerts for each new missed vaccination
    for (const event of overdueEvents) {
        if (!event.animalId) continue;
        
        const animalIdVal = event.animalId._id || event.animalId;
        const message = `Missed vaccination: ${event.vaccineName} was due on ${event.date.toLocaleDateString()}`;
        
        const existingAlert = await Alert.findOne({
            animalId: animalIdVal,
            type: 'vaccination',
            message: { $regex: event.vaccineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
            isResolved: false
        });

        if (!existingAlert) {
            const daysPastDue = Math.floor((now - event.date) / (1000 * 60 * 60 * 24));
            await Alert.create({
                animalId: animalIdVal,
                type: 'vaccination',
                severity: daysPastDue > 30 ? 'high' : 'medium',
                message
            });
        }
    }
}

exports.createAlert = async (req, res) => {
  try {
    const { animalId, type, severity, message } = req.body;
    
    const alert = await Alert.create({
      animalId,
      type,
      severity,
      message
    });

    res.status(201).json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    // Auto-detect missed vaccinations and create alerts before fetching
    try {
      await checkMissedVaccinations();
    } catch (err) {
      console.error('Missed vaccination check failed:', err);
    }

    const { animalId, type, severity, isResolved, search, startDate, endDate, page, limit } = req.query;
    
    const filter = {};
    if (animalId) filter.animalId = animalId;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (isResolved !== undefined) filter.isResolved = isResolved === 'true';
    if (search) filter.message = { $regex: search, $options: 'i' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // If pagination params provided, return paginated response
    if (page || limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [alerts, total] = await Promise.all([
        Alert.find(filter)
          .populate({
            path: 'animalId',
            select: 'name rfid species farmId',
            populate: { path: 'farmId', select: 'name' }
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Alert.countDocuments(filter)
      ]);

      return res.status(200).json({
        alerts,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    // Non-paginated (backward-compatible)
    const alerts = await Alert.find(filter)
      .populate({
        path: 'animalId',
        select: 'name rfid species farmId',
        populate: { path: 'farmId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.isResolved = true;
    alert.resolvedAt = new Date();
    await alert.save();

    // If this is a vaccination alert, also mark the corresponding vaccination event as administered
    if (alert.type === 'vaccination' && alert.animalId) {
      // Extract vaccine name from alert message like "Missed vaccination: PPR - PPR Vaccine was due on ..."
      const vaccMatch = alert.message.match(/Missed vaccination:\s*(.+?)\s*was due on/i);
      if (vaccMatch) {
        const vaccineName = vaccMatch[1].trim();
        await VaccinationEvent.updateMany(
          {
            animalId: alert.animalId,
            vaccineName: { $regex: vaccineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
            eventType: 'missed'
          },
          { $set: { eventType: 'administered', date: new Date() } }
        );
      }
    }

    res.status(200).json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.deleteOne();
    res.status(200).json({ message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};