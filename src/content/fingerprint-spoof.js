/**
 * Stealth Raider — fingerprint spoofer (MAIN world, document_start).
 *
 * Runs inside the page's own JS context so it can redefine the objects that
 * fingerprinting scripts read: navigator, screen, WebGL, canvas, audio,
 * timezone, and geolocation. It cannot use chrome.* APIs — the ISOLATED
 * bridge (inject-loader.js) couriers the active identity to it via postMessage.
 *
 * Design notes:
 *  • Overrides are installed synchronously, right now, from a generic default
 *    identity. The real per-session identity replaces it a few ms later when
 *    the bridge posts it. Every override reads `state` live, so the switch is
 *    seamless and no real value is ever exposed once Ghost Mode is on.
 *  • Canvas/WebGL/audio spoofing adds tiny, *deterministic* per-identity noise
 *    so the fingerprint is stable within a session (won't trip "randomizer"
 *    detectors) but unique across identities.
 *  • Wrapped functions report native-looking toString() output to resist the
 *    cheapest tamper checks.
 */

(() => {
  "use strict";

  // ---- live state ---------------------------------------------------------
  const DEFAULT = {
    seed: "00000000",
    userAgent: navigator.userAgent,
    appVersion: navigator.appVersion,
    platform: navigator.platform,
    vendor: "Google Inc.",
    hardwareConcurrency: 8,
    deviceMemory: 8,
    language: "en-US",
    languages: ["en-US", "en"],
    chromeMajor: 126,
    screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24 },
    webgl: { vendor: "Google Inc.", renderer: "ANGLE (Generic)" },
    noise: { canvas: 12345, audio: 0.00005, webglHash: 6789 },
    timezone: "America/New_York",
    timezoneOffset: 300,
    geolocation: null,
  };

  const state = {
    enabled: true,
    fp: false, canvas: false, webgl: false, audio: false, ua: false, tz: false, geo: false,
    profile: DEFAULT,
  };

  const applyConfig = (settings, profile) => {
    if (profile) state.profile = profile;
    if (settings) {
      state.enabled = settings.ghostMode !== false;
      state.fp = state.enabled && settings.spoofFingerprint !== false;
      state.canvas = state.enabled && settings.spoofCanvas !== false;
      state.webgl = state.enabled && settings.spoofWebgl !== false;
      state.audio = state.enabled && settings.spoofAudio !== false;
      state.ua = state.enabled && settings.spoofUserAgent !== false;
      state.tz = state.enabled && settings.spoofTimezone !== false;
      state.geo = state.enabled && !!settings.spoofLocation && !!state.profile.geolocation;
    } else {
      // No settings yet: assume protective defaults on.
      state.fp = state.canvas = state.webgl = state.audio = state.ua = state.tz = true;
    }
  };
  applyConfig(null, null);

  window.addEventListener("message", (ev) => {
    if (ev.source !== window) return;
    const d = ev.data;
    if (d && d.__sr && d.dir === "toPage") applyConfig(d.settings, d.profile);
  });
  // Announce readiness in case the bridge injected us and is waiting.
  window.postMessage({ __sr: true, dir: "toContent", type: "ready" }, "*");

  // ---- helpers ------------------------------------------------------------
  const nativeStrings = new WeakMap();

  // Mask wrapped functions so fn.toString() looks native.
  const origFnToString = Function.prototype.toString;
  Function.prototype.toString = function () {
    if (nativeStrings.has(this)) return nativeStrings.get(this);
    return origFnToString.call(this);
  };
  nativeStrings.set(Function.prototype.toString, "function toString() { [native code] }");

  const markNative = (fn, name) => {
    nativeStrings.set(fn, `function ${name}() { [native code] }`);
    return fn;
  };

  const defineGetter = (obj, prop, getter) => {
    try {
      Object.defineProperty(obj, prop, { get: markNative(getter, `get ${prop}`), configurable: true, enumerable: true });
    } catch (e) { /* non-configurable — skip */ }
  };

  // Tiny deterministic PRNG (mirrors lib/profiles.js makeRng).
  const makeRng = (seedStr) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => {
      h += 0x6d2b79f5; let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  // ==========================================================================
  // navigator + userAgentData
  // ==========================================================================
  try {
    const nav = Navigator.prototype;
    defineGetter(nav, "userAgent", () => (state.ua ? state.profile.userAgent : DEFAULT.userAgent));
    defineGetter(nav, "appVersion", () => (state.ua ? state.profile.appVersion : DEFAULT.appVersion));
    defineGetter(nav, "platform", () => (state.fp ? state.profile.platform : DEFAULT.platform));
    defineGetter(nav, "vendor", () => (state.fp ? state.profile.vendor : "Google Inc."));
    defineGetter(nav, "language", () => (state.fp ? state.profile.language : DEFAULT.language));
    defineGetter(nav, "languages", () => (state.fp ? Object.freeze([...state.profile.languages]) : DEFAULT.languages));
    defineGetter(nav, "hardwareConcurrency", () => (state.fp ? state.profile.hardwareConcurrency : DEFAULT.hardwareConcurrency));
    defineGetter(nav, "deviceMemory", () => (state.fp ? state.profile.deviceMemory : DEFAULT.deviceMemory));

    // navigator.userAgentData (Client Hints).
    if ("userAgentData" in navigator) {
      const brandsFor = (maj) => [
        { brand: "Chromium", version: String(maj) },
        { brand: "Google Chrome", version: String(maj) },
        { brand: "Not.A/Brand", version: "24" },
      ];
      const platformFor = (os) => (os === "macOS" ? "macOS" : os === "Linux" ? "Linux" : "Windows");
      const uaData = {
        get brands() { return state.ua ? brandsFor(state.profile.chromeMajor) : brandsFor(DEFAULT.chromeMajor); },
        get mobile() { return false; },
        get platform() { return state.fp ? platformFor(state.profile.os) : "Windows"; },
        toJSON() { return { brands: this.brands, mobile: this.mobile, platform: this.platform }; },
        getHighEntropyValues(hints) {
          const p = state.profile;
          const full = {
            architecture: "x86", bitness: "64",
            brands: state.ua ? brandsFor(p.chromeMajor) : brandsFor(DEFAULT.chromeMajor),
            fullVersionList: (state.ua ? brandsFor(p.chromeMajor) : brandsFor(DEFAULT.chromeMajor))
              .map((b) => ({ brand: b.brand, version: `${b.version}.0.0.0` })),
            mobile: false, model: "",
            platform: state.fp ? platformFor(p.os) : "Windows",
            platformVersion: "15.0.0", uaFullVersion: `${p.chromeMajor}.0.0.0`,
            wow64: false,
          };
          const out = {};
          (hints || []).forEach((h) => { if (h in full) out[h] = full[h]; });
          return Promise.resolve(out);
        },
      };
      markNative(uaData.getHighEntropyValues, "getHighEntropyValues");
      defineGetter(nav, "userAgentData", () => uaData);
    }
  } catch (e) { /* navigator hardening failed */ }

  // ==========================================================================
  // screen
  // ==========================================================================
  try {
    const sc = state.profile.screen;
    const g = (k) => () => (state.fp ? state.profile.screen[k] : DEFAULT.screen[k]);
    defineGetter(Screen.prototype, "width", g("width"));
    defineGetter(Screen.prototype, "height", g("height"));
    defineGetter(Screen.prototype, "availWidth", g("availWidth"));
    defineGetter(Screen.prototype, "availHeight", g("availHeight"));
    defineGetter(Screen.prototype, "colorDepth", g("colorDepth"));
    defineGetter(Screen.prototype, "pixelDepth", g("pixelDepth"));
    void sc;
  } catch (e) { /* screen hardening failed */ }

  // ==========================================================================
  // timezone
  // ==========================================================================
  try {
    const origResolved = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = markNative(function () {
      const opts = origResolved.call(this);
      if (state.tz) opts.timeZone = state.profile.timezone;
      return opts;
    }, "resolvedOptions");

    const origOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = markNative(function () {
      return state.tz ? state.profile.timezoneOffset : origOffset.call(this);
    }, "getTimezoneOffset");
  } catch (e) { /* timezone hardening failed */ }

  // ==========================================================================
  // canvas
  // ==========================================================================
  try {
    const perturb = (data, w, h) => {
      const rng = makeRng(`${state.profile.seed}:${state.profile.noise.canvas}:${w}x${h}:${data.length}`);
      for (let i = 0; i < data.length; i += 4) {
        if (rng() < 0.045) {
          const d = rng() < 0.5 ? -1 : 1;
          data[i] = clamp(data[i] + d);
          data[i + 1] = clamp(data[i + 1] + d);
          data[i + 2] = clamp(data[i + 2] + d);
        }
      }
    };

    const CtxProto = CanvasRenderingContext2D.prototype;
    const origGetImageData = CtxProto.getImageData;
    CtxProto.getImageData = markNative(function (x, y, w, h, ...rest) {
      const img = origGetImageData.call(this, x, y, w, h, ...rest);
      if (state.canvas) perturb(img.data, w, h);
      return img;
    }, "getImageData");

    // Encode from a noised *copy* so the visible canvas is never mutated.
    const cloneNoised = (canvas) => {
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return canvas;
      const copy = document.createElement("canvas");
      copy.width = w; copy.height = h;
      const cx = copy.getContext("2d");
      cx.drawImage(canvas, 0, 0);
      const img = origGetImageData.call(cx, 0, 0, w, h);
      perturb(img.data, w, h);
      cx.putImageData(img, 0, 0);
      return copy;
    };

    const CanvasProto = HTMLCanvasElement.prototype;
    const origToDataURL = CanvasProto.toDataURL;
    CanvasProto.toDataURL = markNative(function (...args) {
      if (state.canvas) { try { return origToDataURL.apply(cloneNoised(this), args); } catch (e) {} }
      return origToDataURL.apply(this, args);
    }, "toDataURL");

    const origToBlob = CanvasProto.toBlob;
    if (origToBlob) {
      CanvasProto.toBlob = markNative(function (cb, ...args) {
        if (state.canvas) { try { return origToBlob.apply(cloneNoised(this), [cb, ...args]); } catch (e) {} }
        return origToBlob.apply(this, [cb, ...args]);
      }, "toBlob");
    }
  } catch (e) { /* canvas hardening failed */ }

  // ==========================================================================
  // WebGL (vendor/renderer + readPixels noise)
  // ==========================================================================
  try {
    const patchGL = (proto) => {
      if (!proto) return;
      const origGetParameter = proto.getParameter;
      proto.getParameter = markNative(function (p) {
        if (state.webgl) {
          // UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL
          if (p === 37445) return state.profile.webgl.vendor;
          if (p === 37446) return state.profile.webgl.renderer;
        }
        return origGetParameter.call(this, p);
      }, "getParameter");

      const origReadPixels = proto.readPixels;
      proto.readPixels = markNative(function (x, y, w, h, fmt, type, pixels, ...rest) {
        const r = origReadPixels.call(this, x, y, w, h, fmt, type, pixels, ...rest);
        if (state.webgl && pixels && pixels.length) {
          const rng = makeRng(`${state.profile.seed}:gl:${state.profile.noise.webglHash}:${pixels.length}`);
          for (let i = 0; i < pixels.length; i += 17) {
            if (rng() < 0.5 && typeof pixels[i] === "number") {
              pixels[i] = clamp((pixels[i] | 0) + (rng() < 0.5 ? -1 : 1));
            }
          }
        }
        return r;
      }, "readPixels");
    };
    patchGL(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
    patchGL(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  } catch (e) { /* webgl hardening failed */ }

  // ==========================================================================
  // AudioContext fingerprint
  // ==========================================================================
  try {
    if (window.AnalyserNode) {
      const origFreq = AnalyserNode.prototype.getFloatFrequencyData;
      AnalyserNode.prototype.getFloatFrequencyData = markNative(function (arr) {
        origFreq.call(this, arr);
        if (state.audio) {
          const off = state.profile.noise.audio;
          for (let i = 0; i < arr.length; i++) arr[i] += off * ((i % 7) - 3);
        }
      }, "getFloatFrequencyData");
    }
    if (window.AudioBuffer) {
      const origGetChannel = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = markNative(function (ch) {
        const data = origGetChannel.call(this, ch);
        if (state.audio) {
          const off = state.profile.noise.audio;
          for (let i = 0; i < data.length; i += 1000) data[i] += off;
        }
        return data;
      }, "getChannelData");
    }
  } catch (e) { /* audio hardening failed */ }

  // ==========================================================================
  // Geolocation
  // ==========================================================================
  try {
    if (navigator.geolocation) {
      const makePosition = () => {
        const g = state.profile.geolocation || {};
        return {
          coords: {
            latitude: g.latitude, longitude: g.longitude,
            accuracy: g.accuracy || 25, altitude: null, altitudeAccuracy: null,
            heading: null, speed: null,
          },
          timestamp: Date.now(),
        };
      };
      const geo = navigator.geolocation;
      const origGet = geo.getCurrentPosition.bind(geo);
      const origWatch = geo.watchPosition.bind(geo);
      geo.getCurrentPosition = markNative(function (success, error, opts) {
        if (state.geo && state.profile.geolocation) { try { success(makePosition()); } catch (e) {} return; }
        return origGet(success, error, opts);
      }, "getCurrentPosition");
      geo.watchPosition = markNative(function (success, error, opts) {
        if (state.geo && state.profile.geolocation) { try { success(makePosition()); } catch (e) {} return 0; }
        return origWatch(success, error, opts);
      }, "watchPosition");
    }
  } catch (e) { /* geolocation hardening failed */ }
})();
