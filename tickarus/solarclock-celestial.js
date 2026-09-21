/*
 * solarclock-celestial.js — positions the sun and moon inside the
 * frame using real elevation/azimuth, and renders the moon's current
 * phase.
 *
 * Mapping onto the artwork:
 *   - top edge of the artwork  = straight up (elevation 90°)
 *   - the artwork's own horizon line (see HORIZON_FRACTION below)
 *     = the horizon (elevation 0°)
 *   - the middle column = the sun's noon direction: due south for a
 *     northern-hemisphere viewer, due north for a southern-hemisphere
 *     one (this flips automatically from the sign of latitude)
 *   - left = the sunrise side (east), right = the sunset side (west)
 *
 * The sun renders in clear daytime skies; the moon renders at night
 * (clear or partly cloudy skies), with a simple light/shadow disc for
 * its current phase. Both are hidden by cloud/rain/snow/fog, using
 * the same Open-Meteo category solarclock-weather.js uses -- this
 * module fetches weather independently (a second, infrequent poll;
 * not worth the plumbing to share one fetch for a personal site).
 *
 * Accuracy: the sun reuses solarclock.js's own solar geometry
 * (~1 arcminute). The moon uses a low-precision *unperturbed* orbital
 * model (adapted from P. Schlyter's widely-used formulas) -- good to
 * roughly a degree, which is plenty for placing a small icon in a
 * stylized sky, but not telescope-grade, and it will drift further
 * from truth the further nowUTC is from the present.
 *
 * Requires solarclock.js. Uses SolarClock.getWeather if
 * solarclock-weather.js is also loaded; without it, sun/moon render
 * regardless of conditions (no cloud gate).
 */

