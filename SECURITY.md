# Security

ContainerCheck runs entirely in the browser. It has no backend, no accounts and no analytics, and it makes no network calls after the page loads. This file lists the client-side controls in the app, mapped to OWASP guidance, so auditors and pentesters can check each one.

## Controls

| # | Risk (OWASP) | Control | Where |
|---|---|---|---|
| 1 | DOM / reflected XSS | No HTML string sinks (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, string timers). The UI is built only with `createElement` and Text nodes through `h()`, which only accepts allow-listed attributes (it rejects `on*`, `href`, `src` and `style`). | `src/main.js` §3 |
| 2 | XSS (browser-enforced) | CSP `require-trusted-types-for 'script'`. Any string passed to an HTML or script sink throws a `TypeError`, even if such a call were added later. Only one Trusted Types policy (`app-sw`) is allowed, and it accepts only the app's own `sw.js` URL. | `index.html`, `src/main.js` §9 |
| 3 | Input handling | Input is normalized with NFKC and stripped of control and zero-width characters, then filtered against an allow-list (`[A-Z0-9]`). Raw text that is shown back to the user is truncated, limited to printable ASCII, and rendered as text only. The `?c=` and `#bulk` URL inputs go through the same allow-list. | `src/main.js` §1, §10 |
| 4 | Script and resource injection | Strict CSP with `default-src 'none'` and `script-src` / `style-src` / `font-src` / `img-src` set to `'self'`. There is no `unsafe-inline` or `unsafe-eval`, and `base-uri`, `form-action` and `object-src` are set to `'none'`. Sent as an HTTP header in production, and kept as a `<meta>` tag for defence in depth. | `public/_headers`, `index.html`, `legal.html` |
| 5 | Third-party / supply chain | The page loads zero third-party resources. Tailwind is compiled at build time and fonts are self-hosted with `@fontsource`. Every `<script>` and stylesheet gets `integrity="sha384-…"` and `crossorigin="anonymous"` at build time, and the build fails if an external URL appears in `index.html`. | `vite.config.js` (`subresourceIntegrity`) |
| 6 | Clickjacking | HTTP headers `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`. As a fallback, OWASP frame-busting hides the UI unless `window.self === window.top`. | `public/_headers`, `public/security-init.js`, `src/styles.css` |
| 7 | Sensitive data exposure | Stateless processing. Nothing is stored in `localStorage`, `sessionStorage`, cookies or IndexedDB. The theme follows the OS preference. A manual choice travels only in our own links between pages (`?theme=dark|light`), and on arrival it is checked against an allow-list and removed from the address bar. A `no-referrer` policy keeps the page URL from leaking. External links use `rel="noopener noreferrer"`. | all |
| 8 | CSV / formula injection | On export, cells that start with `=`, `+`, `-`, `@`, TAB or CR get a `'` prefix, and every cell is quoted per RFC 4180. | `src/main.js` (`csvCell`) |
| 9 | Client-side DoS | Bulk input is capped at 50,000 characters and 2,000 entries per run. Single input is capped at 11 characters. | `src/main.js` §0 |
| 10 | Code hygiene | ES module scope with no globals, frozen lookup tables, prototype-less maps, no source maps in production, and no runtime dependencies. | `src/main.js`, `vite.config.js` |
| 11 | Vulnerable dependencies (A06) | No runtime dependencies (`npm audit --omit=dev` → 0). Cloudflare builds and deploys from Git (Workers Builds), so no deploy token is stored in GitHub. GitHub Actions CI installs with `npm ci --ignore-scripts`, fails on any high or critical advisory (`npm audit --audit-level=high`), and runs with a read-only token. | `.github/workflows/ci.yml` |
| 12 | Transport security | `.app` is on the browsers' HSTS preload list (HTTPS only), and the site also sends `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. Other headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy: same-origin`. | `public/_headers` |
| 13 | Domain abuse / email spoofing | The domain sends and receives no email. It publishes a null MX, `v=spf1 -all`, DMARC `p=reject` (strict alignment) and an empty DKIM wildcard. CAA allows only Let's Encrypt and Cloudflare's backup CAs, with `iodef` reporting. DNSSEC is active. All verified on 2026-11-11 with `nslookup` and DNS-over-HTTPS. | Cloudflare DNS (see README, *Deployment*) |

## Accepted risks

Reviewed: 2026-11-10 · Owner: José Oldemar Chaves Urbina · Next review: when a patched release is published, or by 2027-02-10 at the latest.

| Advisory | Package | Severity | Where it is used | Decision |
|---|---|---|---|---|
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4): prototype poisoning in `mergeObject()` | `deepmerge` 4.3.1, via `vite-plugin-pwa` → `workbox-build` → `@rollup/plugin-node-resolve` | Low | Build time only, while the service worker is generated | **Accepted** |

**Why accepted:**

- **No fix exists.** 4.3.1 is the latest published version and is affected. `npm audit fix --force` would downgrade `vite-plugin-pwa` to 0.2.1, which breaks the build.
- **Nothing reaches it from outside.** `deepmerge` only merges this repository's own build configuration. User input never reaches it, and it is not shipped to the browser (`npm audit --omit=dev` → 0).
- **The deploy gate is unaffected.** It fails only on high or critical advisories (`npm audit --audit-level=high`).
- **The only other way to remove it** is to drop the PWA (offline support and install), which changes behaviour for users. Not worth it for a low-severity, build-time issue.

**Related mitigation:** `package.json` overrides `glob` inside `workbox-build` (`^14.0.2`). This fixes the moderate advisories for `glob` (GHSA-3g3m-2fjr-6pw4) and `minimatch` (GHSA-g3hv-75wg-m249). The newer `glob` requires Node.js ≥ 20.

**Re-evaluate** when `deepmerge`, `@rollup/plugin-node-resolve` or `workbox-build` publish a fix. Then remove this entry and run `npm audit` again.

## Hosting and HTTP headers

Production runs on a **Cloudflare Worker with static assets** at `https://containercheck.app`. The response headers are defined in [`public/_headers`](public/_headers), which Vite copies into `dist/`. That file:

- sends the CSP as an HTTP header, adding `frame-ancestors 'none'` (browsers ignore it in `<meta>`);
- sets `X-Frame-Options`, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` and COOP/CORP;
- gives the service worker scripts their own CSP, without Trusted Types, so offline support keeps working.

`*.workers.dev` and preview URLs are disabled in `wrangler.jsonc`, so no copy of the site exists outside the custom domain. `www.containercheck.app` answers only with a `301` to the apex. TLS: minimum version 1.2, TLS 1.3 on, and *Always Use HTTPS*.

Keep the `<meta>` CSP in `index.html` / `legal.html` and the header CSP identical, apart from `frame-ancestors`.

CSP reporting (`report-to`) is not configured, because the site has no endpoint to receive reports. Cloudflare adds its own Network Error Logging headers (`NEL` / `Report-To`, failures only).

## Development note

The Vite dev server (`npm run dev`) injects inline styles for hot reload, so the dev server removes the CSP `<meta>` tag. `npm run build` and `npm run preview` always serve the strict policy. Run security tests against the production build.

## Reporting a vulnerability

Please open a private security advisory on GitHub, or write to jose.chaves@irazu.fi.
