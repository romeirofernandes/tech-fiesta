const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    benefits: {
        type: [String],
        default: []
    },
    financial_aid: {
        type: String,
        default: 'Check locally'
    },
    duration: {
        type: String,
        default: 'Ongoing'
    },
    how_to_apply: {
        type: String,
        default: 'Contact Gram Panchayat'
    },
    official_link: {
        type: String,
        default: ''
    },
    applicationProcess: {
        type: [String],
        default: []
    },
    source: {
        type: String,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Scheme', schemeSchema);
