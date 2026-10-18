// Subtitle checker. Reads an .srt or .vtt file in the browser (it is never uploaded), checks it
// against the style guide, converts Georgian typed in old Latin-keyed fonts (AcadNusx and similar)
// to Unicode, and saves clean SRT or WebVTT files.
// File content is only ever inserted with textContent, never as HTML.
(function () {
  var form = document.querySelector("[data-checker]");
  if (!form) return;
  var T = JSON.parse(document.getElementById("checker-text").textContent);
  var report = document.querySelector("[data-report]");
  var heading = report.querySelector("h2");
  var summary = report.querySelector("[data-summary]");
  var legacyBox = report.querySelector("[data-legacy]");
  var preview = report.querySelector("[data-preview]");
  var table = report.querySelector("[data-issues]");
  var tbody = table.querySelector("tbody");
  var status = form.querySelector(".form-status");
  var fileInput = form.querySelector("#sub-file");
  var textInput = form.querySelector("#sub-text");
  var langSelect = form.querySelector("#sub-lang");
  var DEC = T.decimal || ".";
  var MAX_CHARS = 42, MAX_LINES = 2, MIN_MS = 833, MAX_MS = 7000, MAX_LISTED = 300;
  var state = { cues: [], name: "subtitles", note: "" };

  var fill = function (template, values) {
    return template.replace(/\{(\w+)\}/g, function (m, k) { return values[k] !== undefined ? values[k] : m; });
  };
  var num = function (x, digits) { return x.toFixed(digits).replace(".", DEC); };
  var pad = function (n, w) { return String(n).padStart(w, "0"); };

  // ---------- Time ----------
  function ms(h, m, s, frac) { return ((+h || 0) * 3600 + +m * 60 + +s) * 1000 + +(frac + "00").slice(0, 3); }
  function stamp(t, sep) {
    return pad(Math.floor(t / 3600000), 2) + ":" + pad(Math.floor(t / 60000) % 60, 2) + ":" +
      pad(Math.floor(t / 1000) % 60, 2) + sep + pad(t % 1000, 3);
  }
  function length(t) {
    var s = Math.round(t / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    return (h ? h + ":" + pad(m, 2) : m) + ":" + pad(s % 60, 2);
  }

  // ---------- Parsing (SRT and WebVTT) ----------
  var TIME = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{1,3})\s*-->\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/;
  function parse(text) {
    text = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    var vtt = /^WEBVTT/.test(text);
    var cues = [];
    text.split(/\n[ \t]*\n/).forEach(function (block) {
      var lines = block.split("\n");
      while (lines.length && !lines[0].trim()) lines.shift();
      if (!lines.length) return;
      if (vtt && /^(WEBVTT|NOTE|STYLE|REGION)\b/.test(lines[0])) return;
      var t = -1;
      for (var i = 0; i < Math.min(lines.length, 3); i++) if (lines[i].indexOf("-->") !== -1) { t = i; break; }
      var m = t === -1 ? null : TIME.exec(lines[t]);
      if (!m) { cues.push({ bad: true }); return; }
      cues.push({
        start: ms(m[1], m[2], m[3], m[4]),
        end: ms(m[5], m[6], m[7], m[8]),
        lines: lines.slice(t + 1).map(function (l) { return l.replace(/\s+$/, ""); }).filter(function (l) { return l.trim() !== ""; })
      });
    });
    return cues;
  }

  // Text as the viewer sees it: no <i> tags or {\an8}-style codes.
  var visible = function (line) { return line.replace(/<[^>]*>/g, "").replace(/\{\\[^}]*\}/g, ""); };
  var GEORGIAN = /[\u10D0-\u10FF]/;
  var MTAVRULI = /[\u1C90-\u1CBF]/;

  // ---------- Old Latin-keyed Georgian fonts ----------
  // The same letters as the Georgian keyboard layout: T is თ, W is ჭ, R is ღ, S is შ, J is ჟ, Z is ძ, C is ჩ.
  var KEYS = { a: "ა", b: "ბ", g: "გ", d: "დ", e: "ე", v: "ვ", z: "ზ", T: "თ", i: "ი", k: "კ", l: "ლ", m: "მ",
    n: "ნ", o: "ო", p: "პ", J: "ჟ", r: "რ", s: "ს", t: "ტ", u: "უ", f: "ფ", q: "ქ", R: "ღ", y: "ყ", S: "შ",
    C: "ჩ", c: "ც", Z: "ძ", w: "წ", W: "ჭ", x: "ხ", j: "ჯ", h: "ჰ" };
  function toUnicode(line) {
    return line.split(/(<[^>]*>|\{\\[^}]*\})/).map(function (part, i) {
      if (i % 2) return part;  // keep tags as they are
      return part.replace(/[A-Za-z]/g, function (ch) { return KEYS[ch] || KEYS[ch.toLowerCase()] || ch; });
    }).join("");
  }
  function looksLegacy(cues, lang) {
    if (lang !== "ka") return false;
    var all = cues.map(function (c) { return (c.lines || []).map(visible).join(" "); }).join(" ");
    return !GEORGIAN.test(all) && (all.match(/[A-Za-z]/g) || []).length >= 10;
  }

  // ---------- Checks ----------
  function check(cues, lang) {
    var issues = [];
    var maxCps = lang === "en" ? 20 : 17;
    var add = function (n, cue, text) { issues.push({ n: n, time: cue && !cue.bad ? stamp(cue.start, ",") : "", text: text }); };
    var prev = null;
    cues.forEach(function (c, i) {
      var n = i + 1;
      if (c.bad) { add(n, null, T.parse); return; }
      var dur = c.end - c.start;
      if (prev) {
        if (c.start < prev.cue.start) add(n, c, T.order);
        else if (prev.cue.end > c.start) add(prev.n, prev.cue, fill(T.overlap, { ms: prev.cue.end - c.start }));
      }
      if (!c.lines.length) add(n, c, T.empty);
      if (dur < MIN_MS) add(n, c, fill(T.short, { s: num(Math.max(dur, 0) / 1000, 2) }));
      else if (dur > MAX_MS) add(n, c, fill(T.long, { s: num(dur / 1000, 1) }));
      if (c.lines.length > MAX_LINES) add(n, c, fill(T.lines, { n: c.lines.length }));
      c.lines.forEach(function (l, j) {
        var len = Array.from(visible(l)).length;
        if (len > MAX_CHARS) add(n, c, fill(T.lineLong, { i: j + 1, n: len }));
      });
      var chars = Array.from(c.lines.map(visible).join(" ")).length;
      if (dur > 0 && chars / (dur / 1000) > maxCps + 0.05) {
        add(n, c, fill(T.cps, { cps: num(chars / (dur / 1000), 1), max: maxCps }));
      }
      if (lang === "ka") {
        var text = c.lines.map(visible).join(" ");
        if (MTAVRULI.test(text)) add(n, c, T.mtavruli);
        if (text.indexOf('"') !== -1) add(n, c, T.quotes);
      }
      prev = { n: n, cue: c };
    });
    return issues;
  }

  // ---------- Output ----------
  function render() {
    var lang = langSelect.value;
    var cues = state.cues;
    var good = cues.filter(function (c) { return !c.bad; });
    var legacy = looksLegacy(cues, lang);
    var issues = legacy ? [] : check(cues, lang);
    var end = good.reduce(function (m, c) { return Math.max(m, c.end); }, 0);
    summary.textContent = (state.note ? state.note + " " : "") + fill(T.summary, {
      cues: good.length,
      duration: length(end),
      issues: legacy ? "" : issues.length ? fill(T.issuesSome, { n: issues.length }) : T.issuesNone
    });
    legacyBox.hidden = !legacy;
    tbody.textContent = "";
    issues.slice(0, MAX_LISTED).forEach(function (issue) {
      var tr = document.createElement("tr");
      [String(issue.n), issue.time, issue.text].forEach(function (value, k) {
        var cell = document.createElement(k === 0 ? "th" : "td");
        if (k === 0) cell.scope = "row";
        cell.textContent = value;
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });
    if (issues.length > MAX_LISTED) {
      var tr = document.createElement("tr"), td = document.createElement("td");
      td.colSpan = 3;
      td.textContent = fill(T.more, { n: MAX_LISTED });
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    table.hidden = !issues.length;
    report.hidden = false;
    heading.focus();
  }

  function load(text, name) {
    state.cues = parse(text);
    state.name = name;
    preview.hidden = true;
    if (!state.cues.some(function (c) { return !c.bad; })) {
      report.hidden = true;
      status.textContent = T.noCues;
      return;
    }
    status.textContent = "";
    render();
  }

  function readFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var bytes = reader.result, text;
      state.note = "";
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch (e) {
        text = new TextDecoder("windows-1252").decode(bytes);
        state.note = T.notUtf8;
      }
      load(text, file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsArrayBuffer(file);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (fileInput.files.length) return readFile(fileInput.files[0]);
    if (textInput.value.trim()) { state.note = ""; return load(textInput.value, "subtitles"); }
    status.textContent = T.noInput;
  });
  fileInput.addEventListener("change", function () { if (fileInput.files.length) readFile(fileInput.files[0]); });
  langSelect.addEventListener("change", function () { if (!report.hidden) render(); });

  // ---------- Convert old fonts ----------
  report.querySelector("[data-convert]").addEventListener("click", function () {
    var count = 0;
    state.cues.forEach(function (c) {
      if (c.bad) return;
      c.lines = c.lines.map(toUnicode);
      count++;
    });
    langSelect.value = "ka";
    state.note = fill(T.converted, { n: count });
    preview.textContent = "";
    var title = document.createElement("p");
    title.className = "preview-title";
    title.textContent = T.previewTitle;
    var pre = document.createElement("pre");
    pre.className = "srt";
    pre.textContent = state.cues.filter(function (c) { return !c.bad; }).slice(0, 3).map(function (c) {
      return stamp(c.start, ",") + " --> " + stamp(c.end, ",") + "\n" + c.lines.join("\n");
    }).join("\n\n");
    preview.appendChild(title);
    preview.appendChild(pre);
    preview.hidden = false;
    render();
  });

  // ---------- Download ----------
  Array.prototype.forEach.call(report.querySelectorAll("[data-download]"), function (b) {
    b.addEventListener("click", function () {
      var vtt = b.getAttribute("data-download") === "vtt";
      var cues = state.cues.filter(function (c) { return !c.bad && c.lines.length; });
      var nl = vtt ? "\n" : "\r\n";
      var body = cues.map(function (c, i) {
        return (i + 1) + nl + stamp(c.start, vtt ? "." : ",") + " --> " + stamp(c.end, vtt ? "." : ",") + nl + c.lines.join(nl);
      }).join(nl + nl) + nl;
      var blob = new Blob([(vtt ? "WEBVTT" + nl + nl : "") + body], { type: vtt ? "text/vtt;charset=utf-8" : "text/plain;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = state.name + T.fileSuffix + (vtt ? ".vtt" : ".srt");
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    });
  });
})();
