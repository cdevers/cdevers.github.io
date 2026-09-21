/*
 * solarclock.js — a geospatially-aware, slewed solar clock, for the browser.
 *
 * Same model as the CLI version: 06:00 = sunrise, 12:00 = true solar
 * transit, 18:00 = sunset, 00:00 = solar midnight (transit + 12h), with
 * each dawn->noon / noon->dusk / dusk->midnight / midnight->dawn quarter
 * independently paced by a sine-shaped rate curve that equals 1
 * SI-second-per-solar-second at its own two endpoints.
 *
 * Usage:
 *   <div id="clock">--:--:--</div>
 *   <script src="solarclock.js"></script>
 *   <script>
 *     SolarClock.attach(document.getElementById('clock'));
 *     // or, to skip browser geolocation entirely:
 *     // SolarClock.attach(document.getElementById('clock'), { lat: 42.39, lon: -71.10 });
 *   </script>
 *
 * Location: tries the browser Geolocation API first (prompts the
 * visitor for permission); if that's denied, unavailable, or times
 * out, falls back to a best-effort IP-based lookup via ipapi.co
 * (no API key, but rate-limited — fine for personal-site traffic).
 *
 * Known limitations: same NOAA/Spencer approximation as the CLI
 * version (accurate to roughly a minute); undefined inside the polar
 * circles on continuous-day/continuous-night dates.
 */

