# On Site — feature spec (v1)

## Files
index.html, styles.css, app.js, parser.js, sun.js, manifest.webmanifest, sw.js, icons/ (final, provided), tests/sample-email.txt (provided), tests/parser.test.html (or similar, runs in a browser), README.md

## Import (parser.js)
Input: the pasted text of EFKT's daily email "Morgendagens oppdrag" (Norwegian). See tests/sample-email.txt for the exact layout (invented data).
- Each job starts with a heading like "EFKT #600001: <address> (Bolig)". Split on these.
- Sections: "Bestilte produkter", "Tid", "Instruksjoner til fotograf", "Instruksjoner for nøkkelhenting", "Eiendomsinformasjon" (Boligtype, Areal, Antall etasjer, Etasje, Boligens verdi), "Adresse".
- Products: "N standard foto" -> Standard foto target N. "N dronefoto" -> Dronefoto target N. "N kveldsfoto" -> Kveldsfoto target N. "Plantegning 2d" -> floor plan task. Ignore "Oppmøte". Unknown products: keep as plain text on the job.
- Key instructions that say keys are picked up somewhere (e.g. "Nøkler hentes på meglerkontoret") -> create a KEY PICKUP step before that job, and a "return keys" item on the job.
- "Missing" values count as empty.
- Same address, different times = separate jobs. Same EFKT ref with two times (day + evening shoot) = two jobs too (id = ref + start time).
- Same EFKT ref imported again -> update that job, don't duplicate.
- Anything expected but missing -> red CHECK flag on the review screen. Every field editable.
- SKIP: Selger, Megler, Meglerkontor contact details (names, phones, emails). Keep only what's needed on site.

## Screens
1. Today: date + "N JOBS · N KEY PICKUP"; sun strip (golden hour, sunset, blue hour); job cards in time order (done = struck through, next = highlighted); key pickups as smaller dashed cards with a tick box; "Paste tomorrow" button top right. Shows today only (no day switcher); if today is empty, says when the next saved jobs are.
2. Paste tomorrow: "Paste" uses navigator.clipboard.readText(), with a textarea fallback. "Found N jobs" review list with CHECK flags; tap to edit; "Paste again"; "Save N jobs".
3. On site (per job): address, time, property type, editing style.
   - If "Instruksjoner til fotograf" has text: highlighted note at the top. If empty: nothing.
   - Top tiles: KEYS (only if the job has keys: picked up / return reminder) and PLANTEGNING 2D (only if ordered: Not scanned / Scanned, "Mark scanned").
   - Counters for each ordered product, big −/+ buttons (e.g. Standard foto 0/20).
   - Detail photos picker: chips Fireplace, Kitchen tap, Window view, Door handle, Light fixture, Textiles, Bathroom tiles, + Other. States: not picked (grey), picked (outlined), shot (dark with ✓). Counter shot/picked. Remember custom chips for next time.
   - Room checklist from a template per property type (Leilighet, Enebolig, Rekkehus, etc.); tick each room; optional note per room; "+ Add room".
   - Buttons: "Drone check" (https://safetofly.no) and "Open in Maps" (Google Maps search for the address: https://www.google.com/maps/search/?api=1&query=<address>).
   - "Finish shoot" at the bottom.
4. Before you leave: only what's still open (counters below target, unticked rooms, picked-but-unshot details, floor plan not scanned, keys to return, rooms with notes). "Copy summary for agent" (plain text to clipboard), "Go back", "Finish anyway".

## Settings screen
- "Show Open weScan button" toggle, off by default. When on, the PLANTEGNING 2D tile shows "Open weScan" linking to: shortcuts://run-shortcut?name=Open%20weScan
- "Export backup" (downloads JSON) and "Import backup".
- History of finished jobs, with "Clear history" (asks first; deletes finished jobs only).

## Sun (sun.js)
- Golden hour start, sunset, blue hour for Oslo, Norway, calculated offline (no API). A small MIT-licensed sun library copied into the repo, or your own formula; credit it in README.
- If a job's time slot overlaps golden or blue hour, show a one-line tip on the job.

## Storage
- localStorage, every read/write in try/catch; render correctly when empty.

## PWA
- manifest.webmanifest: name "On Site", short_name "On Site", display "standalone", background and theme color #16202B, icons icons/icon-192.png and icons/icon-512.png.
- index.html: <link rel="apple-touch-icon" href="icons/apple-touch-icon.png">, apple-mobile-web-app-title "On Site".
- sw.js caches the app files for offline use; bump the cache version on each release.
- All paths relative, because the site lives at /on-site/ on GitHub Pages.

## README.md (plain language)
What On Site is, how to install on iPhone (Safari > Share > Add to Home Screen), how to use Paste tomorrow, the privacy rules, the live URL.
