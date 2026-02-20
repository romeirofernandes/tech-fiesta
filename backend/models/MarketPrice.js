const mongoose = require('mongoose');
const { MARKET_COMMODITIES } = require('../constants/biEnums');

const marketPriceSchema = new mongoose.Schema({
  commodity: {
    type: String,
    required: true,
    enum: MARKET_COMMODITIES,
    index: true
  },
  /** AGMARKNET commodity name (e.g. "Milk", "Egg") or custom label */
  commodityLabel: {
    type: String,
    default: ''
  },
  /** The modal/typical price from AGMARKNET or admin input */
  modalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  minPrice: {
    type: Number,
    default: null
  },
  maxPrice: {
    type: Number,
    default: null
  },
  unit: {
    type: String,
    required: true,
    default: 'Rs./Quintal'
  },
  market: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  district: {
    type: String,
    default: ''
  },
  variety: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  /** 'agmarknet' | 'manual' */
  source: {
    type: String,
    required: true,
    enum: ['agmarknet', 'manual'],
    default: 'manual'
  },
  sourceUrl: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

marketPriceSchema.index({ commodity: 1, date: -1 });
marketPriceSchema.index({ source: 1 });
marketPriceSchema.index({ commodity: 1, source: 1, date: 1, market: 1 });

marketPriceSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
