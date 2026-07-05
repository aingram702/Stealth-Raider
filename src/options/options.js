/* Stealth Raider — cockpit (options) controller. */

import { MSG, APP, LOCATION_PRESETS } from "../lib/constants.js";
import { TIERS, STEALTH_SERVERS, getTier, hasFeature } from "../lib/license.js";

const $ = (id) => document.getElementById(id);
const send = (type, extra = {}) =>
  new Promise((res) => chrome.runtime.sendMessage({ type, ...extra }, res));

let STATE = null;

// -------------------------------------------------------------- tabs
function showTab(name) {
  document.querySelectorAll(".nav").forEach((n) => n.classList.toggle("active", n.dataset.tab === name));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  history.replaceState(null, "", "#" + name);
}
document.querySelectorAll(".nav").forEach((n) =>
  n.addEventListener("click", () => showTab(n.dataset.tab))
);

// -------------------------------------------------------------- toast
let toastTimer;
function toast(text, kind) {
  const t = $("toast");
  t.textContent = text;
  t.className = "toast show" + (kind === "alert" ? " alert" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), 2400);
}

// -------------------------------------------------------------- static UI
function buildLocationPresets() {
  const sel = $("locPreset");
  sel.innerHTML = "";
  LOCATION_PRESETS.forEach((p) => {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = p.label;
    sel.appendChild(o);
  });
}

function buildServers(license, settings) {
  const list = $("serverList");
  list.innerHTML = "";
  const canUse = hasFeature(license, "managedServers");
  STEALTH_SERVERS.forEach((s) => {
    const el = document.createElement("div");
    el.className = "server" + (canUse ? "" : " locked") +
      (settings.proxy.presetId === s.id ? " active" : "");
    el.innerHTML = `<span class="server__flag">${s.region}</span><span class="server__label">${s.label}</span><span class="server__lock">${canUse ? "▸" : "🔒"}</span>`;
    el.addEventListener("click", async () => {
      if (!canUse) { showTab("upgrade"); toast("Stealth Servers need Raider Pro", "alert"); return; }
      // A real backend would return live endpoint creds here; we record the
      // selection so the provisioning layer can bind it.
      const res = await send(MSG.SET_SETTINGS, {
        patch: { proxy: { ...settings.proxy, presetId: s.id }, proxyEnabled: true },
      });
      STATE.settings = res.settings;
      buildServers(license, res.settings);
      toast(`Routing via ${s.label}`);
    });
    list.appendChild(el);
  });
}

function buildTiers(license) {
  const wrap = $("tiers");
  wrap.innerHTML = "";
  const currentId = getTier(license).id;
  ["recruit", "raider", "squadron"].forEach((id) => {
    const t = TIERS[id];
    const el = document.createElement("div");
    el.className = "panel panel--bracket tier" + (id === currentId ? " current" : "");
    const feats = {
      recruit: ["Fingerprint + UA spoof", "Canvas / WebGL / audio", "Incognito raids", "Self-destruct wipe", "Manual proxy", "WebRTC guard"],
      raider: ["Everything in Recruit", "Managed Stealth Servers", "One-click IP regions", "Location cloaking", "Auto identity rotation", "Profile vault"],
      squadron: ["Everything in Raider Pro", "Shared server pools", "Team policy sync", "Priority support"],
    }[id];
    el.innerHTML = `
      <div class="tier__name">${t.label}</div>
      <div class="tier__price">${t.price}</div>
      <div class="tier__tag">${t.tagline}</div>
      <ul>${feats.map((f) => `<li>${f}</li>`).join("")}</ul>
      <span class="pill ${id === currentId ? "pill--live" : ""} tier__badge">${id === currentId ? "ACTIVE" : t.price === "Free" ? "INCLUDED" : "UPGRADE"}</span>`;
    wrap.appendChild(el);
  });
}

