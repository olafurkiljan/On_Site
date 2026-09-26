/* On Site — sun times for Oslo, calculated offline.
   Own implementation of the standard "sunrise equation" (public-domain
   astronomy formulas, see https://en.wikipedia.org/wiki/Sunrise_equation).
   Accurate to about a minute, which is plenty for planning a shoot.

   Photography definitions used here (sun altitude above the horizon):
     golden hour  +6° down to −4°
     sunset       −0.833° (upper edge of the sun touches the horizon)
     blue hour    −4° down to −8°  */
(function (root) {
  'use strict';

  var OSLO = { lat: 59.9139, lng: 10.7522, tz: 'Europe/Oslo' };
  var RAD = Math.PI / 180;

  function julianNoon(dateStr) {
    var p = dateStr.split('-');
    return Date.UTC(+p[0], +p[1] - 1, +p[2], 12) / 86400000 + 2440587.5;
  }
  function fromJulian(j) { return new Date((j - 2440587.5) * 86400000); }

  // Returns { rise, set } Date objects for the moment the sun crosses `alt` degrees,
  // or null for each if the sun never reaches that altitude that day.
  function crossing(dateStr, alt, lat, lng) {
    var n = Math.round(julianNoon(dateStr) - 2451545.0 + 0.0008);
    var jStar = n - lng / 360;
    var M = (357.5291 + 0.98560028 * jStar) % 360;
    var C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
    var L = (M + C + 180 + 102.9372) % 360;
    var transit = 2451545.0 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD);
    var sinD = Math.sin(L * RAD) * Math.sin(23.4397 * RAD);
    var cosD = Math.cos(Math.asin(sinD));
    var cosW = (Math.sin(alt * RAD) - Math.sin(lat * RAD) * sinD) / (Math.cos(lat * RAD) * cosD);
    if (cosW < -1 || cosW > 1) return { rise: null, set: null };
    var w = Math.acos(cosW) / RAD;
    return { rise: fromJulian(transit - w / 360), set: fromJulian(transit + w / 360) };
  }

  // "HH:MM" in Oslo time, whatever time zone the phone is set to.
  function hhmm(d) {
    if (!d) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: OSLO.tz }).format(d);
    } catch (e) {
      return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    }
  }

  function forDate(dateStr) {
    var g = crossing(dateStr, 6, OSLO.lat, OSLO.lng);
    var s = crossing(dateStr, -0.833, OSLO.lat, OSLO.lng);
    var b1 = crossing(dateStr, -4, OSLO.lat, OSLO.lng);
    var b2 = crossing(dateStr, -8, OSLO.lat, OSLO.lng);
    return {
      morningBlue: { start: hhmm(b2.rise), end: hhmm(b1.rise) },
      morningGolden: { start: hhmm(b1.rise), end: hhmm(g.rise) },
      sunrise: hhmm(s.rise),
      sunset: hhmm(s.set),
      golden: { start: hhmm(g.set), end: hhmm(b1.set) },
      blue: { start: hhmm(b1.set), end: hhmm(b2.set) }
    };
  }

  function mins(t) { var p = (t || '').split(':'); return p.length === 2 ? +p[0] * 60 + +p[1] : null; }
  function overlaps(aStart, aEnd, win) {
    var s = mins(win.start), e = mins(win.end), a = mins(aStart), b = mins(aEnd) || a;
    if (a === null) return false;
    if (s === null && e === null) return false;
    if (s === null) s = 0;
    if (e === null) e = 24 * 60; // sun never gets that low (light summer nights)
    return a < e && b > s;
  }

  // One-line tip if a job's time slot touches golden or blue hour.
  function tipFor(dateStr, start, end) {
    if (!dateStr || !start) return '';
    var t = forDate(dateStr);
    if (overlaps(start, end, t.golden)) return 'Golden hour ' + t.golden.start + '–' + t.golden.end + ' — plan exteriors for then.';
    if (overlaps(start, end, t.blue)) return 'Blue hour ' + t.blue.start + '–' + (t.blue.end || '…') + ' — lights on for twilight exteriors.';
    if (overlaps(start, end, t.morningGolden)) return 'Morning golden hour until ' + t.morningGolden.end + '.';
    if (overlaps(start, end, t.morningBlue)) return 'Morning blue hour until ' + t.morningBlue.end + '.';
    return '';
  }

  var api = { forDate: forDate, tipFor: tipFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OnSiteSun = api;
})(this);
