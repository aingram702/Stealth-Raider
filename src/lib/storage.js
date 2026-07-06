/**
 * Stealth Raider — typed storage helpers over chrome.storage.local.
 */

import { KEYS, DEFAULT_SETTINGS } from "./constants.js";
import { defaultLicense } from "./license.js";

// Deep-merge stored settings over defaults so new keys added in an update
// don't leave old installs with `undefined` fields.
function mergeSettings(stored) {
  const out = structuredClone(DEFAULT_SETTINGS);
  // Guard against prototype-pollution keys sneaking in via a settings patch.
  const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
  const walk = (target, src) => {
    if (!src || typeof src !== "object") return;
    for (const k of Object.keys(src)) {
      if (FORBIDDEN.has(k) || !Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (
        src[k] &&
        typeof src[k] === "object" &&
        !Array.isArray(src[k]) &&
        target[k] &&
        typeof target[k] === "object"
      ) {
        walk(target[k], src[k]);
      } else {
        target[k] = src[k];
      }
    }
  };
  walk(out, stored);
  return out;
}

export async function getSettings() {
  const res = await chrome.storage.local.get(KEYS.settings);
  return mergeSettings(res[KEYS.settings] || {});
}

export async function setSettings(patch) {
  const current = await getSettings();
  const next = mergeSettings({ ...current, ...patch });
  await chrome.storage.local.set({ [KEYS.settings]: next });
  return next;
}

export async function getProfile() {
  const res = await chrome.storage.local.get(KEYS.profile);
  return res[KEYS.profile] || null;
}

export async function setProfile(profile) {
  await chrome.storage.local.set({ [KEYS.profile]: profile });
  return profile;
}

export async function getLicense() {
  const res = await chrome.storage.local.get(KEYS.license);
  return res[KEYS.license] || defaultLicense();
}

export async function setLicense(license) {
  await chrome.storage.local.set({ [KEYS.license]: license });
  return license;
}

const DEFAULT_STATS = { raidsLaunched: 0, dataWipes: 0, identitiesForged: 0, lastRaidAt: null };

export async function getStats() {
  const res = await chrome.storage.local.get(KEYS.stats);
  return { ...DEFAULT_STATS, ...(res[KEYS.stats] || {}) };
}

export async function bumpStat(field, by = 1) {
  const stats = await getStats();
  stats[field] = (stats[field] || 0) + by;
  if (field === "raidsLaunched") stats.lastRaidAt = Date.now();
  await chrome.storage.local.set({ [KEYS.stats]: stats });
  return stats;
}
