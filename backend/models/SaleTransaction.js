const mongoose = require('mongoose');
const { PRODUCT_TYPE_VALUES, PRODUCT_UNITS } = require('../constants/biEnums');

const saleTransactionSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
    index: true
  },
  productType: {
    type: String,
    required: true,
    enum: PRODUCT_TYPE_VALUES
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
  pricePerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  buyerName: {
    type: String,
    default: ''
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

saleTransactionSchema.index({ farmId: 1, date: -1 });
saleTransactionSchema.index({ farmId: 1, productType: 1 });

saleTransactionSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('SaleTransaction', saleTransactionSchema);
