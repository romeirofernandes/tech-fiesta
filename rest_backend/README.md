# IoT Animal Health Monitoring System - REST API Documentation

A Django REST Framework backend for real-time animal health monitoring using ESP32 with RFID, temperature/humidity (DHT11), and heart rate sensors (MAX30102).

Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the server (Daphne ASGI for WebSocket support)
python manage.py runserver
```

The server will run at `http://127.0.0.1:8000/`

### Running the Serial Bridge

```bash
# In a separate terminal
python serial_bridge.py
```

This script reads sensor data from ESP32 via USB serial and POSTs it to the Django API.

---

## API Endpoints Overview

Base URL: `http://127.0.0.1:8000/api/iot/`

| Endpoint                            | Method                 | Description                |
| ----------------------------------- | ---------------------- | -------------------------- |
| `/api/iot/health/`                | GET                    | Health check endpoint      |
| `/api/iot/animals/`               | GET, POST, PUT, DELETE | Animal CRUD operations     |
| `/api/iot/animals/by_rfid/`       | GET                    | Get animal by RFID tag     |
| `/api/iot/sensors/`               | GET, POST              | Sensor readings            |
| `/api/iot/sensors/latest/`        | GET                    | Get latest sensor readings |
| `/api/iot/rfid/`                  | GET, POST              | RFID scan events           |
| `ws://127.0.0.1:8000/ws/sensors/` | WebSocket              | Real-time sensor updates   |

---

## REST API Details

### 1. Health Check

**GET** `/api/iot/health/`

Check if the API is running.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-08T12:30:00Z"
}
```

**React Example:**

```javascript
const checkHealth = async () => {
  const response = await fetch('http://127.0.0.1:8000/api/iot/health/');
  const data = await response.json();
  console.log(data.status); // "ok"
};
```

---

### 2. Animals API

#### Get All Animals

**GET** `/api/iot/animals/`

Returns list of all registered animals.

**Response:**

```json
[
  {
    "id": 1,
    "rfid_tag": "4c1fd505",
    "name": "Animal-4c1fd505",
    "species": "Cow",
    "breed": "Holstein",
    "date_of_birth": "2024-05-15",
    "weight": "450.50",
    "created_at": "2026-01-08T10:00:00Z",
    "updated_at": "2026-01-08T10:00:00Z"
  }
]
```

**React Example:**

```javascript
const fetchAnimals = async () => {
  const response = await fetch('http://127.0.0.1:8000/api/iot/animals/');
  const animals = await response.json();
  return animals;
};
```

#### Get Animal by RFID

**GET** `/api/iot/animals/by_rfid/?rfid=<tag>`

Get specific animal by RFID tag.

**Query Parameters:**

- `rfid` (required): RFID tag string (e.g., "4c1fd505")

**Response:**

```json
{
  "id": 1,
  "rfid_tag": "4c1fd505",
  "name": "Animal-4c1fd505",
  "species": "Cow",
  "breed": "Holstein",
  "date_of_birth": "2024-05-15",
  "weight": "450.50",
  "created_at": "2026-01-08T10:00:00Z",
  "updated_at": "2026-01-08T10:00:00Z"
}
```

**Error Response (404):**

```json
{
  "error": "Animal not found"
}
```

**React Example:**

```javascript
const getAnimalByRFID = async (rfidTag) => {
  const response = await fetch(
    `http://127.0.0.1:8000/api/iot/animals/by_rfid/?rfid=${rfidTag}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
};

// Usage
try {
  const animal = await getAnimalByRFID('4c1fd505');
  console.log(animal.name);
} catch (error) {
  console.error('Animal not found:', error.message);
}
```

#### Create New Animal

**POST** `/api/iot/animals/`

Register a new animal with RFID tag.

**Request Body:**

```json
{
  "rfid_tag": "abc123def",
  "name": "Bessie",
  "species": "Cow",
  "breed": "Holstein",
  "date_of_birth": "2024-05-15",
  "weight": "450.50"
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "rfid_tag": "abc123def",
  "name": "Bessie",
  "species": "Cow",
  "breed": "Holstein",
  "date_of_birth": "2024-05-15",
  "weight": "450.50",
  "created_at": "2026-01-08T12:30:00Z",
  "updated_at": "2026-01-08T12:30:00Z"
}
```

**React Example:**

```javascript
const createAnimal = async (animalData) => {
  const response = await fetch('http://127.0.0.1:8000/api/iot/animals/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(animalData)
  });
  
  return await response.json();
};

// Usage
const newAnimal = await createAnimal({
  rfid_tag: 'abc123def',
  name: 'Bessie',
  species: 'Cow',
  breed: 'Holstein',
  date_of_birth: '2024-05-15',
  weight: '450.50'
});
```

#### Update Animal

**PUT** `/api/iot/animals/{id}/`

Update an existing animal.

**Request Body:**

```json
{
  "name": "Bessie Updated",
  "weight": "465.00"
}
```

**React Example:**

```javascript
const updateAnimal = async (animalId, updates) => {
  const response = await fetch(
    `http://127.0.0.1:8000/api/iot/animals/${animalId}/`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    }
  );
  
  return await response.json();
};
```

#### Delete Animal

**DELETE** `/api/iot/animals/{id}/`

Delete an animal.

**React Example:**

```javascript
const deleteAnimal = async (animalId) => {
  await fetch(`http://127.0.0.1:8000/api/iot/animals/${animalId}/`, {
    method: 'DELETE'
  });
};
```

---

### 3. Sensor Readings API

#### Get All Sensor Readings

**GET** `/api/iot/sensors/`

Get all sensor readings (paginated).

**Response:**

```json
[
  {
    "id": 85,
    "animal": 1,
    "animal_name": "Animal-4c1fd505",
    "animal_species": "Cow",
    "rfid_tag": "4c1fd505",
    "temperature": "29.70",
    "humidity": "38.00",
    "heart_rate": 72,
    "sensor_type": "COMBINED",
    "device_id": "ESP32-001",
    "timestamp": "2026-01-08T12:49:38Z",
    "created_at": "2026-01-08T12:49:38Z"
  }
]
```

#### Get Latest Sensor Readings

**GET** `/api/iot/sensors/latest/`

Get most recent sensor readings.

**Query Parameters:**

- `limit` (optional): Number of readings to return (default: 50)
- `rfid` (optional): Filter by specific RFID tag

**Examples:**

```
GET /api/iot/sensors/latest/?limit=20
GET /api/iot/sensors/latest/?rfid=4c1fd505
GET /api/iot/sensors/latest/?rfid=4c1fd505&limit=10
```

**React Example:**

```javascript
const getLatestReadings = async (limit = 20, rfid = null) => {
  let url = `http://127.0.0.1:8000/api/iot/sensors/latest/?limit=${limit}`;
  if (rfid) {
    url += `&rfid=${rfid}`;
  }
  
  const response = await fetch(url);
  return await response.json();
};

