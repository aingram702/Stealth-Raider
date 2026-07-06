/**
 * Stealth Raider — promotional image generator.
 *
 * Renders the Chrome Web Store promo tiles at their exact required sizes:
 *   • Small promo tile   440 × 280   docs/promo/small-tile-440x280.png
 *   • Marquee promo tile 1400 × 560  docs/promo/marquee-1400x560.png
 *
 * The design is drawn as HTML + inline SVG (so the flying-wing mark stays crisp)
 * and screenshotted with headless Chromium.
 *
 * Requires Playwright:  npm i -D playwright && npx playwright install chromium
 * Run:                  node tools/generate-promo.mjs   (or: npm run promo)
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "promo");
fs.mkdirSync(OUT, { recursive: true });

const WING = "50,15 94,66 70,60 60,74 50,66 40,74 30,60 6,66";

const badge = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#12242c"/><stop offset="100%" stop-color="#070b0e"/>
    </radialGradient>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e6f0f3"/><stop offset="100%" stop-color="#aebfc6"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="1.1" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <circle cx="50" cy="50" r="49" fill="url(#bg)" stroke="#1c2731" stroke-width="1.2"/>
  <circle cx="50" cy="50" r="45" fill="none" stroke="#22d3a8" stroke-width="1.1" opacity="0.7" filter="url(#glow)"/>
  <g opacity="0.35" stroke="#22d3a8" stroke-width="0.5">
    <circle cx="50" cy="50" r="36" fill="none"/><circle cx="50" cy="50" r="26" fill="none"/>
  </g>
  <polygon points="${WING}" fill="url(#skin)" stroke="#6cd0be" stroke-width="1.3" stroke-linejoin="round"/>
</svg>`;

const chips = (items) => items.map((t) => `<span class="chip">${t}</span>`).join("");

const baseCSS = `
  * { box-sizing:border-box; margin:0; padding:0; }
  :root { --hud:#22d3a8; --hud-dim:#178f74; --ink:#e6f0f3; --ink-mid:#93a4ae;
    --mono:'DejaVu Sans Mono','Cascadia Code',monospace; --sans:'DejaVu Sans','Segoe UI',system-ui,sans-serif; }
  html,body { width:100%; height:100%; }
  .tile { position:relative; width:100%; height:100%; overflow:hidden; color:var(--ink); font-family:var(--sans);
    background: radial-gradient(120% 120% at 22% -10%, #16303a 0%, #0a1015 46%, #05080b 100%); }
  .tile::before { content:""; position:absolute; inset:0;
    background-image: linear-gradient(rgba(34,211,168,0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34,211,168,0.07) 1px, transparent 1px);
    background-size:34px 34px; mask-image: radial-gradient(130% 100% at 20% 0%, #000 35%, transparent 100%); }
  .tile::after { content:""; position:absolute; inset:0; pointer-events:none;
    background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.02) 0 1px, transparent 1px 3px); }
  .bracket { position:absolute; width:26px; height:26px; border:2px solid var(--hud-dim); opacity:0.7; }
  .bracket.tl { top:16px; left:16px; border-right:0; border-bottom:0; }
  .bracket.br { bottom:16px; right:16px; border-left:0; border-top:0; }
  .wordmark { font-family:var(--mono); font-weight:700; letter-spacing:0.14em; line-height:1; color:#fff;
    text-shadow:0 0 22px rgba(34,211,168,0.35); }
  .tagline { color:var(--hud); font-family:var(--mono); letter-spacing:0.06em; }
  .kicker { font-family:var(--mono); letter-spacing:0.32em; color:var(--hud-dim); text-transform:uppercase; }
  .chip { font-family:var(--mono); text-transform:uppercase; letter-spacing:0.1em; color:var(--ink-mid);
    border:1px solid #1c2731; background:rgba(34,211,168,0.05); border-radius:999px; font-size:11px; padding:6px 12px; }
  .content { position:relative; z-index:2; height:100%; display:flex; align-items:center; }
  .glowwrap { filter: drop-shadow(0 0 26px rgba(34,211,168,0.30)); }
`;

const small = `<div class="tile"><div class="bracket tl"></div><div class="bracket br"></div>
  <div class="content" style="flex-direction:column; justify-content:center; gap:14px; text-align:center;">
    <div class="glowwrap">${badge(96)}</div>
    <div class="wordmark" style="font-size:30px;">STEALTH RAIDER</div>
    <div class="tagline" style="font-size:14px;">Get in. Get out. Unnoticed.</div>
    <div style="display:flex; gap:8px; margin-top:2px;">${chips(["Fingerprint", "IP", "Incognito"])}</div>
  </div></div>`;

const marquee = `<div class="tile"><div class="bracket tl"></div><div class="bracket br"></div>
  <div class="content" style="gap:70px; padding:0 90px;">
    <div class="glowwrap" style="flex:none;">${badge(320)}</div>
    <div style="display:flex; flex-direction:column; gap:22px;">
      <div class="kicker" style="font-size:16px;">B-21 · COVERT OPS</div>
      <div class="wordmark" style="font-size:82px;">STEALTH RAIDER</div>
      <div class="tagline" style="font-size:26px;">Get in. Get out. Unnoticed.</div>
      <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:6px;">
        ${chips(["Fingerprint Spoof", "Location Cloak", "IP Masking", "Incognito Raids", "Self-Destruct"])}
      </div>
    </div></div></div>`;

const wrap = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${baseCSS}</style></head><body>${body}</body></html>`;

const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
async function shot(html, w, h, file) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(wrap(html), { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log("wrote docs/promo/" + file + `  (${w}x${h})`);
}
await shot(small, 440, 280, "small-tile-440x280.png");
await shot(marquee, 1400, 560, "marquee-1400x560.png");
await browser.close();
