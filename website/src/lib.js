// Shared helpers: safe HTML templates, interface text, security headers and small utilities.
import site from "./generated/site.js";

export const HOST = "translation.foundation.ge";
export const CONTACT = "translation@foundation.ge";

// ---------- HTML: every interpolated value is escaped unless it is already safe HTML ----------
// html`<p>${text}</p>` escapes text; nested html`` results and raw() pass through unchanged. Pages are only
// built this way, so nothing read from GitHub can ever become markup.
class Safe {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ESC[c]);
export const raw = (s) => new Safe(String(s));
const part = (v) => (v == null || v === false ? "" : v instanceof Safe ? v.s : Array.isArray(v) ? v.map(part).join("") : esc(v));
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  return new Safe(out);
}

// Only https links ever reach an href.
export function safeLink(u) {
  if (typeof u !== "string") return null;
  try {
    const url = new URL(u);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

// ---------- Interface text ----------
export function t(lang, key, vars) {
  const entry = site.strings[key];
  if (!entry) { console.log(JSON.stringify({ event: "missing-string", key })); return key; }
  let s = entry[lang] ?? entry.en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  return s;
}
// The same, with HTML (such as a link) in the placeholders. The sentence itself is escaped.
export function th(lang, key, vars = {}) {
  return raw(esc(t(lang, key)).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? part(vars[k]) : m)));
}
export const prefix = (lang) => (lang === "en" ? "/en" : "");

// ---------- Times ----------
export function clock(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60) % 60).padStart(2, "0"), ss = String(s % 60).padStart(2, "0");
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${Math.floor(s / 60)}:${ss}`;
}
export function runtimeMs(value) {
  const parts = String(value || "0").split(":").map(Number);
  while (parts.length < 3) parts.unshift(0);
  return ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000;
}

// ---------- Security headers ----------
const CSP = [
  "default-src 'none'",
  `script-src 'self' '${site.themeScriptHash}'`,
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "upgrade-insecure-requests",
  "report-uri /api/csp-report",
  "report-to csp",
].join("; ");

export function secure(response, url, { cache } = {}) {
  const res = new Response(response.body, response);
  const h = res.headers;
  const shareable = /\.(png|svg|woff2|srt)$/.test(url.pathname);
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  h.set("Content-Security-Policy", CSP);
  h.set("Reporting-Endpoints", 'csp="/api/csp-report"');
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Resource-Policy", shareable ? "cross-origin" : "same-origin");
  const isHtml = (h.get("Content-Type") || "").includes("text/html");
  // Pages are sent exactly as rendered: no-transform stops the edge from injecting scripts (such as the
  // zone's automatic analytics beacon), which the About page promises are not there and the CSP would block.
  let cc = cache || h.get("Cache-Control") || (isHtml ? "no-cache" : null);
  if (cc && isHtml && !cc.includes("no-transform")) cc += ", no-transform";
  if (cc) h.set("Cache-Control", cc);
  if (/\.(css|js)$/.test(url.pathname) && /^\?v=[0-9a-f]{10}$/.test(url.search)) h.set("Cache-Control", "public, max-age=31536000, immutable");
  return res;
}

export const text = (body, status = 200, extra = {}) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", ...extra } });

export const redirect = (url, location, status = 301) =>
  new Response(null, { status, headers: { Location: new URL(location, url.origin).toString() } });

export { site };
