const ProductionRecord = require('../models/ProductionRecord');
const { PRODUCT_UNITS } = require('../constants/biEnums');

// Create
exports.create = async (req, res) => {
  try {
    const { farmId, animalId, productType, quantity, unit, date, notes } = req.body;
    const record = new ProductionRecord({
      farmId,
      animalId,
      productType,
      quantity,
      unit: unit || PRODUCT_UNITS[productType] || 'units',
      date,
      notes,
    });
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error('Create production record error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// List (with optional filters)
exports.list = async (req, res) => {
  try {
    const { farmId, animalId, productType, from, to } = req.query;
    const filter = {};
    if (farmId) filter.farmId = farmId;
    if (animalId) filter.animalId = animalId;
    if (productType) filter.productType = productType;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const records = await ProductionRecord.find(filter)
      .populate('animalId', 'name rfid species')
      .populate('farmId', 'name')
      .sort({ date: -1 })
      .limit(Number(req.query.limit) || 500);
    res.json(records);
  } catch (error) {
    console.error('List production records error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get by ID
exports.getById = async (req, res) => {
  try {
    const record = await ProductionRecord.findById(req.params.id)
      .populate('animalId', 'name rfid species')
      .populate('farmId', 'name');
    if (!record) return res.status(404).json({ message: 'Not found' });
    res.json(record);
  } catch (error) {
    console.error('Get production record error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update
exports.update = async (req, res) => {
  try {
    const record = await ProductionRecord.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ message: 'Not found' });
    res.json(record);
  } catch (error) {
    console.error('Update production record error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// Delete
exports.remove = async (req, res) => {
  try {
    const record = await ProductionRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete production record error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
