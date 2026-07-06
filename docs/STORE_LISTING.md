# Chrome Web Store — listing copy

Copy-paste source for the Web Store developer dashboard. Every field is sized to
the store's limits. Keep claims consistent with `PRIVACY.md` and `SECURITY.md` —
reviewers reject privacy extensions that overstate anonymity.

---

## Product name
> Shown from the manifest `name`. Max 75 chars.

**Stealth Raider**

*Optional, more discoverable variant (update `manifest.json` `name` to match if
you use it):*
`Stealth Raider — Anti-Fingerprint, Proxy & Privacy`

---

## Summary / short description
> Manifest `description`. Max 132 chars. (Currently 111.)

Covert browsing kit: spoof your fingerprint, location & IP, run incognito raids, and self-destruct every trace.

---

## Category
**Privacy & Security**

## Language
English (United States)

---

## Detailed description
> Max 16,000 chars. Plain text with line breaks (no Markdown rendering).

Get in. Get out. Unnoticed.

Named for the B-21 Raider stealth bomber, Stealth Raider is a covert-ops privacy
kit for missions where staying invisible is the whole point. It masks the
signals sites use to identify you, runs your sessions in disposable incognito
windows, routes your IP through a proxy, and self-destructs every trace when the
mission ends — all from a sleek cockpit dashboard.

WHAT IT DOES

• Fingerprint spoofing — Overrides the browser signals trackers read
  (navigator, screen, hardware, Client Hints) with a coherent fake identity
  where every value agrees with the others, so it reads as a real machine.

• Canvas, WebGL & Audio protection — Adds tiny, per-session noise so your
  canvas/WebGL/audio fingerprint is stable within a session but unique across
  identities — defeating the hashes trackers use to follow you.

• Location cloak — Overrides the Geolocation API and timezone to a city you
  choose.

• IP cloaking — Routes your traffic through a proxy so sites see the proxy's IP
  instead of yours. Bring your own SOCKS/HTTP proxy for free, or use one-click
  managed Stealth Servers with a Pro subscription.

• Incognito raids — Every "raid" opens in a fresh incognito window.

• Self-destruct — Wipe cookies, cache, history, storage and more — automatically
  when a raid ends, or instantly with the Self-Destruct button.

• Extra hardening — WebRTC leak protection, third-party cookie blocking, Do Not
  Track + Global Privacy Control signals, referrer stripping, and blocking of
  hyperlink auditing and prefetch.

• Panic key — One shortcut (Ctrl/Cmd+Shift+X) aborts the raid, scrubs
  everything, and forges a fresh identity.

DESIGNED FOR CLARITY

A stealth-bomber cockpit UI: a quick-access popup for launching raids and
toggling systems, plus a full dashboard with live readouts of your active
identity, network route, and mission stats.

HONEST ABOUT WHAT AN EXTENSION CAN DO

We don't sell magic invisibility. A browser extension cannot invent a new IP by
itself — real IP cloaking needs a proxy behind it, which Stealth Raider
configures (yours or ours). Fingerprint and location spoofing are highly
effective against common trackers, but a determined adversary doing deep
analysis may still find tells. This is strong privacy hardening, not a
guarantee of anonymity.

PRIVACY

Stealth Raider has no analytics, no telemetry, and no tracking. It does not
collect or transmit your data. Your settings and identity stay on your device.
Full details: see the Privacy Policy.

RESPONSIBLE USE

Stealth Raider is built for lawful use — protecting your own privacy, security
research, and authorized testing. You are responsible for complying with the
terms of the sites you visit and with applicable law.

FREE & PRO

The free tier includes the full core stealth kit. Raider Pro adds managed
Stealth Servers (one-click IP regions), location cloaking, and identity
auto-rotation. Squadron adds team features.

---

## Single purpose description
> Required field. One sentence on the extension's single purpose.

Stealth Raider protects user privacy by spoofing the browser's fingerprint,
location, and IP (via proxy), running sessions in incognito, and clearing
browsing data to prevent tracking.

