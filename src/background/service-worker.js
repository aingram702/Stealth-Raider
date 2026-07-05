/**
 * Stealth Raider — background service worker (MV3).
 *
 * Mission control. Owns:
 *   • proxy configuration (IP cloaking)              — chrome.proxy
 *   • privacy hardening toggles                      — chrome.privacy
 *   • referrer / DNT / GPC header rules              — chrome.declarativeNetRequest
 *   • incognito "raid" windows + auto data wipe      — chrome.windows/browsingData
 *   • identity (fingerprint) profile lifecycle       — storage + profiles.js
 *   • panic / self-destruct kill switch              — commands
 *
 * IMPORTANT — honesty about IP spoofing: a browser extension cannot invent a
 * new IP by itself. Real IP cloaking routes traffic through a proxy/SOCKS
 * endpoint. Free tier = user-supplied proxy; Pro tier = managed "Stealth
 * Servers" provisioned by the backend. Everything here configures that path;
 * it does not fabricate a network hop that isn't there.
 */

import { MSG, DEFAULT_SETTINGS } from "../lib/constants.js";
import { generateProfile } from "../lib/profiles.js";
import {
  getSettings,
  setSettings,
  getProfile,
  setProfile,
  getLicense,
  setLicense,
  getStats,
  bumpStat,
} from "../lib/storage.js";
import { hasFeature, activate } from "../lib/license.js";

// Raid windows we opened, tracked so we can wipe when they close. Kept in
// session storage because the SW can be torn down and respawned at any time.
const RAID_KEY = "sr_raids"; // chrome.storage.session: { [windowId]: startedAt }

async function getRaids() {
  const r = await chrome.storage.session.get(RAID_KEY);
  return r[RAID_KEY] || {};
}
async function setRaids(raids) {
  await chrome.storage.session.set({ [RAID_KEY]: raids });
}

// --------------------------------------------------------------------------
// Lifecycle
// --------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  if (!(await getProfile())) {
    await forgeIdentity(settings);
  }
  await applyAll(settings);
  await updateBadge(settings.ghostMode);
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await applyAll(settings);
  await updateBadge(settings.ghostMode);
  if (settings.wipeOnStartup) {
    await wipeData({ since: 0, scope: settings.wipeScope });
  }
});

// --------------------------------------------------------------------------
// Applying settings to the browser
// --------------------------------------------------------------------------

async function applyAll(settings) {
  await Promise.allSettled([
    applyProxy(settings),
    applyPrivacy(settings),
    applyHeaderRules(settings),
  ]);
}

async function applyProxy(settings) {
  try {
    if (!settings.ghostMode || !settings.proxyEnabled || !settings.proxy.host) {
      await chrome.proxy.settings.clear({ scope: "regular" });
      return;
    }
    const { scheme, host, port } = settings.proxy;
    await chrome.proxy.settings.set({
      scope: "regular",
      value: {
        mode: "fixed_servers",
        rules: {
          singleProxy: { scheme, host, port: Number(port) || 1080 },
          bypassList: ["localhost", "127.0.0.1", "[::1]"],
        },
      },
    });
  } catch (e) {
    console.warn("[SR] proxy apply failed:", e);
  }
}

// Supply proxy credentials when the proxy asks for auth.
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (!details.isProxy) {
      callback?.({});
      return;
    }
    getSettings().then((s) => {
      const { username, password } = s.proxy || {};
      if (username) callback?.({ authCredentials: { username, password } });
      else callback?.({});
    });
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

async function trySet(setting, value) {
  try {
    if (setting && setting.set) await setting.set({ value, scope: "regular" });
  } catch (e) {
    /* setting may be controlled by another extension/policy */
  }
}
async function tryClear(setting) {
  try {
    if (setting && setting.clear) await setting.clear({ scope: "regular" });
  } catch (e) {
    /* ignore */
  }
}

