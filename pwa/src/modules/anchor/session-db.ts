/**
 * Anchor module — IndexedDB Persistence Layer
 *
 * Manages sessions, track points, active state, and logbook entries.
 */

export interface AnchorSession {
  id?: number;
  anchorLat: number;
  anchorLng: number;
  radius: number;
  bufferRadius: number | null;
  sectorEnabled: boolean;
  sectorBearing: number;
  sectorWidth: number;
  startTime: number;
  endTime: number | null;
  chainLengthM: number | null;
  depthM: number | null;
  alarmTriggered: boolean;
  alarmCount: number;
  maxDistance: number;
  maxSog: number;
}

export interface TrackPoint {
  id?: number;
  sessionId: number;
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: number;
  distance: number;
  alarmState: string;
}

export interface ActiveState {
  key: string;
  isAnchored: boolean;
  anchorLat: number;
  anchorLng: number;
  radius: number;
  bufferRadius: number | null;
  sectorEnabled: boolean;
  sectorBearing: number;
  sectorWidth: number;
  sessionId: number | null;
  anchorStartTime: number;
  maxDistanceSwing: number;
  maxSogDuringAnchor: number;
  chainLengthM: number | null;
  depthM: number | null;
  unit: string;
}

export interface LogbookEntry {
  id?: number;
  sessionId: number;
  createdAt: number;
  summary: string;
  logEntry: string;
  safetyNote: string;
  isAiGenerated: boolean;
}

export interface SessionStats {
  totalSessions: number;
  totalAlarms: number;
  totalDuration: number;
  maxDistance: number;
  maxSog: number;
  avgDuration: number;
}

export class SessionDB {
  db: IDBDatabase | null = null;
  private DB_NAME = 'AnchorAlertDB';
  private DB_VERSION = 2;

  open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
          store.createIndex('startTime', 'startTime', { unique: false });
        }
        if (!db.objectStoreNames.contains('trackpoints')) {
          const store = db.createObjectStore('trackpoints', { keyPath: 'id', autoIncrement: true });
          store.createIndex('sessionId', 'sessionId', { unique: false });
        }
        if (!db.objectStoreNames.contains('activeState')) {
          db.createObjectStore('activeState', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('logbook')) {
          const logStore = db.createObjectStore('logbook', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
      request.onsuccess = (e: Event) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };
      request.onerror = (e: Event) => reject((e.target as IDBOpenDBRequest).error);
    });
  }

  private _tx(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    const tx = this.db!.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  private _req<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async createSession(session: Omit<AnchorSession, 'id'>): Promise<number> {
    return this._req(this._tx('sessions', 'readwrite').add(session)) as Promise<number>;
  }

  async updateSession(id: number, updates: Partial<AnchorSession>): Promise<void> {
    const store = this._tx('sessions', 'readwrite');
    const existing = await this._req(store.get(id));
    if (existing) {
      Object.assign(existing, updates);
      await this._req(store.put(existing));
    }
  }

  async getSession(id: number): Promise<AnchorSession | undefined> {
    return this._req(this._tx('sessions').get(id));
  }

  async getAllSessions(): Promise<AnchorSession[]> {
    return this._req(this._tx('sessions').index('startTime').getAll());
  }

  async deleteSession(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['trackpoints', 'sessions', 'logbook'], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      const trackStore = tx.objectStore('trackpoints');
      const sessionStore = tx.objectStore('sessions');
      const logStore = tx.objectStore('logbook');

      // Delete trackpoints for this session
      const trackIdx = trackStore.index('sessionId');
      const trackReq = trackIdx.getAll(id);
      trackReq.onsuccess = () => {
        for (const p of trackReq.result) trackStore.delete((p as TrackPoint).id!);
      };

      // Delete logbook entries for this session
      const logIdx = logStore.index('sessionId');
      const logReq = logIdx.getAll(id);
      logReq.onsuccess = () => {
        for (const e of logReq.result) logStore.delete((e as LogbookEntry).id!);
      };

      // Delete the session itself
      sessionStore.delete(id);
    });
  }

  async addTrackPoint(point: Omit<TrackPoint, 'id'>): Promise<number> {
    return this._req(this._tx('trackpoints', 'readwrite').add(point)) as Promise<number>;
  }

  async addTrackPointsBatch(points: Omit<TrackPoint, 'id'>[]): Promise<void> {
    const store = this._tx('trackpoints', 'readwrite');
    for (const p of points) store.add(p);
  }

  async getTrackPoints(sessionId: number): Promise<TrackPoint[]> {
    return this._req(this._tx('trackpoints').index('sessionId').getAll(sessionId));
  }

  async saveActiveState(state: Omit<ActiveState, 'key'>): Promise<void> {
    await this._req(this._tx('activeState', 'readwrite').put({ key: 'current', ...state }));
  }

  async getActiveState(): Promise<ActiveState | undefined> {
    return this._req(this._tx('activeState').get('current'));
  }

  async clearActiveState(): Promise<void> {
    await this._req(this._tx('activeState', 'readwrite').delete('current'));
  }

  async addLogbookEntry(entry: Omit<LogbookEntry, 'id'>): Promise<number> {
    return this._req(this._tx('logbook', 'readwrite').add(entry)) as Promise<number>;
  }

  async getLogbookEntries(sessionId: number): Promise<LogbookEntry[]> {
    return this._req(this._tx('logbook').index('sessionId').getAll(sessionId));
  }

  async getAllLogbookEntries(): Promise<LogbookEntry[]> {
    return this._req(this._tx('logbook').getAll());
  }

  async deleteLogbookEntries(sessionId: number): Promise<void> {
    const store = this._tx('logbook', 'readwrite');
    const idx = store.index('sessionId');
    const entries = await this._req(idx.getAll(sessionId));
    for (const e of entries) store.delete((e as LogbookEntry).id!);
  }

  async getStats(): Promise<SessionStats> {
    const sessions = await this.getAllSessions();
    return calculateSessionStats(sessions);
  }
}

/** Pure stats calculation — extracted for testability. */
export function calculateSessionStats(sessions: AnchorSession[]): SessionStats {
  const completed = sessions.filter((s) => s.endTime);
  const totalAlarms = completed.reduce((sum, s) => sum + (s.alarmCount || 0), 0);
  const totalDuration = completed.reduce((sum, s) => sum + ((s.endTime || 0) - s.startTime), 0);
  const maxDist = completed.reduce((max, s) => Math.max(max, s.maxDistance || 0), 0);
  const maxSog = completed.reduce((max, s) => Math.max(max, s.maxSog || 0), 0);
  return {
    totalSessions: completed.length,
    totalAlarms,
    totalDuration,
    maxDistance: maxDist,
    maxSog,
    avgDuration: completed.length > 0 ? totalDuration / completed.length : 0,
  };
}
