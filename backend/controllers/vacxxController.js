const Vacxx = require('../models/Vacxx');

// @desc    Create a new vaccination schedule
// @route   POST /api/vacxx
// @access  Public
const createVacxx = async (req, res) => {
  try {
    const vacxx = await Vacxx.create(req.body);
    res.status(201).json(vacxx);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all vaccination schedules
// @route   GET /api/vacxx
// @access  Public
const getVacxx = async (req, res) => {
  try {
    const vacxxs = await Vacxx.find();
    res.status(200).json(vacxxs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createVacxx,
  getVacxx,
};
