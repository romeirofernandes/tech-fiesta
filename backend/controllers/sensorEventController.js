const SensorEvent = require('../models/SensorEvent');
const Animal = require('../models/Animal');
const Farmer = require('../models/Farmer');

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
    const { animalId, type, startDate, endDate, farmerId } = req.query;
    
    const filter = {};
    if (farmerId) {
      const farmer = await Farmer.findById(farmerId);
      if (farmer && farmer.farms && farmer.farms.length > 0) {
        const animals = await Animal.find({ farmId: { $in: farmer.farms } }).select('_id');
        const animalIds = animals.map(a => a._id);
        filter.animalId = { $in: animalIds };
      } else {
        filter.animalId = { $in: [] };
      }
    }
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