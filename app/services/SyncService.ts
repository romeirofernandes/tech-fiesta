import { db } from '../lib/db';
import NetInfo from '@react-native-community/netinfo';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

class SyncService {
  private isSyncing = false;
  private syncStartedAt = 0;
  private retryTimers: any[] = [];

  async isOnline() {
    const state = await NetInfo.fetch();
    // isInternetReachable can be null on some platforms/Expo Go — treat null as "maybe reachable"
    return state.isConnected && state.isInternetReachable !== false;
  }

  startMonitoring() {
    // Try processing after a short delay for DB init
    setTimeout(() => this.processQueue(true), 2000);

    // === RELIABLE FALLBACK: Check every 15 seconds for pending items ===
    // This guarantees sync happens even if addEventListener doesn't fire
    const periodicTimer = setInterval(async () => {
      try {
        const online = await this.isOnline();
        if (online) {
          this.processQueue(true);
        }
      } catch {}
    }, 15000);

    // Also listen for network changes (belt and suspenders)
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('[Sync] Network event: connected, scheduling sync...');

        // Clear any existing retry timers
        this.retryTimers.forEach(t => clearTimeout(t));
        this.retryTimers = [];

        // Try immediately and retry after delays
        this.processQueue(true);
        this.retryTimers.push(setTimeout(() => this.processQueue(true), 3000));
        this.retryTimers.push(setTimeout(() => this.processQueue(true), 8000));
      }
    });

    // Return combined cleanup function
    return () => {
      unsubscribeNetInfo();
      clearInterval(periodicTimer);
      this.retryTimers.forEach(t => clearTimeout(t));
      this.retryTimers = [];
    };
  }

  // --- Queue Management ---

  async addToQueue(action: string, tableName: string, data: any) {
    try {
      db.runSync(
        'INSERT INTO sync_queue (action, tableName, data, status) VALUES (?, ?, ?, ?)',
        [action, tableName, JSON.stringify(data), 'pending']
      );
      this.processQueue(); // Try to process immediately if online
    } catch (error) {
      console.error("[Sync] Error adding to sync queue:", error);
    }
  }

  async processQueue(force = false) {
    // Timeout guard: if isSyncing has been true for over 30 seconds, something is stuck — reset it
    if (this.isSyncing) {
      if (Date.now() - this.syncStartedAt > 30000) {
        console.log('[Sync] Sync timeout (>30s), resetting lock...');
        this.isSyncing = false;
      } else {
        return;
      }
    }

    // Online check
    if (!force) {
      const online = await this.isOnline();
      if (!online) return;
    }

    this.isSyncing = true;
    this.syncStartedAt = Date.now();

    try {
      // Wrap in try-catch in case tables don't exist yet
      let pendingItems: any[] = [];
      try {
        pendingItems = db.getAllSync('SELECT * FROM sync_queue WHERE status = ?', ['pending']) as any[];
      } catch (dbErr) {
        console.log('[Sync] sync_queue table not ready yet');
        return;
      }

      if (pendingItems.length === 0) return;

      console.log(`[Sync] Processing ${pendingItems.length} pending item(s)...`);

      for (const item of pendingItems) {
        try {
          // Double check status in case it changed during async operation of previous item
          const currentStatus = db.getFirstSync<{status: string}>('SELECT status FROM sync_queue WHERE id = ?', [item.id]);
          if (!currentStatus || currentStatus.status !== 'pending') continue;

          const data = JSON.parse(item.data);
          let success = false;

          if (item.tableName === 'farms') {
            if (item.action === 'CREATE') {
              success = await this.syncCreateFarm(data);
            } else if (item.action === 'UPDATE') {
              success = await this.syncUpdateFarm(data);
            } else if (item.action === 'DELETE') {
              success = await this.syncDeleteFarm(data);
            }
          } else if (item.tableName === 'user_profile') {
            if (item.action === 'UPDATE') {
              success = await this.syncUpdateProfile(data);
            }
          } else if (item.tableName === 'animals') {
            if (item.action === 'CREATE') {
              success = await this.syncCreateAnimal(data);
            } else if (item.action === 'UPDATE') {
              success = await this.syncUpdateAnimal(data);
            } else if (item.action === 'DELETE') {
              success = await this.syncDeleteAnimal(data);
            }
          }

          if (success) {
            db.runSync('UPDATE sync_queue SET status = ? WHERE id = ?', ['synced', item.id]);
            console.log(`[Sync] ✓ Synced item ${item.id} (${item.action} ${item.tableName})`);
          }
        } catch (error) {
          console.error(`[Sync] Error processing queue item ${item.id}:`, error);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // --- Farm Sync Actions ---

  async syncCreateFarm(farmData: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/farms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(farmData),
      });

      if (response.ok) {
        const newFarm = await response.json();
        try {
            const exists = db.getFirstSync('SELECT id FROM farms WHERE id = ?', [newFarm._id]);
            if (exists) {
                db.runSync('DELETE FROM farms WHERE tempId = ?', [farmData.tempId]);
            } else {
                db.runSync(
                  'UPDATE farms SET id = ?, syncStatus = ? WHERE tempId = ?',
                  [newFarm._id, 'synced', farmData.tempId]
                );
            }
        } catch (dbError) {
            console.error("Local DB update failed after successful sync:", dbError);
            // We return true because the server part succeeded. 
            // Retrying would cause duplicate farms on server.
            // The local DB is now slightly inconsistent (pending farm vs server farm), 
            // but next pullFarms will fix it.
            return true;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Sync Create Farm Failed:", error);
      return false;
    }
  }

  async syncUpdateFarm(farmData: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/farms/${farmData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(farmData),
      });
      if (response.ok) {
        db.runSync('UPDATE farms SET syncStatus = ? WHERE id = ?', ['synced', farmData._id]);
        return true;
      }
      return false;
    } catch (error) {
        console.error("Sync Update Farm Failed:", error);
        return false;
    }
  }

  async syncDeleteFarm(farmData: any) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/farms/${farmData._id}`, {
            method: 'DELETE',
        });
        if (response.ok) {
             // Already deleted locally, just confirm sync
             return true; 
        }
        return false;
      } catch (error) {
          console.error("Sync Delete Farm Failed:", error);
          return false;
      }
  }

  async syncUpdateProfile(profileData: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/farmers/${profileData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        db.runSync('UPDATE user_profile SET syncStatus = ? WHERE id = ?', ['synced', profileData._id]);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Sync Update Profile Failed:", error);
      return false;
    }
  }

  // --- Animal Sync Actions ---

  async syncCreateAnimal(animalData: any) {
    try {
      let body;
      let headers: Record<string, string> = {};

      if (animalData.imageUri) {
        const formData = new FormData();
        formData.append('name', animalData.name);
        formData.append('rfid', animalData.rfid);
        formData.append('species', animalData.species);
        formData.append('breed', animalData.breed);
        formData.append('gender', animalData.gender);
        formData.append('age', String(animalData.age));
        formData.append('ageUnit', animalData.ageUnit);
        formData.append('farmId', animalData.farmId);
        // @ts-ignore
        formData.append('image', {
          uri: animalData.imageUri,
          name: 'animal.jpg',
          type: 'image/jpeg',
        });
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          name: animalData.name,
          rfid: animalData.rfid,
          species: animalData.species,
          breed: animalData.breed,
          gender: animalData.gender,
          age: animalData.age,
          ageUnit: animalData.ageUnit,
          farmId: animalData.farmId,
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/animals`, {
        method: 'POST',
        headers,
        body,
      });

      if (response.ok) {
        const result = await response.json();
        const newAnimal = result.animal || result;
        try {
          const exists = db.getFirstSync('SELECT id FROM animals WHERE id = ?', [newAnimal._id]);
          if (exists) {
            db.runSync('DELETE FROM animals WHERE tempId = ?', [animalData.tempId]);
          } else {
            db.runSync(
              'UPDATE animals SET id = ?, syncStatus = ?, imageUrl = ? WHERE tempId = ?',
              [newAnimal._id, 'synced', newAnimal.imageUrl || animalData.imageUrl || null, animalData.tempId]
            );
          }
        } catch (dbError) {
          console.error("Local DB update failed after successful animal sync:", dbError);
          return true; 
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Sync Create Animal Failed:", error);
      return false;
    }
  }

  async syncUpdateAnimal(animalData: any) {
    try {
      let body;
      let headers: Record<string, string> = {};

      if (animalData.imageUri) {
        const formData = new FormData();
        formData.append('name', animalData.name);
        formData.append('rfid', animalData.rfid);
        formData.append('species', animalData.species);
        formData.append('breed', animalData.breed);
        formData.append('gender', animalData.gender);
        formData.append('age', String(animalData.age));
        formData.append('ageUnit', animalData.ageUnit);
        formData.append('farmId', animalData.farmId);
        // @ts-ignore
        formData.append('image', {
          uri: animalData.imageUri,
          name: 'animal.jpg',
          type: 'image/jpeg',
        });
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          name: animalData.name,
          rfid: animalData.rfid,
          species: animalData.species,
          breed: animalData.breed,
          gender: animalData.gender,
          age: animalData.age,
          ageUnit: animalData.ageUnit,
          farmId: animalData.farmId,
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/animals/${animalData._id}`, {
        method: 'PUT',
        headers,
        body,
      });

      if (response.ok) {
        // Also update imageUrl if returned, or at least mark synced
        const result = await response.json();
        const updatedAnimal = result.animal || result;
        
        db.runSync(
          'UPDATE animals SET syncStatus = ?, imageUrl = ? WHERE id = ?', 
          ['synced', updatedAnimal.imageUrl || animalData.imageUrl || null, animalData._id]
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Sync Update Animal Failed:", error);
      return false;
    }
  }

  async syncDeleteAnimal(animalData: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/animals/${animalData._id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // Already deleted locally, just confirm sync
        return true;
      }
      return false;
    } catch (error) {
      console.error("Sync Delete Animal Failed:", error);
      return false;
    }
  }

  // --- Pull Data ---

  async pullFarms(farmerId: string) {
    if (this.isSyncing || !(await this.isOnline())) return;
    this.isSyncing = true;

    try {
      const response = await fetch(`${API_BASE_URL}/api/farms?farmerId=${farmerId}`);
      if (response.ok) {
        const farms = await response.json();
        
        // We only want to replace 'synced' data. 
        // Pending data (unsynced local changes) should strictly overwrite cloud data in UI until synced.
        
        db.runSync('DELETE FROM farms WHERE syncStatus = ?', ['synced']); 
        
        const statement = db.prepareSync(
            'INSERT OR REPLACE INTO farms (id, name, location, imageUrl, coordinates, farmerId, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        
        for (const farm of farms) {
             // Check if we have a pending local update for this farm, if so, skip overwriting ?
             // For simplicity, we just insert. If there was a pending UPDATE for a synced farm, 
             // it usually has the same ID. INSERT OR REPLACE will overwrite our local pending update!
             // This is bad. We must NOT overwrite if status is 'pending'.
             const local = db.getFirstSync<{syncStatus: string}>('SELECT syncStatus FROM farms WHERE id = ?', [farm._id]);
             if (local && local.syncStatus === 'pending') {
                 continue; 
             }

             statement.executeSync([
                farm._id, 
                farm.name, 
                farm.location, 
                farm.imageUrl || '', 
                JSON.stringify(farm.coordinates), 
                farm.farmerId, 
                'synced'
            ]);
        }
        statement.finalizeSync();
      }
    } catch (error) {
      console.error("Error pulling farms:", error);
    } finally {
        this.isSyncing = false;
    }
  }

  async pullAnimals(farmId?: string) {
    if (this.isSyncing || !(await this.isOnline())) return;
    this.isSyncing = true;

    try {
      const url = farmId 
        ? `${API_BASE_URL}/api/animals?farmId=${farmId}` 
        : `${API_BASE_URL}/api/animals`;
      const response = await fetch(url);
      
      if (response.ok) {
        const animals = await response.json();
        
        // Only delete synced records to preserve pending local changes
        if (farmId) {
          db.runSync('DELETE FROM animals WHERE syncStatus = ? AND farmId = ?', ['synced', farmId]);
        } else {
          db.runSync('DELETE FROM animals WHERE syncStatus = ?', ['synced']);
        }
        
        for (const a of animals) {
          // Skip if we have a pending local change for this animal
          const local = db.getFirstSync<{syncStatus: string}>('SELECT syncStatus FROM animals WHERE id = ?', [a._id]);
          if (local && local.syncStatus === 'pending') continue;

          db.runSync(
            'INSERT OR REPLACE INTO animals (id, name, rfid, species, breed, gender, age, ageUnit, farmId, farmName, farmLocation, imageUrl, createdAt, updatedAt, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              a._id ?? null,
              a.name ?? '',
              a.rfid ?? '',
              a.species ?? '',
              a.breed ?? '',
              a.gender ?? '',
              a.age ?? 0,
              a.ageUnit ?? 'months',
              (a.farmId?._id || a.farmId) ?? null,
              a.farmId?.name ?? null,
              a.farmId?.location ?? null,
              a.imageUrl ?? null,
              a.createdAt ?? new Date().toISOString(),
              a.updatedAt ?? new Date().toISOString(),
              'synced',
            ]
          );
        }
      }
    } catch (error) {
      console.error("Error pulling animals:", error);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncService = new SyncService();

