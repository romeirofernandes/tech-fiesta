const mongoose = require('mongoose');

const vacxxSchema = new mongoose.Schema({
    animalType: {
        type: String,
        required: true,
        enum: ['Cow', 'Bull', 'Buffalo', 'Sheep', 'Goat', 'Chicken']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Any'],
        required: false,
        default: 'Any'
    },
    image: {
        type: String,
        required: false
    },
    unit: {
        type: String,
        default: 'months'
    },
    schedule: [{
        disease: {
            type: String,
            required: true
        },
        firstDoseAtMonths: {
            type: Number,
            required: false
        },
        boosterAfterMonths: {
            type: Number,
            default: null
        },
        repeatEveryMonths: {
            type: Number,
            default: null
        },
        firstDoseAtDays: {
            type: Number,
            required: false
        },
        boosterAfterDays: {
            type: Number,
            default: null
        },
        repeatEveryDays: {
            type: Number,
            default: null
        },
        mandatory: {
            type: Boolean,
            default: false
        },
        notes: {
            type: String
        }
    }],
    source: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Vacxx', vacxxSchema);
