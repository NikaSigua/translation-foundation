// The page shell (content/layout.html, compiled by build.py) and small shared pieces.
import { html, esc, t, prefix, site } from "./lib.js";

export function page(ctx, { title, description, body, status = 200, noindex = false, scripts = [] }) {
  const { lang, path } = ctx;
  const L = prefix(lang);
  const other = lang === "ka" ? "en" : "ka";
  const siteName = t(lang, "site_name");
  const values = {
    TITLE: esc(title ? `${title} · ${siteName}` : siteName),
    OG_TITLE: esc(title || siteName),
    DESCRIPTION: esc(description || t(lang, "home_lede")),
    ROBOTS: noindex ? '<meta name="robots" content="noindex">\n' : "",
    PATH: esc(L + path),
    PATH_KA: esc(path),
    PATH_EN: esc("/en" + path),
    ALT_PATH: esc((other === "en" ? "/en" : "") + path),
    SCRIPTS: scripts.map((s) => `<script src="${esc(site.versions[s] ? `${s}?v=${site.versions[s]}` : s)}" defer></script>`).join("\n"),
  };
  let out = site.layouts[lang].replace(/\{\{CUR:([^}]+)\}\}/g, (m, p) =>
    path === p ? ' aria-current="page"' : p !== "/" && path.startsWith(p) ? ' aria-current="true"' : "");
  out = out.replace(/\{\{(TITLE|OG_TITLE|DESCRIPTION|ROBOTS|PATH|PATH_KA|PATH_EN|ALT_PATH|SCRIPTS)\}\}/g, (m, k) => values[k]);
  out = out.replace("{{CONTENT}}", () => String(body));
  return new Response(out, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

// A film's timeline: the dark track is the whole film, the yellow part is what's done. Drawn with SVG
// attributes rather than inline styles, which the Content-Security-Policy forbids. The text beside it says
// the same thing for screen readers.
export function timeline(fraction, big = false) {
  const w = Math.max(0, Math.min(100, Math.round(fraction * 1000) / 10));
  return html`<svg class="timeline${big ? " timeline-big" : ""}" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="tl-track" width="100" height="4"/><rect class="tl-fill" width="${w}" height="4"/>${w > 0 && w < 100 ? html`<rect class="tl-head" x="${Math.max(0, w - 0.4)}" width="0.8" height="4"/>` : ""}</svg>`;
}

export function notFound(ctx) {
  const { lang } = ctx;
  const body = html`<div class="wrap narrow page">
  <h1>${t(lang, "notfound_h")}</h1>
  <p>${t(lang, "notfound_p")}</p>
  <p><a href="${prefix(lang)}/">${t(lang, "all_films")}</a></p>
</div>`;
  return page(ctx, { title: t(lang, "notfound_h"), body, status: 404, noindex: true });
}
