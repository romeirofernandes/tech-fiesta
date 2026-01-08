const SensorEvent = require('../models/SensorEvent');

exports.createSensorEvent = async (req, res) => {
  try {
    const { animalId, type, value, meta } = req.body;
    
    const sensorEvent = await SensorEvent.create({
      animalId,
      type,
      value,
      meta
    });

    res.status(201).json(sensorEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getSensorEvents = async (req, res) => {
  try {
    const { animalId, type, startDate, endDate } = req.query;
    
    const filter = {};
    if (animalId) filter.animalId = animalId;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.recordedAt = {};
      if (startDate) filter.recordedAt.$gte = new Date(startDate);
      if (endDate) filter.recordedAt.$lte = new Date(endDate);
    }

    const events = await SensorEvent.find(filter)
      .populate('animalId', 'name rfid species')
      .sort({ recordedAt: -1 });
    
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};