const HeartRateThreshold = require('../models/HeartRateThreshold');
const Animal = require('../models/Animal');
const Farmer = require('../models/Farmer');
const HEART_RATE_DEFAULTS = require('../config/heartRateDefaults');

// GET /api/heart-rate-thresholds/defaults
exports.getDefaults = async (req, res) => {
  try {
    res.status(200).json(HEART_RATE_DEFAULTS);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/heart-rate-thresholds
exports.getThresholds = async (req, res) => {
  try {
    const { farmerId } = req.query;
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

    const thresholds = await HeartRateThreshold.find(filter)
      .populate('animalId', 'name rfid species farmId')
      .sort({ updatedAt: -1 });

    res.status(200).json(thresholds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/heart-rate-thresholds/:animalId
exports.getThreshold = async (req, res) => {
  try {
    const { animalId } = req.params;

    const custom = await HeartRateThreshold.findOne({ animalId })
      .populate('animalId', 'name rfid species farmId');

    if (custom) {
      return res.status(200).json({ ...custom.toObject(), isCustom: true });
    }

    // Return species default
    const animal = await Animal.findById(animalId);
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found' });
    }

    const defaults = HEART_RATE_DEFAULTS[animal.species] || HEART_RATE_DEFAULTS.other;
    res.status(200).json({
      animalId: animal,
      minBPM: defaults.min,
      maxBPM: defaults.max,
      isCustom: false,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/heart-rate-thresholds/:animalId
exports.upsertThreshold = async (req, res) => {
  try {
    const { animalId } = req.params;
    const { minBPM, maxBPM } = req.body;

    if (minBPM == null || maxBPM == null) {
      return res.status(400).json({ message: 'minBPM and maxBPM are required' });
    }

    if (minBPM >= maxBPM) {
      return res.status(400).json({ message: 'minBPM must be less than maxBPM' });
    }

    const animal = await Animal.findById(animalId);
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found' });
    }

    const threshold = await HeartRateThreshold.findOneAndUpdate(
      { animalId },
      { minBPM, maxBPM },
      { new: true, upsert: true, runValidators: true }
    ).populate('animalId', 'name rfid species farmId');

    res.status(200).json({ ...threshold.toObject(), isCustom: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/heart-rate-thresholds/:animalId
exports.deleteThreshold = async (req, res) => {
  try {
    const { animalId } = req.params;

    const deleted = await HeartRateThreshold.findOneAndDelete({ animalId });
    if (!deleted) {
      return res.status(404).json({ message: 'No custom threshold found for this animal' });
    }

    // Return the species default after deletion
    const animal = await Animal.findById(animalId);
    const defaults = HEART_RATE_DEFAULTS[animal?.species] || HEART_RATE_DEFAULTS.other;

    res.status(200).json({
      message: 'Custom threshold removed, reverted to species default',
      defaults: { minBPM: defaults.min, maxBPM: defaults.max },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