(function (global) {
  'use strict';

  var NOMINAL_QUARTER = 6 * 3600; // seconds

  function isLeap(y) {
    return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  }

  function dayOfYearUTC(date) {
    var start = Date.UTC(date.getUTCFullYear(), 0, 1);
    return Math.floor((date.getTime() - start) / 86400000) + 1;
  }

  function fracYearGamma(dateUTC) {
    var n = dayOfYearUTC(dateUTC);
    var days = isLeap(dateUTC.getUTCFullYear()) ? 366 : 365;
    return (2 * Math.PI / days) * (n - 1);
  }

  function equationOfTime(gamma) {
    return 229.18 * (
      0.000075
      + 0.001868 * Math.cos(gamma)
      - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma)
      - 0.040849 * Math.sin(2 * gamma)
    );
  }

  function declination(gamma) {
    return (
      0.006918
      - 0.399912 * Math.cos(gamma)
      + 0.070257 * Math.sin(gamma)
      - 0.006758 * Math.cos(2 * gamma)
      + 0.000907 * Math.sin(2 * gamma)
      - 0.002697 * Math.cos(3 * gamma)
      + 0.00148 * Math.sin(3 * gamma)
    );
  }

  // dateUTC: a Date; only its UTC calendar date is used.
  function solarEventsUTC(dateUTC, lat, lon) {
    var gamma = fracYearGamma(dateUTC);
    var eqtime = equationOfTime(gamma); // minutes
    var decl = declination(gamma);      // radians

    var latR = (lat * Math.PI) / 180;
    var zenith = (90.833 * Math.PI) / 180;

    var cosHa = (Math.cos(zenith) - Math.sin(latR) * Math.sin(decl)) /
      (Math.cos(latR) * Math.cos(decl));

    var solarNoonMin = 720 - 4 * lon - eqtime; // minutes from UTC midnight
    var midnightUTC = Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate());
    var transit = new Date(midnightUTC + solarNoonMin * 60000);

    if (cosHa > 1) return { sunrise: null, noon: transit, sunset: null, polar: 'continuous_night' };
    if (cosHa < -1) return { sunrise: null, noon: transit, sunset: null, polar: 'continuous_day' };

    var haDeg = (Math.acos(cosHa) * 180) / Math.PI;
    var sunrise = new Date(transit.getTime() - 4 * haDeg * 60000);
    var sunset = new Date(transit.getTime() + 4 * haDeg * 60000);
    return { sunrise: sunrise, noon: transit, sunset: sunset, polar: null };
  }

  function buildAnchors(nowUTC, lat, lon) {
    var anchors = [];
    var offsets = [-1, 0, 1, 2];
    for (var i = 0; i < offsets.length; i++) {
      var d = new Date(nowUTC.getTime() + offsets[i] * 86400000);
      var dateOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      var ev = solarEventsUTC(dateOnly, lat, lon);
      if (ev.polar) return null;
      anchors.push([ev.sunrise, 6]);
      anchors.push([ev.noon, 12]);
      anchors.push([ev.sunset, 18]);
      anchors.push([new Date(ev.noon.getTime() + 12 * 3600000), 24]);
    }
    anchors.sort(function (a, b) { return a[0] - b[0]; });
    return anchors;
  }

  function solarTimeWithin(nowUTC, t0, v0, t1) {
    var duration = (t1 - t0) / 1000;
    var elapsed = (nowUTC - t0) / 1000;
    if (duration <= 0) return ((v0 % 24) + 24) % 24;

    var theta = (Math.PI * elapsed) / duration;
    var k = ((NOMINAL_QUARTER - duration) * Math.PI) / (2 * duration);
    var solarElapsed = elapsed + ((k * duration) / Math.PI) * (1 - Math.cos(theta));
    var frac = solarElapsed / NOMINAL_QUARTER;
    return (((v0 + 6 * frac) % 24) + 24) % 24;
  }

  function currentSolarHour(nowUTC, lat, lon) {
    var anchors = buildAnchors(nowUTC, lat, lon);
    if (!anchors) return null;
    for (var i = 0; i < anchors.length - 1; i++) {
      var t0 = anchors[i][0], v0 = anchors[i][1];
      var t1 = anchors[i + 1][0];
      if (t0 <= nowUTC && nowUTC <= t1) {
        return solarTimeWithin(nowUTC, t0, v0, t1);
      }
    }
    return null;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatHour(hour) {
    var h = Math.floor(hour);
    var mFull = (hour - h) * 60;
    var m = Math.floor(mFull);
    var s = (mFull - m) * 60;
    return pad2(h) + ':' + pad2(m) + ':' + s.toFixed(2).padStart(5, '0');
  }

  // ---------- Sun elevation & sky color ----------

  // Full sun position: elevation + azimuth (degrees), azimuth measured
  // from true north, clockwise (N=0, E=90, S=180, W=270). Also returns
  // hourAngle since callers occasionally need the sign (before/after
  // local transit).
  function solarPosition(nowUTC, lat, lon) {
    var gamma = fracYearGamma(nowUTC);
    var eqtime = equationOfTime(gamma); // minutes
    var decl = declination(gamma);      // radians

    var utcMinutes = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes() + nowUTC.getUTCSeconds() / 60;
    var trueSolarTime = utcMinutes + eqtime + 4 * lon; // minutes
    var hourAngleDeg = (trueSolarTime / 4) - 180;
    hourAngleDeg = (((hourAngleDeg + 180) % 360) + 360) % 360 - 180; // normalize to [-180, 180]

    var ha = (hourAngleDeg * Math.PI) / 180;
    var latR = (lat * Math.PI) / 180;

    var sinElev = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(ha);
    sinElev = Math.max(-1, Math.min(1, sinElev));
    var elevation = (Math.asin(sinElev) * 180) / Math.PI;

    var elevR = (elevation * Math.PI) / 180;
    var cosAz = (Math.sin(decl) - Math.sin(elevR) * Math.sin(latR)) / (Math.cos(elevR) * Math.cos(latR));
    cosAz = Math.max(-1, Math.min(1, cosAz));
    var azimuth = (Math.acos(cosAz) * 180) / Math.PI;
    if (Math.sin(ha) > 0) azimuth = 360 - azimuth; // afternoon: sun is west of south/north

    return { elevation: elevation, azimuth: azimuth, hourAngle: hourAngleDeg };
  }

  // Solar elevation angle in degrees (negative = below horizon) for a
  // real-world instant. Independent of the elastic solar-clock math
  // above -- this drives the sky color, which should track the real
  // sun, not the warped clock.
  function solarElevationDeg(nowUTC, lat, lon) {
    return solarPosition(nowUTC, lat, lon).elevation;
  }

  // Color stops as [elevationDeg, [r,g,b]], ascending by elevation.
  // Two tables: ZENITH (top of sky) stays cooler/darker through the
  // sunrise/sunset transition; HORIZON (bottom) is where the red/
  // orange glow lives. Together they give a sunset-style gradient
  // right at the crossing, and a flat blue or flat dark sky otherwise.
  var ZENITH_STOPS = [
    [-90, [5, 6, 15]],
    [-18, [10, 14, 36]],
    [-6, [20, 26, 55]],
    [0, [43, 58, 92]],
    [10, [79, 134, 179]],
    [30, [126, 193, 232]],
    [90, [142, 203, 240]],
  ];
  var HORIZON_STOPS = [
    [-90, [5, 6, 15]],
    [-18, [18, 23, 43]],
    [-8, [44, 33, 64]],
    [-3, [92, 58, 85]],
    [0, [217, 97, 63]],
    [4, [234, 176, 106]],
    [10, [207, 227, 240]],
    [30, [191, 227, 245]],
    [90, [191, 227, 245]],
  ];

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // ---- small RGB <-> HSL helpers, used to floor a color's lightness
  // (so a "night" tint stays dimly visible instead of crushing to
  // black -- the museum-painting overlay leans on this) ----

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
  }

  function clampLightness(c, minL) {
    if (minL == null) return c;
    var hsl = rgbToHsl(c[0], c[1], c[2]);
    if (hsl[2] < minL) hsl[2] = minL;
    return hslToRgb(hsl[0], hsl[1], hsl[2]);
  }

  function colorForElevation(stops, elevation) {
    if (elevation <= stops[0][0]) return stops[0][1];
    for (var i = 0; i < stops.length - 1; i++) {
      var lo = stops[i], hi = stops[i + 1];
      if (elevation <= hi[0]) {
        var t = (elevation - lo[0]) / (hi[0] - lo[0]);
        return [
          lerp(lo[1][0], hi[1][0], t),
          lerp(lo[1][1], hi[1][1], t),
          lerp(lo[1][2], hi[1][2], t),
        ];
      }
    }
    return stops[stops.length - 1][1];
  }

  function toRgbString(c) {
    return 'rgb(' + Math.round(c[0]) + ', ' + Math.round(c[1]) + ', ' + Math.round(c[2]) + ')';
  }

  // Returns { elevation, zenith, horizon } -- zenith/horizon as
  // "rgb(r, g, b)" strings, ready to drop into a CSS gradient.
  // Pass minLightness (0-1) to floor how dark the result can get --
  // e.g. 0.22 keeps a "gallery lighting" level so an overlay tinted
  // by this color never goes fully black at night.
  function skyColors(nowUTC, lat, lon, minLightness) {
    var elevation = solarElevationDeg(nowUTC, lat, lon);
    var z = colorForElevation(ZENITH_STOPS, elevation);
    var h = colorForElevation(HORIZON_STOPS, elevation);
    if (minLightness != null) {
      z = clampLightness(z, minLightness);
      h = clampLightness(h, minLightness);
    }
    return {
      elevation: elevation,
      zenith: toRgbString(z),
      horizon: toRgbString(h),
    };
  }

  // ---------- Location ----------

  function ipGeolocate() {
    return fetch('https://ipapi.co/json/')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.latitude != null && data.longitude != null) {
          return { lat: data.latitude, lon: data.longitude, source: 'ip', city: data.city };
        }
        return null;
      })
      .catch(function () { return null; });
  }

  function getLocation() {
    return new Promise(function (resolve) {
      if (!('geolocation' in navigator)) {
        ipGeolocate().then(resolve);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'gps' });
        },
        function () { ipGeolocate().then(resolve); },
        { timeout: 8000, maximumAge: 600000 }
      );
    });
  }

  // ---------- Public: paint a sky-color gradient onto an element ----------

  // Updates target.style.background to a top-to-bottom gradient that
  // tracks the real sun's elevation: dark at night, red/orange around
  // sunrise & sunset, light blue in daylight. This is the "fallback"
  // sky look -- a later version can swap it out per-condition (clouds,
  // rain, snow, stars, moon) once real weather data is wired in;
  // SolarClock.skyColors() is the hook point for that.
  function attachSky(target, opts) {
    opts = opts || {};
    var stopped = false;
    var intervalMs = opts.intervalMs || 15000;
    var timer = null;

    function paint(lat, lon) {
      if (stopped) return;
      var colors = skyColors(new Date(), lat, lon);
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
      getLocation().then(function (loc) {
        if (!loc) return; // leave whatever background was already set (CSS fallback)
        if (typeof opts.onLocated === 'function') opts.onLocated(loc);
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

  // ---------- Public: attach a live display to a DOM element ----------

  function attach(el, opts) {
    opts = opts || {};
    var stopped = false;

    function tick(lat, lon) {
      if (stopped) return;
      var now = new Date();
      var hour = currentSolarHour(now, lat, lon);
      el.textContent = hour === null ? 'undefined (polar day/night)' : formatHour(hour);
      requestAnimationFrame(function () { tick(lat, lon); });
    }

    function begin(lat, lon) {
      tick(lat, lon);
    }

    if (opts.lat != null && opts.lon != null) {
      begin(opts.lat, opts.lon);
    } else {
      el.textContent = 'locating…';
      getLocation().then(function (loc) {
        if (!loc) {
          el.textContent = 'location unavailable';
          return;
        }
        if (typeof opts.onLocated === 'function') opts.onLocated(loc);
        begin(loc.lat, loc.lon);
      });
    }

    return {
      stop: function () { stopped = true; },
    };
  }

  global.SolarClock = {
    solarEventsUTC: solarEventsUTC,
    currentSolarHour: currentSolarHour,
    solarElevationDeg: solarElevationDeg,
    solarPosition: solarPosition,
    skyColors: skyColors,
    formatHour: formatHour,
    getLocation: getLocation,
    attach: attach,
    attachSky: attachSky,
  };
})(typeof window !== 'undefined' ? window : globalThis);
