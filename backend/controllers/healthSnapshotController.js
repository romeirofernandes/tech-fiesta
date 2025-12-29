const HealthSnapshot = require('../models/HealthSnapshot');

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
    const { animalId } = req.query;
    const filter = animalId ? { animalId } : {};

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