/**
 * Age utility functions for computing animal ages dynamically.
 * 
 * Since the Animal model stores a static `age` + `ageUnit` snapshot at creation time,
 * these helpers compute the actual dateOfBirth and current age dynamically.
 */

/**
 * Compute approximate date of birth from the animal's creation date and age at creation.
 * @param {Date} createdAt - When the animal record was created
 * @param {number} age - Age at creation time
 * @param {string} ageUnit - 'days', 'months', or 'years'
 * @returns {Date} Estimated date of birth
 */
function computeDateOfBirth(createdAt, age, ageUnit) {
    const created = new Date(createdAt);
    const unit = (ageUnit || 'months').toLowerCase();
    
    if (unit === 'years') {
        created.setFullYear(created.getFullYear() - age);
    } else if (unit === 'days') {
        created.setDate(created.getDate() - age);
    } else {
        // months (default)
        created.setMonth(created.getMonth() - age);
    }
    
    return created;
}

/**
 * Get the animal's current age in months, computed dynamically from dateOfBirth.
 * @param {Object} animal - Animal document with age, ageUnit, createdAt
 * @returns {number} Current age in months
 */
function getCurrentAgeInMonths(animal) {
    const dob = computeDateOfBirth(animal.createdAt, animal.age || 0, animal.ageUnit || 'months');
    const now = new Date();
    const diffMs = now - dob;
    const avgMonthMs = 30.44 * 24 * 60 * 60 * 1000; // average days per month
    return diffMs / avgMonthMs;
}

/**
 * Parse a primaryVaccinationAge string like "3 months", "0 day", "4-8 months"
 * and return the target age in months.
 * @param {string} primaryVaccinationAge - Free-text vaccination age
 * @returns {number|null} Age in months, or null if unparseable
 */
function parseVaccinationAgeToMonths(primaryVaccinationAge) {
    if (!primaryVaccinationAge) return null;
    
    // Handle ordinal numbers like "6th week", "8th week", "12-14 days"
    // Also handle "At 3 months of age", "3 months & above", "0 day"
    const match = primaryVaccinationAge.match(/(\d+)(?:st|nd|rd|th)?[\s-]*(month|day|week|year)/i);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith('day')) return value / 30;
    if (unit.startsWith('week')) return value / 4;
    if (unit.startsWith('year')) return value * 12;
    return value; // months
}

/**
 * Compute the target vaccination date for a given animal and vaccination schedule.
 * @param {Object} animal - Animal document
 * @param {number} vaccAgeInMonths - Target vaccination age in months
 * @returns {{ targetDate: Date, eventType: string }} - The computed date and whether it's scheduled/missed
 */
function computeVaccinationTarget(animal, vaccAgeInMonths) {
    const dob = computeDateOfBirth(animal.createdAt, animal.age || 0, animal.ageUnit || 'months');
    const now = new Date();
    
    // Target date = dateOfBirth + vaccAgeInMonths
    const targetDate = new Date(dob);
    const wholeMonths = Math.floor(vaccAgeInMonths);
    const remainderDays = Math.round((vaccAgeInMonths - wholeMonths) * 30);
    targetDate.setMonth(targetDate.getMonth() + wholeMonths);
    targetDate.setDate(targetDate.getDate() + remainderDays);
    
    // If targetDate is in the past, it's missed; otherwise it's scheduled
    const eventType = targetDate <= now ? 'missed' : 'scheduled';
    
    return { targetDate, eventType };
}

module.exports = {
    computeDateOfBirth,
    getCurrentAgeInMonths,
    parseVaccinationAgeToMonths,
    computeVaccinationTarget
};
