// Register GSAP plugins so they're ready to use.
gsap.registerPlugin(ScrollTrigger, Draggable);

// Confirm GSAP is loaded.
console.log("GSAP loaded:", gsap.version);

// ---------------------------------------------------------------
// If an image file is missing, show a placeholder box instead of a
// broken image (and retry the opposite .png/.PNG capitalization).
// ---------------------------------------------------------------
document.querySelectorAll(".item img").forEach(function (img) {
  img.addEventListener("error", function () {
    var src = img.getAttribute("src");
    if (!img.dataset.retried) {
      img.dataset.retried = "1";
      var swapped = src.replace(/\.png$/i, function (ext) {
        return ext === ".png" ? ".PNG" : ".png";
      });
      if (swapped !== src) {
        img.src = swapped;
        return;
      }
    }
    img.closest(".item").classList.add("missing");
  });
});

// ---------------------------------------------------------------
// Hand-drawn arrows: connect each note to its picture. They stay
// attached when anything moves, and have a gentle wobble so they
// look sketched rather than mechanical.
// ---------------------------------------------------------------
var svg = document.querySelector(".connectors");
var SVGNS = "http://www.w3.org/2000/svg";
var SAMPLES = 10;                 // points along each arrow

// Tiny seeded random so each arrow's wobble is fixed (doesn't shake).
function seeded(seed) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

var connectors = Array.prototype.slice
  .call(document.querySelectorAll(".note"))
  .map(function (note, i) {
    var target = document.getElementById(note.dataset.for);
    var path = document.createElementNS(SVGNS, "path");
    path.setAttribute("class", "connector");
    path.setAttribute("marker-end", "url(#arrowhead)");
    svg.appendChild(path);
    // A fixed little noise pattern for this arrow's wobble.
    var rnd = seeded(i * 7 + 3);
    var noise = [];
    for (var k = 0; k < SAMPLES; k++) noise.push(rnd() * 2 - 1);
    return { note: note, target: target, path: path, noise: noise };
  });

// The point on a rectangle's border in the direction of (tx, ty).
function edgePoint(rect, tx, ty, pad) {
  var cx = rect.left + rect.width / 2;
  var cy = rect.top + rect.height / 2;
  var dx = tx - cx;
  var dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  var hw = rect.width / 2 + (pad || 0);
  var hh = rect.height / 2 + (pad || 0);
  var scale = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6));
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function quad(p0, pc, p1, t) {
  var mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * pc.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * pc.y + t * t * p1.y,
  };
}

// Smooth curve THROUGH a set of points (Catmull-Rom -> Bézier).
function smoothThrough(p) {
  if (p.length < 3) return "M" + p[0].x + "," + p[0].y + " L" + p[1].x + "," + p[1].y;
  var d = "M" + p[0].x.toFixed(1) + "," + p[0].y.toFixed(1);
  for (var i = 0; i < p.length - 1; i++) {
    var a = p[i - 1] || p[i];
    var b = p[i];
    var c = p[i + 1];
    var e = p[i + 2] || c;
    var c1x = b.x + (c.x - a.x) / 6, c1y = b.y + (c.y - a.y) / 6;
    var c2x = c.x - (e.x - b.x) / 6, c2y = c.y - (e.y - b.y) / 6;
    d += " C" + c1x.toFixed(1) + "," + c1y.toFixed(1) +
         " " + c2x.toFixed(1) + "," + c2y.toFixed(1) +
         " " + c.x.toFixed(1) + "," + c.y.toFixed(1);
  }
  return d;
}

function drawConnectors() {
  if (!svg) return;               // inner pages have no arrows layer
  svg.setAttribute("viewBox", "0 0 " + window.innerWidth + " " + window.innerHeight);
  connectors.forEach(function (c) {
    if (!c.target) return;
    var n = c.note.getBoundingClientRect();
    var t = c.target.getBoundingClientRect();
    var nCenter = { x: n.left + n.width / 2, y: n.top + n.height / 2 };
    var tCenter = { x: t.left + t.width / 2, y: t.top + t.height / 2 };
    var start = edgePoint(n, tCenter.x, tCenter.y, 4);
    var end = edgePoint(t, nCenter.x, nCenter.y, 6);

    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var len = Math.hypot(dx, dy) || 1;
    // base curve control point (gentle arc)
    var off = Math.min(38, len * 0.16);
    var cx = (start.x + end.x) / 2 + (-dy / len) * off;
    var cy = (start.y + end.y) / 2 + (dx / len) * off;
    var cp = { x: cx, y: cy };

    // perpendicular unit vector for the wobble
    var px = -dy / len, py = dx / len;
    var amp = Math.min(7, Math.max(2.5, len * 0.03));

    var pts = [];
    for (var s = 0; s < SAMPLES; s++) {
      var tt = s / (SAMPLES - 1);
      var base = quad(start, cp, end, tt);
      var env = Math.sin(Math.PI * tt);          // 0 at the ends, 1 in the middle
      var w = amp * env * c.noise[s];
      pts.push({ x: base.x + px * w, y: base.y + py * w });
    }
    c.path.setAttribute("d", smoothThrough(pts));
  });
}

