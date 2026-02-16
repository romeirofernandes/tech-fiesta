const Razorpay = require('razorpay');
const crypto = require('crypto');
const EscrowTransaction = require('../models/EscrowTransaction');
const MarketplaceItem = require('../models/MarketplaceItem');

// Initialize Razorpay (only if keys are configured)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

// 1. Create Order (Initialize Escrow)
exports.createOrder = async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({ message: 'Payment service not configured' });
        }
        const { itemId, amount, buyerName, destinationFarmId } = req.body;

        const item = await MarketplaceItem.findById(itemId);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (item.status !== 'available') return res.status(400).json({ message: 'Item is no longer available' });

        const options = {
            amount: amount * 100, // Amount in smallest currency unit (paise)
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);

        if (!order) return res.status(500).send("Some error occured");

        // Create DB Record
        const newTransaction = new EscrowTransaction({
            itemId,
            amount,
            buyerName,
            destinationFarmId, // Store where the animal should go
            sellerId: item.seller, // Store seller ID for easier querying
            razorpayOrderId: order.id,
            status: 'pending_payment',
            // Generate a simple 4-digit release code (internal use mostly now)
            releaseCode: Math.floor(1000 + Math.random() * 9000).toString()
        });

        await newTransaction.save();

        res.json(order);
    } catch (error) {
        res.status(500).send(error);
    }
};

// 2. Verify Payment (Mark as Held in Escrow)
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        } = req.body;

        // Verify Signature
        const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
        const digest = shasum.digest("hex");

        if (digest !== razorpaySignature) {
            return res.status(400).json({ msg: "Transaction not legit!" });
        }

        // Update Transaction Status
        const transaction = await EscrowTransaction.findOneAndUpdate(
            { razorpayOrderId },
            {
                razorpayPaymentId,
                razorpaySignature,
                status: 'held_in_escrow',
                updatedAt: Date.now()
            },
            { new: true }
        );

        // Mark Item as 'Process' or 'Sold' (depending on logic, maybe 'pending_delivery')
        if (transaction) {
            await MarketplaceItem.findByIdAndUpdate(transaction.itemId, { status: 'sold' });
            // Note: For rentals, logic might differ (e.g., 'rented')
        }

        res.json({
            msg: "Payment success! Funds held in Escrow.",
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            releaseCode: transaction.releaseCode // Send code to buyer
        });
    } catch (error) {
        res.status(500).send(error);
    }
};

// 3. Release Funds & Transfer Asset
// 3. Admin Release Funds (No Release Code Needed)
exports.releaseFunds = async (req, res) => {
    try {
        const { transactionId } = req.body;
        // In a real app, verify req.user.role === 'admin' here

        const transaction = await EscrowTransaction.findById(transactionId).populate('itemId');
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        if (transaction.status !== 'held_in_escrow') {
            return res.status(400).json({ message: 'Funds are not in escrow state' });
        }

        // Mark as released
        transaction.status = 'released_to_seller';
        transaction.updatedAt = Date.now();
        await transaction.save();

        // --- ASSET TRANSFER LOGIC ---
        // If the item is 'cattle' and we have a destination farm, move the animal
        if (transaction.itemId.type === 'cattle' && transaction.destinationFarmId && transaction.itemId.linkedAnimalId) {
            const Animal = require('../models/Animal');
            // Update the animal's farmId to the new owner's farm
            await Animal.findByIdAndUpdate(transaction.itemId.linkedAnimalId, {
                farmId: transaction.destinationFarmId,
                updatedAt: Date.now()
            });
            console.log(`Transferred Animal ${transaction.itemId.linkedAnimalId} to Farm ${transaction.destinationFarmId}`);
        }

        // Mark item as sold (already done in verify usually, but ensure consistency)
        await MarketplaceItem.findByIdAndUpdate(transaction.itemId._id, { status: 'sold' });

        res.json({ message: 'Funds released and Asset Transferred successfully!', status: 'released_to_seller' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Get My Orders (Buyer View)
exports.getMyOrders = async (req, res) => {
    try {
        const { buyerName } = req.query; // in real app, use req.user.id
        // Simple filter by buyerName since we used that in createOrder
        const orders = await EscrowTransaction.find({ buyerName }).populate('itemId').sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Get My Sales (Seller View)
// 5. Get My Sales (Seller View)
exports.getMySales = async (req, res) => {
    try {
        const { sellerId } = req.query;

        // Strategy 1: Find transactions where sellerId matches (Newer transactions)
        const directSales = await EscrowTransaction.find({
            sellerId: sellerId,
            status: { $in: ['held_in_escrow', 'released_to_seller'] }
        })
            .select('-releaseCode')
            .populate('itemId')
            .sort({ createdAt: -1 });

        // Strategy 2: Find items belonging to this seller (Legacy transactions support)
        // Only if we want to be exhaustive, but Strategy 1 is preferred going forward.
        // For now, let's merge or just return Strategy 1 as we are fixing the flow.
        // If we strictly need legacy support:
        const myItems = await MarketplaceItem.find({ seller: sellerId }).select('_id');
        const myItemIds = myItems.map(i => i._id);

        const indirectSales = await EscrowTransaction.find({
            itemId: { $in: myItemIds },
            sellerId: { $exists: false }, // Only get ones that didn't have sellerId saved
            status: { $in: ['held_in_escrow', 'released_to_seller'] }
        })
            .select('-releaseCode')
            .populate('itemId')
            .sort({ createdAt: -1 });

        const allSales = [...directSales, ...indirectSales];
        // Sort combined
        allSales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(allSales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 6. Admin: Get All Transactions
exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await EscrowTransaction.find().populate('itemId').sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};