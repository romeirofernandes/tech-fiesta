const IotSensorReading = require('../models/IotSensorReading');
const RFIDEvent = require('../models/RFIDEvent');
const Animal = require('../models/Animal');
const Alert = require('../models/Alert');
const HeartRateThreshold = require('../models/HeartRateThreshold');
const HEART_RATE_DEFAULTS = require('../config/heartRateDefaults');

// IoT Device Connection Tracker
const iotDeviceStatus = {
  lastHeartbeat: null,
  isConnected: false,
  deviceId: null,
  connectionTimeout: 15000 // Consider disconnected if no heartbeat for 15 seconds
};

// Helper: Check if IoT device is connected
const isIotConnected = () => {
  if (!iotDeviceStatus.lastHeartbeat) return false;
  const timeSinceLastBeat = Date.now() - iotDeviceStatus.lastHeartbeat;
  return timeSinceLastBeat < iotDeviceStatus.connectionTimeout;
};

// Helper: Update IoT heartbeat
const updateIotHeartbeat = (deviceId = 'esp32_serial') => {
  iotDeviceStatus.lastHeartbeat = Date.now();
  iotDeviceStatus.isConnected = true;
  iotDeviceStatus.deviceId = deviceId;
};

// Temperature threshold constants for isolation alerts
const TEMP_THRESHOLD = {
  max: 40, // °C - Above this indicates fever
  criticalMax: 41.5 // °C - Critical fever
};

// Heart rate stress threshold (universal, overrides species defaults if higher)
const STRESS_THRESHOLD_BPM = 100;

// Check vitals from database history and create isolation alert if sustained pattern detected
async function checkVitalsAndCreateIsolationAlert(animalId) {
  if (!animalId) return;
  
  try {
    // Get last 5 readings for this animal (within last 15 minutes to ensure recent data)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentReadings = await IotSensorReading.find({
      animalId: animalId,
      timestamp: { $gte: fifteenMinutesAgo }
    })
    .sort({ timestamp: -1 })
    .limit(5);
    
    // Need at least 3 readings to determine a pattern
    if (recentReadings.length < 3) {
      console.log(`ℹ️  Not enough readings for animal ${animalId} (${recentReadings.length}/3 minimum)`);
      return;
    }
    
    const reasons = [];
    let severity = 'medium';
    
    // Count fever readings (temperature > 40°C)
    const feverCount = recentReadings.filter(r => 
      r.temperature != null && r.temperature > TEMP_THRESHOLD.max
    ).length;
    
    // Count stress readings (heart rate > 100 BPM)
    const stressCount = recentReadings.filter(r => 
      r.heartRate != null && r.heartRate > STRESS_THRESHOLD_BPM
    ).length;
    
    // Check for critical fever
    const criticalFeverCount = recentReadings.filter(r => 
      r.temperature != null && r.temperature > TEMP_THRESHOLD.criticalMax
    ).length;
    
    // Sustained pattern = 3+ out of 5 readings (60%+)
    const totalReadings = recentReadings.length;
    const sustainedThreshold = Math.ceil(totalReadings * 0.6); // 60% of readings
    
    if (feverCount >= sustainedThreshold) {
      if (criticalFeverCount >= sustainedThreshold) {
        reasons.push(`Critical Fever (${criticalFeverCount}/${totalReadings} readings > ${TEMP_THRESHOLD.criticalMax}°C)`);
        severity = 'high';
      } else {
        reasons.push(`Sustained Fever (${feverCount}/${totalReadings} readings > ${TEMP_THRESHOLD.max}°C)`);
        severity = 'high';
      }
    }
    
    if (stressCount >= sustainedThreshold) {
      reasons.push(`Sustained Stress (${stressCount}/${totalReadings} readings > ${STRESS_THRESHOLD_BPM} BPM)`);
      if (severity !== 'high') severity = 'high';
    }
    
    // If any sustained abnormality detected, check for existing alert and create if needed
    if (reasons.length > 0) {
      // Check for existing unresolved isolation alert (within last 24 hours to avoid duplicates)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existingAlert = await Alert.findOne({
        animalId,
        type: 'health',
        severity: { $in: ['high', 'medium'] },
        message: { $regex: /Isolation Required|Fever|Stress/i },
        isResolved: false,
        createdAt: { $gte: twentyFourHoursAgo }
      });
      
      if (!existingAlert) {
        // Create new isolation alert
        const message = `🚨 Isolation Required: ${reasons.join(', ')}`;
        await Alert.create({
          animalId,
          type: 'health',
          severity,
          message
        });
        console.log(`✅ Isolation alert created for animal ${animalId}: ${message}`);
      } else {
        console.log(`ℹ️  Existing isolation alert found for animal ${animalId} (created ${existingAlert.createdAt})`);
      }
    } else {
      console.log(`✓ Animal ${animalId} vitals normal (${feverCount} fever, ${stressCount} stress out of ${totalReadings} readings)`);
    }
  } catch (error) {
    console.error('Error checking vitals for isolation:', error);
  }
}

