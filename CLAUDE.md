# On Site — project rules

On Site is a web app (PWA) for a freelance real estate photographer's shoot days. It runs on an iPhone 15 Pro, installed from Safari with Add to Home Screen, and is hosted free on GitHub Pages.

## The owner
- A beginner. Explain what you did in plain language, no jargon. Define a technical term the first time you use it.
- Tests everything on the iPhone.

## Stack
- Plain HTML, CSS and JavaScript. No frameworks, no npm, no build step.
- Must keep working offline after first load (service worker).

## Privacy (strict — the repo is PUBLIC)
- Never commit real client data: no real addresses, names, phone numbers, emails or EFKT reference numbers.
- Test data (tests/) must be invented.
- All job data stays on the phone (localStorage). No servers, analytics or third-party calls with job data.
- The parser skips seller/agent names, phone numbers and emails.
- Never put API keys, passwords or tokens in the code.

## Design ("Light Plot")
- Background #F2F2EE, ink #16202B, accent #1F4E79, light accent #9FC3E6.
- Fonts: Archivo (text), IBM Plex Mono (small caps labels).
- Square corners, thin dividers. Every tap target at least 44×44 px. One-handed use.
- UI text in English; keep EFKT's own product words as written (Standard foto, Dronefoto, Kveldsfoto, Plantegning 2D).
- Icons are final and live in icons/ — do not redraw them.

## Workflow
- Before anything destructive (deleting files, force push, resetting history): explain what happens and how to undo it, and ask first.
- Commit with clear messages and push to main when a task is done.
- After each task: say what changed, how to test it on the iPhone, and the live URL.
- The full feature spec is in docs/SPEC.md.
