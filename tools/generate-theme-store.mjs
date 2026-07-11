/**
 * Stealth Raider — Cockpit Theme Web Store assets.
 *
 * Renders the theme's store media:
 *   theme/store/small-tile-440x280.png
 *   theme/store/marquee-1400x560.png
 *   theme/store/screenshot-01-newtab-1280x800.png
 *   theme/store/screenshot-02-browsing-1280x800.png
 *
 * The screenshots are a Chrome-window MOCKUP styled with the theme's exact
 * colors (the OS window frame can't be captured headlessly). Kept brand-neutral
 * — no third-party logos.
 *
 * Requires Playwright:  npm i -D playwright && npx playwright install chromium
 * Run:                  node tools/generate-theme-store.mjs  (or: npm run theme:store)
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "theme", "store");
fs.mkdirSync(OUT, { recursive: true });

const b64 = (p) => "data:image/png;base64," + fs.readFileSync(p).toString("base64");
const NTP = b64(path.join(ROOT, "theme", "images", "theme_ntp_background.png"));
const ICON = b64(path.join(ROOT, "theme", "images", "icon128.png"));

const WING = "50,15 94,66 70,60 60,74 50,66 40,74 30,60 6,66";
const badge = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="75%"><stop offset="0%" stop-color="#12242c"/><stop offset="100%" stop-color="#070b0e"/></radialGradient>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e6f0f3"/><stop offset="100%" stop-color="#aebfc6"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <circle cx="50" cy="50" r="49" fill="url(#bg)" stroke="#1c2731" stroke-width="1.2"/>
  <circle cx="50" cy="50" r="45" fill="none" stroke="#22d3a8" stroke-width="1.1" opacity="0.7" filter="url(#glow)"/>
  <g opacity="0.32" stroke="#22d3a8" stroke-width="0.5"><circle cx="50" cy="50" r="36" fill="none"/><circle cx="50" cy="50" r="26" fill="none"/></g>
  <polygon points="${WING}" fill="url(#skin)" stroke="#6cd0be" stroke-width="1.3" stroke-linejoin="round"/>
</svg>`;

const CSS = `
  *{margin:0;box-sizing:border-box;}
  :root{--frame:#070a0d;--tool:#0e141a;--tool2:#131b22;--hud:#22d3a8;--hud-dim:#178f74;
    --ink:#d6e4ea;--mid:#93a4ae;--line:#1c2731;--mono:'DejaVu Sans Mono',monospace;--sans:'DejaVu Sans',system-ui,sans-serif;}
  html,body{overflow:hidden;font-family:var(--sans);}
  /* ---- browser mockup ---- */
  .win{width:1280px;height:800px;background:var(--frame);display:flex;flex-direction:column;overflow:hidden;}
  .tabs{height:46px;display:flex;align-items:flex-end;gap:2px;padding:0 12px;background:var(--frame);}
  .dots{display:flex;gap:8px;align-self:center;margin-right:16px;}
  .dot{width:12px;height:12px;border-radius:50%;background:#26323b;}
  .tab{height:34px;min-width:200px;max-width:240px;display:flex;align-items:center;gap:9px;padding:0 14px;
    border-radius:10px 10px 0 0;color:var(--mid);font-size:13px;background:transparent;}
  .tab .fav{width:15px;height:15px;border-radius:4px;flex:none;}
  .tab.active{background:var(--tool);color:#fff;box-shadow:inset 0 2px 0 var(--hud);}
  .tab.active .fav{background:linear-gradient(#2ff0c0,#22d3a8);}
  .tab .fav.g{background:#26323b;}
  .newtab{align-self:center;color:var(--mid);font-size:20px;margin-left:8px;}
  .toolbar{height:52px;background:var(--tool);display:flex;align-items:center;gap:14px;padding:0 16px;border-bottom:1px solid var(--line);}
  .nav{display:flex;gap:16px;color:var(--hud);font-size:18px;}
  .nav .off{color:#3a4750;}
  .omni{flex:1;height:34px;background:#0a0f14;border:1px solid var(--line);border-radius:999px;display:flex;align-items:center;gap:10px;padding:0 16px;color:var(--ink);font-family:var(--mono);font-size:13px;}
  .omni .lock{color:var(--hud);font-size:12px;}
  .omni .mut{color:var(--mid);}
  .actions{display:flex;align-items:center;gap:14px;}
  .actions img{width:22px;height:22px;border-radius:6px;box-shadow:0 0 10px rgba(34,211,168,0.4);}
  .puzzle{color:var(--mid);font-size:17px;}
  .avatar{width:24px;height:24px;border-radius:50%;background:linear-gradient(#2ff0c0,#178f74);}
  .bmk{height:34px;background:var(--tool);display:flex;align-items:center;gap:20px;padding:0 18px;border-bottom:1px solid var(--line);color:var(--mid);font-size:12px;font-family:var(--mono);}
  .bmk span{display:flex;align-items:center;gap:7px;}
  .bmk i{color:var(--hud-dim);font-style:normal;}
  .viewport{flex:1;position:relative;overflow:hidden;background:#070a0d;}
  /* new tab content */
  .ntp{position:absolute;inset:0;background:#070a0d;}
  .ntp img{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:1280px;}
  .search{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);width:560px;height:52px;background:#0c1217;
    border:1px solid var(--line);border-radius:999px;display:flex;align-items:center;gap:14px;padding:0 22px;
    box-shadow:0 10px 40px rgba(0,0,0,0.5);color:var(--mid);font-size:15px;}
  .search .s{color:var(--hud);}
  .shortcuts{position:absolute;left:50%;top:44%;transform:translateX(-50%);display:flex;gap:26px;}
  .sc{display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--mid);font-size:11px;font-family:var(--mono);}
  .sc b{width:48px;height:48px;border-radius:14px;background:#0f161c;border:1px solid var(--line);display:block;}
  /* faux site for browsing shot */
  .site{position:absolute;inset:0;background:#f3f5f7;color:#1c2731;padding:60px 90px;}
  .site h2{font-size:30px;margin-bottom:14px;color:#0e141a;}
  .site p{color:#55636d;max-width:640px;line-height:1.7;margin-bottom:12px;}
  .site .bar{height:120px;border-radius:14px;background:linear-gradient(120deg,#dfe6ea,#eef2f4);margin:22px 0;}
  /* ---- promo tiles ---- */
  .tile{position:relative;width:100%;height:100%;overflow:hidden;color:var(--ink);
    background:radial-gradient(120% 120% at 22% -10%,#16303a 0%,#0a1015 46%,#05080b 100%);}
  .tile::before{content:"";position:absolute;inset:0;
    background-image:linear-gradient(rgba(34,211,168,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,168,0.07) 1px,transparent 1px);
    background-size:34px 34px;-webkit-mask-image:radial-gradient(130% 100% at 20% 0%,#000 35%,transparent 100%);}
  .brk{position:absolute;width:26px;height:26px;border:2px solid var(--hud-dim);opacity:0.7;}
  .brk.tl{top:16px;left:16px;border-right:0;border-bottom:0;}.brk.br{bottom:16px;right:16px;border-left:0;border-top:0;}
  .content{position:relative;z-index:2;height:100%;display:flex;align-items:center;}
  .wm{font-family:var(--mono);font-weight:700;letter-spacing:0.14em;line-height:1;color:#fff;text-shadow:0 0 22px rgba(34,211,168,0.35);}
  .label{font-family:var(--mono);letter-spacing:0.3em;color:var(--hud-dim);text-transform:uppercase;}
  .tag{color:var(--hud);font-family:var(--mono);letter-spacing:0.06em;}
  .chips{display:flex;gap:10px;flex-wrap:wrap;}
  .chip{font-family:var(--mono);text-transform:uppercase;letter-spacing:0.1em;font-size:11px;color:var(--mid);
    border:1px solid var(--line);background:rgba(34,211,168,0.05);border-radius:999px;padding:6px 12px;}
`;

const chrome = (content, activeLabel) => `
<div class="win">
  <div class="tabs">
    <div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
    <div class="tab active"><span class="fav"></span>${activeLabel}</div>
    <div class="tab"><span class="fav g"></span>Docs</div>
    <div class="tab"><span class="fav g"></span>Mail</div>
    <div class="newtab">+</div>
  </div>
  <div class="toolbar">
    <div class="nav"><span>&#8592;</span><span class="off">&#8594;</span><span>&#8635;</span></div>
    <div class="omni"><span class="lock">&#128274;</span><span>stealthraider.app</span><span class="mut">/cockpit</span></div>
    <div class="actions"><span class="puzzle">&#129513;</span><img src="${ICON}"/><span class="avatar"></span></div>
  </div>
  <div class="bmk"><span><i>&#9733;</i> Raid</span><span><i>&#9673;</i> Servers</span><span><i>&#9673;</i> Identity Vault</span><span><i>&#9673;</i> HQ</span></div>
  <div class="viewport">${content}</div>
</div>`;

const newtab = chrome(`
  <div class="ntp"><img src="${NTP}"/>
    <div class="search"><span class="s">&#9906;</span><span>Search or type a command</span></div>
    <div class="shortcuts"><div class="sc"><b></b>Raid</div><div class="sc"><b></b>Servers</div><div class="sc"><b></b>Vault</div><div class="sc"><b></b>HQ</div><div class="sc"><b></b>Wipe</div></div>
  </div>`, "New Tab");

const browsing = chrome(`
  <div class="site">
    <h2>Mission Briefing</h2>
    <p>The themed chrome — frame, tabs, toolbar and omnibox — stays in stealth livery while you browse any site.</p>
    <div class="bar"></div>
    <p>Hull-black surfaces, phosphor-teal accents, and a HUD-lit active tab. Understated on the outside, unmistakable up close.</p>
  </div>`, "stealthraider.app");

const small = `<div class="tile"><div class="brk tl"></div><div class="brk br"></div>
  <div class="content" style="flex-direction:column;justify-content:center;gap:13px;text-align:center;">
    <div style="filter:drop-shadow(0 0 26px rgba(34,211,168,0.3));">${badge(92)}</div>
    <div class="wm" style="font-size:29px;">STEALTH RAIDER</div>
    <div class="label" style="font-size:12px;">Cockpit Theme</div>
    <div class="tag" style="font-size:13px;">Get in. Get out. Unnoticed.</div>
  </div></div>`;

const marquee = `<div class="tile"><div class="brk tl"></div><div class="brk br"></div>
  <div class="content" style="gap:70px;padding:0 90px;">
    <div style="flex:none;filter:drop-shadow(0 0 30px rgba(34,211,168,0.3));">${badge(300)}</div>
    <div style="display:flex;flex-direction:column;gap:20px;">
      <div class="label" style="font-size:16px;">B-21 · Cockpit Theme</div>
      <div class="wm" style="font-size:76px;">STEALTH RAIDER</div>
      <div class="tag" style="font-size:25px;">Fly your whole browser in stealth.</div>
      <div class="chips"><span class="chip">Dark HUD Chrome</span><span class="chip">Cockpit New Tab</span><span class="chip">Phosphor Teal</span></div>
    </div>
  </div></div>`;

const wrap = (body, w, h) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
  html,body{width:${w}px;height:${h}px;}</style></head><body>${body}</body></html>`;

const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
async function shot(body, w, h, file) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(wrap(body, w, h), { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log("wrote theme/store/" + file);
}
await shot(small, 440, 280, "small-tile-440x280.png");
await shot(marquee, 1400, 560, "marquee-1400x560.png");
await shot(newtab, 1280, 800, "screenshot-01-newtab-1280x800.png");
await shot(browsing, 1280, 800, "screenshot-02-browsing-1280x800.png");
await browser.close();
console.log("done");
