<p align="center">
  <a href="https://containercheck.app/" rel="noopener noreferrer">
    <img src="public/android-chrome-192x192.png" alt="ContainerCheck logo" width="96">
  </a>
</p>

<div align="center">

# ContainerCheck: ISO 6346 Container Check Digit Validator

A fast, security-hardened web tool that calculates and verifies shipping container check digits. Check one number with live feedback, or a whole list at once.

🔗 **[Live demo](https://containercheck.app/)**

<img src="https://img.shields.io/badge/ISO-6346-0284c7" alt="ISO 6346">
<img src="https://img.shields.io/badge/JavaScript-ES2022-f7df1e?logo=javascript&logoColor=black" alt="Vanilla JavaScript">
<img src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4">
<img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6">
<img src="https://img.shields.io/badge/CSP-strict_%2B_Trusted_Types-0f172a" alt="Strict CSP">
<img src="https://img.shields.io/badge/npm_audit-0_vulnerabilities-16a34a" alt="0 vulnerabilities">
<img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">

</div>

---

## 📸 Preview

<div align="center">
  <img src="docs/images/screenshot_valid.png" alt="Single mode: valid container number" width="49%">
  <img src="docs/images/screenshot_invalid.png" alt="Single mode: invalid check digit with suggested correction" width="49%">
</div>
<div align="center">
  <img src="docs/images/screenshot_bulk_dark.png" alt="Bulk mode in dark theme" width="49%">
  <img src="docs/images/screenshot_steps.png" alt="Step-by-step check digit calculation" width="49%">
</div>

---

## ✨ Features

**Single mode (live validation)**
- Converts input to uppercase as you type, and ignores spaces and hyphens (`CSQU 305438-3` works).
- With **10 characters** it calculates the check digit. With **11** it verifies it and shows green or red, plus the correct digit and a one-click **Use corrected**.
- A **breakdown panel** splits the code into Owner code (BIC), Category (`U` / `J` / `Z`), Serial number and Check digit. Each segment gets its own error message.
- A **container marking plate** shows the number the way it is painted on a container.
- **Step-by-step calculation**: value × 2ⁱ for each character, the sum, and mod 11.

**Bulk mode**
- Paste many numbers separated by new lines, commas, semicolons or tabs, then press **Validate all** or `Ctrl + Enter`.
- Summary counters (Valid, Invalid, Missing digit, Malformed), filter chips, and flags for duplicates.
- **Copy as CSV**, **Download CSV**, **Copy corrected**, plus a copy button on every row.

**General**
- Light and dark theme (follows your OS, with a manual toggle).
- Responsive and accessible (keyboard-navigable tabs, `aria-live` results) and installable as a PWA.
- Deep links: `?c=CSQU3054383` pre-fills Single mode and `#bulk` opens Bulk mode.
- **Private by design**: no backend, no tracking, nothing stored. Everything runs in your browser.

---

## 🧮 How the ISO 6346 check digit works

1. **Convert**: digits keep their value. Letters map to `A=10 … Z=38`, skipping multiples of 11 (11, 22, 33).
2. **Weight**: multiply each of the first 10 values by 2⁰ … 2⁹ and add the results.
3. **Modulo 11**: the check digit is `sum mod 11`. A remainder of 10 becomes `0`.

Example: `CSQU305438` gives a sum of 6,185 and 6,185 mod 11 = **3**, so the full number is `CSQU3054383`.

Category identifiers: `U` freight container, `J` detachable freight equipment, `Z` trailer or chassis. More on [ISO 6346](https://en.wikipedia.org/wiki/ISO_6346).

### Example numbers
| Input | Result |
|---|---|
| `CSQU3054383` | ✅ Valid |
| `CSQU3054384` | ❌ Invalid. Expected `3` |
| `MAEU845123` | ➕ Missing digit. Becomes `MAEU8451230` |
| `ABCX1234567` | ⚠️ Malformed. `X` is not a valid category |

---

## 🛡️ Security

The app is hardened to OWASP client-side guidelines and is tested against XSS payloads, framing and resource tampering:

- **No HTML string sinks.** The UI is built only with `createElement` and text nodes, and the browser enforces this through **Trusted Types**.
- **Strict CSP**: `default-src 'none'`, scripts, styles and fonts only from `'self'`, no `unsafe-inline` or `unsafe-eval`.
- **Zero third-party resources.** Tailwind is compiled at build time and fonts are self-hosted. Every script and stylesheet ships with **SRI** (`sha384`).
- Anti-clickjacking, CSV formula-injection protection, input limits, and **no storage** (no localStorage, sessionStorage or cookies).
- No runtime dependencies. `npm audit` reports **0 vulnerabilities**, and CI blocks deploys if a high-severity advisory appears.

The full control matrix and hosting notes are in **[SECURITY.md](SECURITY.md)**.

---

## 🧰 Tech stack

| Layer | Choice |
|---|---|
| UI | HTML5 + vanilla JavaScript (ES modules, no framework) |
| Styling | Tailwind CSS 4 (compiled), Inter + JetBrains Mono (self-hosted) |
| Build | Vite 6 · vite-plugin-pwa · custom SRI plugin |
| Hosting | Cloudflare Pages (Git integration) at containercheck.app · CI on GitHub Actions |

### Project structure
```
├── index.html               # The app: markup + CSP meta (no inline scripts or styles)
├── legal.html               # Privacy policy, legal notice, accessibility contact
├── src/
│   ├── main.js              # ISO 6346 logic, safe DOM rendering, single + bulk modes
│   └── styles.css           # Tailwind entry, fonts, anti-framing rule
├── public/
│   ├── _headers             # Cloudflare Pages HTTP security headers (CSP, HSTS, XFO…)
│   ├── robots.txt, sitemap.xml, og-image.png
│   ├── security-init.js     # Anti-clickjacking + initial theme (runs before paint)
│   └── *.png / favicon.ico  # Icons
├── vite.config.js           # Tailwind, PWA, SRI plugin, dev-only CSP relaxation
├── .github/workflows/
│   └── ci.yml               # Audit + build check on every push / PR (no deploy rights)
├── SECURITY.md
└── MANUAL_USER.md
```

---

## 🚀 Getting started

**Prerequisites:** Node.js ≥ 20 and npm ≥ 9.

```bash
git clone https://github.com/irazu-fi/ISO-6346-Container-Validator.git
cd ISO-6346-Container-Validator
npm install
npm run dev        # http://localhost:5173/
```

| Script | Description |
|---|---|
| `npm run dev` | Dev server with hot reload (the CSP meta tag is removed in dev only) |
| `npm run build` | Production build to `dist/` (CSP + SRI applied) |
| `npm run preview` | Serves the production build locally. Use it for security testing |
| `npm run audit:prod` | Audits production dependencies |

---

## 🌐 Deployment

Production is **https://containercheck.app**, hosted on **Cloudflare Pages** with its Git integration. Every push to `main` is built and published automatically. Pull requests get preview URLs on `*.pages.dev`, which are marked `noindex`.

| Cloudflare Pages setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm audit --audit-level=high && npm run build` |
| Build output directory | `dist` |
| Node.js | from `.node-version` (22) |

On every push and pull request, [`.github/workflows/ci.yml`](.github/workflows/ci.yml) audits and builds the project. It has no deploy permissions and uses no secrets.

### DNS (Cloudflare)

The domain has no email, so the records below lock it down against spoofing:

| Type | Name | Content | Purpose |
|---|---|---|---|
| CNAME (proxied) | `@` | created by Pages when the custom domain is added | site |
| CNAME (proxied) | `www` | `containercheck.app` | redirected to the apex by a Redirect Rule |
| MX | `@` | `.` (priority 0) | null MX, RFC 7505 |
| TXT | `@` | `v=spf1 -all` | no server may send mail |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` | reject spoofed mail |
| TXT | `*._domainkey` | `v=DKIM1; p=` | no valid DKIM keys |
| CAA | `@` | `0 issue "letsencrypt.org"`, `0 issue "pki.goog"`, `0 issue "ssl.com"`, `0 iodef "mailto:jose.chaves@irazu.fi"` | only the CAs Cloudflare uses |

DNSSEC is enabled in Cloudflare (DNS → Settings → DNSSEC).

---

## 📡 Monitoring

ContainerCheck is a static site with no server or database, so there is no `/health` endpoint. If the page is served, the app is available. External monitors (Olivia) check the published pages directly:

| Check | Request | Expect |
|---|---|---|
| App page | `GET` or `HEAD https://containercheck.app/` | `200`, body contains `Container Check Digit Validator` |
| Legal page | `GET https://containercheck.app/legal` | `200`, body contains `Who is responsible` |
| www redirect | `HEAD https://www.containercheck.app/` | `301` to `https://containercheck.app/` |
| TLS certificate | `containercheck.app:443` and `www.containercheck.app:443` | valid; issued and renewed by Cloudflare |

- **No credentials:** the checks need no cookies, authentication or tokens, and the site sets no cookies and stores no data.
- **Text check works without JavaScript:** the expected texts are in the static HTML, so a plain HTTP check can see them.

---

## 📖 User manual

For step-by-step usage instructions, see **[MANUAL_USER.md](MANUAL_USER.md)**.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m "Add amazing feature"`.
4. Push the branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

Please keep the security rules: no `innerHTML` or inline scripts, and no third-party CDNs.

---

## 👨‍💻 Author

**José Oldemar Chaves Urbina**
- GitHub: [@OldemarCRC](https://github.com/OldemarCRC)
- LinkedIn: [oldemar-chaves](https://www.linkedin.com/in/oldemar-chaves/)
- Portfolio: [oldemarcrc.github.io/my-portfolio](https://oldemarcrc.github.io/my-portfolio/)

---

## 📄 License

MIT. See [LICENSE.md](LICENSE.md).
