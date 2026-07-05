/**
 * Stealth Raider — identity (fingerprint) profile generation.
 *
 * Produces a *coherent* fake browser identity: the user agent, platform,
 * screen metrics, GPU strings, and locale all agree with one another so the
 * spoofed fingerprint reads as a plausible real machine rather than a random
 * grab-bag that anti-bot systems flag instantly.
 */

// A small, deterministic PRNG so a given seed always yields the same identity.
export function makeRng(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function next() {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// Believable, current-ish desktop identity templates. Each is internally
// consistent (a Windows machine gets a Windows UA, platform, and GPU).
const TEMPLATES = [
  {
    os: "Windows",
    platform: "Win32",
    ua: (v) =>
      `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
    gpus: [
      { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
      { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
      { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    ],
    screens: [
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
      { width: 1366, height: 768 },
    ],
    memory: [8, 16, 32],
    cores: [4, 8, 12, 16],
  },
  {
    os: "macOS",
    platform: "MacIntel",
    ua: (v) =>
      `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
    gpus: [
      { vendor: "Google Inc. (Apple)", renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)" },
      { vendor: "Google Inc. (Apple)", renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)" },
      { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics, OpenGL 4.1)" },
    ],
    screens: [
      { width: 1440, height: 900 },
      { width: 1680, height: 1050 },
      { width: 2560, height: 1600 },
    ],
    memory: [8, 16, 24, 32],
    cores: [8, 10, 12],
  },
  {
    os: "Linux",
    platform: "Linux x86_64",
    ua: (v) =>
      `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
    gpus: [
      { vendor: "Google Inc. (NVIDIA Corporation)", renderer: "ANGLE (NVIDIA Corporation, NVIDIA GeForce GTX 1660/PCIe/SSE2, OpenGL 4.6)" },
      { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Mesa Intel(R) UHD Graphics (CML GT2), OpenGL 4.6)" },
    ],
    screens: [
      { width: 1920, height: 1080 },
      { width: 1600, height: 900 },
    ],
    memory: [8, 16, 32],
    cores: [4, 8, 16],
  },
];

const CHROME_MAJORS = [124, 125, 126, 127, 128];

const LOCALES = [
  { language: "en-US", languages: ["en-US", "en"] },
  { language: "en-GB", languages: ["en-GB", "en"] },
  { language: "de-DE", languages: ["de-DE", "de", "en"] },
  { language: "fr-FR", languages: ["fr-FR", "fr", "en"] },
  { language: "ja-JP", languages: ["ja-JP", "ja", "en"] },
  { language: "pt-BR", languages: ["pt-BR", "pt", "en"] },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

/** Rough offset (minutes, in the JS getTimezoneOffset sense) for coherence. */
const TZ_OFFSETS = {
  "America/New_York": 300,
  "America/Chicago": 360,
  "America/Los_Angeles": 480,
  "Europe/London": 0,
  "Europe/Berlin": -60,
  "Europe/Paris": -60,
  "Asia/Tokyo": -540,
  "Australia/Sydney": -600,
};

/** Generate a fresh random seed. */
export function newSeed() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build a full identity profile.
 * @param {object} [opts]
 * @param {string} [opts.seed] deterministic seed; random if omitted
 * @param {{latitude:number,longitude:number,tz?:string}|null} [opts.geo]
 */
export function generateProfile(opts = {}) {
  const seed = opts.seed || newSeed();
  const rng = makeRng(seed);

  const tpl = pick(rng, TEMPLATES);
  const chromeMajor = pick(rng, CHROME_MAJORS);
  const gpu = pick(rng, tpl.gpus);
  const screen = pick(rng, tpl.screens);
  const locale = pick(rng, LOCALES);
  const cores = pick(rng, tpl.cores);
  const memory = pick(rng, tpl.memory);

  // Location can force a matching timezone for coherence.
  let timezone = pick(rng, TIMEZONES);
  let geo = null;
  if (opts.geo && Number.isFinite(opts.geo.latitude)) {
    geo = {
      latitude: opts.geo.latitude,
      longitude: opts.geo.longitude,
      accuracy: 20 + Math.floor(rng() * 40),
    };
    if (opts.geo.tz) timezone = opts.geo.tz;
  }

  const dockedH = 40 + Math.floor(rng() * 40); // taskbar/menu bar
  return {
    seed,
    createdAt: Date.now(),
    os: tpl.os,
    userAgent: tpl.ua(chromeMajor),
    appVersion: tpl.ua(chromeMajor).replace("Mozilla/", ""),
    platform: tpl.platform,
    vendor: "Google Inc.",
    chromeMajor,
    hardwareConcurrency: cores,
    deviceMemory: memory,
    language: locale.language,
    languages: locale.languages,
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.width,
      availHeight: screen.height - dockedH,
      colorDepth: 24,
      pixelDepth: 24,
    },
    webgl: { vendor: gpu.vendor, renderer: gpu.renderer },
    // Deterministic per-seed jitter used to perturb canvas/audio readouts.
    noise: {
      canvas: Math.floor(rng() * 1e6),
      audio: (rng() * 0.0002 - 0.0001), // tiny gain offset
      webglHash: Math.floor(rng() * 1e6),
    },
    timezone,
    timezoneOffset: TZ_OFFSETS[timezone] ?? 0,
    geolocation: geo,
  };
}
