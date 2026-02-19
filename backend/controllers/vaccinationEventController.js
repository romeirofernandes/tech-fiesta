const VaccinationEvent = require('../models/VaccinationEvent');
const Animal = require('../models/Animal');
const Farmer = require('../models/Farmer');
const Alert = require('../models/Alert');
const cloudinary = require('../config/cloudinary');
const { extractVaccinationInfo } = require('../services/geminiVaccinationService');
const blockchainService = require('../services/blockchainService');

/**
 * Upload a vaccination certificate image, extract info via Gemini,
 * and return pre-filled form data for the frontend.
 * POST /api/vaccination-events/extract-certificate
 */
exports.extractCertificate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // 1. Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'vaccination-certificates',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const certificateUrl = uploadResult.secure_url;
    console.log('[VaccinationCtrl] Uploaded certificate:', certificateUrl);

    // 2. Extract info with Gemini
    let extractedData = {};
    try {
      extractedData = await extractVaccinationInfo(req.file.buffer, req.file.mimetype);
      console.log('[VaccinationCtrl] Gemini extraction:', extractedData);
    } catch (err) {
      console.error('[VaccinationCtrl] Gemini extraction failed:', err.message);
      // Continue — the farmer can still fill manually
    }

    res.status(200).json({
      certificateUrl,
      extractedData,
    });
  } catch (error) {
    console.error('[VaccinationCtrl] Certificate extraction error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.createVaccinationEvent = async (req, res) => {
  try {
    const { animalId, vaccineName, eventType, date, notes, repeatsEvery, certificateUrl, extractedData } = req.body;
    
    const vaccinationEvent = await VaccinationEvent.create({
      animalId,
      vaccineName,
      eventType,
      date,
      notes,
      repeatsEvery,
      certificateUrl: certificateUrl || null,
      extractedData: extractedData || null,
    });

    // 3. If certificate was uploaded, write to blockchain
    if (certificateUrl) {
      try {
        // Look up animal RFID and farmer info
        const animal = await Animal.findById(animalId).populate('farmId');
        let farmer = null;
        if (animal && animal.farmId) {
          farmer = await Farmer.findOne({ farms: animal.farmId._id });
        }

        const blockchainResult = await blockchainService.addVaccinationRecord({
          rfid: animal?.rfid || 'UNKNOWN',
          farmerId: farmer?._id?.toString() || 'UNKNOWN',
          farmerName: farmer?.fullName || 'UNKNOWN',
          vaccineName,
          certificateUrl,
        });

        // Save blockchain proof back to the event
        vaccinationEvent.blockchain = blockchainResult;
        await vaccinationEvent.save();

        console.log('[VaccinationCtrl] Blockchain record added:', blockchainResult.txHash);
      } catch (bcErr) {
        console.error('[VaccinationCtrl] Blockchain write failed (event still saved):', bcErr.message);
        // Non-fatal — the event is saved in MongoDB even if blockchain fails
      }
    }

    res.status(201).json(vaccinationEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getVaccinationEvents = async (req, res) => {
  try {
    const { animalId, eventType, farmerId } = req.query;

    // Auto-detect missed vaccinations before returning
    const now = new Date();
    const missedFilter = { eventType: 'scheduled', date: { $lt: now } };
    if (animalId) missedFilter.animalId = animalId;
    await VaccinationEvent.updateMany(missedFilter, { $set: { eventType: 'missed' } });
    
    const filter = {};
    if (farmerId) {
      const farmer = await Farmer.findById(farmerId);
      if (farmer && farmer.farms && farmer.farms.length > 0) {
        const animals = await Animal.find({ farmId: { $in: farmer.farms } }).select('_id');
        const animalIds = animals.map(a => a._id);
        filter.animalId = { $in: animalIds };
      } else {
        filter.animalId = { $in: [] };
      }
    }
    if (animalId) filter.animalId = animalId;
    if (eventType) filter.eventType = eventType;

    const events = await VaccinationEvent.find(filter)
      .populate('animalId', 'name rfid species')
      .sort({ date: -1 });
    
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateVaccinationEvent = async (req, res) => {
  try {
    const { vaccineName, eventType, date, notes, repeatsEvery } = req.body;
    const event = await VaccinationEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Vaccination event not found' });
    }

    if (vaccineName) event.vaccineName = vaccineName;
    if (eventType) event.eventType = eventType;
    if (date) event.date = date;
    if (notes !== undefined) event.notes = notes;
    if (repeatsEvery !== undefined) event.repeatsEvery = repeatsEvery;

    await event.save();
    res.status(200).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteVaccinationEvent = async (req, res) => {
  try {
    const event = await VaccinationEvent.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Vaccination event not found' });
    }

    await event.deleteOne();
    res.status(200).json({ message: 'Vaccination event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Resolve a vaccination event — marks it as 'administered' and resolves any matching alert.
 * PUT /api/vaccination-events/:id/resolve
 */
exports.resolveVaccinationEvent = async (req, res) => {
  try {
    const event = await VaccinationEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Vaccination event not found' });
    }

    // Mark vaccination as administered
    event.eventType = 'administered';
    event.date = new Date();
    await event.save();

    // Find and resolve any matching alert for this vaccination
    const matchingAlerts = await Alert.find({
      animalId: event.animalId,
      type: 'vaccination',
      isResolved: false,
      message: { $regex: event.vaccineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    });

    for (const alert of matchingAlerts) {
      alert.isResolved = true;
      alert.resolvedAt = new Date();
      await alert.save();
    }

    res.status(200).json({
      event,
      resolvedAlerts: matchingAlerts.length
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Get blockchain vaccination records for an animal RFID.
 * GET /api/vaccination-events/blockchain/:rfid
 */
exports.getBlockchainRecords = async (req, res) => {
  try {
    const records = await blockchainService.getRecordsByRfid(req.params.rfid);
    res.status(200).json(records);
  } catch (error) {
    console.error('[VaccinationCtrl] Blockchain read error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all blockchain records with pagination.
 * GET /api/vaccination-events/blockchain-records?page=1&limit=10
 */
exports.getAllBlockchainRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const data = await blockchainService.getAllRecordsPaginated(page, limit);
    res.status(200).json(data);
  } catch (error) {
    console.error('[VaccinationCtrl] Blockchain paginated read error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get blockchain wallet info (diagnostics).
 * GET /api/vaccination-events/blockchain-status
 */
exports.getBlockchainStatus = async (req, res) => {
  try {
    const info = await blockchainService.getWalletInfo();
    res.status(200).json(info);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};