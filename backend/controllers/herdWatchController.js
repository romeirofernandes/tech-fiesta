const AnimalGpsPath = require('../models/AnimalGpsPath');
const Farm = require('../models/Farm');
const Farmer = require('../models/Farmer');
const Animal = require('../models/Animal');

/**
 * Haversine distance in meters between two lat/lng points
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
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
 * GET /api/herd-watch/farms?farmerId=...
 * Returns only this farmer's farms that have coordinates set
 */
exports.getFarmsForHerdWatch = async (req, res) => {
  try {
    const { farmerId } = req.query;

    if (!farmerId) {
      return res.status(400).json({ message: 'farmerId is required' });
    }

    const farmer = await Farmer.findById(farmerId).select('farms');
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    const farmIds = farmer.farms.map(id => id.toString());

    // Get farms that belong to this farmer AND have coordinates set
    const farms = await Farm.find({
      _id: { $in: farmIds },
      'coordinates.lat': { $ne: null },
      'coordinates.lng': { $ne: null }
    }).sort({ createdAt: -1 });

    // For each farm, attach the animal count
    const farmsWithCounts = await Promise.all(
      farms.map(async (farm) => {
        const animalCount = await Animal.countDocuments({ farmId: farm._id });
        return {
          ...farm.toObject(),
          animalCount
        };
      })
    );

    res.status(200).json(farmsWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/**
 * GET /api/herd-watch/:farmId/paths?farmerId=...
 * Returns all AnimalGpsPath docs for the farm, with animal data populated.
 * Verifies the farm belongs to the requesting farmer.
 * Also re-checks isStraying based on current farm radius.
 */
exports.getAnimalPaths = async (req, res) => {
  try {
    const { farmId } = req.params;
    const { farmerId } = req.query;

    if (!farmerId) {
      return res.status(400).json({ message: 'farmerId is required' });
    }

    // Verify ownership
    const farmer = await Farmer.findById(farmerId).select('farms');
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    const farmerFarmIds = farmer.farms.map(id => id.toString());
    if (!farmerFarmIds.includes(farmId)) {
      return res.status(403).json({ message: 'Forbidden: This farm does not belong to you' });
    }

    const farm = await Farm.findById(farmId);
    if (!farm || !farm.coordinates || farm.coordinates.lat == null) {
      return res.status(404).json({ message: 'Farm not found or has no coordinates' });
    }

    // Fetch paths with animal data
    const paths = await AnimalGpsPath.find({ farmId })
      .populate('animalId', 'name species rfid breed')
      .sort({ 'animalId.name': 1 });

    // Re-check straying status based on current farm radius
    const farmLat = farm.coordinates.lat;
    const farmLng = farm.coordinates.lng;
    const radius = farm.herdWatchRadius || 300;

    const enrichedPaths = paths.map(path => {
      const p = path.toObject();
      if (p.waypoints && p.waypoints.length > 0) {
        const lastWp = p.waypoints[p.waypoints.length - 1];
        const dist = haversineDistance(farmLat, farmLng, lastWp.lat, lastWp.lng);
        p.isStraying = dist > radius;
        p.distanceFromFarm = Math.round(dist);
      }
      return p;
    });

    res.status(200).json({
      farm: {
        _id: farm._id,
        name: farm.name,
        location: farm.location,
        coordinates: farm.coordinates,
        herdWatchRadius: radius,
        imageUrl: farm.imageUrl
      },
      paths: enrichedPaths
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
