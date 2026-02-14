const mongoose = require('mongoose');
const { EXPENSE_CATEGORY_VALUES } = require('../constants/biEnums');

const expenseSchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
    index: true
  },
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    default: null
  },
  category: {
    type: String,
    required: true,
    enum: EXPENSE_CATEGORY_VALUES
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: true,
    index: true
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

expenseSchema.index({ farmId: 1, date: -1 });
expenseSchema.index({ farmId: 1, category: 1 });

expenseSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Expense', expenseSchema);
