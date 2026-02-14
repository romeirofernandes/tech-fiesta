
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

export const fetchAndSyncDashboardData = async (): Promise<void> => {
  try {
    console.log('Starting dashboard sync...');
    
    // Fetch all data in parallel
    const [
      animalsRes,
      farmsRes,
      alertsRes,
      vaccRes,
      healthRes,
      sensorRes,
    ] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/animals`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/api/farms`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/api/alerts`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/api/vaccination-events`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/api/health-snapshots`).catch(() => ({ data: [] })),
      axios.get(`${API_BASE_URL}/api/sensor-events?type=heartRate`).catch(() => ({ data: [] })),
    ]);

    const animals = Array.isArray(animalsRes.data) ? animalsRes.data : [];
    const farms = Array.isArray(farmsRes.data) ? farmsRes.data : [];
    const alerts = Array.isArray(alertsRes.data) ? alertsRes.data : [];
    const vaccinations = Array.isArray(vaccRes.data) ? vaccRes.data : [];
    const healthSnapshots = Array.isArray(healthRes.data) ? healthRes.data : [];
    const sensorEvents = Array.isArray(sensorRes.data) ? sensorRes.data : [];

    // Sync Animals
    db.runSync('DELETE FROM animals;'); 
    for (const a of animals) {
      db.runSync(
        'INSERT OR REPLACE INTO animals (id, name, species, farmId, imageUrl, status) VALUES (?, ?, ?, ?, ?, ?);',
        [a._id ?? null, a.name ?? null, a.species ?? null, (a.farmId?._id || a.farmId) ?? null, a.imageUrl ?? null, a.status ?? null]
      );
    }

    // Sync Farms
    for (const f of farms) {
      db.runSync(
        'INSERT OR REPLACE INTO farms (id, name, location, imageUrl, coordinates, farmerId) VALUES (?, ?, ?, ?, ?, ?);',
        [f._id ?? null, f.name ?? null, f.location ?? null, f.imageUrl ?? null, JSON.stringify(f.coordinates ?? {}), f.farmerId ?? null]
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
