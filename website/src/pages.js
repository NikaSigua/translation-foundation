// The pages. Film data comes from the shared GitHub repository (films/films.json and the .srt files),
// read through GitHub's raw file server and cached for a minute, so a merged change shows up by itself.
import { html, raw, t, th, prefix, safeLink, clock, runtimeMs, site, text, HOST } from "./lib.js";
import { page, timeline, notFound } from "./render.js";
import { parse, progress } from "./subtitles.js";

const SLUG = /^[a-z0-9-]{1,60}$/;
const FILE = /^films\/[a-z0-9-]{1,60}\/(ka|en)\.srt$/;

// ---------- Reading the repository ----------
export function repo(env) {
  const name = env.REPO;
  const branch = env.BRANCH || "main";
  return { name, branch, raw: env.RAW_BASE || `https://raw.githubusercontent.com/${name}/${branch}/`, web: `https://github.com/${name}` };
}

async function getRaw(env, path) {
  const res = await fetch(repo(env).raw + path, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (res.status === 404) return "";            // a file that hasn't been started yet
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${path}`);
  return res.text();
}

// films.json is written by maintainers, but it is still checked here: anything malformed is skipped.
const local = (v) => (v && typeof v === "object" && typeof v.en === "string" && typeof v.ka === "string" ? v : null);
function clean(f) {
  if (!f || !SLUG.test(f.slug) || !local(f.title) || !Array.isArray(f.files)) return null;
  const files = f.files.filter((x) => x && FILE.test(x.path) && ["ka", "en"].includes(x.lang) && (!x.source || FILE.test(x.source)));
  return {
    slug: f.slug, title: f.title, by: local(f.by), rights: local(f.rights),
    year: Number.isInteger(f.year) ? f.year : null,
    imdb: /^tt\d{5,10}$/.test(f.imdb || "") ? f.imdb : null,
    runtime: /^\d{1,2}(:\d{2}){1,2}$/.test(f.runtime || "") ? f.runtime : null,
    watch: safeLink(f.watch), video: safeLink(f.video),
    status: f.status === "waiting" ? "waiting" : "open",
    issue: Number.isInteger(f.issue) ? f.issue : null,
    files,
  };
}

export async function loadFilms(env) {
  const list = JSON.parse(await getRaw(env, "films/films.json"));
  return Array.isArray(list) ? list.map(clean).filter(Boolean) : [];
}

async function withProgress(env, film) {
  const runtime = runtimeMs(film.runtime);
  const tracks = await Promise.all(film.files.map(async (file) => {
    if (film.status === "waiting") return { file, p: null };
    const [target, source] = await Promise.all([getRaw(env, file.path), file.source ? getRaw(env, file.source) : ""]);
    const p = progress(file, target, runtime);
    if (p.next) {
      const index = parse(target).findIndex((c) => c.n === p.next.n);
      p.sourceText = index >= 0 ? (parse(source)[index] || {}).text : null;
    }
    return { file, p };
  }));
  return { ...film, tracks };
}

// ---------- Small pieces ----------
const other = (lang) => (lang === "ka" ? "en" : "ka");
const titleHtml = (lang, f) => html`${f.title[lang]}${f.title[other(lang)] !== f.title[lang] ? html` <span class="title-other" lang="${other(lang)}">${f.title[other(lang)]}</span>` : ""}`;
const facts = (lang, f) => [f.year, f.by && f.by[lang], f.runtime].filter(Boolean).join(" · ");
const filmHref = (lang, f) => `${prefix(lang)}/films/${f.slug}/`;

function trackName(lang, film, file) {
  if (file.lang === "ka") return t(lang, file.source ? "track_ka" : "track_ka_written");
  return t(lang, "track_en");
}

function status(lang, film, tr) {
  if (!tr.p) return t(lang, "waiting");
  const p = tr.p;
  if (p.mode === "translate") {
    if (!p.total) return t(lang, "not_started");
    return p.done === p.total ? t(lang, "finished") : t(lang, "done_of", { done: p.done, total: p.total });
  }
  return p.reached ? t(lang, "written_to", { at: clock(p.reached), total: clock(p.runtime) }) : t(lang, "not_started");
}

// Where to continue, as a time in the film.
function nextAt(tr) {
  if (!tr.p) return null;
  if (tr.p.mode === "translate") return tr.p.next ? tr.p.next.start : null;
  return tr.p.reached < tr.p.runtime ? tr.p.reached : null;
}

function watchFrom(url, ms) {
  if (!url || ms == null) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)youtube\.com$/.test(u.hostname) || !u.searchParams.get("v")) return null;
    u.searchParams.set("t", `${Math.floor(ms / 1000)}s`);
    return u.toString();
  } catch { return null; }
}

// ---------- Home ----------
export async function home(ctx) {
  const { lang, env } = ctx;
  const L = prefix(lang);
  let list;
  try {
    list = await Promise.all((await loadFilms(env)).map((f) => withProgress(env, f)));
  } catch (e) {
    console.log(JSON.stringify({ event: "films-load-failed", message: String(e) }));
    list = null;
  }
  const films = list ? html`<ul class="films">${list.map((f) => html`<li class="film">
      <h3 class="film-title"><a href="${filmHref(lang, f)}">${titleHtml(lang, f)}</a></h3>
      <p class="film-meta">${facts(lang, f)}</p>
      ${f.tracks.map((tr) => html`<div class="track">
        <p class="track-line"><span class="track-name">${trackName(lang, f, tr.file)}</span><span class="track-status">${status(lang, f, tr)}</span></p>
        ${timeline(tr.p ? tr.p.fraction : 0)}
      </div>`)}
      <p class="film-next">${f.status === "waiting"
        ? html`<a href="${filmHref(lang, f)}">${t(lang, "why_waiting")}</a>`
        : html`<a href="${filmHref(lang, f)}">${nextAt(f.tracks[0]) != null ? t(lang, "continue_at", { at: clock(nextAt(f.tracks[0])) }) : t(lang, "open_film")}</a>`}</p>
    </li>`)}</ul>`
    : html`<p class="notice">${t(lang, "load_error")}</p>`;

  const body = html`<div class="wrap">
  <section class="intro">
    <h1>${t(lang, "home_h1")}</h1>
    <p class="lede">${t(lang, "home_lede")}</p>
  </section>
  <section aria-labelledby="h-films">
    <h2 id="h-films" class="section-title">${t(lang, "films_h")}</h2>
    ${films}
  </section>
  <section class="how" aria-labelledby="h-how">
    <h2 id="h-how" class="section-title">${t(lang, "how_h")}</h2>
    <ol class="steps">
      <li>${t(lang, "how_1")}</li>
      <li>${t(lang, "how_2")}</li>
      <li>${t(lang, "how_3")}</li>
    </ol>
    <p><a class="button" href="${L}/help/">${t(lang, "how_link")}</a></p>
  </section>
</div>`;
  return page(ctx, { body, description: t(lang, "home_lede") });
}

// ---------- One film ----------
export async function filmPage(ctx, slug) {
  const { lang, env } = ctx;
  const L = prefix(lang);
  const R = repo(env);
  const found = (await loadFilms(env)).find((f) => f.slug === slug);
  if (!found) return notFound(ctx);
  const f = await withProgress(env, found);
  const issue = f.issue ? `${R.web}/issues/${f.issue}` : `${R.web}/issues`;

  const panels = f.tracks.map((tr) => {
    const at = nextAt(tr);
    let next = "";
    if (tr.p && tr.p.mode === "translate" && tr.p.next) {
      next = html`<p class="next">${t(lang, "next_translate", { n: tr.p.next.n, at: clock(tr.p.next.start) })}</p>
        ${tr.p.sourceText ? html`<blockquote class="cue" lang="${tr.file.lang === "ka" ? "en" : "ka"}"><span class="cue-time">${clock(tr.p.next.start)}</span>${tr.p.sourceText}</blockquote>` : ""}`;
    } else if (tr.p && tr.p.mode === "write" && at != null) {
      next = html`<p class="next">${t(lang, "next_write", { at: clock(at) })}</p>`;
    }
    const watch = watchFrom(f.watch, at);
    const line = tr.p && tr.p.next ? `#L${tr.p.next.line}` : "";
    return html`<section class="panel" aria-labelledby="h-${tr.file.lang}">
      <div class="panel-head"><h2 id="h-${tr.file.lang}">${trackName(lang, f, tr.file)}</h2><p class="track-status">${status(lang, f, tr)}</p></div>
      ${timeline(tr.p ? tr.p.fraction : 0, true)}
      ${f.status === "waiting" ? "" : html`
      ${next}
      <p class="actions">
        <a class="button button-primary" href="${R.web}/edit/${R.branch}/${tr.file.path}">${t(lang, "btn_edit")}</a>
        <a class="button" href="${issue}">${t(lang, "btn_take")}</a>
        ${watch ? html`<a class="button" href="${watch}">${t(lang, "btn_watch_from", { at: clock(at) })}</a>` : ""}
      </p>
      <ul class="more-links">
        <li><a href="${R.web}/blob/${R.branch}/${tr.file.path}${line}">${t(lang, "btn_where")}</a></li>
        <li><a href="${L}/films/${f.slug}/${tr.file.lang}.srt" download>${t(lang, "btn_download")}</a></li>
        <li><a href="${R.web}/upload/${R.branch}/films/${f.slug}">${t(lang, "btn_upload")}</a></li>
        ${f.video ? html`<li><a href="${f.video}">${t(lang, "btn_video")}</a></li>` : ""}
      </ul>`}
    </section>`;
  });

  const body = html`<div class="wrap narrow">
  <p class="back"><a href="${L}/">← ${t(lang, "all_films")}</a></p>
  <h1 class="film-h1">${titleHtml(lang, f)}</h1>
  <p class="film-meta">${facts(lang, f)}${f.imdb ? html` · <a href="https://www.imdb.com/title/${f.imdb}/">IMDb</a>` : ""}</p>
  ${f.status === "waiting" ? html`<div class="notice"><p><strong>${t(lang, "waiting")}.</strong> ${f.rights ? f.rights[lang] : ""}</p>
    <p><a href="${R.web}/blob/${R.branch}/PERMISSION-LETTER.md">${t(lang, "letter_link")}</a></p></div>` : ""}
  ${panels}
  ${f.status === "waiting" ? "" : html`<section class="film-about">
    ${f.watch ? html`<p>${th(lang, "times_match", { link: html`<a href="${f.watch}">${new URL(f.watch).hostname.replace(/^www\./, "")}</a>` })}</p>` : ""}
    ${f.rights ? html`<p>${f.rights[lang]}</p>` : ""}
    <p>${th(lang, "first_time", { link: html`<a href="${L}/help/">${t(lang, "nav_help")}</a>` })}</p>
  </section>`}
</div>`;
  return page(ctx, { title: f.title[lang], description: `${f.title[lang]}: ${t(lang, "home_lede")}`, body });
}

