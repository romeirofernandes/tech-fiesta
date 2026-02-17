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
 * Product type display labels (for production / sales tracking).
 */
export const PRODUCT_LABELS = {
  cow_milk: 'Cow Milk',
  buffalo_milk: 'Buffalo Milk',
  goat_milk: 'Goat Milk',
  sheep_milk: 'Sheep Milk',
  eggs: 'Eggs',
  live_animal: 'Live Animal',
  marketplace: 'Marketplace Sale',
  wool: 'Wool',
  manure: 'Manure',
  goat_hair: 'Goat Hair',
};

/**
 * Market-price commodity labels (animals fetched from AGMARKNET + manual entries).
 */
export const MARKET_COMMODITY_LABELS = {
  cow:           'Cow',
  calf:          'Calf',
  bull:          'Bull',
  egg:           'Egg',
  goat:          'Goat',
  hen:           'Hen',
  buffalo:       'Buffalo',
  pigs:          'Pigs',
  sheep:         'Sheep',
  manure:        'Manure',
  wool:          'Wool',
  goat_hair:     'Goat Hair (White/Clean)',
  cow_milk:      'Cow Milk',
  buffalo_milk:  'Buffalo Milk',
  goat_milk:     'Goat Milk',
  sheep_milk:    'Sheep Milk',
  horse:         'Horse',
};

/** Commodities that can be fetched from AGMARKNET */
export const AGMARKNET_COMMODITIES = ['cow', 'calf', 'bull', 'egg', 'goat', 'hen', 'buffalo', 'pigs', 'sheep'];

/** Manual-only commodities */
export const MANUAL_COMMODITIES = ['manure', 'wool', 'goat_hair', 'cow_milk', 'buffalo_milk', 'goat_milk', 'sheep_milk', 'horse'];

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
  marketplace_purchase: 'Marketplace Purchase',
  other: 'Other',
};

export const PRODUCT_TYPES = ['cow_milk', 'buffalo_milk', 'goat_milk', 'sheep_milk', 'eggs', 'live_animal', 'wool', 'manure', 'goat_hair'];
export const EXPENSE_CATEGORIES = ['feed', 'veterinary', 'labour', 'equipment', 'transport', 'utilities', 'insurance', 'marketplace_purchase', 'other'];

/** Default units per product type */
export const PRODUCT_UNITS = {
  cow_milk: 'litres',
  buffalo_milk: 'litres',
  goat_milk: 'litres',
  sheep_milk: 'litres',
  eggs: 'units',
  live_animal: 'head',
  wool: 'kg',
  manure: 'kg',
  goat_hair: 'kg',
};

/** Which species can produce which product types */
export const SPECIES_PRODUCT_MAP = {
  cow:     ['cow_milk', 'manure'],
  buffalo: ['buffalo_milk', 'manure'],
  goat:    ['goat_milk', 'goat_hair', 'manure'],
  sheep:   ['sheep_milk', 'wool', 'manure'],
  chicken: ['eggs'],
  pig:     ['manure'],
  horse:   ['manure'],
  other:   ['manure'],
};

/**
 * Which species can be sold as live animals.
 * Every species that exists on a farm can potentially be sold.
 */
export const SELLABLE_SPECIES = ['cow', 'buffalo', 'goat', 'sheep', 'chicken', 'pig', 'horse'];

/**
 * Map species to AGMARKNET/manual market commodity key for price lookup.
 */
export const SPECIES_COMMODITY_MAP = {
  cow: 'cow',
  buffalo: 'buffalo',
  goat: 'goat',
  sheep: 'sheep',
  pig: 'pigs',
  chicken: 'hen',
  horse: 'horse',
};
