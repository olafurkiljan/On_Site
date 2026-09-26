# On Site

On Site is a small app for real estate shoot days. You paste the EFKT "Morgendagens oppdrag" email, and it turns it into a day plan. The plan has your jobs in time order, the key pickups, and the golden hour and blue hour times for Oslo. On each job you get photo counters, a detail-photo picker, a room checklist and a "Before you leave" check.

**Live app:** https://olafurkiljan.github.io/On_Site/

## Install it on your iPhone
1. Open the link above in **Safari**. It has to be Safari; other browsers can't install it.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Open On Site from its new icon. After the first open it also works with no signal.

## How to use Paste tomorrow
1. In Mail, open the "Morgendagens oppdrag" email. Select all the text and tap **Copy**.
2. In On Site, tap **Paste tomorrow**, then **Paste**. iPhone may ask to allow pasting; tap **Allow Paste**.
   - If that doesn't work, long-press the text box, choose **Paste**, then tap **Read text**.
3. Check the list. A red **CHECK** label means something is missing, for example the area. Tap a job to fix any field.
4. Tap **Save N jobs**. If you paste an EFKT number that is already saved, that job is updated, not copied twice. Your progress on it is kept.

## Privacy
- Everything you import stays **on your phone** (in the browser's local storage). Nothing is sent to a server, and there is no tracking.
- The importer **skips** the seller, the agent and the agent office: names, phone numbers and email addresses are never saved.
- This code is public on GitHub, so it must never contain real client data. The test email in `tests/` is invented.
- Use **Settings → Export backup** now and then. Deleting the app from your phone also deletes its data.

## Files
| File | What it does |
|---|---|
| `index.html` | The page the app lives in |
| `styles.css` | The look ("Light Plot") |
| `app.js` | The screens and buttons |
| `parser.js` | Reads the pasted EFKT email |
| `sun.js` | Works out golden hour, sunset and blue hour for Oslo |
| `sw.js` | Service worker: saves the app files so it works offline |
| `manifest.webmanifest` | Name, colours and icons for the Home Screen |
| `tests/parser.test.html` | Open it in a browser to test the parser against `tests/sample-email.txt` |

The parser test page is also online at https://olafurkiljan.github.io/On_Site/tests/parser.test.html

## Releasing a change
When you change any app file, raise the version in `sw.js` (`onsite-v1` → `onsite-v2`). That tells phones to fetch the new files. The update shows up the second time you open the app.

## Credits
- Sun times: our own code, based on the public-domain "sunrise equation" (https://en.wikipedia.org/wiki/Sunrise_equation). It needs no internet and no outside service.
- Fonts: Archivo and IBM Plex Mono from Google Fonts (SIL Open Font License).
