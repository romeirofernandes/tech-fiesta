const VaccinationSchedule = require('../models/VaccinationSchedule');
const { parseVaccinationAgeToMonths } = require('../utils/ageUtils');

exports.getSchedulesBySpecies = async (req, res) => {
    try {
        const { species, gender } = req.query;
        const filter = {};

        if (species) {
            // Map common alternative names
            const speciesMap = { 'cattle': 'cow', 'bull': 'cow', 'calf': 'cow' };
            filter.species = speciesMap[species.toLowerCase()] || species.toLowerCase();
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

/**
 * Get vaccines that should have been taken before the animal's current age.
 * Used in the "Health & Shot Records" questionnaire dropdown during animal creation.
 * GET /api/vaccination-schedules/due-before?species=cow&gender=female&age=5&ageUnit=months
 */
exports.getDueBeforeAge = async (req, res) => {
    try {
        const { species, gender, age, ageUnit } = req.query;
        
        if (!species || !age) {
            return res.status(400).json({ message: 'species and age are required' });
        }

        const speciesMap = { 'cattle': 'cow', 'bull': 'cow', 'calf': 'cow' };
        const searchSpecies = speciesMap[species.toLowerCase()] || species.toLowerCase();
        
        // Convert age to months for comparison
        let ageInMonths = parseFloat(age);
        const unit = (ageUnit || 'months').toLowerCase();
        if (unit === 'years') ageInMonths = ageInMonths * 12;
        else if (unit === 'days') ageInMonths = ageInMonths / 30;

        const filter = {
            species: searchSpecies,
        };
        if (gender) {
            filter.$or = [
                { genderSpecific: 'all' },
                { genderSpecific: gender.toLowerCase() }
            ];
        }

        const schedules = await VaccinationSchedule.find(filter).sort({ category: 1, disease: 1 });
        
        // Filter to only vaccines that are due before or at the animal's current age
        const dueVaccines = schedules.filter(schedule => {
            const vaccAgeMonths = parseVaccinationAgeToMonths(schedule.primaryVaccinationAge);
            // If we can't parse the age, include it (better to show than miss)
            if (vaccAgeMonths === null) return true;
            return vaccAgeMonths <= ageInMonths;
        }).map(schedule => ({
            _id: schedule._id,
            disease: schedule.disease,
            vaccineName: schedule.vaccineName,
            displayName: schedule.vaccineName !== '—' 
                ? `${schedule.disease} - ${schedule.vaccineName}` 
                : schedule.disease,
            primaryVaccinationAge: schedule.primaryVaccinationAge,
            category: schedule.category,
            doseAndRoute: schedule.doseAndRoute,
            notes: schedule.notes
        }));

        res.status(200).json(dueVaccines);
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
