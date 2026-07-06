# Security Audit — Stealth Raider

**Scope:** the entire extension (manifest, background service worker, content
scripts, popup, cockpit/options, shared libraries).
**Date:** 2026-07-06 · **Version audited:** 1.0.0 → **1.0.1 (remediated)**
**Method:** manual source review across the standard browser-extension threat
classes (data exfiltration via `postMessage`, DOM-XSS sinks, message-sender
trust, prototype pollution, credential handling, permission surface, CSP),
plus in-browser dynamic verification with a headless Chromium harness.

All findings below have been **remediated and re-verified**.

---

## Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| F1 | **High** | Proxy credentials broadcast to every web page via `postMessage` | ✅ Fixed |
| F2 | **Medium** | DOM-XSS sink in popup via user-controlled proxy host | ✅ Fixed |
| F3 | **Medium** | Privileged service-worker messages accepted without sender authentication | ✅ Fixed |
| F4 | **Medium** | Prototype pollution in the settings merge | ✅ Fixed |
| F5 | **Low** | Proxy password sent to any challenging proxy, not just the configured one | ✅ Fixed |
| F6 | **Low** | Proxy configuration passed to `chrome.proxy` without validation | ✅ Fixed |
| F7 | **Low** | `postMessage` origin/robustness + message-forgery hardening | ✅ Fixed |
| F8 | Hardening | No explicit Content-Security-Policy for extension pages | ✅ Added |
| F9 | Hardening | Web-accessible spoofer script exposed the extension ID to all pages | ✅ Removed |
| F10 | Info | Client-side license is not a security boundary | ✅ Documented |

> A functional bug was surfaced during dynamic testing: the fingerprint spoofer
> was injected as an async `<script>` that was removed before it loaded, so
> **spoofing never actually applied to pages**. Fixed by declaring it as a
> `world: "MAIN"` content script (see F9). Now verified working end-to-end.

---

## Findings & remediations

### F1 — Proxy credentials leaked to every page *(High)*
**Where:** `src/content/inject-loader.js`
**Issue:** the bridge posted the *entire* settings object — including
`proxy.username` and `proxy.password` — into the page's MAIN world via
`window.postMessage`. Any script on any visited site could add a `message`
listener and harvest the user's proxy credentials.
**Fix:** the bridge now sends only a strict allowlist of non-secret flags
(`ghostMode` + the spoof toggles) plus the already-synthetic identity. Secrets
(proxy creds, license, wipe config) never leave the privileged context.
**Verified:** planted `SECRET_USER`/`SECRET_PASS` in storage, loaded a real
page, captured the delivered message → neither secret nor any `proxy` key is
present; identity and spoof flags still delivered.

### F2 — DOM-XSS via proxy host in the popup *(Medium)*
**Where:** `src/popup/popup.js`
**Issue:** the network readout used `innerHTML` with `settings.proxy.host`
(user-supplied). A crafted host injected markup into the popup, which executes
with **extension privileges** (`chrome.*`) — a path to reading storage or
wiping data. A user pasting a malicious "proxy host" from a phishing lure would
be enough.
**Fix:** replaced all HTML sinks with a `setDD()` helper that uses
`textContent`/`createElement`. No user-derived string reaches `innerHTML`.

### F3 — Unauthenticated privileged messages *(Medium)*
**Where:** `src/background/service-worker.js`
**Issue:** `onMessage` performs destructive/privileged actions (self-destruct,
panic wipe, settings changes, license activation) and trusted any sender.
**Fix:** added `isTrustedSender()` — every message must come from one of our own
extension pages (`sender.id === runtime.id` **and** `sender.url` starts with the
extension origin). Content scripts and web pages are rejected. The browser sets
`sender`; a page cannot forge it.

### F4 — Prototype pollution in settings merge *(Medium)*
**Where:** `src/lib/storage.js`
**Issue:** the recursive `mergeSettings` walk copied arbitrary keys from a patch;
a `__proto__`/`constructor` key could pollute `Object.prototype`.
**Fix:** the walk skips `__proto__`/`constructor`/`prototype` and non-own
properties.
**Verified:** a `{"__proto__":{"polluted":true}}` patch leaves
`({}).polluted === undefined` while a legitimate patch still applies.

