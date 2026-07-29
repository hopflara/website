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
    img.closest(".item").classList.add("missing");
  });
});

// ---------------------------------------------------------------
// Gentle floating animation for each item — unless the visitor
// has asked for reduced motion.
// ---------------------------------------------------------------
var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion) {
  document.querySelectorAll(".float").forEach(function (el) {
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

// Blank canvas — build more here as the site grows.
