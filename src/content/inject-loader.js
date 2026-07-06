/**
 * Stealth Raider — injection bridge (ISOLATED world, document_start).
 *
 * The real spoofing happens in the page's own JS context (MAIN world), which
 * cannot touch chrome.* APIs. This bridge is the courier: it injects the
 * MAIN-world spoofer as early as possible, then hands it the active identity
 * read from extension storage and keeps it in sync as the identity changes.
 */

(() => {
  const TAG = "__stealthRaider";
  if (window[TAG]) return;
  window[TAG] = true;

  // NOTE: the MAIN-world spoofer (fingerprint-spoof.js) is declared directly in
  // the manifest with "world": "MAIN", so it is installed synchronously at
  // document_start — no async <script> injection, no web-accessible resource,
  // and no injection race. This bridge only couriers the active identity to it.

  // SECURITY: the page's MAIN world is fully readable by any script on the
  // page. Only ever hand it the flags it needs to spoof, and the (already
  // synthetic) identity it is meant to expose. NEVER forward secrets such as
  // proxy credentials, the license, or the wipe configuration.
  const PAGE_SETTING_KEYS = [
    "ghostMode",
    "spoofFingerprint",
    "spoofCanvas",
    "spoofWebgl",
    "spoofAudio",
    "spoofUserAgent",
    "spoofTimezone",
    "spoofLocation",
  ];
  const sanitizeSettings = (s) => {
    if (!s) return null;
    const out = {};
    for (const k of PAGE_SETTING_KEYS) out[k] = !!s[k];
    return out;
  };

  const toPage = (settings, profile) => {
    // Same-window delivery only; targetOrigin "*" here does not cross frames
    // (postMessage to `window` reaches this window's listeners regardless).
    // The payload is non-secret by construction, and "*" avoids throwing on
    // opaque ("null") origins in about:blank / sandboxed frames.
    window.postMessage(
      { __sr: true, dir: "toPage", settings: sanitizeSettings(settings), profile: profile || null },
      "*"
    );
  };

  let pushing = false;
  const pushCurrent = async () => {
    if (pushing) return; // collapse bursts (e.g. a page spamming "ready")
    pushing = true;
    try {
      const { sr_settings, sr_active_profile } = await chrome.storage.local.get([
        "sr_settings",
        "sr_active_profile",
      ]);
      toPage(sr_settings || null, sr_active_profile || null);
    } catch (e) {
      /* extension context invalidated (reloaded) — ignore */
    } finally {
      pushing = false;
    }
  };

  // 2. Push the current identity as soon as we can.
  pushCurrent();

  // 3. If the MAIN script loaded before us, it announces itself — answer it.
  //    Cross-frame forgery is blocked by the same-window (ev.source) check; a
  //    page forging this only re-triggers a (debounced) push of non-secret data
  //    to its own context, which it already controls.
  window.addEventListener("message", (ev) => {
    if (ev.source !== window) return;
    const d = ev.data;
    if (d && d.__sr === true && d.dir === "toContent" && d.type === "ready") pushCurrent();
  });

  // 4. Keep the page in sync when the identity or settings change.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.sr_active_profile || changes.sr_settings) pushCurrent();
  });

  // 5. Instant push from the service worker (e.g. "New Identity" button).
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "SR_PUSH_PROFILE") pushCurrent();
  });
})();
