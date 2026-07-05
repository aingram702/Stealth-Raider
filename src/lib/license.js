/**
 * Stealth Raider — licensing & monetization scaffold.
 *
 * The whole app is gated through a single `hasFeature()` check so that
 * turning a feature into a paid one later is a one-line change in the TIERS
 * table below — no logic scattered across the UI.
 *
 * TIERS
 *   recruit   (free)  — core stealth: fingerprint spoof, incognito raids,
 *                        self-destruct wipe, manual proxy.
 *   raider    (pro)   — managed Stealth Servers (one-click IP regions),
 *                        location spoofing, identity auto-rotation.
 *   squadron  (team)  — everything + shared server pools & policy sync.
 *
 * NOTE: real activation must be verified server-side before shipping paid
 * tiers. `validateKeyFormat()` only checks the key *shape* locally so the UI
 * can give instant feedback; `activate()` is where a network verification
 * call would go (see the TODO). Never trust a purely client-side unlock in
 * production.
 */

export const TIERS = {
  recruit: {
    id: "recruit",
    label: "Recruit",
    price: "Free",
    tagline: "Core stealth kit",
    features: [
      "spoofFingerprint",
      "spoofCanvas",
      "spoofWebgl",
      "spoofAudio",
      "spoofUserAgent",
      "spoofTimezone",
      "autoIncognito",
      "wipeOnRaidEnd",
      "selfDestruct",
      "manualProxy",
      "webrtcProtection",
      "hardening",
    ],
  },
  raider: {
    id: "raider",
    label: "Raider Pro",
    price: "$4.99/mo",
    tagline: "Managed servers + location cloak",
    inherits: "recruit",
    features: [
      "managedServers",
      "spoofLocation",
      "identityRotation",
      "profileVault",
    ],
  },
  squadron: {
    id: "squadron",
    label: "Squadron",
    price: "$12.99/mo",
    tagline: "Teams & shared server pools",
    inherits: "raider",
    features: ["teamPolicy", "sharedServerPools", "prioritySupport"],
  },
};

const DEFAULT_LICENSE = { tier: "recruit", key: null, activatedAt: null, holder: null };

/** Collapse a tier + everything it inherits into a flat feature set. */
function featureSet(tierId) {
  const set = new Set();
  let cur = TIERS[tierId];
  const guard = new Set();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    (cur.features || []).forEach((f) => set.add(f));
    cur = cur.inherits ? TIERS[cur.inherits] : null;
  }
  return set;
}

export function getTier(license) {
  const id = license?.tier && TIERS[license.tier] ? license.tier : "recruit";
  return TIERS[id];
}

/** Single source of truth for "is this feature unlocked?". */
export function hasFeature(license, feature) {
  return featureSet(getTier(license).id).has(feature);
}

/** Cheap client-side shape check: SR-XXXX-XXXX-XXXX-XXXX (base32-ish). */
export function validateKeyFormat(key) {
  return /^SR-[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/.test(String(key || "").trim().toUpperCase());
}

/**
 * Activate a license key.
 *
 * TODO(monetization): replace the local decode with a call to the licensing
 * backend, e.g.
 *   const res = await fetch(`${API}/v1/license/verify`, { ... });
 * and derive the tier from the *server's* signed response. The offline decode
 * below exists only so the flow is wired end-to-end for development.
 */
export async function activate(key) {
  const clean = String(key || "").trim().toUpperCase();
  if (!validateKeyFormat(clean)) {
    return { ok: false, error: "Invalid key format." };
  }
  // Dev-only: the first block after "SR-" hints at the tier.
  const block = clean.slice(3, 7);
  let tier = "raider";
  if (/^SQ/.test(block)) tier = "squadron";
  else if (/^RE/.test(block)) tier = "recruit";
  return {
    ok: true,
    license: {
      tier,
      key: clean,
      activatedAt: Date.now(),
      holder: null,
    },
  };
}

export function defaultLicense() {
  return { ...DEFAULT_LICENSE };
}

/**
 * Managed "Stealth Server" regions surfaced in the UI. Free users see them
 * locked (upsell); Pro users get working proxy endpoints provisioned by the
 * backend. Endpoints are intentionally blank here — they are filled in by the
 * licensing/provisioning service at runtime for entitled users.
 */
export const STEALTH_SERVERS = [
  { id: "auto", label: "Auto (fastest)", region: "🛰️", tierRequired: "raider" },
  { id: "us-east", label: "US · Ashburn", region: "🇺🇸", tierRequired: "raider" },
  { id: "us-west", label: "US · Los Angeles", region: "🇺🇸", tierRequired: "raider" },
  { id: "uk", label: "UK · London", region: "🇬🇧", tierRequired: "raider" },
  { id: "de", label: "DE · Frankfurt", region: "🇩🇪", tierRequired: "raider" },
  { id: "jp", label: "JP · Tokyo", region: "🇯🇵", tierRequired: "raider" },
  { id: "sg", label: "SG · Singapore", region: "🇸🇬", tierRequired: "raider" },
];
