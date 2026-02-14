const Alert = require('../models/Alert');

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