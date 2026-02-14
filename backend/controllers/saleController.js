const SaleTransaction = require('../models/SaleTransaction');

// Create
exports.create = async (req, res) => {
  try {
    const { farmId, productType, quantity, unit, pricePerUnit, totalAmount, currency, buyerName, date, notes } = req.body;
    const sale = new SaleTransaction({
      farmId,
      productType,
      quantity,
      unit,
      pricePerUnit,
      totalAmount: totalAmount || quantity * pricePerUnit,
      currency: currency || 'INR',
      buyerName,
      date,
      notes,
    });
    await sale.save();
    res.status(201).json(sale);
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// List
exports.list = async (req, res) => {
  try {
    const { farmId, productType, from, to } = req.query;
    const filter = {};
    if (farmId) filter.farmId = farmId;
    if (productType) filter.productType = productType;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const sales = await SaleTransaction.find(filter)
      .populate('farmId', 'name')
      .sort({ date: -1 })
      .limit(Number(req.query.limit) || 500);
    res.json(sales);
  } catch (error) {
    console.error('List sales error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get by ID
exports.getById = async (req, res) => {
  try {
    const sale = await SaleTransaction.findById(req.params.id).populate('farmId', 'name');
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json(sale);
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update
exports.update = async (req, res) => {
  try {
    const body = { ...req.body, updatedAt: Date.now() };
    if (body.quantity && body.pricePerUnit && !body.totalAmount) {
      body.totalAmount = body.quantity * body.pricePerUnit;
    }
    const sale = await SaleTransaction.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    );
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json(sale);
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// Delete
exports.remove = async (req, res) => {
  try {
    const sale = await SaleTransaction.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
