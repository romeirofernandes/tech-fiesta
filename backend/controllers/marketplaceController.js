const MarketplaceItem = require('../models/MarketplaceItem');
const Animal = require('../models/Animal');

// Get all items with optional filters
exports.getItems = async (req, res) => {
    try {
        const { type, location } = req.query;
        let query = { status: 'available' };

        if (type && type !== 'all') {
            query.type = type;
        }

        if (location) {
            // Simple case-insensitive regex for location search
            query.location = { $regex: location, $options: 'i' };
        }

        const items = await MarketplaceItem.find(query)
            .populate('seller', 'fullName imageUrl isVerified')
            .sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single item
exports.getItemById = async (req, res) => {
    try {
        const item = await MarketplaceItem.findById(req.params.id)
            .populate('linkedAnimalId')
            .populate('seller', 'fullName imageUrl isVerified');
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create new item
exports.createItem = async (req, res) => {
    try {
        const newItem = new MarketplaceItem(req.body);
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Mark item as sold/rented
exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const item = await MarketplaceItem.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(item);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
