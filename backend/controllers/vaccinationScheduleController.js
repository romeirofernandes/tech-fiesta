const VaccinationSchedule = require('../models/VaccinationSchedule');

exports.getSchedulesBySpecies = async (req, res) => {
    try {
        const { species, gender } = req.query;
        const filter = {};

        if (species) {
            filter.species = species;
        }

        if (gender) {
            filter.$or = [
                { genderSpecific: 'all' },
                { genderSpecific: gender }
            ];
        }

        const schedules = await VaccinationSchedule.find(filter).sort({ category: 1, disease: 1 });
        res.status(200).json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getAllSchedules = async (req, res) => {
    try {
        const schedules = await VaccinationSchedule.find().sort({ category: 1, disease: 1 });
        res.status(200).json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createSchedule = async (req, res) => {
    try {
        const schedule = new VaccinationSchedule(req.body);
        await schedule.save();
        res.status(201).json(schedule);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.bulkCreateSchedules = async (req, res) => {
    try {
        const { schedules } = req.body;
        if (!Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of schedules' });
        }
        const created = await VaccinationSchedule.insertMany(schedules);
        res.status(201).json({ message: `${created.length} schedules created`, data: created });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