// Get last 20 readings
const readings = await getLatestReadings(20);

// Get last 10 readings for specific animal
const animalReadings = await getLatestReadings(10, '4c1fd505');
```

#### Submit Sensor Reading (ESP32)

**POST** `/api/iot/sensors/`

Submit new sensor reading. **This is called by the ESP32 serial bridge**, but can also be used for manual submissions.

**Request Body:**

```json
{
  "rfid_tag": "4c1fd505",
  "temperature": "29.70",
  "humidity": "38.00",
  "heart_rate": 72,
  "device_id": "ESP32-001"
}
```

**Notes:**

- At least one sensor value (temperature, humidity, or heart_rate) is required
- `rfid_tag` is required
- Automatically creates an Animal record if RFID doesn't exist
- **Broadcasts to WebSocket** `sensors_realtime` group after successful save

**Response (201 Created):**

```json
{
  "id": 85,
  "animal": 1,
  "animal_name": "Animal-4c1fd505",
  "animal_species": "Cow",
  "rfid_tag": "4c1fd505",
  "temperature": "29.70",
  "humidity": "38.00",
  "heart_rate": 72,
  "sensor_type": "COMBINED",
  "device_id": "ESP32-001",
  "timestamp": "2026-01-08T12:49:38Z",
  "created_at": "2026-01-08T12:49:38Z"
}
```

**React Example:**

```javascript
const submitSensorReading = async (reading) => {
  const response = await fetch('http://127.0.0.1:8000/api/iot/sensors/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reading)
  });
  
  return await response.json();
};

