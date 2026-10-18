// Site behaviour: theme, drop-down menus, copy buttons and the name romanizer. Loaded as a file (not
// inline) so the Content-Security-Policy can forbid inline scripts. Everything works without it.
(function () {
  var root = document.documentElement;
  var each = function (selector, fn) { Array.prototype.forEach.call(document.querySelectorAll(selector), fn); };

  // ---------- Light and dark theme ----------
  // Each button says what it will do ("Switch to light mode" while dark), and shows the matching icon.
  var toggles = document.querySelectorAll(".theme-toggle");
  function isDark() {
    return (root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
  }
  function syncToggles() {
    var dark = isDark();
    Array.prototype.forEach.call(toggles, function (t) {
      var label = t.getAttribute(dark ? "data-light-label" : "data-dark-label");
      t.setAttribute("data-mode", dark ? "dark" : "light");
      t.querySelector(".theme-label").textContent = label;
      t.setAttribute("title", label);
    });
  }
  syncToggles();
  Array.prototype.forEach.call(toggles, function (t) {
    t.addEventListener("click", function () {
      root.setAttribute("data-theme", isDark() ? "light" : "dark");
      syncToggles();
      try { localStorage.setItem("theme", root.getAttribute("data-theme")); } catch (e) {}
    });
  });

  // ---------- Drop-down menus are <details>: one open at a time, closed by Escape or a click outside ----------
  var menus = document.querySelectorAll("details.dropdown");
  Array.prototype.forEach.call(menus, function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) Array.prototype.forEach.call(menus, function (o) { if (o !== d) o.open = false; });
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    Array.prototype.forEach.call(menus, function (d) {
      if (d.open) { d.open = false; d.querySelector("summary").focus(); }
    });
  });
  document.addEventListener("click", function (e) {
    Array.prototype.forEach.call(menus, function (d) { if (d.open && !d.contains(e.target)) d.open = false; });
  });

  // ---------- Copy buttons: a block of text (the permission letter) or this page's address ----------
  var copy = function (button, value) {
    var status = button.parentNode.querySelector(".copy-status");
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(function () {
      if (status) status.textContent = button.getAttribute("data-copied");
    }).catch(function () {});
  };
  each("[data-copy-text]", function (b) {
    b.addEventListener("click", function () {
      var source = document.querySelector(b.getAttribute("data-copy-text"));
      if (source) copy(b, source.innerText.trim());
    });
  });
  each("[data-copy-url]", function (b) {
    if (!navigator.clipboard) return;
    b.hidden = false;
    b.addEventListener("click", function () { copy(b, location.href.split("?")[0]); });
  });

  // ---------- Georgian names in Latin letters (national system, 2002) ----------
  var romanizer = document.querySelector("[data-romanize]");
  if (romanizer) {
    var LATIN = {
      "ა": "a", "ბ": "b", "გ": "g", "დ": "d", "ე": "e", "ვ": "v", "ზ": "z", "თ": "t", "ი": "i", "კ": "k’",
      "ლ": "l", "მ": "m", "ნ": "n", "ო": "o", "პ": "p’", "ჟ": "zh", "რ": "r", "ს": "s", "ტ": "t’", "უ": "u",
      "ფ": "p", "ქ": "k", "ღ": "gh", "ყ": "q’", "შ": "sh", "ჩ": "ch", "ც": "ts", "ძ": "dz", "წ": "ts’",
      "ჭ": "ch’", "ხ": "kh", "ჯ": "j", "ჰ": "h"
    };
    var input = romanizer.querySelector("input[type=text]");
    var keep = romanizer.querySelector("[data-apostrophes]");
    var out = romanizer.querySelector("[data-out]");
    var romanize = function () {
      var text = Array.prototype.map.call(input.value, function (ch) {
        // Mtavruli capitals (U+1C90…) are read as their ordinary letters.
        var code = ch.charCodeAt(0);
        if (code >= 0x1C90 && code <= 0x1CBA) ch = String.fromCharCode(code - 0x1C90 + 0x10D0);
        var latin = LATIN[ch];
        if (latin === undefined) return ch;
        return keep.checked ? latin : latin.replace("’", "");
      }).join("");
      // Names: capital first letter of each word, as the official table does.
      out.textContent = text.replace(/(^|[\s\-])([a-z])/g, function (m, sep, c) { return sep + c.toUpperCase(); });
    };
    input.addEventListener("input", romanize);
    keep.addEventListener("change", romanize);
    romanize();
  }
})();
