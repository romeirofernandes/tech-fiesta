const MarketPrice = require('../models/MarketPrice');
const marketPriceImportService = require('../services/marketPriceImportService');

// Create (admin only)
exports.create = async (req, res) => {
  try {
    const { commodity, commodityLabel, modalPrice, minPrice, maxPrice, unit, market, state, district, variety, date, source, sourceUrl } = req.body;
    const mp = new MarketPrice({
      commodity,
      commodityLabel: commodityLabel || '',
      modalPrice,
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
      unit: unit || 'Rs./Quintal',
      market: market || '',
      state: state || '',
      district: district || '',
      variety: variety || '',
      date,
      source: source || 'manual',
      sourceUrl: sourceUrl || '',
    });
    await mp.save();
    res.status(201).json(mp);
  } catch (error) {
    console.error('Create market price error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// List (anyone authenticated)
exports.list = async (req, res) => {
  try {
    const { commodity, source, from, to, limit } = req.query;
    const filter = {};
    if (commodity) filter.commodity = commodity;
    if (source) filter.source = source;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const prices = await MarketPrice.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit) || 200);
    res.json(prices);
  } catch (error) {
    console.error('List market prices error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get by ID
exports.getById = async (req, res) => {
  try {
    const mp = await MarketPrice.findById(req.params.id);
    if (!mp) return res.status(404).json({ message: 'Not found' });
    res.json(mp);
  } catch (error) {
    console.error('Get market price error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update (admin only)
exports.update = async (req, res) => {
  try {
    const mp = await MarketPrice.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!mp) return res.status(404).json({ message: 'Not found' });
    res.json(mp);
  } catch (error) {
    console.error('Update market price error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// Delete (admin only)
exports.remove = async (req, res) => {
  try {
    const mp = await MarketPrice.findByIdAndDelete(req.params.id);
    if (!mp) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete market price error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Trigger import from AGMARKNET for a given commodity.
 * Query params: ?commodity=cow
 */
exports.importFromAgmarknet = async (req, res) => {
  try {
    const { commodity } = req.query;
    if (!commodity) {
      return res.status(400).json({ message: 'commodity query param required (e.g. cow, egg, goat)' });
    }
    const result = await marketPriceImportService.importPrices(commodity);
    res.json(result);
  } catch (error) {
    console.error('Import market prices error:', error);
    res.status(500).json({ message: error.message || 'Import failed' });
  }
};

/**
 * Trigger import from AGMARKNET for ALL supported commodities at once.
 */
exports.importAll = async (req, res) => {
  try {
    const result = await marketPriceImportService.importAll();
    res.json(result);
  } catch (error) {
    console.error('Import all market prices error:', error);
    res.status(500).json({ message: error.message || 'Import all failed' });
  }
};
