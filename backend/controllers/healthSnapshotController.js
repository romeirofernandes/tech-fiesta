const HealthSnapshot = require('../models/HealthSnapshot');
const Animal = require('../models/Animal');
const Farmer = require('../models/Farmer');

exports.createHealthSnapshot = async (req, res) => {
  try {
    const { animalId, score, summary } = req.body;
    
    const healthSnapshot = await HealthSnapshot.create({
      animalId,
      score,
      summary
    });

    res.status(201).json(healthSnapshot);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getHealthSnapshots = async (req, res) => {
  try {
    const { animalId, farmerId } = req.query;
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

    const snapshots = await HealthSnapshot.find(filter)
      .populate('animalId', 'name rfid species')
      .sort({ calculatedOn: -1 });
    
    res.status(200).json(snapshots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
    };
    
exports.getLatestHealthSnapshot = async (req, res) => {
  try {
    const snapshot = await HealthSnapshot.findOne({ animalId: req.params.animalId })
      .sort({ calculatedOn: -1 })
      .populate('animalId', 'name rfid species');
    
    if (!snapshot) {
      return res.status(404).json({ message: 'No health snapshot found' });
    }

    res.status(200).json(snapshot);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};