const Alert = require('../models/Alert');
const VaccinationEvent = require('../models/VaccinationEvent');
const Animal = require('../models/Animal');
const Farmer = require('../models/Farmer');
const AnimalGpsPath = require('../models/AnimalGpsPath');
const Farm = require('../models/Farm');
// Notifications are sent via the Alert post-save hook — no direct imports needed here

/**
 * Haversine distance in meters between two lat/lng points
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check for animals straying outside farm boundaries and auto-create geofence alerts.
 * Called before fetching alerts to ensure they're up-to-date.
 */
async function checkAnimalStraying(farmerFarmIds) {
  try {
    if (!farmerFarmIds || farmerFarmIds.length === 0) return;

    const farms = await Farm.find({
      _id: { $in: farmerFarmIds },
      'coordinates.lat': { $ne: null },
      'coordinates.lng': { $ne: null }
    });

    for (const farm of farms) {
      const paths = await AnimalGpsPath.find({ farmId: farm._id })
        .populate('animalId', 'name rfid');

      if (paths.length === 0) continue;

      const radius = farm.herdWatchRadius || 300;
      const farmLat = farm.coordinates.lat;
      const farmLng = farm.coordinates.lng;

      for (const path of paths) {
        if (!path.animalId || !path.waypoints || path.waypoints.length === 0) continue;

        const lastWp = path.waypoints[path.waypoints.length - 1];
        const dist = haversineDistance(farmLat, farmLng, lastWp.lat, lastWp.lng);
        const animalName = path.animalId.name || 'Unknown';
        const animalIdVal = path.animalId._id || path.animalId;

        if (dist > radius) {
          // Animal is OUTSIDE the boundary
          const existingAlert = await Alert.findOne({
            animalId: animalIdVal,
            type: 'geofence',
            isResolved: false,
          });

          if (existingAlert) {
            // Use findByIdAndUpdate to bypass the post-save hook (no re-notification)
            await Alert.findByIdAndUpdate(existingAlert._id, {
              $set: {
                message: `${animalName} has strayed ${Math.round(dist)}m from ${farm.name} (boundary: ${radius}m)`,
                createdAt: new Date()
              }
            });
          } else {
            // Alert.create triggers post-save hook which sends all notifications
            await Alert.create({
              animalId: animalIdVal,
              type: 'geofence',
              severity: 'high',
              message: `${animalName} has strayed ${Math.round(dist)}m from ${farm.name} (boundary: ${radius}m)`
            });
          }
        } else {
          // Animal is INSIDE the boundary — auto-resolve any open geofence alerts
          await Alert.updateMany(
            {
              animalId: animalIdVal,
              type: 'geofence',
              isResolved: false,
            },
            {
              $set: {
                isResolved: true,
                resolvedAt: new Date(),
                resolvedBy: 'system',
                resolutionNotes: 'Auto-resolved: animal returned within boundary',
              },
            }
          );
        }
      }
    }
  } catch (err) {
    console.error('Animal straying check failed:', err);
  }
}

/**
 * Check for missed vaccinations and auto-create alerts.
 * Called before fetching alerts to ensure they're up-to-date.
 */
async function checkMissedVaccinations() {
    const now = new Date();
    // Find all overdue scheduled vaccination events
    const overdueEvents = await VaccinationEvent.find({
        eventType: 'scheduled',
        date: { $lt: now }
    }).populate('animalId', 'name rfid');

    if (overdueEvents.length === 0) return;

    // Batch update to 'missed'
    const overdueIds = overdueEvents.map(e => e._id);
    await VaccinationEvent.updateMany(
        { _id: { $in: overdueIds } },
        { $set: { eventType: 'missed' } }
    );

    // Create alerts for each new missed vaccination
    for (const event of overdueEvents) {
        if (!event.animalId) continue;
        
        const animalIdVal = event.animalId._id || event.animalId;
        const message = `Missed vaccination: ${event.vaccineName} was due on ${event.date.toLocaleDateString()}`;
        
        const existingAlert = await Alert.findOne({
            animalId: animalIdVal,
            type: 'vaccination',
            message: { $regex: event.vaccineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
            isResolved: false
        });

        if (!existingAlert) {
            const daysPastDue = Math.floor((now - event.date) / (1000 * 60 * 60 * 24));
            // Alert.create triggers post-save hook which sends all notifications
            await Alert.create({
                animalId: animalIdVal,
                type: 'vaccination',
                severity: daysPastDue > 30 ? 'high' : 'medium',
                message
            });
        }
    }
}

exports.createAlert = async (req, res) => {
  try {
    const { animalId, type, severity, message } = req.body;
    
    const alert = await Alert.create({
      animalId,
      type,
      severity,
      message
    });

    // Alert.create triggers post-save hook which sends all notifications once
    res.status(201).json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    // Auto-detect missed vaccinations and create alerts before fetching
    try {
      await checkMissedVaccinations();
    } catch (err) {
      console.error('Missed vaccination check failed:', err);
    }

    const { animalId, type, severity, isResolved, search, startDate, endDate, page, limit, farmerId } = req.query;
    
    const filter = {};

    // Filter by farmer
    let farmerFarmIds = [];
    if (farmerId) {
      const farmer = await Farmer.findById(farmerId);
      if (farmer && farmer.farms && farmer.farms.length > 0) {
        farmerFarmIds = farmer.farms.map(id => id.toString());
        const animals = await Animal.find({ farmId: { $in: farmer.farms } }).select('_id');
        const animalIds = animals.map(a => a._id);
        filter.animalId = { $in: animalIds };
      } else {
        filter.animalId = { $in: [] };
      }
    }

    // Auto-detect straying animals and create geofence alerts
    try {
      if (farmerFarmIds.length > 0) {
        await checkAnimalStraying(farmerFarmIds);
      }
    } catch (err) {
      console.error('Straying check failed:', err);
    }
    if (animalId) filter.animalId = animalId;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (isResolved !== undefined) filter.isResolved = isResolved === 'true';
    if (search) filter.message = { $regex: search, $options: 'i' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // If pagination params provided, return paginated response
    if (page || limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [alerts, total] = await Promise.all([
        Alert.find(filter)
          .populate({
            path: 'animalId',
            select: 'name rfid species farmId',
            populate: { path: 'farmId', select: 'name' }
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Alert.countDocuments(filter)
      ]);

      return res.status(200).json({
        alerts,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    // Non-paginated (backward-compatible)
    const alerts = await Alert.find(filter)
      .populate({
        path: 'animalId',
        select: 'name rfid species farmId',
        populate: { path: 'farmId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.isResolved = true;
    alert.resolvedAt = new Date();
    await alert.save();

    // If this is a vaccination alert, also mark the corresponding vaccination event as administered
    if (alert.type === 'vaccination' && alert.animalId) {
      // Extract vaccine name from alert message like "Missed vaccination: PPR - PPR Vaccine was due on ..."
      const vaccMatch = alert.message.match(/Missed vaccination:\s*(.+?)\s*was due on/i);
      if (vaccMatch) {
        const vaccineName = vaccMatch[1].trim();
        await VaccinationEvent.updateMany(
          {
            animalId: alert.animalId,
            vaccineName: { $regex: vaccineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
            eventType: 'missed'
          },
          { $set: { eventType: 'administered', date: new Date() } }
        );
      }
    }

    res.status(200).json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.deleteOne();
    res.status(200).json({ message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};