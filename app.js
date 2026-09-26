/* On Site — app logic. All job data stays on this phone (localStorage). */
(function () {
  'use strict';

  var STORE_KEY = 'onsite.v1';
  var APP_VERSION = '1.0.2';
  var DEFAULT_DETAILS = ['Fireplace', 'Kitchen tap', 'Window view', 'Door handle', 'Light fixture', 'Textiles', 'Bathroom tiles'];
  var PRODUCTS = ['Standard foto', 'Dronefoto', 'Kveldsfoto'];
  var PROPERTY_TYPES = ['Leilighet', 'Enebolig', 'Rekkehus', 'Tomannsbolig', 'Hytte', 'Tomt'];
  var ROOM_TEMPLATES = {
    leilighet: ['Exterior', 'Entrance / hallway', 'Living room', 'Kitchen', 'Bedroom', 'Bathroom', 'Balcony', 'View'],
    enebolig: ['Exterior front', 'Exterior back / garden', 'Entrance', 'Living room', 'Kitchen', 'Dining area',
      'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bathroom', 'Laundry', 'Hallway / stairs', 'Garage'],
    rekkehus: ['Exterior', 'Entrance', 'Living room', 'Kitchen', 'Bedroom 1', 'Bedroom 2', 'Bathroom', 'Terrace / garden'],
    tomannsbolig: ['Exterior', 'Entrance', 'Living room', 'Kitchen', 'Bedroom 1', 'Bedroom 2', 'Bathroom', 'Garden'],
    hytte: ['Exterior', 'View', 'Living room', 'Kitchen', 'Bedroom', 'Bathroom', 'Terrace'],
    tomt: ['Plot overview', 'Access road', 'View'],
    other: ['Exterior', 'Entrance', 'Living room', 'Kitchen', 'Bedroom', 'Bathroom']
  };

  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');

  /* ---------- Storage ---------- */
  function emptyStore() { return { jobs: {}, settings: { weScan: false }, customChips: [] }; }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var s = raw ? JSON.parse(raw) : null;
      if (!s || typeof s !== 'object') return emptyStore();
      s.jobs = s.jobs && typeof s.jobs === 'object' ? s.jobs : {};
      s.settings = s.settings || { weScan: false };
      s.customChips = Array.isArray(s.customChips) ? s.customChips : [];
      return s;
    } catch (e) { return emptyStore(); }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
    catch (e) { toast('Could not save on this phone. Storage may be full.'); }
  }
  var store = load();

  /* ---------- Helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isoToday() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' }).format(new Date()); }
    catch (e) { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function addDays(iso, n) {
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function dayLabel(iso, opts) {
    if (!iso) return 'No date';
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
    return d.toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, opts || { weekday: 'long', day: 'numeric', month: 'long' }));
  }
  function nowMinutes() {
    try {
      var t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' }).format(new Date());
      return mins(t);
    } catch (e) { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  }
  function mins(t) { var p = (t || '').split(':'); return p.length === 2 ? +p[0] * 60 + +p[1] : 0; }
  function timeRange(j) { return (j.start || '--:--') + (j.end ? '–' + j.end : ''); }
  function fullAddress(j) { return [j.street, [j.postcode, j.city].filter(Boolean).join(' ')].filter(Boolean).join(', '); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function jobsList() { return Object.keys(store.jobs).map(function (k) { return store.jobs[k]; }); }
  function byTime(a, b) { return ((a.date || '') + (a.start || '')).localeCompare((b.date || '') + (b.start || '')); }
  function roomsFor(type) {
    var key = String(type || '').toLowerCase();
    var t = ROOM_TEMPLATES[key] || ROOM_TEMPLATES.other;
    return t.map(function (name) { return { name: name, done: false, note: '' }; });
  }
  function productSummary(j) {
    var parts = (j.products || []).map(function (p) { return p.target + ' ' + p.name; });
    if (j.floorPlan) parts.push('Plantegning 2D');
    return parts.concat(j.extras || []).join(' · ');
  }
  function chipNames(j) {
    var names = DEFAULT_DETAILS.concat(store.customChips);
    Object.keys(j.details || {}).forEach(function (n) { if (names.indexOf(n) === -1) names.push(n); });
    return names;
  }

  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? 'Summary copied' : 'Could not copy. Try again.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Summary copied'); }, fallback);
    } else fallback();
  }

  /* ---------- UI state ---------- */
  var ui = {
    screen: 'today', day: isoToday(), jobRef: null,
    paste: { text: '', jobs: null, open: -1, showBox: false },
    editing: false, addingChip: false, addingRoom: false, openNotes: {}
  };
  function go(screen, extra) {
    ui.screen = screen;
    Object.assign(ui, extra || {});
    ui.addingChip = false; ui.addingRoom = false; ui.editing = false;
    render();
    window.scrollTo(0, 0);
  }

  /* ---------- Screens ---------- */
  function render() {
    var html;
    if (ui.screen === 'paste') html = renderPaste();
    else if (ui.screen === 'job' && store.jobs[ui.jobRef]) html = renderJob(store.jobs[ui.jobRef]);
    else if (ui.screen === 'leave' && store.jobs[ui.jobRef]) html = renderLeave(store.jobs[ui.jobRef]);
    else if (ui.screen === 'settings') html = renderSettings();
    else { ui.screen = 'today'; html = renderToday(); }
    app.innerHTML = html;
  }

  function renderToday() {
    var today = isoToday(), tomorrow = addDays(today, 1);
    var jobs = jobsList().filter(function (j) { return j.date === ui.day; }).sort(byTime);
    var pickups = jobs.filter(function (j) { return j.hasKeys; }).length;

    // Day switcher: today, tomorrow, plus other dates that still have open jobs
    var days = [today, tomorrow];
    jobsList().forEach(function (j) {
      if (j.date && !j.finishedAt && days.indexOf(j.date) === -1) days.push(j.date);
    });
    if (days.indexOf(ui.day) === -1) days.push(ui.day);
    days = days.slice(0, 2).concat(days.slice(2).sort()).slice(0, 5);

    var next = null;
    if (ui.day === today) {
      var now = nowMinutes();
      next = jobs.filter(function (j) { return !j.finishedAt && mins(j.end || j.start) >= now; })[0];
    } else if (ui.day > today) {
      next = jobs.filter(function (j) { return !j.finishedAt; })[0];
    }

    var sun = OnSiteSun.forDate(ui.day);
    var h = '';
    h += '<div class="topbar"><button class="btn small" data-a="settings">Settings</button>' +
      '<button class="btn primary small" data-a="paste">Paste tomorrow</button></div>';
    h += '<h1 style="margin-top:12px">' + esc(dayLabel(ui.day)) + '</h1>';
    h += '<p class="label" style="margin-top:4px">' + plural(jobs.length, 'job', 'jobs').toUpperCase() + ' · ' +
      plural(pickups, 'key pickup', 'key pickups').toUpperCase() + '</p>';
    h += '<div class="seg" role="group" aria-label="Day">' + days.map(function (d) {
      var name = d === today ? 'Today' : d === tomorrow ? 'Tomorrow' : dayLabel(d, { weekday: 'short', day: 'numeric', month: 'short' });
      return '<button data-a="day" data-v="' + d + '" aria-pressed="' + (d === ui.day) + '">' + esc(name) + '</button>';
    }).join('') + '</div>';
    h += '<div class="sun">' +
      '<div class="golden"><span class="label">Golden hour</span><b>' + esc(sun.golden.start || '—') + '</b></div>' +
      '<div><span class="label">Sunset</span><b>' + esc(sun.sunset || '—') + '</b></div>' +
      '<div class="blue"><span class="label">Blue hour</span><b>' + esc(sun.blue.start ? sun.blue.start + '–' + (sun.blue.end || '…') : '—') + '</b></div>' +
      '</div>';

    if (!jobs.length) {
      h += '<div class="empty">No jobs this day.<br>Tap <b>Paste tomorrow</b> to import the EFKT email.</div>';
      return h;
    }
    jobs.forEach(function (j) {
      if (j.hasKeys) {
        h += '<div class="pickup' + (j.keysPickedUp ? ' done' : '') + '">' +
          '<button class="tick" role="checkbox" aria-checked="' + !!j.keysPickedUp + '" aria-label="Keys picked up" data-a="pickup" data-ref="' + esc(j.ref) + '">' + (j.keysPickedUp ? '✓' : '') + '</button>' +
          '<div class="what"><span class="label">Key pickup · before ' + esc(j.start || '') + '</span><br>' +
          esc(j.keyNote || 'Pick up keys') + ' <span class="muted">for ' + esc(j.street) + '</span></div></div>';
      }
      var tip = OnSiteSun.tipFor(j.date, j.start, j.end);
      var cls = 'card' + (j.finishedAt ? ' done' : '') + (next === j ? ' next' : '');
      h += '<button class="' + cls + '" data-a="open" data-ref="' + esc(j.ref) + '">' +
        '<div class="spread"><span class="time">' + esc(timeRange(j)) + '</span><span class="row">' +
        (next === j ? '<span class="tag next">Next</span>' : '') +
        (j.finishedAt ? '<span class="tag">Done</span>' : '') +
        ((j.flags || []).length ? '<span class="tag check">Check</span>' : '') + '</span></div>' +
        '<div class="addr">' + esc(j.street || 'No address') + '</div>' +
        '<div class="meta">' + esc([j.propertyType, productSummary(j)].filter(Boolean).join(' · ')) + '</div>' +
        (tip && !j.finishedAt ? '<div class="tip">☀ ' + esc(tip) + '</div>' : '') +
        '</button>';
    });
    return h;
  }

  function renderPaste() {
    var p = ui.paste;
    var h = '<div class="topbar"><button class="back" data-a="home">‹ Today</button></div>';
    h += '<h1>Paste tomorrow</h1>';
    if (!p.jobs) {
      h += '<p class="muted" style="margin-top:8px">Copy the whole “Morgendagens oppdrag” email in Mail, then tap Paste.</p>';
      h += '<button class="btn primary block" style="margin-top:16px;min-height:56px" data-a="clip">Paste</button>';
      h += '<label class="field"><span class="label">Or paste the text here</span>' +
        '<textarea id="pasteBox" data-f="pasteText" placeholder="Long-press here and choose Paste">' + esc(p.text) + '</textarea></label>';
      h += '<button class="btn block" style="margin-top:8px" data-a="readBox">Read text</button>';
      return h;
    }
    var pickups = p.jobs.filter(function (j) { return j.hasKeys; }).length;
    if (!p.jobs.length) {
      h += '<div class="empty">No jobs found.<br>Make sure you copied the whole email, including the “EFKT #…” headings.</div>';
    } else {
      h += '<p class="label" style="margin-top:8px">Found ' + plural(p.jobs.length, 'job', 'jobs') + ' · ' + plural(pickups, 'key pickup', 'key pickups') + '</p>';
      h += '<p class="muted" style="margin-top:4px;font-size:14px">Tap a job to check or edit it.</p>';
      p.jobs.forEach(function (j, i) {
        var flagged = (j.flags || []).length > 0;
        var exists = !!store.jobs[j.ref];
        h += '<div class="review' + (flagged ? ' flagged' : '') + '" id="rv' + i + '">' +
          '<button data-a="toggleReview" data-i="' + i + '" aria-expanded="' + (p.open === i) + '">' +
          '<div class="spread"><span class="time">' + esc(j.date ? dayLabel(j.date, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' : '') + esc(timeRange(j)) + '</span>' +
          '<span data-flags="' + i + '">' + flagTag(j) + '</span></div>' +
          '<div class="addr" style="font-weight:600;font-size:18px;margin-top:2px">' + esc(j.street || 'No address') + '</div>' +
          '<div class="meta muted" style="font-size:14px">EFKT #' + esc(j.ref) + (exists ? ' · updates saved job' : '') + ' · ' + esc(productSummary(j) || 'no products') +
          (j.hasKeys ? ' · keys' : '') + '</div>' +
          '</button>' +
          (p.open === i ? '<div class="edit">' + editForm(j, 'p' + i) + '</div>' : '') +
          '</div>';
      });
    }
    h += '<div class="bottom-bar"><div class="inner">' +
      '<button class="btn" data-a="pasteAgain">Paste again</button>' +
      '<button class="btn primary" data-a="saveJobs"' + (p.jobs.length ? '' : ' disabled') + '>Save ' + plural(p.jobs.length, 'job', 'jobs') + '</button>' +
      '</div></div>';
    return h;
  }

  function flagTag(j) {
    return (j.flags || []).length ? '<span class="tag check">Check: ' + esc(j.flags.join(', ')) + '</span>' : '';
  }

  function field(key, name, label, value, type, flagName, extra) {
    var flagged = flagName && (extra && extra.flags || []).indexOf(flagName) !== -1;
    return '<label class="field' + (flagged ? ' flagged' : '') + '" data-flagfield="' + esc(flagName || '') + '"><span class="label">' + esc(label) + '</span>' +
      '<input class="input" type="' + (type || 'text') + '" data-k="' + key + '" data-f="' + name + '" value="' + esc(value) + '"' +
      (type === 'number' ? ' inputmode="numeric" min="0"' : '') + (name === 'propertyType' ? ' list="ptypes"' : '') + (name === 'editingStyle' ? ' list="styles"' : '') + '></label>';
  }

  function editForm(j, key) {
    function target(name) { var p = (j.products || []).filter(function (x) { return x.name === name; })[0]; return p ? p.target : 0; }
    var e = { flags: j.flags };
    var h = '';
    h += field(key, 'street', 'Address', j.street, 'text', 'Address', e);
    h += '<div class="grid2">' + field(key, 'postcode', 'Postcode', j.postcode) + field(key, 'city', 'City', j.city) + '</div>';
    h += field(key, 'date', 'Date', j.date, 'date', 'Date', e);
    h += '<div class="grid2">' + field(key, 'start', 'Start', j.start, 'time', 'Time', e) + field(key, 'end', 'End', j.end, 'time') + '</div>';
    h += '<div class="grid2">' + field(key, 'propertyType', 'Property type', j.propertyType, 'text', 'Property type', e) +
      field(key, 'area', 'Area', j.area, 'text', 'Area', e) + '</div>';
    h += '<div class="grid2">' + field(key, 'floors', 'Floors', j.floors) + field(key, 'floor', 'Floor', j.floor) + '</div>';
    h += field(key, 'editingStyle', 'Editing style', j.editingStyle);
    h += '<div class="grid2">' + PRODUCTS.map(function (n) {
      return field(key, 'target:' + n, n, target(n) || '', 'number', 'Products', e);
    }).join('') + '</div>';
    h += '<label class="check-row"><input type="checkbox" data-k="' + key + '" data-f="floorPlan"' + (j.floorPlan ? ' checked' : '') + '> Plantegning 2D</label>';
    h += '<label class="check-row"><input type="checkbox" data-k="' + key + '" data-f="hasKeys"' + (j.hasKeys ? ' checked' : '') + '> Keys to pick up</label>';
    h += '<label class="field"><span class="label">Key instructions</span><textarea style="min-height:70px" data-k="' + key + '" data-f="keyNote">' + esc(j.keyNote) + '</textarea></label>';
    h += '<label class="field"><span class="label">Instructions to photographer</span><textarea style="min-height:90px" data-k="' + key + '" data-f="photographerNote">' + esc(j.photographerNote) + '</textarea></label>';
    h += '<label class="field"><span class="label">Other products (one per line)</span><textarea style="min-height:70px" data-k="' + key + '" data-f="extras">' + esc((j.extras || []).join('\n')) + '</textarea></label>';
    h += '<datalist id="ptypes">' + PROPERTY_TYPES.map(function (t) { return '<option value="' + t + '">'; }).join('') + '</datalist>';
    h += '<datalist id="styles"><option value="Natural"><option value="Bright &amp; airy"><option value="Warm"><option value="HDR"></datalist>';
    return h;
  }

  function renderJob(j) {
    var h = '<div class="topbar"><button class="back" data-a="home">‹ Today</button>' +
      '<button class="btn small link" data-a="toggleEdit">' + (ui.editing ? 'Done editing' : 'Edit details') + '</button></div>';
    h += '<p class="label" style="margin-top:8px">EFKT #' + esc(j.ref) + ' · ' + esc(dayLabel(j.date, { weekday: 'short', day: 'numeric', month: 'short' })) + ' · ' + esc(timeRange(j)) +
      (j.finishedAt ? ' · Finished' : '') + '</p>';
    h += '<h1 style="margin-top:4px">' + esc(j.street || 'No address') + '</h1>';
    h += '<p class="muted">' + esc([j.postcode, j.city].filter(Boolean).join(' ')) + '</p>';
    var facts = [j.propertyType, j.area, j.floors ? j.floors + (j.floors === '1' ? ' floor' : ' floors') : '', j.floor ? 'Floor ' + j.floor : ''].filter(Boolean);
    h += '<p style="margin-top:8px">' + esc(facts.join(' · ') || 'No property info') + '</p>';
    h += '<p class="label" style="margin-top:6px">Editing style: <span style="color:var(--ink)">' + esc(j.editingStyle || 'not set') + '</span></p>';
    if ((j.flags || []).length) h += '<p style="margin-top:8px">' + flagTag(j) + '</p>';

    if (ui.editing) {
      h += '<div class="section">' + editForm(j, 's' + j.ref) + '</div>';
      h += '<button class="btn primary block" style="margin-top:16px" data-a="toggleEdit">Done editing</button>';
      return h;
    }

    if (j.photographerNote) h += '<div class="note"><span class="label" style="color:var(--accent)">Note from EFKT</span><br>' + esc(j.photographerNote) + '</div>';
    if ((j.extras || []).length) h += '<p class="muted" style="margin-top:12px">Also ordered: ' + esc(j.extras.join(', ')) + '</p>';
    var tip = OnSiteSun.tipFor(j.date, j.start, j.end);
    if (tip) h += '<p style="margin-top:12px;color:#7A5400">☀ ' + esc(tip) + '</p>';

    var tiles = '';
    if (j.hasKeys) {
      var kState = j.keysReturned ? 'Returned' : j.keysPickedUp ? 'Picked up — return after' : 'Not picked up';
      tiles += '<div class="tile' + (j.keysReturned ? ' ok' : '') + '"><span class="label">Keys</span><span class="state">' + kState + '</span>' +
        (j.keyNote ? '<span style="font-size:13px">' + esc(j.keyNote) + '</span>' : '') +
        (!j.keysPickedUp ? '<button class="btn small" data-a="keys" data-v="pickedUp">Mark picked up</button>'
          : '<button class="btn small" data-a="keys" data-v="returned">' + (j.keysReturned ? 'Undo' : 'Mark returned') + '</button>') +
        '</div>';
    }
    if (j.floorPlan) {
      tiles += '<div class="tile' + (j.planScanned ? ' ok' : '') + '"><span class="label">Plantegning 2D</span>' +
        '<span class="state">' + (j.planScanned ? 'Scanned' : 'Not scanned') + '</span>' +
        '<button class="btn small" data-a="scan">' + (j.planScanned ? 'Undo' : 'Mark scanned') + '</button>' +
        (store.settings.weScan ? '<a class="btn small" href="shortcuts://run-shortcut?name=Open%20weScan">Open weScan</a>' : '') +
        '</div>';
    }
    if (tiles) h += '<div class="tiles">' + tiles + '</div>';

    if ((j.products || []).length) {
      h += '<div class="section"><span class="label">Photos</span>';
      j.products.forEach(function (p, i) {
        h += '<div class="counter"><button class="btn" data-a="count" data-i="' + i + '" data-v="-1" aria-label="One less ' + esc(p.name) + '">−</button>' +
          '<div style="text-align:center;flex:1"><div class="name">' + esc(p.name) + '</div>' +
          '<div class="count' + (p.shot >= p.target ? ' met' : '') + '">' + p.shot + '/' + p.target + '</div></div>' +
          '<button class="btn dark" data-a="count" data-i="' + i + '" data-v="1" aria-label="One more ' + esc(p.name) + '">+</button></div>';
      });
      h += '</div>';
    }

    var names = chipNames(j), d = j.details || {};
    var picked = names.filter(function (n) { return d[n]; }).length;
    var shot = names.filter(function (n) { return d[n] === 'shot'; }).length;
    h += '<div class="section"><span class="label">Detail photos · ' + shot + '/' + picked + ' shot</span>' +
      '<p class="muted" style="font-size:13px;margin-bottom:8px">Tap once to pick, again when shot, again to clear.</p><div class="chips">';
    names.forEach(function (n) {
      var st = d[n] || '';
      h += '<button class="chip ' + st + '" data-a="chip" data-v="' + esc(n) + '">' + (st === 'shot' ? '✓ ' : '') + esc(n) + '</button>';
    });
    h += '<button class="chip add" data-a="addChip">+ Other</button></div>';
    if (ui.addingChip) h += '<form class="inline-add" data-form="chip"><input class="input" id="newChip" placeholder="Detail name" autocomplete="off"><button class="btn dark">Add</button></form>';
    h += '</div>';

    var rooms = j.rooms || [];
    h += '<div class="section"><span class="label">Rooms · ' + rooms.filter(function (r) { return r.done; }).length + '/' + rooms.length + ' done</span>';
    rooms.forEach(function (r, i) {
      var open = ui.openNotes[j.ref + ':' + i];
      h += '<div class="room' + (r.done ? ' done' : '') + '"><div class="row">' +
        '<button class="tick" role="checkbox" aria-checked="' + r.done + '" aria-label="' + esc(r.name) + ' done" data-a="room" data-i="' + i + '">' + (r.done ? '✓' : '') + '</button>' +
        '<span class="name" data-a="room" data-i="' + i + '">' + esc(r.name) + '</span>' +
        '<button class="btn small link" data-a="roomNote" data-i="' + i + '">' + (r.note ? 'Note ✎' : '+ Note') + '</button></div>' +
        (open || r.note ? '<textarea data-f="roomNote" data-i="' + i + '" placeholder="Note for this room">' + esc(r.note) + '</textarea>' : '') +
        '</div>';
    });
    if (ui.addingRoom) h += '<form class="inline-add" data-form="room"><input class="input" id="newRoom" placeholder="Room name" autocomplete="off"><button class="btn dark">Add</button></form>';
    else h += '<button class="btn small link" data-a="addRoom" style="margin-top:4px">+ Add room</button>';
    h += '</div>';

    var q = encodeURIComponent(fullAddress(j) + ', Norway');
    h += '<div class="section grid2">' +
      '<a class="btn" href="https://safetofly.no" target="_blank" rel="noopener">Drone check</a>' +
      '<a class="btn" href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noopener">Open in Maps</a></div>';

    h += '<div class="bottom-bar"><div class="inner">' +
      (j.finishedAt ? '<button class="btn" data-a="reopen">Reopen job</button>'
        : '<button class="btn primary" data-a="finish">Finish shoot</button>') + '</div></div>';
    return h;
  }

  function openItems(j) {
    var items = [];
    (j.products || []).forEach(function (p) { if (p.shot < p.target) items.push(p.name + ': ' + p.shot + '/' + p.target); });
    (j.rooms || []).forEach(function (r) { if (!r.done) items.push('Room not ticked: ' + r.name); });
    Object.keys(j.details || {}).forEach(function (n) { if (j.details[n] === 'picked') items.push('Detail not shot: ' + n); });
    if (j.floorPlan && !j.planScanned) items.push('Plantegning 2D not scanned');
    if (j.hasKeys && !j.keysReturned) items.push(j.keysPickedUp ? 'Return the keys' : 'Keys: not marked as picked up or returned');
    (j.rooms || []).forEach(function (r) { if (r.note) items.push('Note · ' + r.name + ': ' + r.note); });
    return items;
  }

  function summaryText(j) {
    var lines = ['EFKT #' + j.ref + ' — ' + fullAddress(j), dayLabel(j.date, { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' + timeRange(j), ''];
    lines.push('Delivered:');
    (j.products || []).forEach(function (p) { lines.push('- ' + p.name + ': ' + p.shot + '/' + p.target); });
    if (j.floorPlan) lines.push('- Plantegning 2D: ' + (j.planScanned ? 'scanned' : 'not scanned'));
    var shot = Object.keys(j.details || {}).filter(function (n) { return j.details[n] === 'shot'; });
    if (shot.length) lines.push('- Detail photos: ' + shot.join(', '));
    var notes = (j.rooms || []).filter(function (r) { return r.note; });
    if (notes.length) {
      lines.push('', 'Notes:');
      notes.forEach(function (r) { lines.push('- ' + r.name + ': ' + r.note); });
    }
    if (j.hasKeys) lines.push('', 'Keys: ' + (j.keysReturned ? 'returned' : 'not yet returned'));
    return lines.join('\n');
  }

  function renderLeave(j) {
    var items = openItems(j);
    var h = '<div class="topbar"><button class="back" data-a="backToJob">‹ Back</button></div>';
    h += '<h1>Before you leave</h1><p class="muted">' + esc(j.street) + ' · ' + esc(timeRange(j)) + '</p>';
    if (!items.length) h += '<div class="all-done">Everything is done ✓</div>';
    else {
      h += '<p class="label" style="margin-top:16px">Still open · ' + items.length + '</p><ul class="open-list">' +
        items.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
    }
    h += '<button class="btn block" style="margin-top:20px" data-a="copySummary">Copy summary for agent</button>';
    h += '<div class="bottom-bar"><div class="inner">' +
      '<button class="btn" data-a="backToJob">Go back</button>' +
      '<button class="btn primary" data-a="finishNow">' + (items.length ? 'Finish anyway' : 'Finish') + '</button></div></div>';
    return h;
  }

  function renderSettings() {
    var done = jobsList().filter(function (j) { return j.finishedAt; })
      .sort(function (a, b) { return String(b.finishedAt).localeCompare(String(a.finishedAt)); });
    var h = '<div class="topbar"><button class="back" data-a="home">‹ Today</button></div><h1>Settings</h1>';
    h += '<div class="section"><div class="switch-row"><div><b>Show Open weScan button</b>' +
      '<p class="muted" style="font-size:13px">Adds a button to the Plantegning 2D tile that runs your “Open weScan” shortcut.</p></div>' +
      '<label class="switch"><input type="checkbox" data-a="weScan"' + (store.settings.weScan ? ' checked' : '') + ' aria-label="Show Open weScan button"><span></span></label></div></div>';
    h += '<div class="section"><span class="label">Backup</span><p class="muted" style="font-size:14px">Your jobs are only stored on this phone. Export a backup now and then.</p>' +
      '<div class="grid2" style="margin-top:10px"><button class="btn" data-a="export">Export backup</button>' +
      '<label class="btn" style="position:relative">Import backup<input type="file" accept=".json,application/json" data-a="import" style="position:absolute;inset:0;opacity:0"></label></div></div>';
    h += '<div class="section"><span class="label">History · ' + done.length + ' finished</span>';
    if (!done.length) h += '<p class="muted">No finished jobs yet.</p>';
    done.forEach(function (j) {
      h += '<button class="card" data-a="open" data-ref="' + esc(j.ref) + '"><span class="time">' +
        esc(dayLabel(j.date, { day: 'numeric', month: 'short', year: 'numeric' })) + ' · ' + esc(timeRange(j)) + '</span>' +
        '<div class="addr" style="font-size:17px">' + esc(j.street) + '</div><div class="meta">EFKT #' + esc(j.ref) + ' · ' + esc(productSummary(j)) + '</div></button>';
    });
    h += '</div><p class="label" style="margin-top:32px">On Site ' + APP_VERSION + ' · data stays on this phone</p>';
    return h;
  }

  /* ---------- Actions ---------- */
  function currentJob() { return store.jobs[ui.jobRef]; }

  function jobByKey(key) {
    if (!key) return null;
    if (key[0] === 'p') return ui.paste.jobs && ui.paste.jobs[+key.slice(1)];
    return store.jobs[key.slice(1)];
  }

  function setTarget(j, name, n) {
    j.products = j.products || [];
    var p = j.products.filter(function (x) { return x.name === name; })[0];
    if (n > 0) {
      if (p) p.target = n; else j.products.push({ name: name, target: n, shot: 0 });
      j.products.sort(function (a, b) { return PRODUCTS.indexOf(a.name) - PRODUCTS.indexOf(b.name); });
    } else if (p) {
      j.products.splice(j.products.indexOf(p), 1);
    }
  }

  function readPaste(text) {
    ui.paste.text = text;
    var result = OnSiteParser.parse(text);
    ui.paste.jobs = result.jobs;
    ui.paste.open = -1;
    render();
    window.scrollTo(0, 0);
  }

  function saveParsed() {
    var jobs = ui.paste.jobs || [];
    jobs.forEach(function (n) {
      var old = store.jobs[n.ref];
      var j = Object.assign({}, n);
      if (old) {
        // Re-import: update imported details, keep what was done on site.
        j.products = n.products.map(function (p) {
          var o = (old.products || []).filter(function (x) { return x.name === p.name; })[0];
          return { name: p.name, target: p.target, shot: o ? o.shot : 0 };
        });
        j.editingStyle = n.editingStyle || old.editingStyle || '';
        ['keysPickedUp', 'keysReturned', 'planScanned', 'details', 'rooms', 'finishedAt', 'importedAt'].forEach(function (k) { j[k] = old[k]; });
      } else {
        j.keysPickedUp = false; j.keysReturned = false; j.planScanned = false;
        j.details = {}; j.rooms = roomsFor(n.propertyType); j.finishedAt = null;
        j.importedAt = new Date().toISOString();
      }
      store.jobs[n.ref] = j;
    });
    save();
    var first = jobs.slice().sort(byTime)[0];
    toast('Saved ' + plural(jobs.length, 'job', 'jobs'));
    ui.paste = { text: '', jobs: null, open: -1, showBox: false };
    go('today', { day: first && first.date ? first.date : ui.day });
  }

  function exportBackup() {
    var data = JSON.stringify({ app: 'On Site', version: APP_VERSION, exportedAt: new Date().toISOString(), data: store }, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'on-site-backup-' + isoToday() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        var data = parsed && parsed.data ? parsed.data : parsed;
        if (!data || typeof data.jobs !== 'object') throw new Error('bad');
        var n = Object.keys(data.jobs).length;
        if (!window.confirm('Replace everything on this phone with this backup (' + plural(n, 'job', 'jobs') + ')?')) return;
        store = { jobs: data.jobs, settings: data.settings || { weScan: false }, customChips: data.customChips || [] };
        save();
        toast('Backup imported');
        render();
      } catch (e) { toast('That file is not an On Site backup.'); }
    };
    reader.readAsText(file);
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-a]');
    if (!el || el.tagName === 'INPUT') return;
    var a = el.getAttribute('data-a'), v = el.getAttribute('data-v'), i = +el.getAttribute('data-i');
    var j = currentJob();
    switch (a) {
      case 'home': go('today'); break;
      case 'settings': go('settings'); break;
      case 'paste': go('paste'); break;
      case 'day': ui.day = v; render(); break;
      case 'open': go('job', { jobRef: el.getAttribute('data-ref') }); break;
      case 'pickup': {
        var pj = store.jobs[el.getAttribute('data-ref')];
        if (pj) { pj.keysPickedUp = !pj.keysPickedUp; save(); render(); }
        break;
      }
      case 'clip':
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(function (t) {
            if (t && t.trim()) readPaste(t);
            else { toast('Clipboard is empty. Paste into the box below.'); focusBox(); }
          }, function () { toast('Paste into the box below instead.'); focusBox(); });
        } else { toast('Paste into the box below.'); focusBox(); }
        break;
      case 'readBox': {
        var box = document.getElementById('pasteBox');
        if (box && box.value.trim()) readPaste(box.value); else toast('The box is empty.');
        break;
      }
      case 'pasteAgain': ui.paste = { text: '', jobs: null, open: -1, showBox: false }; render(); break;
      case 'toggleReview':
        ui.paste.open = ui.paste.open === i ? -1 : i; render();
        var card = document.getElementById('rv' + i);
        if (card) card.scrollIntoView({ block: 'start' });
        break;
      case 'saveJobs': saveParsed(); break;
      case 'toggleEdit':
        if (ui.editing && j) { j.flags = OnSiteParser.computeFlags(j); save(); }
        ui.editing = !ui.editing; render(); window.scrollTo(0, 0); break;
      case 'keys':
        if (v === 'pickedUp') j.keysPickedUp = true; else j.keysReturned = !j.keysReturned;
        save(); render(); break;
      case 'scan': j.planScanned = !j.planScanned; save(); render(); break;
      case 'count': {
        var p = j.products[i];
        p.shot = Math.max(0, p.shot + +v);
        save(); render(); break;
      }
      case 'chip': {
        j.details = j.details || {};
        var st = j.details[v];
        if (!st) j.details[v] = 'picked'; else if (st === 'picked') j.details[v] = 'shot'; else delete j.details[v];
        save(); render(); break;
      }
      case 'addChip': ui.addingChip = !ui.addingChip; render(); focusId('newChip'); break;
      case 'room':
        j.rooms[i].done = !j.rooms[i].done; save(); render(); break;
      case 'roomNote': {
        var key = j.ref + ':' + i;
        ui.openNotes[key] = !ui.openNotes[key]; render();
        var ta = document.querySelector('textarea[data-f="roomNote"][data-i="' + i + '"]');
        if (ta) ta.focus();
        break;
      }
      case 'addRoom': ui.addingRoom = true; render(); focusId('newRoom'); break;
      case 'finish': go('leave'); break;
      case 'backToJob': go('job'); break;
      case 'copySummary': copyText(summaryText(j)); break;
      case 'finishNow':
        j.finishedAt = new Date().toISOString(); save();
        toast('Job finished'); go('today', { day: j.date || ui.day }); break;
      case 'reopen': j.finishedAt = null; save(); render(); break;
      case 'export': exportBackup(); break;
    }
  });

  function focusBox() { focusId('pasteBox'); }
  function focusId(id) { var el = document.getElementById(id); if (el) el.focus(); }

  document.addEventListener('submit', function (ev) {
    var form = ev.target.closest('[data-form]');
    if (!form) return;
    ev.preventDefault();
    var j = currentJob();
    var kind = form.getAttribute('data-form');
    var input = form.querySelector('input');
    var name = (input.value || '').trim();
    if (!name || !j) return;
    if (kind === 'chip') {
      if (DEFAULT_DETAILS.indexOf(name) === -1 && store.customChips.indexOf(name) === -1) store.customChips.push(name);
      j.details = j.details || {};
      j.details[name] = 'picked';
      ui.addingChip = false;
    } else {
      j.rooms = j.rooms || [];
      j.rooms.push({ name: name, done: false, note: '' });
      ui.addingRoom = false;
    }
    save(); render();
  });

  // Typing in fields: save without re-rendering (so the keyboard stays open).
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    var f = el.getAttribute('data-f');
    if (!f) return;
    if (f === 'pasteText') { ui.paste.text = el.value; return; }
    if (f === 'roomNote') {
      var j = currentJob();
      if (j) { j.rooms[+el.getAttribute('data-i')].note = el.value; save(); }
      return;
    }
    var key = el.getAttribute('data-k');
    var job = jobByKey(key);
    if (!job) return;
    if (f.indexOf('target:') === 0) setTarget(job, f.slice(7), parseInt(el.value, 10) || 0);
    else if (el.type === 'checkbox') job[f] = el.checked;
    else if (f === 'extras') job.extras = el.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    else job[f] = el.value.trim() === '' ? '' : el.value;
    job.flags = OnSiteParser.computeFlags(job);
    if (key[0] === 's') {
      if (f === 'hasKeys' && !job.hasKeys) { job.keysPickedUp = false; job.keysReturned = false; }
      save();
    }
    // Refresh CHECK markers in place
    var box = el.closest('.edit, .section');
    if (box) {
      box.querySelectorAll('[data-flagfield]').forEach(function (lab) {
        var ff = lab.getAttribute('data-flagfield');
        lab.classList.toggle('flagged', !!ff && job.flags.indexOf(ff) !== -1);
      });
    }
    if (key[0] === 'p') {
      var idx = key.slice(1);
      var tag = document.querySelector('[data-flags="' + idx + '"]');
      if (tag) tag.innerHTML = flagTag(job);
      var card = document.getElementById('rv' + idx);
      if (card) card.classList.toggle('flagged', job.flags.length > 0);
    }
  });

  document.addEventListener('change', function (ev) {
    var el = ev.target;
    var a = el.getAttribute('data-a');
    if (a === 'weScan') { store.settings.weScan = el.checked; save(); }
    if (a === 'import' && el.files && el.files[0]) { importBackup(el.files[0]); el.value = ''; }
  });

  // Keep "next job" fresh while the Today screen is open.
  setInterval(function () { if (ui.screen === 'today' && !document.hidden) render(); }, 60000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && ui.screen === 'today') render();
  });

  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline support unavailable */ });
    });
  }
})();
