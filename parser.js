/* On Site — parser for EFKT's "Morgendagens oppdrag" email.
   Turns pasted email text into job objects. Runs entirely on the phone.
   Privacy: seller / agent / agency sections are skipped, and any phone
   number or email address left in free text is removed. */
(function (root) {
  'use strict';

  var HEADING = /^EFKT\s*#\s*(\d+)\s*:\s*(.*?)\s*(?:\(([^)]*)\))?\s*$/i;
  var FOOTER = /^(Se oppdragene i EFKT web|Med vennlig hilsen)/i;

  // Sections we read, and sections we skip entirely (personal data).
  var KEEP = {
    'bestilte produkter': 'products',
    'tid': 'time',
    'instruksjoner til fotograf': 'photographerNote',
    'instruksjoner for nøkkelhenting': 'keyNote',
    'eiendomsinformasjon': 'property',
    'adresse': 'address'
  };
  var SKIP = ['selger', 'kjøper', 'megler', 'meglerkontor', 'kontaktperson',
    'telefon', 'mobiltelefon', 'e-post', 'epost', 'kart'];

  var MONTHS = { januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6, juli: 7,
    august: 8, september: 9, oktober: 10, november: 11, desember: 12 };

  var EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
  var PHONE = /(\+?\d[\d ]{6,}\d)/g;

  function isMissing(v) {
    return v == null || /^\s*(missing|-|—|n\/a)?\s*$/i.test(String(v));
  }
  function clean(v) { return isMissing(v) ? '' : String(v).trim(); }
  function scrub(text) {
    return text.replace(EMAIL, '').replace(PHONE, function (m) {
      return m.replace(/\D/g, '').length >= 8 ? '' : m;
    }).replace(/[ \t]{2,}/g, ' ').trim();
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function parseTime(lines) {
    var s = lines.join(' ');
    var out = { date: '', start: '', end: '' };
    var d = s.match(/(\d{1,2})\.\s*([a-zæøå]+)\s+(\d{4})/i);
    if (d && MONTHS[d[2].toLowerCase()]) {
      out.date = d[3] + '-' + pad(MONTHS[d[2].toLowerCase()]) + '-' + pad(+d[1]);
    }
    var t = s.match(/(\d{1,2})[:.](\d{2})\s*(?:→|->|–|-|til)\s*(\d{1,2})[:.](\d{2})/);
    if (t) {
      out.start = pad(+t[1]) + ':' + t[2];
      out.end = pad(+t[3]) + ':' + t[4];
    } else {
      var one = s.match(/(\d{1,2})[:.](\d{2})/);
      if (one) out.start = pad(+one[1]) + ':' + one[2];
    }
    return out;
  }

  function parseProducts(lines) {
    var res = { products: [], floorPlan: false, extras: [] };
    lines.join(',').split(',').forEach(function (raw) {
      var p = raw.trim();
      if (!p || /^oppmøte$/i.test(p) || isMissing(p)) return;
      var m = p.match(/^(\d+)\s*(standard\s*foto|dronefoto|drone\s*foto|kveldsfoto|kveld\s*foto)$/i);
      if (m) {
        var kind = m[2].toLowerCase().replace(/\s+/g, '');
        var name = kind === 'standardfoto' ? 'Standard foto' : kind === 'dronefoto' ? 'Dronefoto' : 'Kveldsfoto';
        var existing = res.products.filter(function (x) { return x.name === name; })[0];
        if (existing) existing.target += +m[1];
        else res.products.push({ name: name, target: +m[1], shot: 0 });
      } else if (/plantegning\s*2\s*d/i.test(p)) {
        res.floorPlan = true;
      } else {
        res.extras.push(scrub(p));
      }
    });
    return res;
  }

  function parseProperty(lines) {
    var map = { boligtype: 'propertyType', areal: 'area', 'antall etasjer': 'floors',
      etasje: 'floor', 'boligens verdi': 'value' };
    var out = {};
    lines.forEach(function (l) {
      var m = l.match(/^([^:]+):\s*(.*)$/);
      if (!m) return;
      var key = map[m[1].trim().toLowerCase()];
      if (key) out[key] = clean(m[2]);
    });
    return out;
  }

  function keysArePickedUp(text) {
    return /nøkl\w*[^.]*\b(hentes|hent|avhentes|ligger|fås)\b|\b(hent|hente|hentes)\b[^.]*nøkl/i.test(text);
  }

  // Which fields must be present; anything missing gets a CHECK flag.
  function computeFlags(job) {
    var f = [];
    if (!job.street) f.push('Address');
    if (!job.date) f.push('Date');
    if (!job.start) f.push('Time');
    if (!job.products.length && !job.floorPlan) f.push('Products');
    if (!job.propertyType) f.push('Property type');
    if (!job.area) f.push('Area');
    return f;
  }

  function parseBlock(ref, headingAddr, kind, lines) {
    var buckets = {};
    var section = null;
    lines.forEach(function (line) {
      var key = line.toLowerCase().replace(/:$/, '');
      if (KEEP[key]) { section = KEEP[key]; buckets[section] = buckets[section] || []; return; }
      if (SKIP.indexOf(key) !== -1) { section = 'skip'; return; }
      if (!line || section === null || section === 'skip') return;
      buckets[section].push(line);
    });

    var time = parseTime(buckets.time || []);
    var prod = parseProducts(buckets.products || []);
    var prop = parseProperty(buckets.property || []);
    // EFKT sometimes puts "Etasje: 2" under Adresse; read it as property info, not as an address line.
    var addrLines = (buckets.address || []).filter(function (l) { return !isMissing(l) && !/^[^:]+:\s*/.test(l); });
    var addrProp = parseProperty((buckets.address || []).filter(function (l) { return /^[^:]+:\s*/.test(l); }));
    Object.keys(addrProp).forEach(function (k) { if (!prop[k]) prop[k] = addrProp[k]; });
    var street = clean(addrLines[0] || headingAddr);
    var place = clean(addrLines[1] || '');
    var pm = place.match(/^(\d{4})\s+(.*)$/);
    var note = scrub((buckets.photographerNote || []).filter(function (l) { return !isMissing(l); }).join('\n'));
    var keyNote = scrub((buckets.keyNote || []).filter(function (l) { return !isMissing(l); }).join('\n'));

    var job = {
      ref: ref,
      kind: clean(kind),
      street: street,
      postcode: pm ? pm[1] : '',
      city: pm ? pm[2] : place,
      date: time.date, start: time.start, end: time.end,
      products: prod.products,
      floorPlan: prod.floorPlan,
      extras: prod.extras,
      photographerNote: note,
      keyNote: keyNote,
      hasKeys: keysArePickedUp(keyNote),
      propertyType: prop.propertyType || '',
      area: prop.area || '',
      floors: prop.floors || '',
      floor: prop.floor || '',
      value: prop.value || '',
      editingStyle: ''
    };
    job.flags = computeFlags(job);
    return job;
  }

  function parse(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map(function (l) {
      return l.replace(/ /g, ' ').trim();
    });
    var parsed = [];
    var cur = null;
    function flush() {
      if (!cur) return;
      parsed.push(parseBlock(cur.ref, cur.addr, cur.kind, cur.lines));
      cur = null;
    }
    lines.forEach(function (line) {
      var h = line.match(HEADING);
      if (h) { flush(); cur = { ref: h[1], addr: h[2], kind: h[3] || '', lines: [] }; return; }
      if (FOOTER.test(line)) { flush(); return; }
      if (cur) cur.lines.push(line);
    });
    flush();

    // Job id: the EFKT ref. When one ref has several visits (e.g. day shoot + evening
    // shoot), each visit becomes its own job: ref + start time, e.g. "600003-2000".
    var refTimes = {};
    parsed.forEach(function (j) {
      refTimes[j.ref] = refTimes[j.ref] || [];
      if (refTimes[j.ref].indexOf(j.start) === -1) refTimes[j.ref].push(j.start);
    });
    var byId = {};
    var order = [];
    parsed.forEach(function (j) {
      j.id = refTimes[j.ref].length > 1 ? j.ref + '-' + (j.start || '').replace(':', '') : j.ref;
      if (!byId[j.id]) order.push(j.id);
      byId[j.id] = j; // exact same visit listed twice: last one wins
    });
    var jobs = order.map(function (id) { return byId[id]; });
    jobs.sort(function (a, b) {
      return (a.date + a.start).localeCompare(b.date + b.start);
    });
    var keyPickups = jobs.filter(function (j) { return j.hasKeys; }).map(function (j) {
      return { id: j.id, ref: j.ref, before: j.start, note: j.keyNote };
    });
    return { jobs: jobs, keyPickups: keyPickups };
  }

  var api = { parse: parse, computeFlags: computeFlags, isMissing: isMissing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OnSiteParser = api;
})(this);
