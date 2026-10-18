// translation.foundation.ge: shows the films being subtitled and how far each one has got.
//
// The subtitles themselves live in the shared GitHub repository (REPO in wrangler.jsonc), where people
// add them a few at a time. This Worker reads that repository, renders the pages in Georgian (at the root)
// and English (under /en/), serves the stylesheet, scripts and fonts from public/, and adds strict security
// headers to every response. It stores nothing and sets no cookies.
import { HOST, CONTACT, secure, text, redirect, prefix } from "./lib.js";
import { home, filmPage, download, staticPage, sitemap } from "./pages.js";
import { notFound } from "./render.js";
import site from "./generated/site.js";

const SECURITY_TXT_EXPIRES = "2027-10-17T00:00:00.000Z";

// Earlier addresses, so old links keep working.
const MOVED = {
  "/films/": "/", "/songs/": "/", "/requests/": "/", "/glossary/": "/", "/search/": "/", "/me/": "/", "/projects/": "/",
  "/guide/": "/help/", "/example/": "/help/", "/contribute/": "/help/", "/learn/": "/help/", "/submit/": "/help/",
  "/submit-thanks/": "/help/", "/style/": "/help/#rules", "/privacy/": "/about/#privacy", "/security/": "/about/#security",
  "/accessibility/": "/about/#accessibility",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    try {
      return await route(request, env, url);
    } catch (e) {
      console.log(JSON.stringify({ event: "error", path: url.pathname, message: String((e && e.stack) || e).slice(0, 1500) }));
      return secure(text("Something went wrong. Please try again in a moment.", 500), url, { cache: "no-store" });
    }
  },
};

async function route(request, env, url) {
  const path = url.pathname;
  if (path === "/api/csp-report" && request.method === "POST") return cspReport(request, env);
  if (request.method !== "GET" && request.method !== "HEAD") return secure(text("Method not allowed", 405, { Allow: "GET, HEAD" }), url);
  if (path === "/.well-known/security.txt") return secure(text(securityTxt()), url);
  if (path === "/sitemap.xml") return secure(await sitemap(env), url);

  const en = path === "/en" || path.startsWith("/en/");
  const lang = en ? "en" : "ka";
  const rest = en ? path.slice(3) || "/" : path;
  const ctx = { lang, path: rest, url, env };
  let m;

  if ((m = /^\/films\/([a-z0-9-]{1,60})\/(ka|en)\.srt$/.exec(rest))) {
    return secure((await download(ctx, m[1], m[2])) || text("Not found", 404), url);
  }
  if (/\.[A-Za-z0-9]+$/.test(path)) return secure(await env.ASSETS.fetch(request), url);
  if (!rest.endsWith("/")) return secure(redirect(url, prefix(lang) + rest + "/" + url.search), url);
  if (MOVED[rest]) return secure(redirect(url, prefix(lang) + MOVED[rest]), url);
  if (/^\/(new|u|receipt|admin|auth)\//.test(rest)) return secure(redirect(url, prefix(lang) + "/"), url);

  if (rest === "/") return secure(await home(ctx), url);
  if ((m = /^\/films\/([a-z0-9-]{1,60})\/$/.exec(rest))) return secure(await filmPage(ctx, m[1]), url);
  if ((m = /^\/([a-z]+)\/$/.exec(rest)) && site.pages[lang][m[1]]) return secure(staticPage(ctx, m[1]), url);
  return secure(notFound(ctx), url);
}

// CSP violation reports: logged (no IP, trimmed), never stored.
async function cspReport(request, env) {
  if (Number(request.headers.get("content-length") || 0) > 16384) return text("too large", 413);
  if (env.REPORT_LIMIT) {
    const { success } = await env.REPORT_LIMIT.limit({ key: "csp:" + (request.headers.get("cf-connecting-ip") || "unknown") });
    if (!success) return new Response(null, { status: 204 });
  }
  try { console.log(JSON.stringify({ event: "csp-violation", report: (await request.text()).slice(0, 2000) })); } catch {}
  return new Response(null, { status: 204 });
}

function securityTxt() {
  return [`Contact: mailto:${CONTACT}`, `Expires: ${SECURITY_TXT_EXPIRES}`, "Preferred-Languages: en, ka",
    `Canonical: https://${HOST}/.well-known/security.txt`, `Policy: https://${HOST}/en/about/#security`, ""].join("\n");
}
