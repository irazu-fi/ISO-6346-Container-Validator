/*
 * security-init.js — loaded synchronously in <head>, before first paint.
 * Kept as a separate same-origin file so the CSP needs no 'unsafe-inline'.
 */
(function () {
  'use strict';
  var root = document.documentElement;

  /*
   * SECURITY · Anti-clickjacking.
   * A <meta> CSP cannot carry `frame-ancestors`, and <meta> X-Frame-Options is
   * ignored by browsers, so on static hosting (GitHub Pages) we fall back to
   * the OWASP frame-busting defence:
   *   - top-level window → reveal the UI (styles.css hides it by default)
   *   - framed           → try to break out. Modern browsers usually block
   *                        cross-origin top navigation without a user gesture
   *                        (and sandboxed iframes always do); in that case the
   *                        UI simply stays hidden — the actual protection.
   */
  if (window.self === window.top) {
    root.classList.add('unframed');
  } else {
    try { window.top.location.replace(window.self.location.href); } catch (e) { /* stay hidden */ }
  }

  /*
   * Theme without storage.
   * SECURITY / PRIVACY: nothing is read from or written to localStorage,
   * sessionStorage or cookies — the app stays stateless.
   *   1. Default: the OS preference (prefers-color-scheme).
   *   2. A manual choice is carried between our own pages in the link itself:
   *      links marked data-keep-theme get ?theme=dark|light when the current
   *      theme differs from the OS preference. On arrival the value is
   *      allow-listed, applied, and removed from the address bar, so shared
   *      links never force a theme.
   */
  var osDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var dark = osDark;
  var match = /(?:^|[?&])theme=(dark|light)(?:&|$)/.exec(location.search);
  if (match) {
    dark = match[1] === 'dark';
    try {
      var url = new URL(location.href);
      url.searchParams.delete('theme');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    } catch (e) { /* keep the URL as is */ }
  }
  if (dark) root.classList.add('dark');

  // Capture phase: runs before any page handler, and only for same-origin links we mark.
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[data-keep-theme]') : null;
    if (!link) return;
    var target = new URL(link.getAttribute('href'), location.href);
    if (target.origin !== location.origin) return;
    var current = root.classList.contains('dark');
    target.searchParams.delete('theme');
    if (current !== osDark) target.searchParams.set('theme', current ? 'dark' : 'light');
    link.setAttribute('href', target.pathname + target.search + target.hash);
  }, true);
})();