async function applyPrivacy(settings) {
  const net = chrome.privacy?.network;
  const sites = chrome.privacy?.websites;
  const on = settings.ghostMode;

  // WebRTC IP leak protection.
  if (net?.webRTCIPHandlingPolicy) {
    if (on && settings.webrtcProtection) {
      await trySet(net.webRTCIPHandlingPolicy, "disable_non_proxied_udp");
    } else {
      await tryClear(net.webRTCIPHandlingPolicy);
    }
  }
  // Network prediction / prefetch.
  if (net?.networkPredictionEnabled) {
    if (on && settings.disablePrefetch) await trySet(net.networkPredictionEnabled, false);
    else await tryClear(net.networkPredictionEnabled);
  }
  // Third-party cookies.
  if (sites?.thirdPartyCookiesAllowed) {
    if (on && settings.blockThirdPartyCookies) await trySet(sites.thirdPartyCookiesAllowed, false);
    else await tryClear(sites.thirdPartyCookiesAllowed);
  }
  // Hyperlink auditing (<a ping>).
  if (sites?.hyperlinkAuditingEnabled) {
    if (on && settings.blockHyperlinkAuditing) await trySet(sites.hyperlinkAuditingEnabled, false);
    else await tryClear(sites.hyperlinkAuditingEnabled);
  }
}

// DNT / Global Privacy Control signals + referrer stripping via DNR.
async function applyHeaderRules(settings) {
  const on = settings.ghostMode;
  const rules = [];

  if (on && settings.doNotTrack) {
    rules.push({
      id: 1,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "DNT", operation: "set", value: "1" },
          { header: "Sec-GPC", operation: "set", value: "1" },
        ],
      },
      condition: { urlFilter: "*", resourceTypes: ALL_RESOURCE_TYPES },
    });
  }
  if (on && settings.stripReferrer) {
    rules.push({
      id: 2,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [{ header: "Referer", operation: "remove" }],
      },
      condition: { urlFilter: "*", resourceTypes: ALL_RESOURCE_TYPES },
    });
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1, 2],
      addRules: rules,
    });
  } catch (e) {
    console.warn("[SR] header rules failed:", e);
  }
}

const ALL_RESOURCE_TYPES = [
  "main_frame", "sub_frame", "stylesheet", "script", "image", "font",
  "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other",
];

// --------------------------------------------------------------------------
// Identity (fingerprint) lifecycle
// --------------------------------------------------------------------------

async function forgeIdentity(settings) {
  const geo =
    settings.spoofLocation && settings._geoPreset
      ? settings._geoPreset
      : null;
  const profile = generateProfile({ geo });
  await setProfile(profile);
  await bumpStat("identitiesForged");
  // Content bridges pick this up via chrome.storage.onChanged automatically;
  // also push directly for instant effect on already-open tabs.
  broadcastProfile(profile).catch(() => {});
  return profile;
}

async function broadcastProfile(profile) {
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(
    tabs.map((t) =>
      t.id != null
        ? chrome.tabs.sendMessage(t.id, { type: MSG.PUSH_PROFILE, profile })
        : null
    )
  );
}

// --------------------------------------------------------------------------
// Raids (incognito windows) + data wipe
// --------------------------------------------------------------------------

async function launchRaid(url) {
  const settings = await getSettings();
  const target = url || "https://duckduckgo.com/";
  const allowedIncognito = await chrome.extension.isAllowedIncognitoAccess?.();

  let win;
  if (settings.autoIncognito) {
    win = await chrome.windows.create({ url: target, incognito: true, focused: true });
  } else {
    win = await chrome.windows.create({ url: target, focused: true });
  }

  const raids = await getRaids();
  raids[win.id] = { startedAt: Date.now(), incognito: !!win.incognito };
  await setRaids(raids);

  await bumpStat("raidsLaunched");
  return {
    ok: true,
    windowId: win.id,
    incognito: !!win.incognito,
    incognitoAvailable: allowedIncognito !== false,
  };
}

chrome.windows.onRemoved.addListener(async (windowId) => {
  const raids = await getRaids();
  const raid = raids[windowId];
  if (!raid) return;
  delete raids[windowId];
  await setRaids(raids);

  const settings = await getSettings();
  if (settings.ghostMode && settings.wipeOnRaidEnd) {
    // Only wipe traces created during (or after) the raid so we never touch
    // the user's pre-existing normal browsing. Incognito data is already
    // discarded by Chrome; this cleans any spill into the regular profile.
    await wipeData({ since: raid.startedAt, scope: settings.wipeScope });
  }
});

