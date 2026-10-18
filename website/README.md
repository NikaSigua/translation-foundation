# translation.foundation.ge

The website for this project. It shows each film and how far its subtitles have got, read live from the files in `films/` on GitHub. It stores nothing and sets no cookies.

| Path | What it is |
| --- | --- |
| `src/worker.js` | Routing and old addresses. |
| `src/pages.js` | The film list, film pages and downloads. Reads `films/films.json` and the `.srt` files from GitHub (cached for a minute). |
| `src/subtitles.js` | Reads subtitle files and works out progress, by the same rules as `tools/check_subtitles.py`. |
| `src/lib.js`, `src/render.js` | Escaped HTML templates, security headers and the page shell. |
| `content/` | The page shell (`layout.html`), interface text in Georgian and English (`strings.txt`), and the text pages (how to help, the checker, about). |
| `public/` | Stylesheet, fonts, images, and the browser scripts (all optional). |
| `build.py` | Compiles `content/` into `src/generated/site.js`. Run it after changing `content/` or `public/`. |

## Run locally

From the repository root, serve the files the site reads:

```bash
python3 -m http.server 8799
```

Then, in `website/`, put `RAW_BASE=http://localhost:8799/` in `.dev.vars`, and:

```bash
python3 build.py && npx wrangler@4 dev --local --port 8798 --local-upstream localhost:8798
```

## Deploy

```bash
python3 build.py && npx wrangler@4 deploy
```