// Usage
const reading = await submitSensorReading({
  rfid_tag: '4c1fd505',
  temperature: '29.7',
  humidity: '38.0',
  heart_rate: 72,
  device_id: 'ESP32-001'
});
```

---

### 4. RFID Events API

#### Get RFID Scan Events

**GET** `/api/iot/rfid/`

Get all RFID card scan events (tracks when cards are scanned).

**Response:**

```json
[
  {
    "id": 15,
    "rfid_tag": "4c1fd505",
    "animal": 1,
    "animal_name": "Animal-4c1fd505",
    "reader_id": "ESP32-001",
    "timestamp": "2026-01-08T12:49:28Z",
    "created_at": "2026-01-08T12:49:28Z"
  }
]
```

#### Log RFID Scan Event

**POST** `/api/iot/rfid/`

Log when an RFID card is scanned. **Called by ESP32 serial bridge.**

**Request Body:**

```json
{
  "rfid_tag": "4c1fd505",
  "reader_id": "ESP32-001"
}
```

**Response (201 Created):**

```json
{
  "id": 15,
  "rfid_tag": "4c1fd505",
  "animal": 1,
  "animal_name": "Animal-4c1fd505",
  "reader_id": "ESP32-001",
  "timestamp": "2026-01-08T12:49:28Z",
  "created_at": "2026-01-08T12:49:28Z"
}
```

**React Example:**

```javascript
const getRFIDEvents = async () => {
  const response = await fetch('http://127.0.0.1:8000/api/iot/rfid/');
  return await response.json();
};
```

---

## WebSocket API (Real-Time Updates)

### WebSocket URL

```
ws://127.0.0.1:8000/ws/sensors/
```

### How It Works

1. When ESP32 POSTs sensor data to `/api/iot/sensors/`, Django saves it to the database
2. Django **automatically broadcasts** the data to all connected WebSocket clients
3. Your React app receives updates in real-time without polling

### Message Format

**Incoming Message (from server):**

```json
{
  "type": "sensor_update",
  "data": {
    "id": 85,
    "animal": 1,
    "animal_name": "Animal-4c1fd505",
    "animal_species": "Cow",
    "rfid_tag": "4c1fd505",
    "temperature": "29.70",
    "humidity": "38.00",
    "heart_rate": 72,
    "sensor_type": "COMBINED",
    "device_id": "ESP32-001",
    "timestamp": "2026-01-08T12:49:38Z",
    "created_at": "2026-01-08T12:49:38Z"
  }
}
```

**Initial Connection Message:**

```json
{
  "type": "initial_data",
  "data": [
    /* Array of recent sensor readings */
  ]
}
```

## Data Models

### Animal

```typescript
interface Animal {
  id: number;
  rfid_tag: string;
  name: string;
  species: string;
  breed: string;
  date_of_birth: string | null;  // ISO date string
  weight: string | null;          // Decimal string
  created_at: string;             // ISO datetime string
  updated_at: string;             // ISO datetime string
}
```

### SensorReading

```typescript
interface SensorReading {
  id: number;
  animal: number | null;           // Animal ID (foreign key)
  animal_name: string;             // Animal name (joined)
  animal_species: string;          // Animal species (joined)
  rfid_tag: string;
  temperature: string | null;      // Decimal string in Celsius
  humidity: string | null;         // Decimal string (percentage)
  heart_rate: number | null;       // Integer (BPM)
  sensor_type: 'TEMP' | 'HUMID' | 'HR' | 'COMBINED';
  device_id: string;
  timestamp: string;               // ISO datetime string
  created_at: string;              // ISO datetime string
}
```

### RFIDEvent

```typescript
interface RFIDEvent {
  id: number;
  rfid_tag: string;
  animal: number | null;           // Animal ID (foreign key)
  animal_name: string;             // Animal name (joined)
  reader_id: string;
  timestamp: string;               // ISO datetime string
  created_at: string;              // ISO datetime string
}
```

---

## CORS Configuration

The API is configured to accept requests from any origin during development. In production, update `settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React dev server
    "http://localhost:5173",  # Vite dev server
    # Add your production domains
]
```

---

## Authentication (Currently Disabled)

All endpoints currently use `AllowAny` permission for development. To add authentication:

1. Use Django REST Framework Token Authentication
2. Add `rest_framework.authtoken` to `INSTALLED_APPS`
3. Update `permission_classes` in ViewSets
4. Include token in React requests:

```javascript
const response = await fetch(url, {
  headers: {
    'Authorization': 'Token YOUR_TOKEN_HERE'
  }
});
```

---

## Debugging

### Check if API is running:

```bash
curl http://127.0.0.1:8000/api/iot/health/
```

### Test WebSocket connection:

```javascript
const ws = new WebSocket('ws://127.0.0.1:8000/ws/sensors/');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
```

### View Django server logs:

- Check terminal where `python manage.py runserver` is running
- Look for ` Broadcasting` and ` Consumer received` messages

### Common Issues:

1. **WebSocket connects but no data**: Ensure serial_bridge.py is running and ESP32 is connected
2. **CORS errors**: Check `CORS_ALLOWED_ORIGINS` in settings.py
3. **404 errors**: Verify base URL is `http://127.0.0.1:8000/api/iot/`

---

## Notes for MERN Developers

- **No MongoDB**: Django uses SQLite (SQL database)
- **No Express**: Django REST Framework handles routing
- **No Node.js**: Python/Django backend
- **Similar to Express**: ViewSets = Controllers, Serializers = Data validation
- **WebSocket**: Django Channels (similar to Socket.io)
- **Real-time**: WebSocket broadcasts happen automatically when POST to `/sensors/`

---

## Quick Integration Checklist

- [ ] Fetch animals from `/api/iot/animals/`
- [ ] Fetch latest readings from `/api/iot/sensors/latest/?limit=20`
- [ ] Connect WebSocket to `ws://127.0.0.1:8000/ws/sensors/`
- [ ] Handle `sensor_update` messages in WebSocket
- [ ] Display real-time temperature, humidity, heart rate
- [ ] Show RFID events from `/api/iot/rfid/`
- [ ] (Optional) Add animal registration form
