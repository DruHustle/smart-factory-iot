/**
 * Utility to detect Safari private browsing mode
 * Used to determine whether to use localStorage or sessionStorage
 */

/**
 * Detect if the browser is in private/incognito mode
 * This works across different browsers including Safari
 */
export function isPrivateBrowsingMode(): Promise<boolean> {
  return new Promise((resolve) => {
    // For Safari and most modern browsers
    const test = '__private_mode_test__';
    
    try {
      // Try to use localStorage
      localStorage.setItem(test, test);
      const value = localStorage.getItem(test);
      localStorage.removeItem(test);
      
      // If we can store and retrieve, we're not in private mode
      if (value === test) {
        resolve(false);
        return;
      }
    } catch (e) {
      // If we get an error, we're likely in private mode
      resolve(true);
      return;
    }
    
    // Additional check for Safari private mode
    // In Safari private mode, localStorage is available but throws on write
    try {
      const storage = window.localStorage;
      const x = '__safari_private_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      resolve(false);
    } catch (e) {
      resolve(true);
    }
  });
}

/**
 * Synchronous version of private mode detection
 * Note: This may not be 100% accurate in all cases
 */
export function isPrivateBrowsingModeSync(): boolean {
  try {
    const test = '__private_mode_test__';
    localStorage.setItem(test, test);
    const value = localStorage.getItem(test);
    localStorage.removeItem(test);
    return value !== test;
  } catch (e) {
    return true;
  }
}

/**
 * Get the recommended storage type based on private mode detection
 */
export function getRecommendedStorage(): 'localStorage' | 'sessionStorage' {
  return isPrivateBrowsingModeSync() ? 'sessionStorage' : 'localStorage';
}
