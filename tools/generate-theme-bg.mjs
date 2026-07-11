/**
 * Stealth Raider — Cockpit Theme new-tab background generator.
 *
 * Renders theme/images/theme_ntp_background.png (1920×1080) from HTML + inline
 * SVG using the cockpit styling, so it stays in sync with the extension's look.
 *
 * Requires Playwright:  npm i -D playwright && npx playwright install chromium
 * Run:                  node tools/generate-theme-bg.mjs   (or: npm run theme)
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "theme", "images");
fs.mkdirSync(OUT, { recursive: true });

const WING = "50,15 94,66 70,60 60,74 50,66 40,74 30,60 6,66";
const badge = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#12242c"/><stop offset="100%" stop-color="#070b0e"/></radialGradient>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e6f0f3"/><stop offset="100%" stop-color="#aebfc6"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="1.1" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <circle cx="50" cy="50" r="49" fill="url(#bg)" stroke="#1c2731" stroke-width="1.2"/>
  <circle cx="50" cy="50" r="45" fill="none" stroke="#22d3a8" stroke-width="1.1" opacity="0.7" filter="url(#glow)"/>
  <g opacity="0.32" stroke="#22d3a8" stroke-width="0.5">
    <circle cx="50" cy="50" r="36" fill="none"/><circle cx="50" cy="50" r="26" fill="none"/></g>
  <polygon points="${WING}" fill="url(#skin)" stroke="#6cd0be" stroke-width="1.3" stroke-linejoin="round"/>
</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box;}
  :root{--hud:#22d3a8;--hud-dim:#178f74;--ink:#e6f0f3;--mono:'DejaVu Sans Mono',monospace;}
  html,body{width:1920px;height:1080px;overflow:hidden;}
  .scene{position:relative;width:1920px;height:1080px;
    background:radial-gradient(120% 90% at 50% 118%, #163842 0%, #0a141a 42%, #070a0d 78%);}
  .grid{position:absolute;inset:0;
    background-image:linear-gradient(rgba(34,211,168,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,168,0.06) 1px,transparent 1px);
    background-size:46px 46px;-webkit-mask-image:radial-gradient(80% 70% at 50% 92%,#000 30%,transparent 78%);mask-image:radial-gradient(80% 70% at 50% 92%,#000 30%,transparent 78%);}
  .scan{position:absolute;inset:0;background:repeating-linear-gradient(to bottom,rgba(255,255,255,0.015) 0 1px,transparent 1px 3px);}
  .rings{position:absolute;left:50%;top:78%;transform:translate(-50%,-50%);width:900px;height:900px;border-radius:50%;opacity:0.5;
    background:repeating-radial-gradient(circle,transparent 0 58px,rgba(34,211,168,0.05) 58px 59px);
    -webkit-mask-image:radial-gradient(circle,#000 0%,transparent 62%);mask-image:radial-gradient(circle,#000 0%,transparent 62%);}
  .bracket{position:absolute;width:60px;height:60px;border:2.5px solid var(--hud-dim);opacity:0.65;}
  .tl{top:48px;left:48px;border-right:0;border-bottom:0;} .tr{top:48px;right:48px;border-left:0;border-bottom:0;}
  .bl{bottom:48px;left:48px;border-right:0;border-top:0;} .br{bottom:48px;right:48px;border-left:0;border-top:0;}
  .brand{position:absolute;left:50%;top:76%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center;}
  .badge{filter:drop-shadow(0 0 34px rgba(34,211,168,0.30));}
  .kicker{font-family:var(--mono);letter-spacing:0.42em;color:var(--hud-dim);text-transform:uppercase;font-size:19px;}
  .wordmark{font-family:var(--mono);font-weight:700;letter-spacing:0.2em;color:#fff;font-size:66px;line-height:1;text-shadow:0 0 30px rgba(34,211,168,0.35);}
  .tag{font-family:var(--mono);color:var(--hud);letter-spacing:0.1em;font-size:24px;}
</style></head><body>
  <div class="scene">
    <div class="grid"></div><div class="rings"></div><div class="scan"></div>
    <div class="bracket tl"></div><div class="bracket tr"></div><div class="bracket bl"></div><div class="bracket br"></div>
    <div class="brand">
      <div class="badge">${badge(180)}</div>
      <div class="kicker">B-21 · Covert Ops</div>
      <div class="wordmark">STEALTH RAIDER</div>
      <div class="tag">Get in. Get out. Unnoticed.</div>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(OUT, "theme_ntp_background.png"), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
await browser.close();
console.log("wrote theme/images/theme_ntp_background.png (1920x1080)");
