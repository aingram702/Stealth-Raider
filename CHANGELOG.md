# Changelog

All notable changes to Stealth Raider are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [1.0.1] — 2026-07-06

### Security
Full security audit + remediation (see [`SECURITY.md`](SECURITY.md)):
- **[High]** Stopped proxy credentials from being broadcast to every web page
  via `postMessage`; the page now receives only non-secret spoof flags + the
  synthetic identity.
- **[Medium]** Removed a DOM-XSS sink in the popup (proxy host was rendered via
  `innerHTML`); all readouts now use `textContent`.
- **[Medium]** Service worker now authenticates message senders — privileged
  actions (wipe, panic, settings, license) accept only our own extension pages.
- **[Medium]** Hardened the settings merge against prototype pollution.
- **[Low]** Proxy password is now sent only to the exact configured proxy; proxy
  config is validated (scheme/host/port) before use.
- Added an explicit `content_security_policy` for extension pages.
- Removed the web-accessible spoofer resource (smaller fingerprint surface).

### Fixed
- **Fingerprint spoofing now actually applies to pages.** The MAIN-world spoofer
  is declared as a `world: "MAIN"` content script instead of an async
  `<script>` injection that was being removed before it loaded. Verified:
  `navigator`, screen, hardware, and timezone all reflect the spoofed identity.

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