// Helper: Find animal by RFID tag
const findAnimalByRfid = async (rfidTag) => {
  if (!rfidTag) return null;
  // Normalize RFID: lowercase, remove spaces
  const normalizedRfid = rfidTag.toLowerCase().replace(/\s+/g, '');
  const animal = await Animal.findOne({ 
    rfid: { $regex: new RegExp(`^${normalizedRfid}$`, 'i') }
  });
  return animal;
};

// GET /api/iot/health/
exports.healthCheck = async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

// GET /api/iot/status - Check IoT device connection status
exports.getIotStatus = async (req, res) => {
  const connected = isIotConnected();
  res.json({
    connected,
    lastHeartbeat: iotDeviceStatus.lastHeartbeat,
    deviceId: iotDeviceStatus.deviceId,
    timeSinceLastBeat: iotDeviceStatus.lastHeartbeat 
      ? Date.now() - iotDeviceStatus.lastHeartbeat 
      : null
  });
};

// POST /api/iot/heartbeat - IoT device sends heartbeat
exports.heartbeat = async (req, res) => {
  const { deviceId } = req.body;
  updateIotHeartbeat(deviceId);
  res.json({ 
    status: 'ok', 
    message: 'Heartbeat received',
    timestamp: new Date().toISOString() 
  });
};

