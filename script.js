// Register GSAP plugins so they're ready to use.
gsap.registerPlugin(ScrollTrigger, Draggable);

// Confirm GSAP is loaded.
console.log("GSAP loaded:", gsap.version);

// ---------------------------------------------------------------
// If an image file is missing, show a labeled placeholder box
// instead of a broken image. Removes itself once you add the image.
// ---------------------------------------------------------------
document.querySelectorAll(".item img").forEach(function (img) {
  img.addEventListener("error", function () {
    var src = img.getAttribute("src");

    // First failure: retry with the extension's capitalization flipped
    // (e.g. .png <-> .PNG). GitHub Pages is case-sensitive, so this
    // rescues images uploaded as .PNG when the code asked for .png.
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

    // Still no luck: show a labeled placeholder box.
    img.closest(".item").classList.add("missing");
  });
});

// ---------------------------------------------------------------
// Gentle floating animation for each item — unless the visitor
// has asked for reduced motion.
// ---------------------------------------------------------------
var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var editMode = location.hash === "#edit";

// Floating is turned off in edit mode so items stay still while you drag them.
if (!reduceMotion && !editMode) {
  // (The photostrip is full-height and flush to the edges, so it stays put.)
  document.querySelectorAll(".item:not(.item--strip) .float").forEach(function (el) {
    gsap.to(el, {
      y: gsap.utils.random(-12, -6),      // drift up a little
      duration: gsap.utils.random(2.5, 4),
      ease: "sine.inOut",
      repeat: -1,                          // forever
      yoyo: true,                          // and back down
      delay: gsap.utils.random(0, 2),      // start at different times
    });
  });
}

// ---------------------------------------------------------------
// DRAG MODE — add "#edit" to the site's URL to turn it on.
// You can then drag any item around; a little panel shows each
// item's left/top position (in %) and a button copies them all so
// you can paste them back into index.html (or hand them to Claude).
// Normal visitors never see this — it only appears with #edit.
// ---------------------------------------------------------------
function initEditMode() {
  document.body.classList.add("edit-mode");
  var canvas = document.querySelector(".canvas");
  var items = Array.prototype.slice.call(document.querySelectorAll(".item"));

  // Build the little control panel.
  var panel = document.createElement("div");
  panel.className = "edit-panel";
  panel.innerHTML =
    '<div class="edit-panel-title">&#9998; edit mode &mdash; drag the items</div>' +
    '<pre class="edit-readout"></pre>' +
    '<button class="edit-copy">Copy positions</button>' +
    '<a class="edit-exit" href="#">exit</a>';
  document.body.appendChild(panel);
  var readout = panel.querySelector(".edit-readout");

  function nameOf(el) {
    var label = el.querySelector(".label");
    var text = label ? label.textContent.trim() : el.getAttribute("href");
    return text.split("(")[0].trim();            // drop parentheticals for tidiness
  }

  function position(el) {
    return {
      left: (el.offsetLeft / canvas.clientWidth) * 100,
      top: (el.offsetTop / canvas.clientHeight) * 100,
    };
  }

  function refresh() {
    readout.textContent = items
      .map(function (el) {
        var p = position(el);
        var name = nameOf(el);
        if (name.length > 22) name = name.slice(0, 21) + "…";
        return (
          name.padEnd(24) +
          "left:" + p.left.toFixed(1) + "%  top:" + p.top.toFixed(1) + "%"
        );
      })
      .join("\n");
  }

  items.forEach(function (el) {
    // Don't follow the link while arranging — clicking just selects.
    el.addEventListener("click", function (e) {
      e.preventDefault();
    });
    Draggable.create(el, {
      type: "top,left",          // moves via CSS top/left, so the tilt is kept
      dragClickables: true,
      onDrag: refresh,
      onDragEnd: refresh,
    });
  });

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
