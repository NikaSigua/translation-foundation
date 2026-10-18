#!/usr/bin/env python3
"""Compiles content/ into src/generated/site.js, which the Worker uses to render every page.

The site is rendered by the Worker (src/), because the film pages show live progress, read from the
shared GitHub repository. This script prepares the parts that don't change:

content/layout.html          the page shell: header, menus and footer. {{T:key}} is interface text,
                             resolved here; other {{PLACEHOLDERS}} are filled in by the Worker per request.
content/strings.txt          interface text: key.en = ... / key.ka = ... (both languages are required)
content/pages/<lang>/*.html  the text pages (how to help, the subtitle checker, about),
                             same file name in both languages. Each starts with a front-matter comment:
                               <!--
                               title: Guide
                               description: One sentence for search results and link previews.
                               -->

Also written: public/robots.txt. Stylesheets and scripts are referenced as /file.css?v=<content hash>, so
browsers never pair a new page with an old file. The Worker serves /sitemap.xml from the database.
"""
import base64
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
LANGS = {"ka": {"prefix": "", "locale": "ka_GE"}, "en": {"prefix": "/en", "locale": "en_GB"}}
FRONT = re.compile(r"\A\s*<!--(.*?)-->\s*", re.S)
STRING = re.compile(r"\{\{T:([a-z0-9_]+)\}\}")
CONTACT = "translation@foundation.ge"
SITE = "https://translation.foundation.ge"


def read_strings():
    strings = {}
    for n, line in enumerate((ROOT / "content/strings.txt").read_text().splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        key, value = line.split(" = ", 1)
        name, lang = key.strip().rsplit(".", 1)
        if lang not in LANGS:
            raise SystemExit(f"strings.txt:{n}: unknown language {lang!r}")
        strings.setdefault(name, {})[lang] = value.strip()
    missing = sorted(k for k, v in strings.items() if set(v) != set(LANGS))
    if missing:
        raise SystemExit(f"strings.txt: keys without both languages: {missing}")
    return strings


def parse_page(path):
    text = path.read_text()
    match = FRONT.match(text)
    if not match:
        raise SystemExit(f"{path}: missing front-matter comment")
    meta = {}
    for line in match.group(1).strip().splitlines():
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    for required in ("title", "description"):
        if required not in meta:
            raise SystemExit(f"{path}: front matter needs '{required}'")
    return meta, text[match.end():]


def asset_versions():
    """A short content hash for each stylesheet and script."""
    return {"/" + f.relative_to(ROOT / "public").as_posix(): hashlib.sha256(f.read_bytes()).hexdigest()[:10]
            for f in (ROOT / "public").rglob("*") if f.suffix in (".css", ".js")}


def versioned(text, versions):
    pattern = re.compile(r'((?:src|href)=")(/[^"?#]+\.(?:css|js))(")')
    return pattern.sub(lambda m: m.group(1) + m.group(2) + ("?v=" + versions[m.group(2)] if m.group(2) in versions else "") + m.group(3), text)


def invisible(text):
    """Characters that are easy to paste by accident and hard to see."""
    return re.findall(r"[​-‏‪-‮⁠-⁤﻿­]", text)


def main():
    strings = read_strings()
    layout = (ROOT / "content/layout.html").read_text()
    versions = asset_versions()

    head_script = re.search(r"<head>.*?<script>(.*?)</script>", layout, re.S).group(1)
    theme_hash = "sha256-" + base64.b64encode(hashlib.sha256(head_script.encode()).digest()).decode()

    layouts = {}
    for lang, conf in LANGS.items():
        other = "en" if lang == "ka" else "ka"
        out = STRING.sub(lambda m: strings[m.group(1)][lang] if m.group(1) in strings else
                         (_ for _ in ()).throw(SystemExit(f"layout.html: unknown string {m.group(1)!r}")), layout)
        for key, value in {"LANG": lang, "L": conf["prefix"], "ALT_LANG": other, "OG_LOCALE": conf["locale"],
                           "CONTACT": CONTACT}.items():
            out = out.replace("{{" + key + "}}", value)
        layouts[lang] = versioned(out, versions)

    slugs = {lang: sorted(p.stem for p in (ROOT / "content/pages" / lang).glob("*.html")) for lang in LANGS}
    if slugs["ka"] != slugs["en"]:
        raise SystemExit(f"Pages differ between languages: {set(slugs['ka']) ^ set(slugs['en'])}")
    pages = {lang: {} for lang in LANGS}
    for lang in LANGS:
        for stem in slugs[lang]:
            path = ROOT / "content/pages" / lang / f"{stem}.html"
            meta, body = parse_page(path)
            if invisible(body):
                raise SystemExit(f"{path}: invisible characters {sorted(set(invisible(body)))}")
            pages[lang][stem] = {"title": meta["title"], "description": meta["description"], "body": versioned(body, versions)}

    for lang in LANGS:
        for name, value in strings.items():
            if invisible(value[lang]):
                raise SystemExit(f"strings.txt: {name}.{lang} has invisible characters")

    site = {"themeScriptHash": theme_hash, "versions": versions, "layouts": layouts, "strings": strings, "pages": pages}
    out = ROOT / "src/generated/site.js"
    out.parent.mkdir(exist_ok=True)
    out.write_text("// Generated by build.py from content/. Do not edit.\nexport default "
                   + json.dumps(site, ensure_ascii=False, indent=1) + ";\n")

    (ROOT / "public/robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {SITE}/sitemap.xml\n")
    print(f"site.js: {len(strings)} strings, {sum(len(p) for p in pages.values())} static pages, theme {theme_hash[:20]}…")


if __name__ == "__main__":
    main()
