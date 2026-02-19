const VaccinationEvent = require('../models/VaccinationEvent');
const Alert = require('../models/Alert');
const Animal = require('../models/Animal');
const Farmer = require('../models/Farmer');

exports.createVaccinationEvent = async (req, res) => {
  try {
    const { animalId, vaccineName, eventType, date, notes, repeatsEvery } = req.body;
    
    const vaccinationEvent = await VaccinationEvent.create({
      animalId,
      vaccineName,
      eventType,
      date,
      notes,
      repeatsEvery
    });

    res.status(201).json(vaccinationEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getVaccinationEvents = async (req, res) => {
  try {
    const { animalId, eventType, farmerId } = req.query;

    // Auto-detect missed vaccinations before returning
    const now = new Date();
    const missedFilter = { eventType: 'scheduled', date: { $lt: now } };
    if (animalId) missedFilter.animalId = animalId;
    await VaccinationEvent.updateMany(missedFilter, { $set: { eventType: 'missed' } });
    
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
    if (eventType) filter.eventType = eventType;

    const events = await VaccinationEvent.find(filter)
      .populate('animalId', 'name rfid species')
      .sort({ date: -1 });
    
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateVaccinationEvent = async (req, res) => {
  try {
    const { vaccineName, eventType, date, notes, repeatsEvery } = req.body;
    const event = await VaccinationEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Vaccination event not found' });
    }

    if (vaccineName) event.vaccineName = vaccineName;
    if (eventType) event.eventType = eventType;
    if (date) event.date = date;
    if (notes !== undefined) event.notes = notes;
    if (repeatsEvery !== undefined) event.repeatsEvery = repeatsEvery;

    await event.save();
    res.status(200).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteVaccinationEvent = async (req, res) => {
  try {
    const event = await VaccinationEvent.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Vaccination event not found' });
    }

    await event.deleteOne();
    res.status(200).json({ message: 'Vaccination event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Resolve a vaccination event — marks it as 'administered' and resolves any matching alert.
 * PUT /api/vaccination-events/:id/resolve
 */
exports.resolveVaccinationEvent = async (req, res) => {
  try {
    const event = await VaccinationEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Vaccination event not found' });
    }

    // Mark vaccination as administered
    event.eventType = 'administered';
    event.date = new Date();
    await event.save();

    // Find and resolve any matching alert for this vaccination
    const matchingAlerts = await Alert.find({
      animalId: event.animalId,
      type: 'vaccination',
      isResolved: false,
      message: { $regex: event.vaccineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    });

    for (const alert of matchingAlerts) {
      alert.isResolved = true;
      alert.resolvedAt = new Date();
      await alert.save();
    }

    res.status(200).json({
      event,
      resolvedAlerts: matchingAlerts.length
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};