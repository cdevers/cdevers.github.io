/*
 * solarclock-painting.js — a "gallery lighting" tint for compositing
 * the sky behind an image via CSS mix-blend-mode: multiply.
 *
 * A raw sky color at night is very dark (by design) -- fine for a
 * page background, but multiplying an image against near-black
 * crushes it to nothing. This floors the color's lightness so an
 * image tinted by it stays dimly visible after dark, like a museum
 * painting under track lighting rather than a window into the void.
 *
 * Requires solarclock.js to be loaded first.
 *
 * Usage:
 *   <div id="tint" style="position:absolute; inset:0;"></div>
 *   <img src="art.jpg" style="position:absolute; inset:0; mix-blend-mode:multiply;">
 *   <script>
 *     SolarClock.attachPaintingTint(document.getElementById('tint'), { lat: 42.39, lon: -71.10 });
 *   </script>
 */

(function (global) {
  'use strict';

  var SolarClock = global.SolarClock;
  if (!SolarClock) {
    throw new Error('solarclock-painting.js requires solarclock.js to be loaded first');
  }

  function attachPaintingTint(target, opts) {
    opts = opts || {};
    var stopped = false;
    var timer = null;
    var intervalMs = opts.intervalMs || 20000; // the tint drifts slowly; no need to poll often
    var minLightness = opts.minLightness != null ? opts.minLightness : 0.22;

    function paint(lat, lon) {
      if (stopped) return;
      var colors = SolarClock.skyColors(new Date(), lat, lon, minLightness);
      target.style.background = 'linear-gradient(180deg, ' + colors.zenith + ' 0%, ' + colors.horizon + ' 100%)';
      if (typeof opts.onUpdate === 'function') opts.onUpdate(colors);
    }

    function begin(lat, lon) {
      paint(lat, lon);
      timer = setInterval(function () { paint(lat, lon); }, intervalMs);
    }

    if (opts.lat != null && opts.lon != null) {
      begin(opts.lat, opts.lon);
    } else {
      SolarClock.getLocation().then(function (loc) {
        if (!loc) return;
        begin(loc.lat, loc.lon);
      });
    }

    return {
      stop: function () {
        stopped = true;
        if (timer) clearInterval(timer);
      },
    };
  }

  SolarClock.attachPaintingTint = attachPaintingTint;
})(typeof window !== 'undefined' ? window : globalThis);
