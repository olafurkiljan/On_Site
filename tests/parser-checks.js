/* Checks for parser.js against tests/sample-email.txt (invented data).
   Used by tests/parser.test.html. */
(function (root) {
  'use strict';

  function runChecks(parser, text) {
    var r = parser.parse(text);
    var results = [];
    function check(name, ok, detail) { results.push({ name: name, ok: !!ok, detail: detail || '' }); }
    function job(ref) { return r.jobs.filter(function (j) { return j.ref === ref; })[0] || {}; }
    function target(j, name) {
      var p = (j.products || []).filter(function (x) { return x.name === name; })[0];
      return p ? p.target : 0;
    }

    check('Finds 4 jobs', r.jobs.length === 4, 'found ' + r.jobs.length);
    check('Finds 1 key pickup', r.keyPickups.length === 1, 'found ' + r.keyPickups.length);
    check('Key pickup is for #600001', r.keyPickups[0] && r.keyPickups[0].ref === '600001');

    var a = job('600001');
    check('#600001 Standard foto 20', target(a, 'Standard foto') === 20);
    check('#600001 Plantegning 2D ordered', a.floorPlan === true);
    check('#600001 time 09:00–10:30 on 2026-09-16', a.date === '2026-09-16' && a.start === '09:00' && a.end === '10:30');
    check('#600001 no photographer note', a.photographerNote === '');
    check('#600001 address', a.street === 'Eksempelveien 12' && a.postcode === '0000');

    var b = job('600002');
    check('#600002 Standard foto 25 + Dronefoto 5', target(b, 'Standard foto') === 25 && target(b, 'Dronefoto') === 5);
    check('#600002 flagged: missing Area', (b.flags || []).indexOf('Area') !== -1, 'flags: ' + (b.flags || []).join(', '));
    check('#600002 photographer note kept', /hagen/.test(b.photographerNote));
    check('#600002 no keys', b.hasKeys === false);

    var c = job('600003'), d = job('600004');
    check('Same address, different times = 2 jobs', c.street === d.street && c.start !== d.start);
    check('#600004 Kveldsfoto 7', target(d, 'Kveldsfoto') === 7);
    check('"Oppmøte" ignored', r.jobs.every(function (j) { return j.extras.length === 0; }));

    var others = r.jobs.filter(function (j) { return j.ref !== '600002' && j.flags.length; });
    check('Only #600002 has CHECK flags', others.length === 0,
      others.map(function (j) { return j.ref + ': ' + j.flags.join(', '); }).join('; '));

    var out = JSON.stringify(r);
    var forbidden = ['Ola Testmann', 'Kari Prøve', 'Per Eksempel', 'Test Eiendom', 'Prøvegata',
      '00000000', '00000001', '00000002', 'example.com', '@'];
    var leaked = forbidden.filter(function (s) { return out.indexOf(s) !== -1; });
    check('No seller/agent names, phones or emails in output', leaked.length === 0, leaked.join(', '));

    var again = parser.parse(text + '\n' + text);
    check('Same ref twice = no duplicates', again.jobs.length === 4 &&
      again.jobs.every(function (j) { return j.id === j.ref; }));

    // One EFKT ref with two visits (day + evening) must give two jobs, not one.
    var twoVisits = parser.parse(text.replace('EFKT #600004', 'EFKT #600003'));
    var visits = twoVisits.jobs.filter(function (j) { return j.ref === '600003'; });
    check('Same EFKT ref, two times = 2 jobs', twoVisits.jobs.length === 4 && visits.length === 2 &&
      visits[0].id !== visits[1].id, visits.map(function (j) { return j.id + ' ' + j.start; }).join(', '));
    var twoAgain = parser.parse(text.replace('EFKT #600004', 'EFKT #600003') + '\n' + text.replace('EFKT #600004', 'EFKT #600003'));
    check('Same ref, two times, pasted twice = still 4 jobs', twoAgain.jobs.length === 4);

    return { results: results, parsed: r };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = runChecks;
  else root.runParserChecks = runChecks;
})(this);
