import { db } from '../lib/db';
import NetInfo from '@react-native-community/netinfo';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

class SyncService {
  async isOnline() {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  }

  startMonitoring() {
    return NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log("Internet restored, processing sync queue...");
        this.processQueue();
      }
    });
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
      console.error("Error adding to sync queue:", error);
    }
  }

  private isSyncing = false;

  async processQueue() {
    if (this.isSyncing || !(await this.isOnline())) return;

    this.isSyncing = true;
    try {
      // Fetch all pending items
      const pendingItems = db.getAllSync('SELECT * FROM sync_queue WHERE status = ?', ['pending']);

      for (const item of pendingItems as any[]) {
        try {
          // Double check status incase it changed during async operation of previous item
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
          }

          if (success) {
            db.runSync('UPDATE sync_queue SET status = ? WHERE id = ?', ['synced', item.id]);
          }
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // --- Specific Sync Actions ---

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
}

export const syncService = new SyncService();