// The latest file, as a download (for Aegisub and other editors).
export async function download(ctx, slug, lang) {
  const film = (await loadFilms(ctx.env)).find((f) => f.slug === slug);
  const file = film && film.status !== "waiting" && film.files.find((x) => x.lang === lang);
  if (!file) return null;
  const body = await getRaw(ctx.env, file.path);
  return new Response(body, { headers: {
    "Content-Type": "application/x-subrip; charset=utf-8",
    "Content-Disposition": `attachment; filename="${slug}.${lang}.srt"`,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=60",
  } });
}

// ---------- Static pages: help, checker, about ----------
export function staticPage(ctx, slug) {
  const p = site.pages[ctx.lang][slug];
  const R = repo(ctx.env);
  const body = p.body.replaceAll("{{REPO}}", R.web).replaceAll("{{BRANCH}}", R.branch);
  return page(ctx, { title: p.title, description: p.description, body: raw(body), scripts: slug === "check" ? ["/checker.js"] : [] });
}

export async function sitemap(env) {
  let films = [];
  try { films = await loadFilms(env); } catch {}
  const paths = ["/", ...Object.keys(site.pages.ka).map((s) => `/${s}/`), ...films.map((f) => `/films/${f.slug}/`)];
  const urls = paths.flatMap((p) => [p, "/en" + p]).map((p) => `  <url><loc>https://${HOST}${p}</loc></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

export { text };