// -------------------------------------------------------------- render
function render(state) {
  STATE = state;
  const { settings, profile, license, stats } = state;
  const armed = !!settings.ghostMode;
  const tier = getTier(license);

  $("tierPill").textContent = tier.label.toUpperCase();
  $("tierPill").className = "pill" + (tier.id !== "recruit" ? " pill--pro" : "");
  $("ghostToggle").checked = armed;
  $("armMiniStatus").textContent = armed ? "ARMED" : "STANDBY";
  $("armMiniStatus").classList.toggle("on", armed);

  // Dashboard status.
  $("radar").classList.toggle("off", !armed);
  $("heroStatus").textContent = armed ? "ARMED" : "STANDBY";
  document.querySelector(".status-hero").classList.toggle("on", armed);
  $("heroHint").textContent = armed ? "Signature masked · ready to raid" : "Signature exposed";
  $("mRaids").textContent = stats.raidsLaunched || 0;
  $("mWipes").textContent = stats.dataWipes || 0;
  $("mIds").textContent = stats.identitiesForged || 0;

  // Toggle inputs (settings + scopes).
  document.querySelectorAll("[data-setting]").forEach((el) => {
    el.checked = !!settings[el.dataset.setting];
  });
  document.querySelectorAll("[data-scope]").forEach((el) => {
    el.checked = !!settings.wipeScope[el.dataset.scope];
  });

  // Proxy form.
  $("proxyScheme").value = settings.proxy.scheme;
  $("proxyHost").value = settings.proxy.host || "";
  $("proxyPort").value = settings.proxy.port || "";
  $("proxyUser").value = settings.proxy.username || "";
  $("proxyPass").value = settings.proxy.password || "";

  // Location.
  $("locPreset").value = settings._geoPresetId || "nul";
  $("geoProTag").hidden = hasFeature(license, "spoofLocation");

  // Profile readouts.
  if (profile) {
    const net = settings.proxyEnabled && settings.proxy.host
      ? `${settings.proxy.scheme}://${settings.proxy.host}:${settings.proxy.port}`
      : settings.proxy.presetId ? `Stealth Server · ${settings.proxy.presetId}` : "direct (real IP)";
    const geoTxt = settings.spoofLocation && profile.geolocation
      ? `${profile.geolocation.latitude.toFixed(3)}, ${profile.geolocation.longitude.toFixed(3)}` : "device default";

    // Dashboard
    $("dSystem").textContent = `${profile.os} · ${profile.platform}`;
    $("dAgent").textContent = profile.userAgent;
    $("dGpu").textContent = profile.webgl.renderer;
    $("dScreen").textContent = `${profile.screen.width}×${profile.screen.height}`;
    $("dLocale").textContent = `${profile.language} · ${profile.timezone}`;
    $("dGeo").textContent = geoTxt;
    $("dNet").textContent = net;

    // Identity tab
    $("idSeed").textContent = "#" + String(profile.seed).toUpperCase();
    $("idOs").textContent = `${profile.os} · ${profile.platform}`;
    $("idUa").textContent = profile.userAgent;
    $("idGpuV").textContent = profile.webgl.vendor;
    $("idGpuR").textContent = profile.webgl.renderer;
    $("idScreen").textContent = `${profile.screen.width}×${profile.screen.height} (avail ${profile.screen.availWidth}×${profile.screen.availHeight})`;
    $("idHw").textContent = `${profile.hardwareConcurrency} cores · ${profile.deviceMemory} GB`;
    $("idLang").textContent = profile.languages.join(", ");
    $("idTz").textContent = `${profile.timezone} (UTC${profile.timezoneOffset <= 0 ? "+" : "-"}${Math.abs(profile.timezoneOffset / 60)})`;
  }

  buildServers(license, settings);
  buildTiers(license);
  $("verTag").textContent = "v" + APP.version;
}

async function refresh() {
  render(await send(MSG.GET_STATE));
}

// -------------------------------------------------------------- wiring
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

document.querySelectorAll("[data-scope]").forEach((el) => {
  el.addEventListener("change", async () => {
    const scope = { ...STATE.settings.wipeScope, [el.dataset.scope]: el.checked };
    const res = await send(MSG.SET_SETTINGS, { patch: { wipeScope: scope } });
    STATE.settings = res.settings;
  });
});

