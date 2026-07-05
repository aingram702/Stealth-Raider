/**
 * Stealth Raider — shared constants.
 *
 * Imported by the service worker, popup, and options page (all ES modules).
 * Content scripts are self-contained and do NOT import this file.
 */

export const APP = {
  name: "Stealth Raider",
  codename: "B-21",
  version: "1.0.0",
};

/** chrome.storage.local keys. */
export const KEYS = {
  settings: "sr_settings",
  profile: "sr_active_profile",
  license: "sr_license",
  stats: "sr_stats",
};

/** Master feature switches, persisted in settings. */
export const DEFAULT_SETTINGS = {
  // Master arm switch. When false, the extension is fully inert.
  ghostMode: true,

  // Spoofing modules.
  spoofFingerprint: true,
  spoofCanvas: true,
  spoofWebgl: true,
  spoofAudio: true,
  spoofUserAgent: true,
  spoofLocation: false, // opt-in: overrides geolocation + timezone
  spoofTimezone: true,

  // Network / IP.
  proxyEnabled: false,
  proxy: {
    scheme: "socks5", // "http" | "https" | "socks4" | "socks5"
    host: "",
    port: 1080,
    username: "",
    password: "",
    presetId: "", // set when a managed "Stealth Server" is selected (Pro)
  },
  webrtcProtection: true, // stop WebRTC from leaking the real IP

  // Hardening.
  blockThirdPartyCookies: true,
  doNotTrack: true, // DNT + Global Privacy Control signal
  stripReferrer: true,
  blockHyperlinkAuditing: true,
  disablePrefetch: true,

  // Session hygiene.
  autoIncognito: true, // launch raids in incognito windows
  wipeOnRaidEnd: true, // clear browsing data when a raid window closes
  wipeOnStartup: false,
  wipeScope: {
    cookies: true,
    cache: true,
    history: true,
    localStorage: true,
    indexedDB: true,
    serviceWorkers: true,
    passwords: false,
    formData: true,
    downloads: false,
  },

  // Cosmetic.
  reduceMotion: false,
};

/** A spoofed geolocation coordinate the user can pick from the map presets. */
export const LOCATION_PRESETS = [
  { id: "nul", label: "No override", lat: null, lon: null, tz: null },
  { id: "nyc", label: "New York, US", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
  { id: "lon", label: "London, UK", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { id: "ber", label: "Berlin, DE", lat: 52.52, lon: 13.405, tz: "Europe/Berlin" },
  { id: "tok", label: "Tokyo, JP", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
  { id: "syd", label: "Sydney, AU", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
  { id: "sao", label: "São Paulo, BR", lat: -23.5558, lon: -46.6396, tz: "America/Sao_Paulo" },
  { id: "sin", label: "Singapore, SG", lat: 1.3521, lon: 103.8198, tz: "Asia/Singapore" },
];

export const MSG = {
  GET_STATE: "SR_GET_STATE",
  SET_SETTINGS: "SR_SET_SETTINGS",
  TOGGLE_GHOST: "SR_TOGGLE_GHOST",
  LAUNCH_RAID: "SR_LAUNCH_RAID",
  NEW_IDENTITY: "SR_NEW_IDENTITY",
  SELF_DESTRUCT: "SR_SELF_DESTRUCT",
  PANIC: "SR_PANIC",
  ACTIVATE_LICENSE: "SR_ACTIVATE_LICENSE",
  // Runtime → content bridge.
  PUSH_PROFILE: "SR_PUSH_PROFILE",
  // Page (MAIN) ↔ content bridge.
  PAGE_PROFILE: "SR_PAGE_PROFILE",
  PAGE_READY: "SR_PAGE_READY",
};
