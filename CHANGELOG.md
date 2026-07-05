# Changelog

All notable changes to Stealth Raider are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] — 2026-07-05

### Added
- **Fingerprint spoofing** (MAIN-world overrides): `navigator`, `screen`,
  hardware, Client Hints / `userAgentData`, with coherent seeded identities.
- **Canvas, WebGL and Audio** anti-fingerprinting with deterministic per-session
  noise; WebGL vendor/renderer spoofing.
- **Location cloak**: Geolocation API + timezone override with city presets.
- **IP cloaking** via `chrome.proxy` — manual proxy (SOCKS4/5, HTTP/S) with
  authentication, plus a managed "Stealth Servers" flow for paid tiers.
- **Incognito raids** and a **Panic** kill switch (abort + wipe + new identity).
- **Self-destruct / auto-wipe** of browsing data, scoped so auto-wipe never
  touches pre-existing normal browsing; configurable wipe payload.
- **Hardening**: WebRTC leak protection, third-party cookie blocking,
  DNT + Global Privacy Control, referrer stripping, hyperlink-auditing and
  prefetch blocking.
- **Cockpit UI**: stealth-bomber themed popup and full options page with live
  HUD readouts, radar status, and quick toggles.
- **Monetization scaffold**: three tiers gated through a single `hasFeature()`
  switch, license activation flow, and upgrade UI.
- Pure-Python, dependency-free icon generator.
