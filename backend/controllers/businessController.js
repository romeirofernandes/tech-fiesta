const BusinessProfile = require('../models/BusinessProfile');
const GstService = require('../services/gstService');
const Farmer = require('../models/Farmer');

const gstService = new GstService(process.env.APPYFLOW_KEY_SECRET);

/**
 * Verify GST number and create/update business profile
 * POST /api/business/verify-gst
 */
exports.verifyGST = async (req, res) => {
  try {
    const { farmerId, gstNumber, ownerName } = req.body;

    if (!farmerId || !gstNumber) {
      return res.status(400).json({ error: true, message: 'farmerId and gstNumber are required' });
    }

    // Check if farmer exists
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ error: true, message: 'Farmer not found' });
    }

    // Check if this GST is already registered to another farmer
    const existingBiz = await BusinessProfile.findOne({ gstNumber: gstNumber.toUpperCase().trim() });
    if (existingBiz && existingBiz.farmerId.toString() !== farmerId) {
      return res.status(409).json({ error: true, message: 'This GST number is already registered to another account' });
    }

    // Verify GST number
    const gstData = await gstService.verifyGST(gstNumber);

    const taxpayer = gstData.taxpayerInfo;
    if (!taxpayer) {
      return res.status(400).json({ error: true, message: 'Invalid GST number or no taxpayer information found' });
    }

    // Check if GST is active
    if (taxpayer.sts !== 'Active') {
      return res.status(400).json({ error: true, message: `GST registration is not active. Status: ${taxpayer.sts}` });
    }

    // Name matching validation — compare owner name with GST legal/trade name
    const nameToCheck = (ownerName || farmer.fullName || '').toLowerCase().trim();
    const gstLegalName = (taxpayer.lgnm || '').toLowerCase().trim();
    const gstTradeName = (taxpayer.tradeNam || '').toLowerCase().trim();

    // Check if the provided name is a reasonable match (substring or fuzzy)
    const nameMatches =
      gstLegalName.includes(nameToCheck) ||
      nameToCheck.includes(gstLegalName) ||
      gstTradeName.includes(nameToCheck) ||
      nameToCheck.includes(gstTradeName) ||
      // Also check individual words from the name
      nameToCheck.split(' ').some(word => word.length > 2 && (gstLegalName.includes(word) || gstTradeName.includes(word)));

    if (!nameMatches) {
      return res.status(400).json({
        error: true,
        message: "Business Verification failed - Name doesn't match. The name you provided does not match the GST registration records."
      });
    }

    const addr = taxpayer.pradr?.addr || {};

    // Create or update business profile
    const profileData = {
      farmerId,
      gstNumber: taxpayer.gstin,
      tradeName: taxpayer.tradeNam || '',
      legalName: taxpayer.lgnm || '',
      businessType: taxpayer.ctb || '',
      registrationDate: taxpayer.rgdt || '',
      gstStatus: taxpayer.sts || 'Active',
      address: {
        street: addr.st || '',
        building: addr.bno || '',
        locality: addr.loc || '',
        district: addr.dst || '',
        state: addr.stcd || '',
        pincode: addr.pncd || '',
        city: addr.city || ''
      },
      businessActivities: taxpayer.nba || [],
      verified: true,
      verifiedAt: new Date()
    };

    const profile = await BusinessProfile.findOneAndUpdate(
      { farmerId },
      profileData,
      { upsert: true, new: true }
    );

    // Update farmer to mark as business verified
    await Farmer.findByIdAndUpdate(farmerId, { isBusinessVerified: true });

    res.json({
      error: false,
      message: 'GST verified successfully',
      profile
    });

  } catch (error) {
    console.error('GST verification error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'GST verification failed' });
  }
};

/**
 * Get business profile for a farmer
 * GET /api/business/profile/:farmerId
 */
exports.getBusinessProfile = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const profile = await BusinessProfile.findOne({ farmerId }).populate('farmerId', 'fullName email phoneNumber');

    if (!profile) {
      return res.status(404).json({ error: true, message: 'No business profile found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

/**
 * Get GST filing details
 * GET /api/business/filing-details
 */
exports.getFilingDetails = async (req, res) => {
  try {
    const { gstNo, year } = req.query;
    if (!gstNo || !year) {
      return res.status(400).json({ error: true, message: 'gstNo and year are required' });
    }

    const data = await gstService.getFilingDetails(gstNo, year);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

/**
 * Get business dashboard summary
 * GET /api/business/dashboard/:farmerId
 */
exports.getBusinessDashboard = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const profile = await BusinessProfile.findOne({ farmerId });

    if (!profile) {
      return res.status(404).json({ error: true, message: 'No business profile found' });
    }

    // Get recent transactions where this farmer is the buyer (business purchases)
    const EscrowTransaction = require('../models/EscrowTransaction');
    const recentPurchases = await EscrowTransaction.find({
      buyerName: (await Farmer.findById(farmerId))?.fullName,
      status: { $in: ['completed', 'released_to_seller'] }
    }).sort({ createdAt: -1 }).limit(10).populate('itemId');

    // Get recent sales
    const recentSales = await EscrowTransaction.find({
      sellerId: farmerId,
      status: { $in: ['completed', 'released_to_seller'] }
    }).sort({ createdAt: -1 }).limit(10).populate('itemId');

    res.json({
      profile,
      recentPurchases,
      recentSales,
      stats: {
        walletBalance: profile.walletBalance,
        totalEarnings: profile.totalEarnings,
        totalPurchases: profile.totalPurchases,
        totalTransactions: recentPurchases.length + recentSales.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

/**
 * Update wallet balance (after payment completion)
 * POST /api/business/wallet/credit
 */
exports.creditWallet = async (req, res) => {
  try {
    const { farmerId, amount, description } = req.body;

    const profile = await BusinessProfile.findOneAndUpdate(
      { farmerId },
      {
        $inc: { walletBalance: amount, totalEarnings: amount > 0 ? amount : 0 }
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ error: true, message: 'Business profile not found' });
    }

    res.json({ error: false, message: 'Wallet credited', balance: profile.walletBalance });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};