$("locPreset").addEventListener("change", async (e) => {
  const preset = LOCATION_PRESETS.find((p) => p.id === e.target.value);
  const geo = preset && preset.lat != null
    ? { latitude: preset.lat, longitude: preset.lon, tz: preset.tz } : null;
  await send(MSG.SET_SETTINGS, { patch: { _geoPresetId: preset.id, _geoPreset: geo } });
  // Regenerate the identity so timezone + coords stay coherent.
  const res = await send(MSG.NEW_IDENTITY);
  if (res?.ok) { STATE.profile = res.profile; await refresh(); toast("Location set · identity re-forged"); }
});

$("saveProxyBtn").addEventListener("click", async () => {
  const proxy = {
    ...STATE.settings.proxy,
    scheme: $("proxyScheme").value,
    host: $("proxyHost").value.trim(),
    port: Number($("proxyPort").value) || 1080,
    username: $("proxyUser").value.trim(),
    password: $("proxyPass").value,
    presetId: "",
  };
  const res = await send(MSG.SET_SETTINGS, { patch: { proxy } });
  STATE.settings = res.settings;
  toast(proxy.host ? "Proxy saved" : "Proxy cleared");
});

$("launchBtn").addEventListener("click", async () => {
  const res = await send(MSG.LAUNCH_RAID, {});
  if (res?.ok) {
    toast(res.incognito ? "RAID LAUNCHED · incognito" : "RAID LAUNCHED");
    if (res.incognitoAvailable === false) toast("Enable 'Allow in incognito' for full stealth", "alert");
    setTimeout(refresh, 400);
  } else toast("Launch failed", "alert");
});

const regen = async () => {
  const res = await send(MSG.NEW_IDENTITY);
  if (res?.ok) { render({ ...STATE, profile: res.profile }); toast("NEW IDENTITY FORGED"); setTimeout(refresh, 300); }
};
$("newIdentityBtn").addEventListener("click", regen);
$("regenBtn").addEventListener("click", regen);

// Destructive wipes — two-click confirm.
function armConfirm(btn, label, action) {
  let armed = false, timer;
  btn.addEventListener("click", async () => {
    if (!armed) {
      armed = true; btn.dataset.orig = btn.textContent; btn.textContent = "☢ Confirm — irreversible";
      timer = setTimeout(() => { armed = false; btn.textContent = btn.dataset.orig; }, 3000);
      return;
    }
    clearTimeout(timer); armed = false; btn.textContent = btn.dataset.orig; btn.disabled = true;
    await action();
    btn.disabled = false;
  });
}
armConfirm($("selfDestructBtn"), "", async () => {
  const res = await send(MSG.SELF_DESTRUCT, { since: 0 });
  toast(res?.ok ? "TRACES ERASED" : "Wipe failed", res?.ok ? undefined : "alert");
  setTimeout(refresh, 300);
});
armConfirm($("wipeNowBtn"), "", async () => {
  const res = await send(MSG.SELF_DESTRUCT, { since: 0 });
  toast(res?.ok ? "TRACES ERASED" : "Wipe failed", res?.ok ? undefined : "alert");
  setTimeout(refresh, 300);
});

$("activateBtn").addEventListener("click", async () => {
  const key = $("licenseKey").value.trim();
  const res = await send(MSG.ACTIVATE_LICENSE, { key });
  const msg = $("licenseMsg");
  if (res?.ok) {
    STATE.license = res.license;
    msg.textContent = `Activated: ${getTier(res.license).label}. Welcome aboard.`;
    msg.style.color = "var(--hud)";
    render(STATE);
    toast("LICENSE ACTIVATED");
  } else {
    msg.textContent = res?.error || "Activation failed.";
    msg.style.color = "var(--alert)";
  }
});

// -------------------------------------------------------------- boot
buildLocationPresets();
const initialTab = (location.hash || "#dashboard").slice(1);
showTab(["dashboard","identity","network","hardening","session","upgrade","about"].includes(initialTab) ? initialTab : "dashboard");
refresh();
