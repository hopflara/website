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
// Hand-drawn arrows: connect each note to its picture. The arrows
// recalculate whenever anything moves, so they always stay attached.
// ---------------------------------------------------------------
var svg = document.querySelector(".connectors");
var SVGNS = "http://www.w3.org/2000/svg";

var connectors = Array.prototype.slice
  .call(document.querySelectorAll(".note"))
  .map(function (note) {
    var target = document.getElementById(note.dataset.for);
    var path = document.createElementNS(SVGNS, "path");
    path.setAttribute("class", "connector");
    path.setAttribute("marker-end", "url(#arrowhead)");
    svg.appendChild(path);
    return { note: note, target: target, path: path };
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

function drawConnectors() {
  svg.setAttribute("viewBox", "0 0 " + window.innerWidth + " " + window.innerHeight);
  connectors.forEach(function (c) {
    if (!c.target) return;
    var n = c.note.getBoundingClientRect();
    var t = c.target.getBoundingClientRect();
    var nCenter = { x: n.left + n.width / 2, y: n.top + n.height / 2 };
    var tCenter = { x: t.left + t.width / 2, y: t.top + t.height / 2 };
    var start = edgePoint(n, tCenter.x, tCenter.y, 4);   // leave the note edge
    var end = edgePoint(t, nCenter.x, nCenter.y, 6);     // stop just off the picture

    // Gentle curve for a hand-drawn feel.
    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var len = Math.hypot(dx, dy) || 1;
    var off = Math.min(38, len * 0.16);
    var cxp = (start.x + end.x) / 2 + (-dy / len) * off;
    var cyp = (start.y + end.y) / 2 + (dx / len) * off;

    c.path.setAttribute(
      "d",
      "M" + start.x.toFixed(1) + "," + start.y.toFixed(1) +
      " Q" + cxp.toFixed(1) + "," + cyp.toFixed(1) +
      " " + end.x.toFixed(1) + "," + end.y.toFixed(1)
    );
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
  // Keep the arrows glued to the bobbing pictures.
  gsap.ticker.add(drawConnectors);
}

// ---------------------------------------------------------------
// DRAG MODE — add "#edit" to the URL to turn it on. Drag pictures
// AND notes; the arrows re-connect live. The panel lists every
// position and copies them for pasting back into index.html.
// ---------------------------------------------------------------
function initEditMode() {
  document.body.classList.add("edit-mode");
  var canvas = document.querySelector(".canvas");
  var items = Array.prototype.slice.call(document.querySelectorAll(".item"));
  var notes = Array.prototype.slice.call(document.querySelectorAll(".note"));
  var all = items.concat(notes);

  var panel = document.createElement("div");
  panel.className = "edit-panel";
  panel.innerHTML =
    '<div class="edit-panel-title">&#9998; edit mode &mdash; drag pictures &amp; notes</div>' +
    '<pre class="edit-readout"></pre>' +
    '<button class="edit-copy">Copy positions</button>' +
    '<a class="edit-exit" href="#">exit</a>';
  document.body.appendChild(panel);
  var readout = panel.querySelector(".edit-readout");

  function nameOf(el) {
    if (el.classList.contains("note")) return "→ " + el.textContent.trim();
    return el.dataset.name || el.getAttribute("href");
  }

  function refresh() {
    readout.textContent = all
      .map(function (el) {
        var left = (el.offsetLeft / canvas.clientWidth) * 100;
        var top = (el.offsetTop / canvas.clientHeight) * 100;
        var name = nameOf(el);
        if (name.length > 22) name = name.slice(0, 21) + "…";
        return (
          name.padEnd(24) +
          "left:" + left.toFixed(1) + "%  top:" + top.toFixed(1) + "%"
        );
      })
      .join("\n");
  }

  all.forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();          // don't follow links while arranging
    });
    Draggable.create(el, {
      type: "top,left",
      dragClickables: true,
      onDrag: function () {
        drawConnectors();
        refresh();
      },
      onDragEnd: function () {
        drawConnectors();
        refresh();
      },
    });
  });

  drawConnectors();
  refresh();

  panel.querySelector(".edit-copy").addEventListener("click", function () {
    var btn = this;
    var done = function () {
      btn.textContent = "Copied! ✓";
      setTimeout(function () {
        btn.textContent = "Copy positions";
      }, 1500);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(readout.textContent).then(done, done);
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
