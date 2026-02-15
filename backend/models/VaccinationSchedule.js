const mongoose = require('mongoose');

const vaccinationScheduleSchema = new mongoose.Schema({
    species: [{
        type: String,
        enum: ['cow', 'buffalo', 'goat', 'sheep', 'chicken', 'pig', 'horse', 'other'],
        required: true
    }],
    category: {
        type: String,
        required: true
    },
    disease: {
        type: String,
        required: true
    },
    vaccineName: {
        type: String,
        default: '—'
    },
    primaryVaccinationAge: {
        type: String,
        default: '—'
    },
    boosterSchedule: {
        type: String,
        default: '—'
    },
    doseAndRoute: {
        type: String,
        default: '—'
    },
    notes: {
        type: String,
        default: null
    },
    genderSpecific: {
        type: String,
        enum: ['all', 'male', 'female'],
        default: 'all'
    }
}, { timestamps: true });

module.exports = mongoose.model('VaccinationSchedule', vaccinationScheduleSchema);
