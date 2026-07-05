# Monetization playbook

Stealth Raider is architected so that going from "free tool" to "revenue" is a
configuration change, not a rewrite. This doc captures the plan.

## The one lever

Every gated capability flows through a single function:

```js
// src/lib/license.js
hasFeature(license, "managedServers"); // -> true/false
```

Tiers and their features live in the `TIERS` table in the same file. To move a
feature between free and paid, edit that table. The popup and cockpit already
read from it (badges, locked servers, tier cards, upsell CTAs).

## Tiers (shipped, wired end‑to‑end)

| Tier | Price | Hook |
| --- | --- | --- |
| **Recruit** | Free | Core stealth kit. Acquisition + word of mouth. |
| **Raider Pro** | $4.99/mo | Managed Stealth Servers (one‑click IP regions), location cloak, identity auto‑rotation, profile vault. The "just works" IP is the #1 conversion driver. |
| **Squadron** | $12.99/mo | Teams, shared server pools, policy sync. Sold per‑seat to research/QA/marketing teams. |

## What to build before charging

1. **Licensing backend.** Replace the dev‑only offline decode in
   `activate()` (`src/lib/license.js`, marked `TODO(monetization)`) with a real
   `POST /v1/license/verify` that returns a **signed** entitlement. Derive the
   tier from the server response, never from the key alone. Cache with a short
   TTL and re‑verify periodically in the service worker.
2. **Stealth Server provisioning.** `STEALTH_SERVERS` currently lists regions
   with blank endpoints. For entitled users, fetch live proxy endpoints +
   short‑lived credentials from the backend and feed them into the existing
   proxy config path (`applyProxy` in the service worker). The UI selection flow
   already records `proxy.presetId`.
3. **Billing.** Stripe (or Paddle for global tax handling) checkout → webhook →
   entitlement store. Chrome Web Store's own payments API is deprecated, so use
   an external checkout linked from the Upgrade tab.
4. **Account/device binding.** Bind licenses to an account, cap concurrent
   devices, and support revocation.

## Growth ideas that fit the theme

- **Free "recon" trials** of Pro (24‑hour Stealth Server pass).
- **Referral "wingman" program** — invite a pilot, both get a month.
- **Squadron** self‑serve team billing for privacy‑conscious orgs.
- Content: "leave no trace" guides, fingerprint test‑bench comparisons.

## Compliance notes

- Chrome Web Store review scrutinizes broad `host_permissions` and privacy
  claims — keep `PRIVACY.md` accurate and the permission justifications tight.
- Don't overstate anonymity. The README's "straight talk" section is
  deliberately honest; keep marketing consistent with it to avoid takedowns and
  chargebacks.
