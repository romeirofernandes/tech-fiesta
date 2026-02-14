import * as SQLite from 'expo-sqlite';

export async function initDatabase() {
  const db = SQLite.openDatabaseSync('tech_fiesta.db');

  // Create Farms table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS farms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      imageUrl TEXT,
      coordinates TEXT,
      farmerId TEXT,
      syncStatus TEXT DEFAULT 'synced',
      tempId TEXT
    );
  `);

  // Create User Profile table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      fullName TEXT,
      email TEXT,
      phoneNumber TEXT,
      imageUrl TEXT,
      syncStatus TEXT DEFAULT 'synced'
    );
  `);

  // Create Sync Queue table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      tableName TEXT NOT NULL,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      timestamp INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Create Animals table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS animals (
      id TEXT PRIMARY KEY,
      name TEXT,
      species TEXT,
      farmId TEXT,
      imageUrl TEXT,
      status TEXT,
      syncStatus TEXT DEFAULT 'synced'
    );
  `);

  // Create Alerts table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      severity TEXT,
      type TEXT,
      animalId TEXT,
      animalName TEXT,
      message TEXT,
      createdAt TEXT,
      isResolved INTEGER DEFAULT 0,
      syncStatus TEXT DEFAULT 'synced'
    );
  `);

  // Create Vaccinations table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS vaccinations (
      id TEXT PRIMARY KEY,
      animalId TEXT,
      vaccineName TEXT,
      date TEXT,
      status TEXT,
      eventType TEXT,
      syncStatus TEXT DEFAULT 'synced'
    );
  `);

  // Create Health Snapshots table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS health_snapshots (
      id TEXT PRIMARY KEY,
      animalId TEXT,
      score INTEGER,
      date TEXT,
      syncStatus TEXT DEFAULT 'synced'
    );
  `);

  // Create Sensor Events table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sensor_events (
      id TEXT PRIMARY KEY,
      type TEXT,
      value REAL,
      date TEXT,
      syncStatus TEXT DEFAULT 'synced'
    );
  `);

  console.log('Database initialized successfully');
  return db;
}

export const db = SQLite.openDatabaseSync('tech_fiesta.db');
