
import { db } from './db';
import axios from 'axios';
import * as SQLite from 'expo-sqlite';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.37:8000';

export interface DashboardData {
  animals: any[];
  farms: any[];
  alerts: any[];
  vaccinations: any[];
  healthSnapshots: any[];
  sensorEvents: any[];
}

export const fetchAndSyncDashboardData = async (farmerId?: string): Promise<void> => {
  try {
    console.log('Starting dashboard sync...');
    
    // Fetch all data in parallel
    const config = farmerId ? { params: { farmerId } } : {};

    const [
      animalsRes,
      farmsRes,
      alertsRes,
      vaccRes,
      healthRes,
      sensorRes,
    ] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/animals`, config).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/api/farms`, config).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/api/alerts`, config).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/api/vaccination-events`, config).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/api/health-snapshots`, config).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/api/sensor-events?type=heartRate`, config).catch(() => ({ data: [] })),
    ]);

    const animals = Array.isArray(animalsRes.data) ? animalsRes.data : [];
    const farms = Array.isArray(farmsRes.data) ? farmsRes.data : [];
    const alerts = Array.isArray(alertsRes.data) ? alertsRes.data : [];
    const vaccinations = Array.isArray(vaccRes.data) ? vaccRes.data : [];
    const healthSnapshots = Array.isArray(healthRes.data) ? healthRes.data : [];
    const sensorEvents = Array.isArray(sensorRes.data) ? sensorRes.data : [];

    // Sync Animals - only overwrite synced records
    db.runSync('DELETE FROM animals WHERE syncStatus = ?;', ['synced']);
    for (const a of animals) {
      const local = db.getFirstSync<{syncStatus: string}>('SELECT syncStatus FROM animals WHERE id = ?', [a._id]);
      if (local && local.syncStatus === 'pending') continue;
      db.runSync(
        'INSERT OR REPLACE INTO animals (id, name, rfid, species, breed, gender, age, ageUnit, farmId, farmName, farmLocation, imageUrl, createdAt, updatedAt, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [
          a._id ?? null,
          a.name ?? null,
          a.rfid ?? null,
          a.species ?? null,
          a.breed ?? null,
          a.gender ?? null,
          a.age ?? 0,
          a.ageUnit ?? 'months',
          (a.farmId?._id || a.farmId) ?? null,
          a.farmId?.name ?? null,
          a.farmId?.location ?? null,
          a.imageUrl ?? null,
          a.createdAt ?? null,
          a.updatedAt ?? null,
          'synced'
        ]
      );
    }

    // Sync Farms
    db.runSync('DELETE FROM farms WHERE syncStatus = ?;', ['synced']);
    for (const f of farms) {
      const local = db.getFirstSync<{syncStatus: string}>('SELECT syncStatus FROM farms WHERE id = ?', [f._id]);
      if (local && local.syncStatus === 'pending') continue;

      db.runSync(
        'INSERT OR REPLACE INTO farms (id, name, location, imageUrl, coordinates, farmerId, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [f._id ?? null, f.name ?? null, f.location ?? null, f.imageUrl ?? null, JSON.stringify(f.coordinates ?? {}), f.farmerId ?? null, 'synced']
      );
    }

    // Sync Alerts
    db.runSync('DELETE FROM alerts;');
    for (const a of alerts) {
      db.runSync(
        'INSERT OR REPLACE INTO alerts (id, severity, type, animalId, animalName, message, createdAt, isResolved) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        [
          a._id ?? null, 
          a.severity ?? null, 
          a.type ?? null, 
          (a.animalId?._id || a.animalId) ?? null, 
          a.animalId?.name ?? null, 
          a.message ?? null, 
          a.createdAt ?? null, 
          a.isResolved ? 1 : 0
        ]
      );
    }

    // Sync Vaccinations
    db.runSync('DELETE FROM vaccinations;');
    for (const v of vaccinations) {
      db.runSync(
        'INSERT OR REPLACE INTO vaccinations (id, animalId, vaccineName, date, status, eventType) VALUES (?, ?, ?, ?, ?, ?);',
        [v._id ?? null, (v.animalId?._id || v.animalId) ?? null, v.vaccineName ?? null, v.date ?? null, v.status ?? null, v.eventType ?? null]
      );
    }

    // Sync Health Snapshots
    db.runSync('DELETE FROM health_snapshots;');
    for (const h of healthSnapshots) {
      db.runSync(
        'INSERT OR REPLACE INTO health_snapshots (id, animalId, score, date) VALUES (?, ?, ?, ?);',
        [h._id ?? null, (h.animalId?._id || h.animalId) ?? null, h.score ?? 0, h.date ?? null]
      );
    }

    // Sync Sensor Events
    db.runSync('DELETE FROM sensor_events;');
    for (const s of sensorEvents) {
      db.runSync(
        'INSERT OR REPLACE INTO sensor_events (id, type, value, date) VALUES (?, ?, ?, ?);',
        [s._id ?? null, s.type ?? null, s.value ?? 0, s.date ?? null]
      );
    }

    console.log('Dashboard sync completed successfully');
  } catch (error) {
    console.error('Dashboard sync error:', error);
  }
};

export const getLocalDashboardData = (): DashboardData => {
  try {
    const animals = db.getAllSync('SELECT * FROM animals;');
    const farms = db.getAllSync('SELECT * FROM farms;');
    const alerts = db.getAllSync('SELECT * FROM alerts;');
    const vaccinations = db.getAllSync('SELECT * FROM vaccinations;');
    const healthSnapshots = db.getAllSync('SELECT * FROM health_snapshots;');
    const sensorEvents = db.getAllSync('SELECT * FROM sensor_events;');

    return {
      animals,
      farms,
      alerts: alerts.map((a: any) => ({ ...a, isResolved: !!a.isResolved })),
      vaccinations,
      healthSnapshots,
      sensorEvents,
    };
  } catch (error) {
    console.error('Error getting local dashboard data:', error);
    return {
      animals: [],
      farms: [],
      alerts: [],
      vaccinations: [],
      healthSnapshots: [],
      sensorEvents: [],
    };
  }
};
