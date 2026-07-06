/* Stealth Raider — popup controller. */

import { MSG } from "../lib/constants.js";
import { getTier, hasFeature } from "../lib/license.js";

const $ = (id) => document.getElementById(id);
const send = (type, extra = {}) =>
  new Promise((res) => chrome.runtime.sendMessage({ type, ...extra }, res));

let STATE = null;

// -------------------------------------------------------------- rendering
function render(state) {
  STATE = state;
  const { settings, profile, license, stats } = state;
  const armed = !!settings.ghostMode;

  // Tier badge + upsell.
  const tier = getTier(license);
  $("tierPill").textContent = tier.label.toUpperCase();
  $("tierPill").className = "pill" + (tier.id !== "recruit" ? " pill--pro" : "");
  $("upgradeLink").hidden = tier.id !== "recruit";

  // ARM state.
  const armPanel = $("armPanel");
  const app = document.querySelector(".app");
  $("ghostToggle").checked = armed;
  armPanel.classList.toggle("armed", armed);
  app.classList.toggle("disarmed", !armed);
  $("radar").classList.toggle("off", !armed);
  $("armStatus").textContent = armed ? "ARMED" : "STANDBY";
  $("armHint").textContent = armed
    ? "Ghost Mode engaged · signature masked"
    : "Ghost Mode disengaged";

  // Quick toggles.
  document.querySelectorAll("[data-setting]").forEach((el) => {
    el.checked = !!settings[el.dataset.setting];
    el.disabled = !armed && el.dataset.setting !== "autoIncognito";
  });

  // Identity readout.
  if (profile) {
    $("identSeed").textContent = "#" + String(profile.seed).slice(0, 8).toUpperCase();
    $("rSystem").textContent = profile.os + " · " + profile.platform;
    $("rAgent").textContent = "Chrome " + profile.chromeMajor;
    $("rGpu").textContent = shortGpu(profile.webgl.renderer);
    $("rScreen").textContent = `${profile.screen.width}×${profile.screen.height} · ${profile.hardwareConcurrency}c/${profile.deviceMemory}gb`;
    $("rLocale").textContent = profile.language;
    $("rTz").textContent = profile.timezone;
    if (settings.spoofLocation && profile.geolocation) {
      setDD($("rGeo"), `${profile.geolocation.latitude.toFixed(3)}, ${profile.geolocation.longitude.toFixed(3)}`, true);
    } else {
      setDD($("rGeo"), "device default", false);
    }
  }
  // Network status. SECURITY: proxy.host is user input — never interpolate it
  // into innerHTML (the popup runs with extension privileges). Use textContent.
  const net = $("rNet");
  if (settings.proxyEnabled && settings.proxy.host) {
    setDD(net, `${settings.proxy.scheme}://${settings.proxy.host}:${settings.proxy.port}`, true);
  } else if (settings.proxy.presetId) {
    setDD(net, `Stealth Server · ${settings.proxy.presetId}`, true);
  } else {
    setDD(net, "direct (real IP)", false);
  }

  // Stats.
  $("sRaids").textContent = stats.raidsLaunched || 0;
  $("sWipes").textContent = stats.dataWipes || 0;
  $("sIds").textContent = stats.identitiesForged || 0;

  void hasFeature;
}

// Set a readout value without an HTML sink. `accent` wraps it in a themed span.
function setDD(dd, text, accent) {
  dd.textContent = "";
  if (accent) {
    const s = document.createElement("span");
    s.className = "accent";
    s.textContent = text;
    dd.appendChild(s);
  } else {
    dd.textContent = text;
  }
}

function shortGpu(r) {
  const m = /(NVIDIA[^,)]*|Radeon[^,)]*|Intel\(R\)[^,)]*|Apple M\d[^,)]*|GeForce[^,)]*)/i.exec(r || "");
  return (m ? m[1] : r || "—").trim().slice(0, 26);
}

// -------------------------------------------------------------- toast
let toastTimer;
function toast(text, kind) {
  const t = $("toast");
  t.textContent = text;
  t.className = "toast show" + (kind === "alert" ? " alert" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), 2200);
}

// -------------------------------------------------------------- actions
async function refresh() {
  render(await send(MSG.GET_STATE));
}

$("ghostToggle").addEventListener("change", async () => {
  const res = await send(MSG.TOGGLE_GHOST);
  render({ ...STATE, settings: res.settings });
  toast(res.settings.ghostMode ? "SYSTEMS ARMED" : "STANDING DOWN");
});

document.querySelectorAll("[data-setting]").forEach((el) => {
  el.addEventListener("change", async () => {
    const res = await send(MSG.SET_SETTINGS, { patch: { [el.dataset.setting]: el.checked } });
    render({ ...STATE, settings: res.settings });
  });
});

$("launchBtn").addEventListener("click", async () => {
  $("launchBtn").disabled = true;
  const res = await send(MSG.LAUNCH_RAID, {});
  $("launchBtn").disabled = false;
  if (res?.ok) {
    if (res.incognito) toast("RAID LAUNCHED · incognito");
    else if (res.incognitoAvailable === false)
      toast("Enable 'Allow in incognito' for full stealth", "alert");
    else toast("RAID LAUNCHED");
    setTimeout(refresh, 400);
  } else {
    toast("Launch failed", "alert");
  }
});

$("newIdentityBtn").addEventListener("click", async () => {
  const res = await send(MSG.NEW_IDENTITY);
  if (res?.ok) {
    render({ ...STATE, profile: res.profile });
    toast("NEW IDENTITY FORGED");
    setTimeout(refresh, 300);
  }
});

// Two-click confirm for the destructive wipe.
let armDestruct = false;
let destructTimer;
$("selfDestructBtn").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  if (!armDestruct) {
    armDestruct = true;
    btn.textContent = "☢ Confirm Wipe?";
    btn.classList.add("btn--danger");
    clearTimeout(destructTimer);
    destructTimer = setTimeout(() => {
      armDestruct = false;
      btn.textContent = "☢ Self-Destruct";
    }, 3000);
    return;
  }
  clearTimeout(destructTimer);
  armDestruct = false;
  btn.textContent = "☢ Self-Destruct";
  btn.disabled = true;
  const res = await send(MSG.SELF_DESTRUCT, { since: 0 });
  btn.disabled = false;
  toast(res?.ok ? "TRACES ERASED" : "Wipe failed", res?.ok ? undefined : "alert");
  setTimeout(refresh, 300);
});

$("cockpitLink").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
$("upgradeLink").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("src/options/options.html#upgrade") });
});

refresh();
