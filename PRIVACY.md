# Stealth Raider — Privacy Policy

**Effective date:** 2026-07-05

Stealth Raider is a privacy tool. It would be hypocritical to harvest your data,
so it doesn't.

## What we collect

**Nothing leaves your device by default.** Stealth Raider has **no analytics, no
telemetry, and no tracking**. It does not phone home.

All settings, your active spoof identity, your license, and local statistics
(counts of raids/wipes/identities) are stored **locally** in
`chrome.storage.local` on your own machine. Uninstalling the extension removes
them.

## Permissions and why they're needed

| Permission | Reason |
| --- | --- |
| `proxy` | Route traffic through a proxy to cloak your IP. |
| `privacy` | Toggle WebRTC leak protection, third‑party cookies, prefetch, hyperlink auditing. |
| `browsingData` | Perform the self‑destruct / auto‑wipe of local browsing data. |
| `declarativeNetRequest`, `webRequest`, `webRequestAuthProvider` | Send DNT/GPC signals, strip referrers, and supply proxy credentials. |
| `storage` | Save your settings and identity locally. |
| `tabs`, `webNavigation`, `scripting` | Launch raids and apply spoofing to pages. |
| `host_permissions: <all_urls>` | Fingerprint/location spoofing must run on every site to be effective. |

## Network requests we make

The base (free) extension makes **no network requests of its own**. Your normal
browsing traffic is only affected if you enable a proxy — in which case it goes
to the proxy **you configured**.

## Paid tiers (Stealth Servers)

If you subscribe to a paid tier, connecting to a managed Stealth Server routes
your browsing traffic through that server (that's the point of a proxy). License
verification contacts the licensing backend to confirm your subscription. Those
services will have their own supplementary privacy terms at purchase time. The
free extension in this repository does neither.

## Contact

Questions: open an issue in the repository.
