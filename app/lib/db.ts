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

  console.log('Database initialized successfully');
  return db;
}

export const db = SQLite.openDatabaseSync('tech_fiesta.db');
