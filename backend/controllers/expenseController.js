const Expense = require('../models/Expense');

// Create
exports.create = async (req, res) => {
  try {
    const { farmId, animalId, category, amount, currency, description, date } = req.body;
    const expense = new Expense({
      farmId,
      animalId: animalId || null,
      category,
      amount,
      currency: currency || 'INR',
      description,
      date,
    });
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// List
exports.list = async (req, res) => {
  try {
    const { farmId, animalId, category, from, to } = req.query;
    const filter = {};
    if (farmId) filter.farmId = farmId;
    if (animalId) filter.animalId = animalId;
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const expenses = await Expense.find(filter)
      .populate('animalId', 'name rfid species')
      .populate('farmId', 'name')
      .sort({ date: -1 })
      .limit(Number(req.query.limit) || 500);
    res.json(expenses);
  } catch (error) {
    console.error('List expenses error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get by ID
exports.getById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('animalId', 'name rfid species')
      .populate('farmId', 'name');
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update
exports.update = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// Delete
exports.remove = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
