#!/usr/bin/env python3
"""Checks every subtitle file in films/ and prints how far each translation has got.

Runs on every pull request (.github/workflows/check.yml), so a broken file never reaches the shared copy.
You can also run it yourself: python3 tools/check_subtitles.py
On a pull request it also compares each file with the shared copy (--base origin/main), so a change can never
undo work that is already there, for example an upload made from an old copy of the file.

Errors (the pull request can't be merged until they're fixed):
  - a subtitle that can't be read: missing number, bad time line, or no text
  - numbers out of order, or times that go backwards
  - a translation whose number of subtitles or times differ from its source file
  - a change that would undo work already in the shared copy: translated subtitles turned back into the
    original, or a written-down film that got shorter
Warnings (worth a look, but allowed):
  - lines longer than 42 characters, or more than 2 lines in one subtitle
  - formatting tags other than <i>
"""
import json
import os
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TIME = re.compile(r"^(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})$")
GEORGIAN = re.compile(r"[ა-ჿᲐ-Ჿ]")
LATIN = re.compile(r"[A-Za-z]")
IN_ACTIONS = os.environ.get("GITHUB_ACTIONS") == "true"


def ms(h, m, s, f):
    return ((int(h) * 60 + int(m)) * 60 + int(s)) * 1000 + int(f)


def clock(t):
    s = t // 1000
    return f"{s // 3600}:{s // 60 % 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def report(kind, path, line, message):
    rel = path.relative_to(ROOT)
    if IN_ACTIONS:
        print(f"::{kind} file={rel},line={line}::{message}")
    else:
        print(f"{rel}:{line}: {kind}: {message}")


def parse(path, raw=None):
    """Returns (cues, errors). Each cue: number, start, end, text lines, and the line of its number in the file."""
    errors = []
    raw = path.read_bytes() if raw is None else raw
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return [], [(1, "The file isn't saved as UTF-8.")]
    lines = text.lstrip("\uFEFF").replace("\r\n", "\n").split("\n")
    cues, i = [], 0
    while i < len(lines):
        if not lines[i].strip():
            i += 1
            continue
        start_line = i + 1
        number = lines[i].strip()
        if not number.isdigit():
            errors.append((start_line, f"Expected a subtitle number, found {number[:40]!r}."))
            while i < len(lines) and lines[i].strip():
                i += 1
            continue
        m = TIME.match(lines[i + 1].strip()) if i + 1 < len(lines) else None
        if not m:
            errors.append((start_line + 1, f"Subtitle {number}: the time line should look like 00:01:02,500 --> 00:01:04,000."))
            i += 2
            while i < len(lines) and lines[i].strip():
                i += 1
            continue
        body = []
        j = i + 2
        while j < len(lines) and lines[j].strip():
            body.append(lines[j].rstrip())
            j += 1
        if not body:
            errors.append((start_line, f"Subtitle {number} has no text."))
        cues.append({"n": int(number), "start": ms(*m.groups()[:4]), "end": ms(*m.groups()[4:]), "text": body, "line": start_line})
        i = j
    return cues, errors


def done(cue, lang):
    text = " ".join(cue["text"])
    return bool(GEORGIAN.search(text)) if lang == "ka" else bool(LATIN.search(text)) and not GEORGIAN.search(text)


def runtime_ms(value):
    parts = [int(p) for p in value.split(":")]
    while len(parts) < 3:
        parts.insert(0, 0)
    return ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000


