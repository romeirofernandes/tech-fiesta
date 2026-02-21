const MarketplaceItem = require('../models/MarketplaceItem');
const Animal = require('../models/Animal');
const ProductionRecord = require('../models/ProductionRecord');
const MarketPrice = require('../models/MarketPrice');
const { PRODUCT_UNITS } = require('../constants/biEnums');

/**
 * Map production product types to market commodity keys used in MarketPrice
 */
const PROD_TO_MARKET_COMMODITY = {
    cow_milk: 'cow_milk',
    buffalo_milk: 'buffalo_milk',
    goat_milk: 'goat_milk',
    sheep_milk: 'sheep_milk',
    eggs: 'egg',
    wool: 'wool',
    manure: 'manure',
    goat_hair: 'goat_hair',
    meat_liveweight: 'cow',
};

/**
 * Normalise a market price to per-unit (per kg / litre / piece).
 */
function normalisedPrice(mp) {
    if (!mp) return 0;
    const u = (mp.unit || '').toLowerCase();
    if (u.includes('quintal')) return mp.modalPrice / 100;
    if (u.includes('dozen')) return mp.modalPrice / 12;
    return mp.modalPrice;
}

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
            .populate('seller', 'fullName imageUrl isVerified phoneNumber')
            .populate('linkedAnimalId', 'species name imageUrl')
            .sort({ createdAt: -1 })
            .lean();

        // ── Enrich cattle items with production stats & potential earnings ──
        const cattleAnimalIds = items
            .filter(i => i.type === 'cattle' && i.linkedAnimalId?._id)
            .map(i => i.linkedAnimalId._id);

        if (cattleAnimalIds.length > 0) {
            // Aggregate total production per animal × product type
            const productionAgg = await ProductionRecord.aggregate([
                { $match: { animalId: { $in: cattleAnimalIds } } },
                {
                    $group: {
                        _id: { animalId: '$animalId', productType: '$productType' },
                        totalQuantity: { $sum: '$quantity' },
                        unit: { $first: '$unit' },
                    },
                },
            ]);

            // Collect unique commodities and batch-fetch latest market prices
            const commodityKeys = [
                ...new Set(
                    productionAgg
                        .map(p => PROD_TO_MARKET_COMMODITY[p._id.productType])
                        .filter(Boolean)
                ),
            ];

            const priceResults = await Promise.all(
                commodityKeys.map(async (commodity) => {
                    const price = await MarketPrice.findOne({ commodity })
                        .sort({ date: -1 })
                        .lean();
                    return { commodity, price };
                })
            );

            const priceMap = {};
            for (const { commodity, price } of priceResults) {
                if (price) priceMap[commodity] = price;
            }

            // Build per-animal production map
            const prodMap = {};
            for (const rec of productionAgg) {
                const aid = rec._id.animalId.toString();
                if (!prodMap[aid]) prodMap[aid] = { products: [], totalEarnings: 0 };

                const marketCommodity = PROD_TO_MARKET_COMMODITY[rec._id.productType];
                const mp = priceMap[marketCommodity];
                const perUnit = normalisedPrice(mp);
                const earnings = Math.round(rec.totalQuantity * perUnit);

                prodMap[aid].products.push({
                    productType: rec._id.productType,
                    totalQuantity: rec.totalQuantity,
                    unit: rec.unit || PRODUCT_UNITS[rec._id.productType] || 'units',
                    earnings,
                    pricePerUnit: perUnit,
                });
                prodMap[aid].totalEarnings += earnings;
            }

            // Attach to items
            for (const item of items) {
                if (item.type === 'cattle' && item.linkedAnimalId?._id) {
                    const aid = item.linkedAnimalId._id.toString();
                    item.productionStats = prodMap[aid] || { products: [], totalEarnings: 0 };
                }
            }
        }

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
            .populate('seller', 'fullName imageUrl isVerified phoneNumber');
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
