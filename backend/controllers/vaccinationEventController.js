const VaccinationEvent = require('../models/VaccinationEvent');

exports.createVaccinationEvent = async (req, res) => {
  try {
    const { animalId, vaccineName, eventType, date, confidence, notes } = req.body;
    
    const vaccinationEvent = await VaccinationEvent.create({
      animalId,
      vaccineName,
      eventType,
      date,
      confidence,
      notes
    });

    res.status(201).json(vaccinationEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getVaccinationEvents = async (req, res) => {
  try {
    const { animalId, eventType } = req.query;
    
    const filter = {};
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
    const { eventType, date, confidence, notes } = req.body;
    const event = await VaccinationEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Vaccination event not found' });
    }

    if (eventType) event.eventType = eventType;
    if (date) event.date = date;
    if (confidence) event.confidence = confidence;
    if (notes !== undefined) event.notes = notes;

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