// Redraw when the page/fonts/size settle.
window.addEventListener("load", drawConnectors);
window.addEventListener("resize", drawConnectors);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawConnectors);
setTimeout(drawConnectors, 300);
drawConnectors();

// ---------------------------------------------------------------
// Gentle floating animation — off if the visitor prefers reduced
// motion, or while editing. Arrows follow the float via the ticker.
// ---------------------------------------------------------------
var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var editMode = location.hash === "#edit";

if (!reduceMotion && !editMode) {
  document.querySelectorAll(".item:not(.item--strip) .float").forEach(function (el) {
    gsap.to(el, {
      y: gsap.utils.random(-12, -6),
      duration: gsap.utils.random(2.5, 4),
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      delay: gsap.utils.random(0, 2),
    });
  });
  gsap.ticker.add(drawConnectors);   // keep arrows glued to the bobbing pictures
}

// ---------------------------------------------------------------
// DRAG MODE — add "#edit" to the URL to turn it on.
//   • drag pictures, notes, AND the middle title
//   • double-click a note to change its words
//   • drag the panel itself by its title bar
//   • Copy positions to paste the layout back into index.html
// ---------------------------------------------------------------
function initEditMode() {
  document.body.classList.add("edit-mode");
  var canvas = document.querySelector(".canvas");
  var items = Array.prototype.slice.call(document.querySelectorAll(".item"));
  var notes = Array.prototype.slice.call(document.querySelectorAll(".note"));
  var title = document.querySelector(".title-block");
  var all = items.concat(notes).concat([title]);

  var panel = document.createElement("div");
  panel.className = "edit-panel";
  panel.innerHTML =
    '<div class="edit-panel-title">&#9998; edit mode &mdash; drag things</div>' +
    '<div class="edit-hint">double-click a note to change its words &bull; drag this box by its title</div>' +
    '<pre class="edit-readout"></pre>' +
    '<button class="edit-copy">Copy layout</button>' +
    '<a class="edit-exit" href="#">exit</a>';
  document.body.appendChild(panel);
  var readout = panel.querySelector(".edit-readout");

  function nameOf(el) {
    if (el.classList.contains("title-block")) return "the middle title";
    if (el.classList.contains("note")) return "→ " + el.textContent.trim();
    return el.dataset.name || el.getAttribute("href");
  }
  function pos(el) {
    return {
      left: (el.offsetLeft / canvas.clientWidth) * 100,
      top: (el.offsetTop / canvas.clientHeight) * 100,
    };
  }
  function refresh() {
    readout.textContent = all
      .map(function (el) {
        var p = pos(el);
        var name = nameOf(el);
        if (name.length > 22) name = name.slice(0, 21) + "…";
        return name.padEnd(24) + "left:" + p.left.toFixed(1) + "%  top:" + p.top.toFixed(1) + "%";
      })
      .join("\n");
  }
  // Full-detail version (with the note text) for copying back to the file.
  function exportText() {
    return all
      .map(function (el) {
        var p = pos(el);
        var coords = "left:" + p.left.toFixed(1) + "% top:" + p.top.toFixed(1) + "%";
        if (el.classList.contains("note")) return 'note "' + el.textContent.trim() + '"  ' + coords;
        if (el.classList.contains("title-block")) return "TITLE  " + coords;
        return (el.dataset.name || el.getAttribute("href")) + "  " + coords;
      })
      .join("\n");
  }

  var draggables = new Map();
  all.forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
    });
    var d = Draggable.create(el, {
      type: "top,left",
      dragClickables: true,
      onDrag: function () { drawConnectors(); refresh(); },
      onDragEnd: function () { drawConnectors(); refresh(); },
    })[0];
    draggables.set(el, d);
  });

  // Double-click a note to edit its words.
  notes.forEach(function (note) {
    note.addEventListener("dblclick", function () {
      var d = draggables.get(note);
      if (d) d.disable();                         // don't drag while typing
      note.classList.add("editing");
      note.contentEditable = "true";
      note.focus();
      // select all text for quick replacement
      var range = document.createRange();
      range.selectNodeContents(note);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    note.addEventListener("input", function () {
      drawConnectors();
      refresh();
    });
    note.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        note.blur();
      }
    });
    note.addEventListener("blur", function () {
      note.contentEditable = "false";
      note.classList.remove("editing");
      var d = draggables.get(note);
      if (d) d.enable();
      drawConnectors();
      refresh();
    });
  });

  // Make the panel itself draggable by its title bar.
  Draggable.create(panel, {
    type: "x,y",
    trigger: panel.querySelector(".edit-panel-title"),
  });

  drawConnectors();
  refresh();

  panel.querySelector(".edit-copy").addEventListener("click", function () {
    var btn = this;
    var done = function () {
      btn.textContent = "Copied! ✓";
      setTimeout(function () { btn.textContent = "Copy layout"; }, 1500);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(exportText()).then(done, done);
    } else {
      done();
    }
  });

  panel.querySelector(".edit-exit").addEventListener("click", function (e) {
    e.preventDefault();
    location.hash = "";
    location.reload();
  });
}

if (editMode) {
  initEditMode();
}

// Turning on #edit from the address bar takes effect on the next load.
window.addEventListener("hashchange", function () {
  if (location.hash === "#edit" && !document.body.classList.contains("edit-mode")) {
    location.reload();
  }
});
