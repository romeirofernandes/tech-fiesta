import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;
let _dbReady: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Get the database instance synchronously.
 * Returns null if the database hasn't been initialized yet.
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    // Attempt to open synchronously as a fallback
    _db = SQLite.openDatabaseSync('tech_fiesta.db');
  }
  return _db;
}

/**
 * Get a promise that resolves to the database once it has been initialized.
 * Safe to call multiple times – will only init once.
 */
export function getDbAsync(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbReady) {
    _dbReady = initDatabase();
  }
  return _dbReady;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  // If already initialized, return immediately
  if (_db) {
    return _db;
  }

  try {
    const database = SQLite.openDatabaseSync('tech_fiesta.db');

    // Create Farms table
    database.execSync(`
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
    database.execSync(`
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
    database.execSync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        tableName TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Migration: Check if animals table has the new schema (rfid column)
    try {
      const tableInfo = database.getAllSync('PRAGMA table_info(animals)');
      const hasRfid = tableInfo.some((col: any) => col.name === 'rfid');
      if (!hasRfid && tableInfo.length > 0) {
        console.log('Migrating animals table schema...');
        database.execSync('DROP TABLE animals');
      }
    } catch (e) {
      console.log('Error checking schema, proceeding...', e);
    }

    // Create Animals table (matches backend Animal model)
    database.execSync(`
      CREATE TABLE IF NOT EXISTS animals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        rfid TEXT,
        species TEXT,
        breed TEXT,
        gender TEXT,
        age REAL,
        ageUnit TEXT DEFAULT 'months',
        farmId TEXT,
        farmName TEXT,
        farmLocation TEXT,
        imageUrl TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        syncStatus TEXT DEFAULT 'synced',
        tempId TEXT
      );
    `);

    // Create Alerts table
    database.execSync(`
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
    database.execSync(`
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
    database.execSync(`
      CREATE TABLE IF NOT EXISTS health_snapshots (
        id TEXT PRIMARY KEY,
        animalId TEXT,
        score INTEGER,
        date TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Create Sensor Events table
    database.execSync(`
      CREATE TABLE IF NOT EXISTS sensor_events (
        id TEXT PRIMARY KEY,
        type TEXT,
        value REAL,
        date TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    console.log('Database initialized successfully');
    _db = database;
    return database;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/** 
 * Backwards-compatible export.
 * Use getDb() or getDbAsync() in new code for safety.
 */
export const db = new Proxy({} as SQLite.SQLiteDatabase, {
  get(_target, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  },
});
