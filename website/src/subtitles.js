// Reads SRT files from the shared repository and works out how far each film has got.
// The same rules as tools/check_subtitles.py: a subtitle in a Georgian file counts as done when it has
// Georgian letters; one in an English file, when it has Latin letters and no Georgian ones.
const TIME = /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;
const ms = (h, m, s, f) => ((+h * 60 + +m) * 60 + +s) * 1000 + +(f + "00").slice(0, 3);
const GEORGIAN = /[ა-ჿᲐ-Ჿ]/;
const LATIN = /[A-Za-z]/;

export function parse(text) {
  const lines = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const cues = [];
  for (let i = 0; i < lines.length; i++) {
    const m = TIME.exec(lines[i].trim());
    if (!m) continue;
    const body = [];
    let j = i + 1;
    while (j < lines.length && lines[j].trim()) body.push(lines[j].trim()), j++;
    const n = Number((lines[i - 1] || "").trim()) || cues.length + 1;
    cues.push({ n, line: i, start: ms(m[1], m[2], m[3], m[4]), end: ms(m[5], m[6], m[7], m[8]), text: body.join(" ") });
    i = j;
  }
  return cues;
}

export const isDone = (cue, lang) =>
  lang === "ka" ? GEORGIAN.test(cue.text) : LATIN.test(cue.text) && !GEORGIAN.test(cue.text);

// Progress of one file.
//   translate (the file started as a copy of its source): how many subtitles are done, and the first one
//     that isn't, which is where to continue
//   write down (no source): how far into the film the subtitles reach
export function progress(file, targetText, runtimeMs) {
  const cues = parse(targetText);
  if (file.source) {
    const total = cues.length;
    const done = cues.filter((c) => isDone(c, file.lang)).length;
    const next = cues.find((c) => !isDone(c, file.lang)) || null;
    return { mode: "translate", total, done, next, fraction: total ? done / total : 0 };
  }
  const reached = cues.length ? cues[cues.length - 1].end : 0;
  return { mode: "write", reached, runtime: runtimeMs, next: null, fraction: runtimeMs ? Math.min(1, reached / runtimeMs) : 0 };
}
