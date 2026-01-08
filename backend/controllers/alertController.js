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
    const { animalId, type, severity, isResolved } = req.query;
    
    const filter = {};
    if (animalId) filter.animalId = animalId;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (isResolved !== undefined) filter.isResolved = isResolved === 'true';

    const alerts = await Alert.find(filter)
      .populate('animalId', 'name rfid species')
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