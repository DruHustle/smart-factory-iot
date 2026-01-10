/**
 * A safe wrapper for storage that handles Safari Private Browsing mode
 * and other environments where storage might be restricted.
 * 
 * Falls back to in-memory storage when localStorage/sessionStorage is unavailable.
 */

// In-memory fallback storage
const memoryStorage: Record<string, string> = {};
const sessionMemoryStorage: Record<string, string> = {};

/**
 * Check if a specific storage type is available
 */
const isStorageAvailable = (type: 'localStorage' | 'sessionStorage'): boolean => {
  try {
    const storage = window[type];
    const testKey = '__storage_test_' + Date.now();
    storage.setItem(testKey, testKey);
    const retrieved = storage.getItem(testKey);
    storage.removeItem(testKey);
    return retrieved === testKey;
  } catch (e) {
    // Storage is not available (likely Safari private mode or quota exceeded)
    return false;
  }
};

// Check availability once on load
const storageAvailable = {
  local: isStorageAvailable('localStorage'),
  session: isStorageAvailable('sessionStorage'),
};

/**
 * Safe localStorage wrapper with in-memory fallback
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (storageAvailable.local) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        // Fallback to memory storage if write fails
        return memoryStorage[key] || null;
      }
    }
    return memoryStorage[key] || null;
  },

  setItem: (key: string, value: string): void => {
    if (storageAvailable.local) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // If localStorage fails, use memory storage
        memoryStorage[key] = value;
      }
    } else {
      memoryStorage[key] = value;
    }
  },

  removeItem: (key: string): void => {
    if (storageAvailable.local) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        delete memoryStorage[key];
      }
    } else {
      delete memoryStorage[key];
    }
  },

  clear: (): void => {
    if (storageAvailable.local) {
      try {
        localStorage.clear();
      } catch (e) {
        Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
      }
    } else {
      Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable: (): boolean => storageAvailable.local,
};

/**
 * Safe sessionStorage wrapper with in-memory fallback
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (storageAvailable.session) {
      try {
        return sessionStorage.getItem(key);
      } catch (e) {
        return sessionMemoryStorage[key] || null;
      }
    }
    return sessionMemoryStorage[key] || null;
  },

  setItem: (key: string, value: string): void => {
    if (storageAvailable.session) {
      try {
        sessionStorage.setItem(key, value);
      } catch (e) {
        sessionMemoryStorage[key] = value;
      }
    } else {
      sessionMemoryStorage[key] = value;
    }
  },

  removeItem: (key: string): void => {
    if (storageAvailable.session) {
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        delete sessionMemoryStorage[key];
      }
    } else {
      delete sessionMemoryStorage[key];
    }
  },

  clear: (): void => {
    if (storageAvailable.session) {
      try {
        sessionStorage.clear();
      } catch (e) {
        Object.keys(sessionMemoryStorage).forEach(key => delete sessionMemoryStorage[key]);
      }
    } else {
      Object.keys(sessionMemoryStorage).forEach(key => delete sessionMemoryStorage[key]);
    }
  },

  /**
   * Check if sessionStorage is available
   */
  isAvailable: (): boolean => storageAvailable.session,
};
