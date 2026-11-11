import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from the root of https://containercheck.app (Cloudflare Pages).
const BASE = '/'

/**
 * SECURITY · Subresource Integrity (SRI).
 * After bundling, adds integrity="sha384-…" and crossorigin="anonymous" to
 * every <script src> and <link rel="stylesheet|modulepreload"> in index.html.
 * If a file is altered on the server/CDN, the browser refuses to execute it.
 * Covers Vite chunks/assets and files copied from /public (security-init.js).
 */
function subresourceIntegrity() {
  let publicDir = 'public'
  const sri = (data) => `sha384-${createHash('sha384').update(data).digest('base64')}`

  return {
    name: 'subresource-integrity',
    apply: 'build',
    configResolved(config) { publicDir = config.publicDir },
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        const lookup = (url) => {
          if (/^(https?:)?\/\//.test(url)) throw new Error(`SRI: external resource not allowed: ${url}`)
          const file = url.startsWith(BASE) ? url.slice(BASE.length) : url.replace(/^\//, '')
          const item = bundle?.[file]
          if (item) return item.type === 'chunk' ? item.code : item.source
          const fromPublic = resolve(publicDir, file)
          if (existsSync(fromPublic)) return readFileSync(fromPublic)
          throw new Error(`SRI: cannot hash ${url}`)
        }
        const tagRe = /<(script|link)\b([^>]*?)\s(src|href)="([^"]+)"([^>]*)>/g
        return html.replace(tagRe, (tag, name, before, attr, url, after) => {
          const all = before + after
          if (name === 'link' && !/rel="(stylesheet|modulepreload)"/.test(all)) return tag
          if (/\bintegrity=/.test(all)) return tag
          const cors = /\bcrossorigin\b/.test(all) ? '' : ' crossorigin="anonymous"'
          return `<${name}${before} ${attr}="${url}"${after} integrity="${sri(lookup(url))}"${cors}>`
            .replace(/\scrossorigin(?=[\s>])/, ' crossorigin="anonymous"')
        })
      },
    },
  }
}

/**
 * The Vite dev server injects inline <style> tags for HMR, which the strict
 * CSP would (correctly) block. The CSP meta tag is therefore removed ONLY when
 * running `npm run dev`; production builds always keep it.
 */
function devRelaxCsp() {
  return {
    name: 'dev-relax-csp',
    apply: 'serve',
    transformIndexHtml: (html) =>
      html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '<!-- CSP disabled in dev server only -->'),
  }
}

export default defineConfig({
  base: BASE,
  // Multi-page app: no SPA fallback, so /legal is not answered with index.html.
  appType: 'mpa',
  plugins: [
    tailwindcss(),
    devRelaxCsp(),
    VitePWA({
      registerType: 'autoUpdate',
      // SECURITY: no auto-injected inline/registration script; main.js registers
      // the worker itself through a Trusted Types policy.
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sea Container Check Digit Verifier',
        short_name: 'ContainerCheck',
        description: 'ISO 6346 container check digit calculator and validator',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        icons: [
          { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Full-bleed version with the logo inside the 80 % safe zone, for adaptive icons.
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,ico,svg}'],
        // Not an SPA: let each page (index.html, legal.html) be served as itself.
        navigateFallback: null,
        // Our own URL parameters must not stop the precache from answering offline.
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^theme$/, /^c$/],
        // Cloudflare Pages serves pages at clean URLs and answers /index.html and
        // /legal.html with a 308 redirect. Workbox refuses redirected responses, so
        // precache the final URLs instead, otherwise offline support silently fails.
        manifestTransforms: [
          (entries) => ({
            manifest: entries.map((e) =>
              e.url === 'index.html' ? { ...e, url: '/' }
                : e.url.endsWith('.html') ? { ...e, url: '/' + e.url.replace(/\.html$/, '') }
                  : e),
            warnings: [],
          }),
        ],
      },
    }),
    subresourceIntegrity(),
  ],
  build: {
    // Two pages: the app and the privacy / legal notice.
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        legal: resolve(root, 'legal.html'),
      },
    },
    // SECURITY: never inline assets as data: URIs (CSP allows only 'self').
    assetsInlineLimit: 0,
    // No inline modulepreload polyfill.
    modulePreload: { polyfill: false },
    sourcemap: false,
  },
})
