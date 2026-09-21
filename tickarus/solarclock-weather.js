/*
 * solarclock-weather.js — weather overlay for solarclock.js.
 *
 * Pulls current conditions from Open-Meteo (free, no API key,
 * designed for direct client-side use) and draws a lightweight CSS
 * effects layer on top of the sky gradient: clouds, rain, snow, fog,
 * and stars at night (the sun/moon themselves are handled by
 * solarclock-celestial.js). Falls back to "just stars by time of
 * day, no weather" if the fetch fails for any reason — it never
 * blocks the clock or the plain sky-color gradient from working.
 *
 * Requires solarclock.js to be loaded first.
 *
 * Usage:
 *   <div id="fx-host"></div>  <!-- any positioned ancestor works; body is fine -->
 *   <script src="solarclock.js"></script>
 *   <script src="solarclock-weather.js"></script>
 *   <script>
 *     SolarClock.attachWeatherFX(document.body, { lat: 42.39, lon: -71.10 });
 *   </script>
 */

(function (global) {
  'use strict';

  var SolarClock = global.SolarClock;
  if (!SolarClock) {
    throw new Error('solarclock-weather.js requires solarclock.js to be loaded first');
  }

  // ---- WMO weather code -> category / label ----
  // https://open-meteo.com/en/docs -- current=weather_code

  var CODE_CATEGORY = {
    0: 'clear', 1: 'clear', 2: 'cloudy', 3: 'overcast',
    45: 'fog', 48: 'fog',
    51: 'rain', 53: 'rain', 55: 'rain', 56: 'rain', 57: 'rain',
    61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain',
    71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
    80: 'rain', 81: 'rain', 82: 'rain',
    85: 'snow', 86: 'snow',
    95: 'thunder', 96: 'thunder', 99: 'thunder',
  };

  var CODE_LABEL = {
    0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
    45: 'fog', 48: 'rime fog',
    51: 'light drizzle', 53: 'drizzle', 55: 'dense drizzle',
    56: 'freezing drizzle', 57: 'freezing drizzle',
    61: 'light rain', 63: 'rain', 65: 'heavy rain',
    66: 'freezing rain', 67: 'freezing rain',
    71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
    80: 'rain showers', 81: 'rain showers', 82: 'violent showers',
    85: 'snow showers', 86: 'heavy snow showers',
    95: 'thunderstorm', 96: 'thunderstorm, hail', 99: 'thunderstorm, hail',
  };

  function weatherCategory(code) {
    return CODE_CATEGORY[code] || 'clear';
  }

  function weatherLabel(code) {
    return CODE_LABEL[code] || 'unknown';
  }

  function fetchWeather(lat, lon) {
    var url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + encodeURIComponent(lat)
      + '&longitude=' + encodeURIComponent(lon)
      + '&current=temperature_2m,weather_code,cloud_cover,precipitation,is_day'
      + '&temperature_unit=fahrenheit';
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.current) return null;
        var c = data.current;
        return {
          code: c.weather_code,
          category: weatherCategory(c.weather_code),
          label: weatherLabel(c.weather_code),
          tempF: c.temperature_2m,
          cloudCover: c.cloud_cover,
          precipitation: c.precipitation,
          isDay: c.is_day === 1,
        };
      })
      .catch(function () { return null; });
  }

  // ---- FX overlay (pure CSS, no canvas) ----

  function ensureStyles() {
    if (document.getElementById('solarclock-fx-style')) return;
    var style = document.createElement('style');
    style.id = 'solarclock-fx-style';
    style.textContent = [
      '.sc-fx { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }',
      '.sc-cloud { position: absolute; background: rgba(255,255,255,0.55); border-radius: 50%; filter: blur(8px); }',
      '.sc-fog { position: absolute; inset: 0; background: rgba(225,225,232,0.28); backdrop-filter: blur(2px); }',
      '.sc-drop { position: absolute; top: 0; width: 2px; background: rgba(210,225,245,0.55); animation: sc-fall linear infinite; }',
      '.sc-flake { position: absolute; top: 0; border-radius: 50%; background: rgba(255,255,255,0.9); animation: sc-drift linear infinite; }',
      '.sc-star { position: absolute; border-radius: 50%; background: #fff; animation: sc-twinkle ease-in-out infinite; }',
      '@keyframes sc-fall { from { transform: translateY(-10vh); } to { transform: translateY(110vh); } }',
      '@keyframes sc-drift { from { transform: translateY(-10vh) translateX(0); } to { transform: translateY(110vh) translateX(24px); } }',
      '@keyframes sc-twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }',
    ].join('\n');
    document.head.appendChild(style);
  }

  function clearEl(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function renderClouds(el, count) {
    for (var i = 0; i < count; i++) {
      var c = document.createElement('div');
      c.className = 'sc-cloud';
      var w = rand(80, 220);
      c.style.width = w + 'px';
      c.style.height = (w * 0.5) + 'px';
      c.style.left = rand(-10, 90) + '%';
      c.style.top = rand(5, 45) + '%';
      el.appendChild(c);
    }
  }

  function renderPrecip(el, kind, count) {
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      var left = rand(0, 100);
      if (kind === 'snow') {
        p.className = 'sc-flake';
        var size = rand(2, 5);
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = left + '%';
        p.style.animationDuration = rand(6, 12) + 's';
        p.style.animationDelay = rand(0, 8) + 's';
      } else {
        p.className = 'sc-drop';
        p.style.height = rand(10, 18) + 'px';
        p.style.left = left + '%';
        p.style.animationDuration = rand(0.5, 1) + 's';
        p.style.animationDelay = rand(0, 1) + 's';
      }
      el.appendChild(p);
    }
  }

  function renderStars(el, count) {
    for (var i = 0; i < count; i++) {
      var s = document.createElement('div');
      s.className = 'sc-star';
      var size = rand(1, 2.5);
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.left = rand(0, 100) + '%';
      s.style.top = rand(0, 60) + '%';
      s.style.animationDuration = rand(2, 5) + 's';
      s.style.animationDelay = rand(0, 4) + 's';
      el.appendChild(s);
    }
  }

  function render(el, weather, isNight) {
    clearEl(el);
    var category = weather ? weather.category : 'clear';

    if (isNight && (category === 'clear' || category === 'cloudy')) {
      renderStars(el, 60);
    }

    if (category === 'cloudy') renderClouds(el, 3);
    if (category === 'overcast') renderClouds(el, 6);
    if (category === 'fog') {
      var f = document.createElement('div');
      f.className = 'sc-fog';
      el.appendChild(f);
    }
    if (category === 'rain' || category === 'thunder') {
      renderClouds(el, 5);
      renderPrecip(el, 'rain', 80);
    }
    if (category === 'snow') {
      renderClouds(el, 4);
      renderPrecip(el, 'snow', 60);
    }
  }

  // ---------- Public ----------

  function attachWeatherFX(target, opts) {
    opts = opts || {};
    ensureStyles();

    var fx = document.createElement('div');
    fx.className = 'sc-fx';
    target.appendChild(fx);

    var stopped = false;
    var timer = null;
    var pollMs = opts.pollMs || 15 * 60 * 1000; // conditions don't need checking often

    function update(lat, lon) {
      if (stopped) return;
      fetchWeather(lat, lon).then(function (weather) {
        if (stopped) return;
        var elevation = SolarClock.solarElevationDeg(new Date(), lat, lon);
        var isNight = elevation < -0.833;
        render(fx, weather, isNight);
        if (typeof opts.onWeather === 'function') opts.onWeather(weather);
      });
    }

    function begin(lat, lon) {
      update(lat, lon);
      timer = setInterval(function () { update(lat, lon); }, pollMs);
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
        if (fx.parentNode) fx.parentNode.removeChild(fx);
      },
    };
  }

  SolarClock.getWeather = fetchWeather;
  SolarClock.weatherCategory = weatherCategory;
  SolarClock.weatherLabel = weatherLabel;
  SolarClock.attachWeatherFX = attachWeatherFX;
})(typeof window !== 'undefined' ? window : globalThis);
