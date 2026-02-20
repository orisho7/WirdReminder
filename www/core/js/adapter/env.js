/**
 * env.js - Environment Detection Utility
 * Helps identify the current runtime environment.
 */

export const env = {
    /**
     * Is the current environment a browser extension (Chrome, Firefox, etc.)?
     */
    isExtension: typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id,

    /**
     * Is the current environment Firefox specific?
     */
    isFirefox: typeof browser !== 'undefined' && !!browser.runtime,

    /**
     * Is the current environment a standard Web/PWA context?
     */
    isWeb: typeof window !== 'undefined' && !(typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id),

    /**
     * Detection for mobile (Capacitor/Native)
     */
    isMobile: typeof window !== 'undefined' && !!window.Capacitor && window.Capacitor.isNativePlatform,

    /**
     * Current Application Version (synced from package.json)
     */
    version: '1.3.4'
};
