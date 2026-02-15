/**
 * BI Domain Enums & Types
 * Single source of truth for product types, units, categories, and species mappings.
 */

const PRODUCT_TYPES = {
  COW_MILK: 'cow_milk',
  BUFFALO_MILK: 'buffalo_milk',
  GOAT_MILK: 'goat_milk',
  SHEEP_MILK: 'sheep_milk',
  EGGS: 'eggs',
  LIVE_ANIMAL: 'live_animal',
  MEAT_LIVEWEIGHT: 'meat_liveweight',
  WOOL: 'wool',
  MANURE: 'manure',
  GOAT_HAIR: 'goat_hair',
};

const PRODUCT_TYPE_VALUES = Object.values(PRODUCT_TYPES);

// Some product types are valid for sales but not for production records
const PRODUCTION_PRODUCT_TYPE_VALUES = PRODUCT_TYPE_VALUES.filter(v => v !== PRODUCT_TYPES.LIVE_ANIMAL);
const SALE_PRODUCT_TYPE_VALUES = PRODUCT_TYPE_VALUES;

/** Default measurement units per product type */
const PRODUCT_UNITS = {
  cow_milk: 'litres',
  buffalo_milk: 'litres',
  goat_milk: 'litres',
  sheep_milk: 'litres',
  eggs: 'units',
  live_animal: 'head',
  meat_liveweight: 'kg',
  wool: 'kg',
  manure: 'kg',
  goat_hair: 'kg',
};

/** Which species can produce which product types */
const SPECIES_PRODUCT_MAP = {
  cow:     ['cow_milk', 'manure'],
  buffalo: ['buffalo_milk', 'manure'],
  goat:    ['goat_milk', 'goat_hair', 'manure'],
  sheep:   ['sheep_milk', 'wool', 'manure'],
  chicken: ['eggs', 'manure'],
  pig:     ['manure'],
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
const MANUAL_ONLY_COMMODITIES = ['manure', 'wool', 'goat_hair', 'cow_milk', 'buffalo_milk', 'goat_milk', 'sheep_milk', 'horse'];

/** All valid market-price commodity keys */
const MARKET_COMMODITIES = [...AGMARKNET_COMMODITIES, ...MANUAL_ONLY_COMMODITIES];

/** Human-readable labels */
const MARKET_COMMODITY_LABELS = {
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

const GRANULARITY = ['day', 'week', 'month'];

module.exports = {
  PRODUCT_TYPES,
  PRODUCT_TYPE_VALUES,
  PRODUCTION_PRODUCT_TYPE_VALUES,
  SALE_PRODUCT_TYPE_VALUES,
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
