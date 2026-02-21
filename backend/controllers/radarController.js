const RadarReading = require('../models/RadarReading');
const MovementAlert = require('../models/MovementAlert');

// ── In-memory live radar store (no DB writes) ────────────────
// Keyed by angle so latest reading per angle is always kept
const liveRadarStore = new Map(); // angle → { angle, distance, timestamp }
const GEOFENCE_THRESHOLD = 30; // cm

// POST /api/radar/live — called by radarBridge for every reading
exports.postLiveReading = (req, res) => {
  const { angle, distance, deviceId } = req.body;
  if (angle === undefined || distance === undefined) {
    return res.status(400).json({ message: 'angle and distance required' });
  }
  updateRadarHeartbeat();
  liveRadarStore.set(angle, {
    angle,
    distance,
    alert: distance < GEOFENCE_THRESHOLD && distance > 0,
    timestamp: Date.now()
  });
  res.json({ ok: true });
};

// GET /api/radar/live — polled by frontend
exports.getLiveReadings = (req, res) => {
  const readings = Array.from(liveRadarStore.values())
    .sort((a, b) => a.angle - b.angle);
  res.json({
    readings,
    isConnected: isRadarConnected(),
    threshold: GEOFENCE_THRESHOLD
  });
};
// ─────────────────────────────────────────────────────────────

// Radar device status tracking
const radarDeviceStatus = {
  lastHeartbeat: null,
  isConnected: false,
  deviceId: 'radar_01',
  connectionTimeout: 15000 // 15 seconds without heartbeat = disconnected
};

// Check if radar device is connected
function isRadarConnected() {
  if (!radarDeviceStatus.lastHeartbeat) return false;
  const timeSinceHeartbeat = Date.now() - radarDeviceStatus.lastHeartbeat;
  return timeSinceHeartbeat < radarDeviceStatus.connectionTimeout;
}

// Update radar heartbeat
function updateRadarHeartbeat() {
  radarDeviceStatus.lastHeartbeat = Date.now();
  radarDeviceStatus.isConnected = true;
}

// GET /api/radar/status - Get radar device connection status
exports.getRadarStatus = () => {
  const status = {
    isConnected: isRadarConnected(),
    lastHeartbeat: radarDeviceStatus.lastHeartbeat,
    deviceId: radarDeviceStatus.deviceId,
    status: isRadarConnected() ? 'connected' : 'disconnected'
  };
  return status;
};

// POST /api/radar/heartbeat - Receive heartbeat from radar device
exports.heartbeat = (req, res) => {
  updateRadarHeartbeat();
  res.json({ 
    success: true, 
    timestamp: radarDeviceStatus.lastHeartbeat,
    isConnected: true 
  });
};

// POST /api/radar/reading - Store radar sweep data
exports.createReading = async (req, res) => {
  try {
    const { deviceId, angle, distance, location } = req.body;
    
    // Update heartbeat on data reception
    updateRadarHeartbeat();
    
    if (angle === undefined || distance === undefined) {
      return res.status(400).json({ message: 'angle and distance are required' });
    }

    const reading = new RadarReading({
      deviceId: deviceId || 'radar_01',
      angle,
      distance,
      location: location || null,
      timestamp: new Date()
    });

    await reading.save();
    res.status(201).json(reading);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// POST /api/radar/reading/bulk - Store multiple readings (full sweep)
exports.bulkCreateReadings = async (req, res) => {
  try {
    const { readings, deviceId, location } = req.body;
    
    // Update heartbeat on data reception
    updateRadarHeartbeat();
    
    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ message: 'readings array is required' });
    }

    const radarReadings = readings.map(r => ({
      deviceId: deviceId || 'radar_01',
      angle: r.angle,
      distance: r.distance,
      location: location || null,
      timestamp: new Date()
    }));

    const result = await RadarReading.insertMany(radarReadings);
    res.status(201).json({ created: result.length, readings: result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/radar/latest - Get latest sweep data
exports.getLatestReadings = async (req, res) => {
  try {
    const { deviceId = 'radar_01', limit = 180 } = req.query;
    
    const readings = await RadarReading.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/radar/readings - Get paginated readings with filters
exports.getReadings = async (req, res) => {
  try {
    const { 
      deviceId = 'radar_01', 
      limit = 100, 
      offset = 0,
      startDate,
      endDate 
    } = req.query;
    
    const query = { deviceId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const readings = await RadarReading.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    const total = await RadarReading.countDocuments(query);
    res.json({ results: readings, count: total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/radar/alert - Create movement alert
exports.createAlert = async (req, res) => {
  try {
    const { deviceId, distance, angle, location, severity } = req.body;
    
    if (distance === undefined || angle === undefined) {
      return res.status(400).json({ message: 'distance and angle are required' });
    }

    const alert = new MovementAlert({
      deviceId: deviceId || 'radar_01',
      distance,
      angle,
      location: location || null,
      severity: severity || 'high',
      timestamp: new Date()
    });

    await alert.save();
    res.status(201).json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/radar/alerts - Get movement alerts with filters
exports.getAlerts = async (req, res) => {
  try {
    const { 
      deviceId = 'radar_01',
      limit = 50,
      offset = 0,
      isResolved,
      startDate,
      endDate,
      severity
    } = req.query;
    
    const query = { deviceId };
    
    if (isResolved !== undefined) {
      query.isResolved = isResolved === 'true';
    }
    
    if (severity) {
      query.severity = severity;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const alerts = await MovementAlert.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('farmId', 'name location');
    
    const total = await MovementAlert.countDocuments(query);
    res.json({ results: alerts, count: total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/radar/alerts/:id/resolve - Resolve an alert
exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNotes } = req.body;
    
    const alert = await MovementAlert.findByIdAndUpdate(
      id,
      {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || 'system',
        resolutionNotes: resolutionNotes || ''
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/radar/stats - Get radar statistics
exports.getStats = async (req, res) => {
  try {
    const { deviceId = 'radar_01', hours = 24 } = req.query;
    
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const totalReadings = await RadarReading.countDocuments({ 
      deviceId, 
      timestamp: { $gte: since } 
    });
    
    const totalAlerts = await MovementAlert.countDocuments({ 
      deviceId, 
      timestamp: { $gte: since } 
    });
    
    const unresolvedAlerts = await MovementAlert.countDocuments({ 
      deviceId, 
      isResolved: false,
      timestamp: { $gte: since } 
    });
    
    const closestDetection = await RadarReading.findOne({ deviceId })
      .sort({ distance: 1, timestamp: -1 })
      .limit(1);

    res.json({
      deviceId,
      period: `${hours} hours`,
      totalReadings,
      totalAlerts,
      unresolvedAlerts,
      closestDetection: closestDetection ? {
        distance: closestDetection.distance,
        angle: closestDetection.angle,
        timestamp: closestDetection.timestamp
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
