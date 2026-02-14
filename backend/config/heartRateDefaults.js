// Normal resting heart rate ranges for livestock species (BPM)
// Sources: Merck Veterinary Manual, veterinary physiology references
const HEART_RATE_DEFAULTS = {
  cow: { min: 40, max: 80, label: 'Cow' },
  buffalo: { min: 40, max: 80, label: 'Buffalo' },
  goat: { min: 70, max: 135, label: 'Goat' },
  sheep: { min: 60, max: 120, label: 'Sheep' },
  chicken: { min: 250, max: 300, label: 'Chicken' },
  pig: { min: 60, max: 100, label: 'Pig' },
  horse: { min: 28, max: 44, label: 'Horse' },
  other: { min: 60, max: 100, label: 'Other' },
};

module.exports = HEART_RATE_DEFAULTS;