// GET /api/iot/animals/by_rfid/?rfid=XXXX
exports.getAnimalByRfid = async (req, res) => {
  try {
    const { rfid } = req.query;
    if (!rfid) {
      return res.status(400).json({ message: 'rfid query parameter required' });
    }
    const animal = await findAnimalByRfid(rfid);
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found' });
    }
    res.json(animal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/iot/sensors/
exports.getSensorReadings = async (req, res) => {
  try {
    const { limit = 100, offset = 0, rfid } = req.query;
    const query = {};
    if (rfid) {
      query.rfidTag = rfid.toLowerCase().replace(/\s+/g, '');
    }
    const readings = await IotSensorReading.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('animalId', 'name rfid species breed');
    
    const total = await IotSensorReading.countDocuments(query);
    res.json({ results: readings, count: total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/iot/sensors/
exports.createSensorReading = async (req, res) => {
  try {
    const { rfidTag, rfid_tag, temperature, humidity, heartRate, heart_rate, sensorType, sensor_type, deviceId, device_id } = req.body;
    
    // Update heartbeat when sensor data is received
    updateIotHeartbeat(deviceId || device_id);
    
    // Support both camelCase and snake_case
    const normalizedRfid = (rfidTag || rfid_tag || '').toLowerCase().replace(/\s+/g, '');
    
    if (!normalizedRfid) {
      return res.status(400).json({ message: 'rfidTag is required' });
    }

    // Find animal by RFID
    const animal = await findAnimalByRfid(normalizedRfid);

    // Determine sensor type
    let type = sensorType || sensor_type || 'COMBINED';
    if (!sensorType && !sensor_type) {
      const hasTemp = temperature != null;
      const hasHumid = humidity != null;
      const hasHr = (heartRate || heart_rate) != null;
      if (hasTemp && !hasHumid && !hasHr) type = 'TEMP';
      else if (hasHumid && !hasTemp && !hasHr) type = 'HUMID';
      else if (hasHr && !hasTemp && !hasHumid) type = 'HR';
      else type = 'COMBINED';
    }

    const reading = new IotSensorReading({
      rfidTag: normalizedRfid,
      animalId: animal ? animal._id : null,
      temperature: temperature != null ? temperature : null,
      humidity: humidity != null ? humidity : null,
      heartRate: heartRate != null ? heartRate : (heart_rate != null ? heart_rate : null),
      sensorType: type,
      deviceId: deviceId || device_id || '',
      timestamp: new Date()
    });

    await reading.save();
    
    // Populate animal info for response
    await reading.populate('animalId', 'name rfid species breed');
    
    // Check vitals and create isolation alert if sustained abnormal pattern detected
    if (animal && animal._id) {
      // Run async without blocking response (fire and forget)
      checkVitalsAndCreateIsolationAlert(animal._id).catch(err => 
        console.error('Isolation alert check failed:', err)
      );
    }
    
    res.status(201).json(reading);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/iot/sensors/latest/?rfid=&limit=&since=
exports.getLatestReadings = async (req, res) => {
  try {
    const { rfid, limit = 10, since } = req.query;
    const query = {};
    
    if (rfid) {
      query.rfidTag = rfid.toLowerCase().replace(/\s+/g, '');
    }
    
    if (since) {
      query.timestamp = { $gt: new Date(since) };
    }

    const readings = await IotSensorReading.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('animalId', 'name rfid species breed');

    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/iot/sensors/by_animal/?animal_id=&rfid=
exports.getReadingsByAnimal = async (req, res) => {
  try {
    const { animal_id, rfid, limit = 100 } = req.query;
    const query = {};

    if (animal_id) {
      query.animalId = animal_id;
    } else if (rfid) {
      query.rfidTag = rfid.toLowerCase().replace(/\s+/g, '');
    } else {
      return res.status(400).json({ message: 'animal_id or rfid query parameter required' });
    }

    const readings = await IotSensorReading.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('animalId', 'name rfid species breed');

    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/iot/sensors/bulk/
exports.bulkSensorData = async (req, res) => {
  try {
    const { readings } = req.body;
    
    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ message: 'readings array is required' });
    }

    const results = [];
    for (const data of readings) {
      const rfidTag = (data.rfidTag || data.rfid_tag || '').toLowerCase().replace(/\s+/g, '');
      if (!rfidTag) continue;

      const animal = await findAnimalByRfid(rfidTag);
      
      const reading = new IotSensorReading({
        rfidTag,
        animalId: animal ? animal._id : null,
        temperature: data.temperature,
        humidity: data.humidity,
        heartRate: data.heartRate || data.heart_rate,
        sensorType: data.sensorType || data.sensor_type || 'COMBINED',
        deviceId: data.deviceId || data.device_id || '',
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
      });

      await reading.save();
      results.push(reading);
    }

    res.status(201).json({ created: results.length, results });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/iot/rfid/
exports.getRfidEvents = async (req, res) => {
  try {
    const { limit = 100, offset = 0, rfid } = req.query;
    const query = {};
    if (rfid) {
      query.rfidTag = rfid.toLowerCase().replace(/\s+/g, '');
    }

    const events = await RFIDEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('animalId', 'name rfid species breed');

    const total = await RFIDEvent.countDocuments(query);
    res.json({ results: events, count: total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/iot/rfid/
exports.createRfidEvent = async (req, res) => {
  try {
    const { rfidTag, rfid_tag, readerId, reader_id } = req.body;
    
    // Update heartbeat when RFID event is received
    updateIotHeartbeat(readerId || reader_id);
    
    const normalizedRfid = (rfidTag || rfid_tag || '').toLowerCase().replace(/\s+/g, '');
    
    if (!normalizedRfid) {
      return res.status(400).json({ message: 'rfidTag is required' });
    }

    const animal = await findAnimalByRfid(normalizedRfid);

    const event = new RFIDEvent({
      rfidTag: normalizedRfid,
      animalId: animal ? animal._id : null,
      readerId: readerId || reader_id || '',
      timestamp: new Date()
    });

    await event.save();
    await event.populate('animalId', 'name rfid species breed');

    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/iot/isolation-alerts - Get active isolation alerts
exports.getIsolationAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({
      type: 'health',
      isResolved: false,
      message: { $regex: /Isolation Required|Fever|Stress/i }
    })
    .populate('animalId', 'name rfid species breed')
    .sort({ createdAt: -1 })
    .limit(50);
    
    // Get latest vitals for each animal
    const enrichedAlerts = await Promise.all(alerts.map(async (alert) => {
      if (!alert.animalId) return alert.toObject();
      
      const latestReading = await IotSensorReading.findOne({
        animalId: alert.animalId._id
      })
      .sort({ timestamp: -1 })
      .select('temperature humidity heartRate timestamp');
      
      return {
        ...alert.toObject(),
        latestVitals: latestReading || null
      };
    }));
    
    res.json(enrichedAlerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/iot/isolation-alerts/:id/resolve - Resolve isolation alert
exports.resolveIsolationAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNotes } = req.body;
    
    const alert = await Alert.findByIdAndUpdate(
      id,
      {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || 'system',
        resolutionNotes: resolutionNotes || 'Animal isolated'
      },
      { new: true }
    ).populate('animalId', 'name rfid species');
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    res.json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

