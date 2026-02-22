const Farmer = require('../models/Farmer');
const AadhaarService = require('../services/aadhaarService');

const aadhaarService = new AadhaarService();

/**
 * Verify Aadhaar number for farmer
 * POST /api/farmer-verify/aadhaar
 */
exports.verifyAadhaar = async (req, res) => {
  try {
    const { farmerId, aadhaarNumber } = req.body;

    if (!farmerId || !aadhaarNumber) {
      return res.status(400).json({ error: true, message: 'farmerId and aadhaarNumber are required' });
    }

    // Validate Aadhaar format (12 digits)
    const cleanAadhaar = aadhaarNumber.replace(/\s/g, '');
    if (!/^\d{12}$/.test(cleanAadhaar)) {
      return res.status(400).json({ error: true, message: 'Invalid Aadhaar number. Must be 12 digits.' });
    }

    // Check if farmer exists
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ error: true, message: 'Farmer not found' });
    }

    // Check if Aadhaar is already used by another farmer
    const existingFarmer = await Farmer.findOne({ aadhaarNumber: cleanAadhaar });
    if (existingFarmer && existingFarmer._id.toString() !== farmerId) {
      return res.status(409).json({ error: true, message: 'This Aadhaar number is already registered to another account' });
    }

    // Verify with AgriStack
    const result = await aadhaarService.verifyAadhaar(cleanAadhaar);

    // Only mark as verified if the farmer is actually registered in AgriStack
    const isRegistered = result.registrationStatus && result.registrationStatus.toLowerCase() !== 'not registered';

    // Update farmer with Aadhaar info
    farmer.aadhaarNumber = cleanAadhaar;
    farmer.isAadhaarVerified = isRegistered;
    farmer.aadhaarVerifiedAt = isRegistered ? new Date() : null;
    await farmer.save();

    if (!isRegistered) {
      return res.json({
        error: false,
        message: 'Aadhaar lookup complete — farmer is not registered in AgriStack',
        data: {
          registrationStatus: result.registrationStatus,
          centralId: result.centralId,
          isVerified: false,
          farmer: {
            _id: farmer._id,
            fullName: farmer.fullName,
            isAadhaarVerified: false,
            aadhaarVerifiedAt: null
          }
        }
      });
    }

    res.json({
      error: false,
      message: 'Aadhaar verified successfully',
      data: {
        registrationStatus: result.registrationStatus,
        centralId: result.centralId,
        isVerified: true,
        farmer: {
          _id: farmer._id,
          fullName: farmer.fullName,
          isAadhaarVerified: true,
          aadhaarVerifiedAt: farmer.aadhaarVerifiedAt
        }
      }
    });

  } catch (error) {
    console.error('Aadhaar verification error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Aadhaar verification failed' });
  }
};

/**
 * Check if farmer has verified Aadhaar
 * GET /api/farmer-verify/status/:farmerId
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const farmer = await Farmer.findById(farmerId).select('fullName isAadhaarVerified aadhaarVerifiedAt aadhaarNumber');

    if (!farmer) {
      return res.status(404).json({ error: true, message: 'Farmer not found' });
    }

    res.json({
      error: false,
      data: {
        isAadhaarVerified: farmer.isAadhaarVerified || false,
        aadhaarVerifiedAt: farmer.aadhaarVerifiedAt,
        maskedAadhaar: farmer.aadhaarNumber
          ? `XXXX-XXXX-${farmer.aadhaarNumber.slice(-4)}`
          : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};
