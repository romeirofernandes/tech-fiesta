const mongoose = require('mongoose');
const { PRODUCTION_PRODUCT_TYPE_VALUES, PRODUCT_UNITS } = require('../constants/biEnums');

const productionRecordSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
    index: true
  },
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true,
    index: true
  },
  productType: {
    type: String,
    required: true,
    enum: PRODUCTION_PRODUCT_TYPE_VALUES
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    default: function () {
      return PRODUCT_UNITS[this.productType] || 'units';
    }
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  notes: {
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

productionRecordSchema.index({ farmId: 1, date: -1 });
productionRecordSchema.index({ animalId: 1, productType: 1, date: -1 });

productionRecordSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('ProductionRecord', productionRecordSchema);
