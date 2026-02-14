/**
 * BI Domain Enums & Types
 * Single source of truth for product types, units, categories, and species mappings.
 */

const PRODUCT_TYPES = {
  MILK: 'milk',
  EGGS: 'eggs',
  MEAT_LIVEWEIGHT: 'meat_liveweight',
  WOOL: 'wool',
  MANURE: 'manure',
};

const PRODUCT_TYPE_VALUES = Object.values(PRODUCT_TYPES);

/** Default measurement units per product type */
const PRODUCT_UNITS = {
  milk: 'litres',
  eggs: 'units',
  meat_liveweight: 'kg',
  wool: 'kg',
  manure: 'kg',
};

/** Which species can produce which product types */
const SPECIES_PRODUCT_MAP = {
  cow:     ['milk', 'manure', 'meat_liveweight'],
  buffalo: ['milk', 'manure', 'meat_liveweight'],
  goat:    ['milk', 'manure', 'meat_liveweight', 'wool'],
  sheep:   ['wool', 'manure', 'meat_liveweight', 'milk'],
  chicken: ['eggs', 'manure', 'meat_liveweight'],
  pig:     ['manure', 'meat_liveweight'],
  horse:   ['manure'],
  other:   ['manure'],
};

const EXPENSE_CATEGORIES = {
  FEED: 'feed',
  VETERINARY: 'veterinary',
  LABOUR: 'labour',
  EQUIPMENT: 'equipment',
  TRANSPORT: 'transport',
  UTILITIES: 'utilities',
  INSURANCE: 'insurance',
  OTHER: 'other',
};

const EXPENSE_CATEGORY_VALUES = Object.values(EXPENSE_CATEGORIES);

const CURRENCY = 'INR';

// ---------------------------------------------------------------------------
// Market-price commodity types
// Includes animals fetched from AGMARKNET API + manual-only commodities
// ---------------------------------------------------------------------------

/** AGMARKNET commodity IDs for api.agmarknet.gov.in/v1/daily-price-arrival/report */
const AGMARKNET_COMMODITY_IDS = {
  cow:      171,
  calf:     174,
  bull:     173,
  egg:      314,
  goat:     178,
  hen:      316,
  buffalo:  175,
  pigs:     179,
  sheep:    177,
};

/** All AGMARKNET-fetchable commodity keys */
const AGMARKNET_COMMODITIES = Object.keys(AGMARKNET_COMMODITY_IDS);

/** Manual-only commodity keys (not available on AGMARKNET) */
const MANUAL_ONLY_COMMODITIES = ['manure', 'wool', 'goat_hair'];

/** All valid market-price commodity keys */
const MARKET_COMMODITIES = [...AGMARKNET_COMMODITIES, ...MANUAL_ONLY_COMMODITIES];

/** Human-readable labels */
const MARKET_COMMODITY_LABELS = {
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

const GRANULARITY = ['day', 'week', 'month'];

module.exports = {
  PRODUCT_TYPES,
  PRODUCT_TYPE_VALUES,
  PRODUCT_UNITS,
  SPECIES_PRODUCT_MAP,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_VALUES,
  CURRENCY,
  AGMARKNET_COMMODITY_IDS,
  AGMARKNET_COMMODITIES,
  MANUAL_ONLY_COMMODITIES,
  MARKET_COMMODITIES,
  MARKET_COMMODITY_LABELS,
  GRANULARITY,
};