def base_version(ref, rel):
    """The file as it is in the shared copy, or None if it is new there."""
    try:
        return subprocess.run(["git", "show", f"{ref}:{rel}"], cwd=ROOT, capture_output=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def main():
    base = sys.argv[sys.argv.index("--base") + 1] if "--base" in sys.argv else None
    films = json.loads((ROOT / "films/films.json").read_text(encoding="utf-8"))
    sources = {}
    for film in films:
        for f in film["files"]:
            sources[f["path"]] = (film, f)
    failed = False
    for path in sorted((ROOT / "films").rglob("*.srt")):
        cues, errors = parse(path)
        for line, message in errors:
            report("error", path, line, message)
        for k, cue in enumerate(cues, 1):
            if cue["n"] != k:
                errors.append(1)
                report("error", path, cue["line"], f"Subtitle number {cue['n']} should be {k}: numbers go 1, 2, 3… without gaps.")
                break
        for a, b in zip(cues, cues[1:]):
            if b["start"] < a["start"]:
                errors.append(1)
                report("error", path, b["line"], f"Subtitle {b['n']} starts before subtitle {a['n']}.")
        rel = path.relative_to(ROOT).as_posix()
        editable = rel in sources   # official reference files (sources) are not edited, so no style warnings
        for cue in cues:
            if cue["end"] <= cue["start"]:
                errors.append(1)
                report("error", path, cue["line"], f"Subtitle {cue['n']} ends before it starts.")
            if not editable:
                continue
            target = sources[rel][1]
            if target.get("source") and not done(cue, target["lang"]):
                continue   # not translated yet: the text is still the original
            if len(cue["text"]) > 2:
                report("warning", path, cue["line"], f"Subtitle {cue['n']} has {len(cue['text'])} lines; 2 at most is easier to read.")
            for t in cue["text"]:
                if len(re.sub(r"</?i>", "", t)) > 42:
                    report("warning", path, cue["line"], f"Subtitle {cue['n']}: a line is longer than 42 characters.")
                if re.search(r"<(?!/?i>)[^>]+>|\{\\", t):
                    report("warning", path, cue["line"], f"Subtitle {cue['n']}: only <i> italics are kept; other tags are removed.")

        if rel in sources and base:
            film, f = sources[rel]
            old_raw = base_version(base, rel)
            old, _ = parse(path, old_raw) if old_raw is not None else ([], [])
            if f.get("source"):
                undone = [o["n"] for o, c in zip(old, cues) if done(o, f["lang"]) and not done(c, f["lang"])]
                if undone:
                    errors.append(1)
                    report("error", path, 1, f"This change would undo translated subtitles {undone[0]}–{undone[-1]} that are already in the shared copy. "
                           "Get the latest file from the film's page, add your part to it, and upload it again.")
            elif old and (len(cues) < len(old) or (cues and cues[-1]["end"] < old[-1]["end"])):
                errors.append(1)
                report("error", path, 1, f"This change would remove subtitles that are already in the shared copy (it had {len(old)}, now {len(cues)}). "
                       "Get the latest file from the film's page, add your part to it, and upload it again.")

        if rel in sources:
            film, f = sources[rel]
            if f.get("source"):
                src_cues, _ = parse(ROOT / f["source"])
                if len(src_cues) != len(cues):
                    errors.append(1)
                    report("error", path, 1, f"This translation has {len(cues)} subtitles but {f['source']} has {len(src_cues)}. Keep one translated subtitle for each original one.")
                else:
                    for a, b in zip(src_cues, cues):
                        if (a["start"], a["end"]) != (b["start"], b["end"]):
                            report("warning", path, b["line"], f"Subtitle {b['n']}: the times differ from {f['source']}.")
                            break
                n = sum(done(c, f["lang"]) for c in cues)
                nxt = next((c for c in cues if not done(c, f["lang"])), None)
                where = f"next: subtitle {nxt['n']} at {clock(nxt['start'])}" if nxt else "finished"
                print(f"{rel}: {n} of {len(cues)} subtitles translated ({where})")
            else:
                total = runtime_ms(film["runtime"])
                last = cues[-1]["end"] if cues else 0
                print(f"{rel}: written down up to {clock(last)} of {clock(total)}")
        failed = failed or bool(errors)
    if failed:
        print("Some subtitle files need fixing (see the errors above).")
        sys.exit(1)
    print("All subtitle files are fine.")


if __name__ == "__main__":
    main()
