const BusinessOwner = require('../models/BusinessOwner');
const GstService = require('../services/gstService');
const jwt = require('jsonwebtoken');

const gstService = new GstService(process.env.APPYFLOW_KEY_SECRET);
const JWT_SECRET = process.env.JWT_SECRET || 'pashu-pehchan-biz-secret-key';

/**
 * Register a new business owner (with GST verification during signup)
 * POST /api/biz-auth/register
 */
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, gstNumber, phoneNumber } = req.body;

    if (!fullName || !email || !password || !gstNumber) {
      return res.status(400).json({ error: true, message: 'fullName, email, password, and gstNumber are required' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: true, message: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: true, message: 'Password must be at least 6 characters' });
    }

    // Validate GST format
    const cleanGST = gstNumber.toUpperCase().trim();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGST)) {
      return res.status(400).json({ error: true, message: 'Invalid GST number format' });
    }

    // Check if email already exists
    const existingEmail = await BusinessOwner.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({ error: true, message: 'Email is already registered' });
    }

    // Check if GST already exists
    const existingGST = await BusinessOwner.findOne({ gstNumber: cleanGST });
    if (existingGST) {
      return res.status(409).json({ error: true, message: 'This GST number is already registered' });
    }

    // Verify GST number with external API
    let gstData;
    try {
      gstData = await gstService.verifyGST(cleanGST);
    } catch (gstErr) {
      return res.status(400).json({ error: true, message: 'GST verification failed: ' + (gstErr.message || 'Unknown error') });
    }

    const taxpayer = gstData.taxpayerInfo;
    if (!taxpayer) {
      return res.status(400).json({ error: true, message: 'Invalid GST number or no taxpayer information found' });
    }

    if (taxpayer.sts !== 'Active') {
      return res.status(400).json({ error: true, message: `GST registration is not active. Status: ${taxpayer.sts}` });
    }

    // Name matching — compare provided name with GST legal/trade name
    const nameToCheck = fullName.toLowerCase().trim();
    const gstLegalName = (taxpayer.lgnm || '').toLowerCase().trim();
    const gstTradeName = (taxpayer.tradeNam || '').toLowerCase().trim();

    const nameMatches =
      gstLegalName.includes(nameToCheck) ||
      nameToCheck.includes(gstLegalName) ||
      gstTradeName.includes(nameToCheck) ||
      nameToCheck.includes(gstTradeName) ||
      nameToCheck.split(' ').some(word => word.length > 2 && (gstLegalName.includes(word) || gstTradeName.includes(word)));

    if (!nameMatches) {
      return res.status(400).json({
        error: true,
        message: "Business Verification failed - Name doesn't match. The name you provided does not match the GST registration records."
      });
    }

    const addr = taxpayer.pradr?.addr || {};

    // Create the business owner
    const owner = new BusinessOwner({
      fullName,
      email: email.toLowerCase().trim(),
      password,
      phoneNumber: phoneNumber || undefined,
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
      isGstVerified: true,
      verifiedAt: new Date()
    });

    await owner.save();

    // Generate JWT token
    const token = jwt.sign({ id: owner._id, type: 'business' }, JWT_SECRET, { expiresIn: '30d' });

    // Return owner data (without password)
    const ownerObj = owner.toObject();
    delete ownerObj.password;

    res.status(201).json({
      error: false,
      message: 'Business account created successfully',
      token,
      owner: ownerObj
    });

  } catch (error) {
    console.error('Business registration error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Registration failed' });
  }
};

/**
 * Login a business owner
 * POST /api/biz-auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: true, message: 'Email and password are required' });
    }

    const owner = await BusinessOwner.findOne({ email: email.toLowerCase().trim() });
    if (!owner) {
      return res.status(401).json({ error: true, message: 'Invalid email or password' });
    }

    const isMatch = await owner.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: true, message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: owner._id, type: 'business' }, JWT_SECRET, { expiresIn: '30d' });

    const ownerObj = owner.toObject();
    delete ownerObj.password;

    res.json({
      error: false,
      message: 'Login successful',
      token,
      owner: ownerObj
    });

  } catch (error) {
    console.error('Business login error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Login failed' });
  }
};

/**
 * Get current business owner profile (by token)
 * GET /api/biz-auth/me
 */
exports.getMe = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: true, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const owner = await BusinessOwner.findById(decoded.id).select('-password');

    if (!owner) {
      return res.status(404).json({ error: true, message: 'Business owner not found' });
    }

    res.json({ error: false, owner });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: true, message: 'Invalid or expired token' });
    }
    res.status(500).json({ error: true, message: error.message });
  }
};

/**
 * Get business owner dashboard
 * GET /api/biz-auth/dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: true, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const owner = await BusinessOwner.findById(decoded.id).select('-password');

    if (!owner) {
      return res.status(404).json({ error: true, message: 'Business owner not found' });
    }

    // Get recent transactions
    const EscrowTransaction = require('../models/EscrowTransaction');

    const recentPurchases = await EscrowTransaction.find({
      buyerName: owner.fullName,
      status: { $in: ['completed', 'released_to_seller'] }
    }).sort({ createdAt: -1 }).limit(10).populate('itemId');

    const recentSales = await EscrowTransaction.find({
      sellerId: owner._id,
      status: { $in: ['completed', 'released_to_seller'] }
    }).sort({ createdAt: -1 }).limit(10).populate('itemId');

    res.json({
      error: false,
      owner,
      recentPurchases,
      recentSales,
      stats: {
        walletBalance: owner.walletBalance,
        totalEarnings: owner.totalEarnings,
        totalPurchases: owner.totalPurchases,
        totalTransactions: recentPurchases.length + recentSales.length
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: true, message: 'Invalid or expired token' });
    }
    res.status(500).json({ error: true, message: error.message });
  }
};
