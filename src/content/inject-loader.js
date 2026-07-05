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

  // 1. Inject the MAIN-world spoofer. It installs its API overrides
  //    synchronously and starts from a safe generic identity until the real
  //    one arrives a few ms later over postMessage.
  try {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("src/content/fingerprint-spoof.js");
    s.async = false;
    (document.head || document.documentElement).prepend(s);
    s.remove(); // element gone; the script has already executed
  } catch (e) {
    /* CSP may block in rare cases; overrides simply won't apply there */
  }

  const toPage = (settings, profile) => {
    window.postMessage(
      { __sr: true, dir: "toPage", settings, profile },
      window.location.origin || "*"
    );
  };

  const pushCurrent = async () => {
    try {
      const { sr_settings, sr_active_profile } = await chrome.storage.local.get([
        "sr_settings",
        "sr_active_profile",
      ]);
      toPage(sr_settings || null, sr_active_profile || null);
    } catch (e) {
      /* extension context invalidated (reloaded) — ignore */
    }
  };

  // 2. Push the current identity as soon as we can.
  pushCurrent();

  // 3. If the MAIN script loaded before us, it announces itself — answer it.
  window.addEventListener("message", (ev) => {
    if (ev.source !== window) return;
    const d = ev.data;
    if (d && d.__sr && d.dir === "toContent" && d.type === "ready") pushCurrent();
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
