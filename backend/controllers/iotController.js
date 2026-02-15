const IotSensorReading = require('../models/IotSensorReading');
const RFIDEvent = require('../models/RFIDEvent');
const Animal = require('../models/Animal');

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