(function (global) {
  'use strict';

  var SolarClock = global.SolarClock;
  if (!SolarClock) {
    throw new Error('solarclock-celestial.js requires solarclock.js to be loaded first');
  }

  var DEG = Math.PI / 180;

  // Where the artwork's own horizon line falls, as a fraction of
  // image height from the top. Measured directly off angel.jpg, at
  // the point where the angel's leading foot just touches the water
  // (the clearest unambiguous reference point in this piece) --
  // change this if you swap in a different image.
  var HORIZON_FRACTION = 0.851;

  function norm360(deg) { return ((deg % 360) + 360) % 360; }
  function norm180(deg) { var d = norm360(deg); return d > 180 ? d - 360 : d; }

  function daysSinceJ2000(date) {
    return (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;
  }

  // ---- Sun's geocentric ecliptic longitude (only needed here for
  // the moon-phase angle; the sun's own render position reuses
  // SolarClock.solarPosition instead, which is independently
  // validated against the NOAA algorithm) ----
  function sunEclipticLongitude(d) {
    var w = 282.9404 + 4.70935e-5 * d;
    var e = 0.016709 - 1.151e-9 * d;
    var M = norm360(356.047 + 0.9856002585 * d);
    var Mr = M * DEG;
    var E = M + (180 / Math.PI) * e * Math.sin(Mr) * (1 + e * Math.cos(Mr));
    var Er = E * DEG;
    var xv = Math.cos(Er) - e;
    var yv = Math.sqrt(1 - e * e) * Math.sin(Er);
    var v = Math.atan2(yv, xv) / DEG;
    return norm360(v + w);
  }

  // ---- Moon's geocentric ecliptic position (unperturbed two-body orbit) ----
  function moonEclipticPosition(d) {
    var N = norm360(125.1228 - 0.0529538083 * d);
    var i = 5.1454;
    var w = norm360(318.0634 + 0.1643573223 * d);
    var a = 60.2666; // Earth radii
    var e = 0.0549;
    var M = norm360(115.3654 + 13.0649929509 * d);

    var Mr = M * DEG;
    var E = M + (180 / Math.PI) * e * Math.sin(Mr) * (1 + e * Math.cos(Mr));
    for (var k = 0; k < 3; k++) {
      var Er0 = E * DEG;
      E -= (E - (180 / Math.PI) * e * Math.sin(Er0) - M) / (1 - e * Math.cos(Er0));
    }
    var Er = E * DEG;
    var xv = a * (Math.cos(Er) - e);
    var yv = a * (Math.sqrt(1 - e * e) * Math.sin(Er));
    var v = Math.atan2(yv, xv) / DEG;
    var r = Math.sqrt(xv * xv + yv * yv);

    var Nr = N * DEG, vwr = (v + w) * DEG, ir = i * DEG;
    var xh = r * (Math.cos(Nr) * Math.cos(vwr) - Math.sin(Nr) * Math.sin(vwr) * Math.cos(ir));
    var yh = r * (Math.sin(Nr) * Math.cos(vwr) + Math.cos(Nr) * Math.sin(vwr) * Math.cos(ir));
    var zh = r * (Math.sin(vwr) * Math.sin(ir));

    return {
      lon: norm360(Math.atan2(yh, xh) / DEG),
      lat: Math.atan2(zh, Math.sqrt(xh * xh + yh * yh)) / DEG,
    };
  }

  function eclipticToEquatorial(lonDeg, latDeg, d) {
    var obliquity = 23.4393 - 3.563e-7 * d;
    var ob = obliquity * DEG, lo = lonDeg * DEG, la = latDeg * DEG;
    var x = Math.cos(lo) * Math.cos(la);
    var y = Math.cos(ob) * Math.sin(lo) * Math.cos(la) - Math.sin(ob) * Math.sin(la);
    var z = Math.sin(ob) * Math.sin(lo) * Math.cos(la) + Math.cos(ob) * Math.sin(la);
    return { ra: norm360(Math.atan2(y, x) / DEG), dec: Math.asin(z) / DEG };
  }

  function localSiderealTimeDeg(d, lon) {
    return norm360(280.46061837 + 360.98564736629 * d + lon);
  }

  function horizontalCoords(raDeg, decDeg, latDeg, lstDeg) {
    var ha = norm180(lstDeg - raDeg);
    var har = ha * DEG, decr = decDeg * DEG, latr = latDeg * DEG;
    var sinEl = Math.sin(decr) * Math.sin(latr) + Math.cos(decr) * Math.cos(latr) * Math.cos(har);
    sinEl = Math.max(-1, Math.min(1, sinEl));
    var el = Math.asin(sinEl) / DEG;
    var elr = el * DEG;
    var cosAz = (Math.sin(decr) - Math.sin(elr) * Math.sin(latr)) / (Math.cos(elr) * Math.cos(latr));
    cosAz = Math.max(-1, Math.min(1, cosAz));
    var az = Math.acos(cosAz) / DEG;
    if (Math.sin(har) > 0) az = 360 - az;
    return { elevation: el, azimuth: az };
  }

  // Public: moon elevation/azimuth + phase for a real-world instant.
  function moonEphemeris(now, lat, lon) {
    var d = daysSinceJ2000(now);
    var moon = moonEclipticPosition(d);
    var eq = eclipticToEquatorial(moon.lon, moon.lat, d);
    var lst = localSiderealTimeDeg(d, lon);
    var pos = horizontalCoords(eq.ra, eq.dec, lat, lst);

    var elongation = norm360(moon.lon - sunEclipticLongitude(d));
    var illumination = (1 - Math.cos(elongation * DEG)) / 2; // 0 = new, 1 = full

    return {
      elevation: pos.elevation,
      azimuth: pos.azimuth,
      illumination: illumination,
      waxing: elongation < 180,
    };
  }

  // ---- Map elevation/azimuth onto the artwork's frame ----
  function skyPosition(elevation, azimuth, lat) {
    var reference = lat >= 0 ? 180 : 0;
    var signed = norm180(azimuth - reference);
    var effective = lat >= 0 ? signed : -signed;
    var xFrac = Math.max(0, Math.min(1, 0.5 + effective / 180));
    var yFrac = Math.max(0, Math.min(1, HORIZON_FRACTION * (1 - elevation / 90)));
    return { x: xFrac * 100, y: yFrac * 100 };
  }

  // ---- Rendering ----

  function ensureStyles() {
    if (document.getElementById('solarclock-celestial-style')) return;
    var style = document.createElement('style');
    style.id = 'solarclock-celestial-style';
    style.textContent = [
      '.sc-celestial { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }',
      '.sc-sun { position: absolute; border-radius: 50%; background: radial-gradient(circle, #fff7dd 0%, #ffe9a8 55%, rgba(255,220,140,0) 75%); transform: translate(-50%, -50%); }',
      '.sc-moon-disc { position: absolute; border-radius: 50%; overflow: hidden; background: #2a2c3a; transform: translate(-50%, -50%); box-shadow: 0 0 14px 3px rgba(240,238,225,0.35); }',
      '.sc-moon-lit { position: absolute; top: 0; height: 100%; background: #f0eee1; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  function clearEl(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // Adds the curved terminator: an ellipse centered on the disc,
  // colored to match the lit or dark side depending on phase, with
  // horizontal radius scaled by how far from quarter-phase we are.
  // This is the standard two-ellipse technique for CSS moon phases --
  // a plain scaled rectangle would draw a straight edge, not the
  // curved terminator a real phase has.
  function appendTerminator(disc, sizePx, illumination) {
    var R = sizePx / 2;
    var Rb = R * Math.abs(2 * illumination - 1);
    var ell = document.createElement('div');
    ell.style.position = 'absolute';
    ell.style.top = '0';
    ell.style.left = (R - Rb) + 'px';
    ell.style.width = (2 * Rb) + 'px';
    ell.style.height = '100%';
    ell.style.borderRadius = '50%';
    ell.style.background = illumination > 0.5 ? '#f0eee1' : '#2a2c3a';
    disc.appendChild(ell);
  }

  // Renders a phase disc: `illumination` 0-1 (0 new, 1 full), `waxing`
  // controls which side is lit (mirrored for southern-hemisphere
  // viewers, since the moon's lit limb appears mirrored there too).
  function renderMoonDisc(el, sizePx, illumination, waxing, lat) {
    var disc = document.createElement('div');
    disc.className = 'sc-moon-disc';
    disc.style.width = sizePx + 'px';
    disc.style.height = sizePx + 'px';

    var litOnRight = waxing;
    if (lat < 0) litOnRight = !litOnRight; // mirrored south of the equator

    if (illumination > 0.02) {
      var lit = document.createElement('div');
      lit.className = 'sc-moon-lit';
      lit.style.width = '50%';
      lit.style[litOnRight ? 'right' : 'left'] = '0';
      disc.appendChild(lit);
      appendTerminator(disc, sizePx, illumination);
    }
    el.appendChild(disc);
    return disc;
  }

  // A calm-sea glint directly below the body (same x, mirrored across
  // the horizon line) -- longest and brightest right at the horizon,
  // tapering shorter and fainter as the body climbs, gone above ~50°
  // elevation (a real flat-water glint gets very compressed and
  // usually isn't worth drawing at that height).
  function renderReflection(layer, xPercent, colorRgb, opacityBase, elevation, sizePx) {
    if (elevation <= 0 || elevation > 50) return;
    var fade = Math.max(0, Math.min(1, 1 - elevation / 50));
    var opacity = opacityBase * fade;
    if (opacity <= 0.02) return;

    var horizonPercent = HORIZON_FRACTION * 100;
    var waterBandPercent = 100 - horizonPercent;
    var lengthFrac = Math.max(0.12, Math.min(1, 1 - elevation / 28));
    var heightPercent = waterBandPercent * lengthFrac;

    var refl = document.createElement('div');
    refl.style.position = 'absolute';
    refl.style.left = xPercent + '%';
    refl.style.top = horizonPercent + '%';
    refl.style.width = (sizePx * 1.1) + 'px';
    refl.style.height = heightPercent + '%';
    refl.style.transform = 'translateX(-50%)';
    refl.style.background = 'radial-gradient(ellipse 50% 45% at 50% 0%, rgba(' + colorRgb + ',' + opacity + ') 0%, rgba(' + colorRgb + ',' + (opacity * 0.35) + ') 40%, rgba(' + colorRgb + ',0) 75%)';
    layer.appendChild(refl);
  }

  function attachCelestial(target, opts) {
    opts = opts || {};
    ensureStyles();

    var layer = document.createElement('div');
    layer.className = 'sc-celestial';
    target.appendChild(layer);

    var stopped = false;
    var timer = null;
    var weatherTimer = null;
    var pollMs = opts.pollMs || 1000; // recompute position often; it's cheap trig, no network
    var weatherPollMs = opts.weatherPollMs || 15 * 60 * 1000;
    var lastWeather = null;

    function refreshWeather(lat, lon) {
      if (!SolarClock.getWeather) return; // weather addon not loaded -- no cloud gate
      SolarClock.getWeather(lat, lon).then(function (w) { lastWeather = w; });
    }

    function update(lat, lon) {
      if (stopped) return;
      clearEl(layer);
      var now = new Date();
      var category = lastWeather ? lastWeather.category : 'clear';
      var sizePx = opts.size || 46;

      var sun = SolarClock.solarPosition(now, lat, lon);
      if (sun.elevation > 0 && category === 'clear') {
        var sp = skyPosition(sun.elevation, sun.azimuth, lat);
        var sunEl = document.createElement('div');
        sunEl.className = 'sc-sun';
        sunEl.style.width = sizePx * 1.6 + 'px';
        sunEl.style.height = sizePx * 1.6 + 'px';
        sunEl.style.left = sp.x + '%';
        sunEl.style.top = sp.y + '%';
        layer.appendChild(sunEl);
        renderReflection(layer, sp.x, '255,247,221', 0.55, sun.elevation, sizePx);
      } else if (sun.elevation <= 0 && (category === 'clear' || category === 'cloudy')) {
        var moon = moonEphemeris(now, lat, lon);
        if (moon.elevation > 0) {
          var mp = skyPosition(moon.elevation, moon.azimuth, lat);
          var discWrap = document.createElement('div');
          discWrap.style.position = 'absolute';
          discWrap.style.left = mp.x + '%';
          discWrap.style.top = mp.y + '%';
          renderMoonDisc(discWrap, sizePx, moon.illumination, moon.waxing, lat);
          layer.appendChild(discWrap);
          var moonOpacity = 0.15 + 0.55 * moon.illumination; // a crescent glints far less than a full moon
          renderReflection(layer, mp.x, '210,214,225', moonOpacity, moon.elevation, sizePx);
        }
      }

      if (typeof opts.onUpdate === 'function') opts.onUpdate({ sun: sun });
    }

    function begin(lat, lon) {
      refreshWeather(lat, lon);
      update(lat, lon);
      timer = setInterval(function () { update(lat, lon); }, pollMs);
      weatherTimer = setInterval(function () { refreshWeather(lat, lon); }, weatherPollMs);
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
        if (weatherTimer) clearInterval(weatherTimer);
      },
    };
  }

  SolarClock.moonEphemeris = moonEphemeris;
  SolarClock.attachCelestial = attachCelestial;
})(typeof window !== 'undefined' ? window : globalThis);