---

## Permission justifications
> Required. Paste one per permission in the dashboard's "Privacy practices" tab.

proxy —
Used to route the user's traffic through a proxy they configure (or a managed
server they subscribe to) so websites see the proxy's IP instead of the user's
real IP. Core to the IP-cloaking feature.

privacy —
Used to toggle Chrome's own privacy protections on the user's behalf: WebRTC IP
leak protection, blocking third-party cookies, disabling network prediction /
prefetch, and disabling hyperlink auditing.

browsingData —
Used to clear the user's browsing data (cookies, cache, history, storage) for
the Self-Destruct and auto-wipe features that remove traces after a session.

declarativeNetRequest —
Used to add privacy request headers (DNT and Global Privacy Control) and to
strip the Referer header, reducing what sites learn about the user.

webRequest and webRequestAuthProvider —
Used solely to supply the username/password for the user's own configured proxy
when that proxy issues an authentication challenge. Credentials are sent only to
the exact proxy the user configured.

storage —
Used to save the user's settings and their active spoofing identity locally on
their device.

tabs and webNavigation —
Used to launch "raid" windows and to know when a raid window closes so the
extension can clear the traces created during it.

scripting —
Supports applying the spoofing configuration to pages.

Host permission (all sites) —
Fingerprint and location spoofing must run on every site the user visits to be
effective, since any site can attempt to fingerprint the user. The extension
does not read or transmit page content; it only overrides the JavaScript APIs
used for fingerprinting.

---

## Data usage disclosures
> "Privacy practices" tab checkboxes/certifications.

Data collected: NONE.

Check these certifications (all true for this extension):
• I do not sell or transfer user data to third parties, outside of the approved
  use cases.
• I do not use or transfer user data for purposes that are unrelated to my
  item's single purpose.
• I do not use or transfer user data to determine creditworthiness or for
  lending purposes.

Notes for the reviewer:
The extension performs no analytics and makes no network requests of its own in
the free tier. Settings and the spoofing identity are stored locally via
chrome.storage. If the user configures a proxy, their normal browsing traffic is
routed to the proxy they chose — the extension itself does not receive that
traffic. Proxy credentials are stored locally and sent only to the user's
configured proxy.

---

## Privacy policy URL
Host `PRIVACY.md` (e.g. GitHub Pages or the repo's raw URL) and paste that link.
Example:
https://github.com/aingram702/Stealth-Raider/blob/main/PRIVACY.md

---

## Screenshots (ready to upload — 1280×800)
> Store accepts 1280×800 or 640×400. Generated from the live extension via
> `node tools/generate-screenshots.mjs` (or `npm run screenshots`).
> Upload in this order; captions below.

1. `docs/screenshots/01-popup-1280x800.png` —
   "Arm your systems and launch a raid in one click."
2. `docs/screenshots/02-dashboard-1280x800.png` —
   "Mission control: live identity, network route, and stats at a glance."
3. `docs/screenshots/03-identity-1280x800.png` —
   "A coherent spoofed fingerprint you can regenerate anytime."
4. `docs/screenshots/04-network-1280x800.png` —
   "Cloak your IP with your own proxy or managed Stealth Servers."
5. `docs/screenshots/05-session-1280x800.png` —
   "Choose exactly what Self-Destruct erases."

## Promotional images (ready to upload)
Generated at the store's exact required sizes:

• Small promo tile — 440×280 — `docs/promo/small-tile-440x280.png`
• Marquee promo tile — 1400×560 — `docs/promo/marquee-1400x560.png`

Both carry the wordmark, the tagline "Get in. Get out. Unnoticed.", the
flying-wing mark, and the cockpit HUD styling. To regenerate after a design
tweak: `node tools/generate-promo.mjs` (or the scratch script used to build them).

## Search / discovery terms
privacy, anti-fingerprint, fingerprint spoofing, incognito, proxy, anti-tracking,
canvas blocker, WebRTC leak, clear cookies, do not track