async function wipeData({ since = 0, scope }) {
  const s = scope || DEFAULT_SETTINGS.wipeScope;
  const removalOptions = { since };
  const dataToRemove = {
    cookies: !!s.cookies,
    cache: !!s.cache,
    history: !!s.history,
    localStorage: !!s.localStorage,
    indexedDB: !!s.indexedDB,
    serviceWorkers: !!s.serviceWorkers,
    passwords: !!s.passwords,
    formData: !!s.formData,
    downloads: !!s.downloads,
    cacheStorage: !!s.cache,
    fileSystems: !!s.indexedDB,
    webSQL: !!s.indexedDB,
  };
  try {
    await chrome.browsingData.remove(removalOptions, dataToRemove);
    await bumpStat("dataWipes");
    return { ok: true };
  } catch (e) {
    console.warn("[SR] wipe failed:", e);
    return { ok: false, error: String(e) };
  }
}

// PANIC: close every raid window immediately and scrub everything.
async function panic() {
  const raids = await getRaids();
  await Promise.allSettled(
    Object.keys(raids).map((id) => chrome.windows.remove(Number(id)))
  );
  await setRaids({});
  const settings = await getSettings();
  const res = await wipeData({ since: 0, scope: { ...settings.wipeScope, cache: true, cookies: true } });
  // Fresh identity so the next session starts clean.
  await forgeIdentity(settings);
  return res;
}

// --------------------------------------------------------------------------
// Badge
// --------------------------------------------------------------------------

async function updateBadge(ghostMode) {
  try {
    await chrome.action.setBadgeText({ text: ghostMode ? "ON" : "OFF" });
    await chrome.action.setBadgeBackgroundColor({
      color: ghostMode ? "#22d3a8" : "#64748b",
    });
  } catch (e) {
    /* action may be unavailable */
  }
}

// --------------------------------------------------------------------------
// Commands (keyboard shortcuts)
// --------------------------------------------------------------------------

chrome.commands?.onCommand.addListener(async (command) => {
  if (command === "panic") await panic();
  if (command === "launch-raid") await launchRaid();
});

// --------------------------------------------------------------------------
// Message router (popup / options / content bridge)
// --------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg?.type) {
      case MSG.GET_STATE: {
        const [settings, profile, license, stats] = await Promise.all([
          getSettings(), getProfile(), getLicense(), getStats(),
        ]);
        sendResponse({ settings, profile, license, stats });
        break;
      }
      case MSG.PAGE_READY: {
        // Content bridge asking for the current identity for its tab.
        const [settings, profile] = await Promise.all([getSettings(), getProfile()]);
        sendResponse({ settings, profile });
        break;
      }
      case MSG.SET_SETTINGS: {
        const next = await setSettings(msg.patch || {});
        await applyAll(next);
        await updateBadge(next.ghostMode);
        sendResponse({ ok: true, settings: next });
        break;
      }
      case MSG.TOGGLE_GHOST: {
        const cur = await getSettings();
        const next = await setSettings({ ghostMode: !cur.ghostMode });
        await applyAll(next);
        await updateBadge(next.ghostMode);
        sendResponse({ ok: true, settings: next });
        break;
      }
      case MSG.NEW_IDENTITY: {
        const settings = await getSettings();
        const profile = await forgeIdentity(settings);
        sendResponse({ ok: true, profile });
        break;
      }
      case MSG.LAUNCH_RAID: {
        sendResponse(await launchRaid(msg.url));
        break;
      }
      case MSG.SELF_DESTRUCT: {
        const settings = await getSettings();
        const res = await wipeData({
          since: msg.since ?? 0,
          scope: msg.scope || settings.wipeScope,
        });
        sendResponse(res);
        break;
      }
      case MSG.PANIC: {
        sendResponse(await panic());
        break;
      }
      case MSG.ACTIVATE_LICENSE: {
        const result = await activate(msg.key);
        if (result.ok) await setLicense(result.license);
        sendResponse(result);
        break;
      }
      default:
        sendResponse({ ok: false, error: "unknown message" });
    }
  })();
  return true; // async response
});

// Expose a couple of helpers for feature-gating checks from messages.
export { hasFeature };
