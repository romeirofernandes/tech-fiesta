/**
 * Format a number as Indian Rupees (INR) with ₹ symbol.
 * Uses the Indian numbering system (lakhs/crores).
 *
 * @param {number} amount
 * @param {object} [options]
 * @param {number} [options.decimals=2]
 * @param {boolean} [options.compact=false] Use compact notation (e.g. ₹1.5L)
 * @returns {string}
 */
export function formatINR(amount, { decimals = 2, compact = false } = {}) {
  if (amount == null || isNaN(amount)) return '₹0.00';

  if (compact) {
    if (Math.abs(amount) >= 1e7) {
      return `₹${(amount / 1e7).toFixed(1)}Cr`;
    }
    if (Math.abs(amount) >= 1e5) {
      return `₹${(amount / 1e5).toFixed(1)}L`;
    }
    if (Math.abs(amount) >= 1e3) {
      return `₹${(amount / 1e3).toFixed(1)}K`;
    }
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Product type display labels (for production / expense tracking).
 */
export const PRODUCT_LABELS = {
  milk: 'Milk',
  eggs: 'Eggs',
  meat_liveweight: 'Meat (Live Weight)',
  wool: 'Wool',
  manure: 'Manure',
};

/**
 * Market-price commodity labels (animals fetched from AGMARKNET + manual entries).
 */
export const MARKET_COMMODITY_LABELS = {
  cow:       'Cow',
  calf:      'Calf',
  bull:      'Bull',
  egg:       'Egg',
  goat:      'Goat',
  hen:       'Hen',
  buffalo:   'Buffalo',
  pigs:      'Pigs',
  sheep:     'Sheep',
  manure:    'Manure',
  wool:      'Wool',
  goat_hair: 'Goat Hair (White/Clean)',
};

/** Commodities that can be fetched from AGMARKNET */
export const AGMARKNET_COMMODITIES = ['cow', 'calf', 'bull', 'egg', 'goat', 'hen', 'buffalo', 'pigs', 'sheep'];

/** Manual-only commodities */
export const MANUAL_COMMODITIES = ['manure', 'wool', 'goat_hair'];

/** All market commodity keys */
export const MARKET_COMMODITIES = [...AGMARKNET_COMMODITIES, ...MANUAL_COMMODITIES];

export const EXPENSE_LABELS = {
  feed: 'Feed',
  veterinary: 'Veterinary',
  labour: 'Labour',
  equipment: 'Equipment',
  transport: 'Transport',
  utilities: 'Utilities',
  insurance: 'Insurance',
  other: 'Other',
};

export const PRODUCT_TYPES = ['milk', 'eggs', 'meat_liveweight', 'wool', 'manure'];
export const EXPENSE_CATEGORIES = ['feed', 'veterinary', 'labour', 'equipment', 'transport', 'utilities', 'insurance', 'other'];