### F5 — Proxy password sent to the wrong proxy *(Low)*
**Where:** `src/background/service-worker.js` (`onAuthRequired`)
**Issue:** credentials were returned for **any** proxy 407 challenge (e.g. a
rogue captive portal), not only the configured proxy.
**Fix:** credentials are supplied only when proxying is enabled **and** the
challenger's host/port matches the configured, validated proxy.

### F6 — Unvalidated proxy configuration *(Low)*
**Where:** `src/background/service-worker.js` (`applyProxy`)
**Fix:** added `sanitizeProxy()` — scheme allowlist (`http/https/socks4/socks5`),
host character allowlist (hostnames / IPv4 / bracketed IPv6), and port clamped
to 1–65535. Invalid configs clear the proxy instead of applying garbage.

### F7 — postMessage robustness & forgery *(Low)*
**Where:** `src/content/inject-loader.js`, `src/content/fingerprint-spoof.js`
**Fixes:** cross-frame forgery already blocked by the same-window `ev.source`
check; tightened message-shape checks to `__sr === true`; debounced the
`ready`-triggered storage read to prevent a page-driven busy-loop; the payload
is now non-secret by construction so the `"*"` target origin carries no risk (it
does not cross frames). A page forging config only affects its own context,
which it inherently controls.

### F8 — Explicit CSP *(Hardening)*
**Where:** `manifest.json`
**Fix:** added `content_security_policy.extension_pages`:
`script-src 'self'; object-src 'self'; base-uri 'none'; form-action 'none'`.

### F9 — Web-accessible script / injection race *(Hardening + bug)*
**Where:** `manifest.json`, `src/content/inject-loader.js`
**Issue:** the spoofer was a `web_accessible_resource` injected via a `<script>`
tag — this (a) exposed the extension ID to every page (an extension-detection
vector) and (b) was removed before it finished loading, so spoofing silently
failed.
**Fix:** the spoofer is now a declarative `world: "MAIN"` content script. The
web-accessible resource was removed entirely (smaller fingerprint surface), and
overrides install synchronously at `document_start` with no race.
**Verified:** on a live page, `navigator.userAgent`, `platform`,
`hardwareConcurrency`, and timezone all match the spoofed identity.

### F10 — Client-side license is not a trust boundary *(Info)*
The offline key decode in `src/lib/license.js` is a **development stub**, clearly
marked `TODO(monetization)`. It must be replaced with server-side signed
verification before any paid tier ships. It gates convenience features, not
security; treat any client-side unlock as spoofable by design.

---

## Residual risk & accepted trade-offs

- **Broad permissions** (`<all_urls>`, `webRequest`, `proxy`, `privacy`,
  `browsingData`). Each is justified (fingerprint/location spoofing must run
  everywhere; `webRequest` is only for proxy auth). This is inherent to the
  product and will draw Web Store review scrutiny — keep `PRIVACY.md` accurate.
- **A page can undo spoofing in its own context.** Any site can redefine the
  overridden getters in its own MAIN world; no extension can prevent this. Our
  overrides defeat *passive* fingerprinting, not a site actively fighting back.
- **`stripReferrer`** removes the `Referer` header globally when enabled; a few
  sites use it for CSRF defenses. It is user-toggleable and off nothing
  security-critical for the user's own session.
- **Proxy credentials at rest** live in `chrome.storage.local` in cleartext
  (standard for extensions; the OS profile is the trust boundary).

## Verification harness

Findings were confirmed fixed by loading the unpacked extension in headless
Chromium and asserting behavior at runtime: no secret reaches page context
(F1), spoofing applies to `navigator`/screen/timezone (F9), prototype pollution
is blocked (F4), and the popup/cockpit still operate through the authenticated
message channel (F3). Service worker registered with zero console errors after
all changes.
