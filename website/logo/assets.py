"""Logo, favicon, app icons and link-preview images for translation.foundation.ge.

The mark is a screen with two subtitle lines: white for one language, amber for the other.
Run `python3 assets.py` to write favicon.svg, apple-touch-icon.png, logo-512.png and og-ka/og-en.png
into ../public/ (needs rsvg-convert).
"""
import pathlib
import subprocess
from xml.sax.saxutils import escape

HERE = pathlib.Path(__file__).parent
PUBLIC = HERE.parent / "public"
INK, PAPER, AMBER, YELLOW = "#1b1b1a", "#fbfaf7", "#c47d0e", "#ffd23f"


def mark(x=0, y=0, size=34, ink=INK, top=PAPER, bottom=AMBER):
    s = size / 34
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<rect x="1" y="4" width="32" height="26" rx="3" fill="{ink}"/>'
            f'<rect x="6" y="17" width="22" height="3.4" rx="1.7" fill="{top}"/>'
            f'<rect x="10" y="23" width="14" height="3.4" rx="1.7" fill="{bottom}"/></g>')


def svg(width, height, body, background=None):
    bg = f'<rect width="{width}" height="{height}" fill="{background}"/>' if background else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">{bg}{body}</svg>'


def png(source, target, width=None):
    src = HERE / "tmp.svg"
    src.write_text(source)
    cmd = ["rsvg-convert", str(src), "-o", str(target)] + (["-w", str(width)] if width else [])
    subprocess.run(cmd, check=True)
    src.unlink()


OG = {
    "ka": dict(title="თარგმანის ფონდი", title_size=50, lines=["ღია სუბტიტრები ფილმებისთვის", "ქართულ და ინგლისურ ენებზე"], body_size=31),
    "en": dict(title="Translation Foundation", title_size=46, lines=["Open subtitles for films", "in Georgian and English"], body_size=38),
}


def og(lang):
    t = OG[lang]
    font = "Helvetica Neue"
    # Left: a film frame with one dual-language subtitle. Right: the name and what it is.
    screen = (f'<rect x="70" y="135" width="520" height="292" fill="{INK}"/>'
              f'<text x="330" y="360" text-anchor="middle" font-family="{font}" font-weight="700" font-size="40" fill="{PAPER}">გამარჯობა!</text>'
              f'<text x="330" y="405" text-anchor="middle" font-family="{font}" font-size="34" fill="{YELLOW}">Hello!</text>'
              f'<text x="70" y="470" font-family="Menlo" font-size="22" fill="#575b61">1  00:00:01,000 --&gt; 00:00:03,500</text>')
    lines = "".join(f'<text x="640" y="{330 + i * 54}" font-family="{font}" font-size="{t["body_size"]}" fill="#3d4148">{escape(l)}</text>'
                    for i, l in enumerate(t["lines"]))
    body = (screen + mark(640, 140, 72)
            + f'<text x="640" y="268" font-family="{font}" font-weight="700" font-size="{t["title_size"]}" fill="{INK}">{escape(t["title"])}</text>'
            + lines
            + f'<rect x="640" y="470" width="64" height="5" fill="{AMBER}"/>'
            + f'<text x="640" y="525" font-family="{font}" font-weight="700" font-size="30" fill="#8a4f00">translation.foundation.ge</text>')
    return svg(1200, 630, body, PAPER)


if __name__ == "__main__":
    (PUBLIC / "favicon.svg").write_text(svg(34, 34, mark()))
    png(svg(180, 180, mark(18, 18, 144), PAPER), PUBLIC / "apple-touch-icon.png")
    png(svg(512, 512, mark(40, 40, 432), PAPER), PUBLIC / "logo-512.png")
    for lang in OG:
        png(og(lang), PUBLIC / f"og-{lang}.png")
    print("wrote favicon.svg, apple-touch-icon.png, logo-512.png, og-ka.png, og-en.png")
