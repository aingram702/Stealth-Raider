/**
 * Stealth Raider — Web Store screenshot generator.
 *
 * Loads the unpacked extension in headless Chromium and captures the store
 * media set at 1280×800:
 *   01 popup hero (live popup composited on a themed stage)
 *   02 dashboard   03 identity   04 network   05 session
 *
 * Requires Playwright:  npm i -D playwright && npx playwright install chromium
 * Run:                  node tools/generate-screenshots.mjs   (or: npm run screenshots)
 */

import { chromium } from "playwright";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs", "screenshots");
fs.mkdirSync(OUT, { recursive: true });
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "sr-shots-"));

const ctx = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [
    "--headless=new",
    `--disable-extensions-except=${ROOT}`,
    `--load-extension=${ROOT}`,
    "--force-color-profile=srgb",
  ],
});

let sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 20000 }));
const extId = new URL(sw.url()).host;
const optUrl = `chrome-extension://${extId}/src/options/options.html`;
const popUrl = `chrome-extension://${extId}/src/popup/popup.html`;
const send = (page, msg) => page.evaluate((m) => new Promise((r) => chrome.runtime.sendMessage(m, r)), msg);

// Seed a Pro license + a proxy so the media shows the product at its best.
const seed = await ctx.newPage();
await seed.goto(optUrl, { waitUntil: "domcontentloaded" });
await send(seed, { type: "SR_ACTIVATE_LICENSE", key: "SR-RAID-7K2M-7QX4-ABCD" });
await send(seed, { type: "SR_SET_SETTINGS", patch: {
  proxyEnabled: true,
  proxy: { scheme: "socks5", host: "gateway.stealth-servers.net", port: 1080, username: "", password: "", presetId: "uk" },
} });
await seed.close();

// Cockpit tabs.
const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(optUrl, { waitUntil: "networkidle" });
for (const [tab, file] of [
  ["dashboard", "02-dashboard-1280x800.png"],
  ["identity", "03-identity-1280x800.png"],
  ["network", "04-network-1280x800.png"],
  ["session", "05-session-1280x800.png"],
]) {
  await page.click(`.nav[data-tab="${tab}"]`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: 1280, height: 800 } });
  console.log("wrote docs/screenshots/" + file);
}
await page.close();

// Popup hero (composited on the extension origin so the iframe is same-origin).
const hero = await ctx.newPage();
await hero.setViewportSize({ width: 1280, height: 800 });
await hero.goto(popUrl, { waitUntil: "domcontentloaded" });
await hero.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box;}
  :root{--hud:#22d3a8;--hud-dim:#178f74;--ink:#e6f0f3;--ink-mid:#93a4ae;--mono:'DejaVu Sans Mono',monospace;--sans:'DejaVu Sans',system-ui,sans-serif;}
  html,body{width:1280px;height:800px;overflow:hidden;font-family:var(--sans);color:var(--ink);}
  .stage{position:relative;width:1280px;height:800px;display:flex;align-items:center;gap:70px;padding:0 90px;
    background:radial-gradient(120% 120% at 78% -10%,#16303a 0%,#0a1015 46%,#05080b 100%);}
  .stage::before{content:"";position:absolute;inset:0;
    background-image:linear-gradient(rgba(34,211,168,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,168,0.06) 1px,transparent 1px);
    background-size:34px 34px;mask-image:radial-gradient(130% 100% at 80% 0%,#000 35%,transparent 100%);}
  .copy{position:relative;z-index:2;max-width:560px;}
  .kicker{font-family:var(--mono);letter-spacing:0.3em;color:var(--hud-dim);text-transform:uppercase;font-size:14px;margin-bottom:20px;}
  h1{font-family:var(--mono);font-weight:700;letter-spacing:0.02em;font-size:52px;line-height:1.05;margin-bottom:18px;text-shadow:0 0 24px rgba(34,211,168,0.3);}
  h1 .t{color:var(--hud);}
  p{color:var(--ink-mid);font-size:19px;line-height:1.6;margin-bottom:26px;}
  .chips{display:flex;gap:10px;flex-wrap:wrap;}
  .chip{font-family:var(--mono);text-transform:uppercase;letter-spacing:0.08em;font-size:12px;color:var(--ink-mid);border:1px solid #1c2731;background:rgba(34,211,168,0.05);border-radius:999px;padding:8px 14px;}
  .device{position:relative;z-index:2;flex:none;width:360px;border-radius:18px;overflow:hidden;border:1px solid #223;box-shadow:0 30px 80px rgba(0,0,0,0.6),0 0 40px rgba(34,211,168,0.18);}
  iframe{width:360px;height:640px;border:0;display:block;}
</style></head><body>
  <div class="stage">
    <div class="copy">
      <div class="kicker">B-21 · Covert Ops</div>
      <h1>Arm your systems.<br><span class="t">Launch a raid</span> in one click.</h1>
      <p>Stealth Raider masks your fingerprint, location and IP, runs the session in incognito, and self-destructs every trace when you're done.</p>
      <div class="chips"><span class="chip">Fingerprint Spoof</span><span class="chip">IP Cloak</span><span class="chip">Incognito</span><span class="chip">Self-Destruct</span></div>
    </div>
    <div class="device"><iframe src="${popUrl}"></iframe></div>
  </div>
</body></html>`, { waitUntil: "networkidle" });
await hero.waitForTimeout(1200);
await hero.screenshot({ path: path.join(OUT, "01-popup-1280x800.png"), clip: { x: 0, y: 0, width: 1280, height: 800 } });
console.log("wrote docs/screenshots/01-popup-1280x800.png");
await hero.close();

await ctx.close();
console.log("done");
