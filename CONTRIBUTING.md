# Contributing to OpenAnchor

## Branching

- Never commit directly to `master`.
- Create a feature branch for every change: `feature/<short-description>` or `fix/<short-description>`.
- Open a pull request into `master` and wait for CI to pass before merging.

## Pull Requests

- One logical change per PR.
- Keep the title concise and in the imperative mood: _"Add anchor alarm sound"_, not _"Added..."_.
- The screenshot CI workflow runs automatically on every PR — check the artifact to verify visual changes look correct.

## PWA (`/pwa`)

The PWA is vanilla JS — no build step, no npm, no bundler.

**Structure:**
```
pwa/
├── index.html              # Shell launcher
├── manifest.json
├── sw.js                   # Service Worker
├── assets/                 # Icons
└── modules/
    ├── anchor/index.html   # Alert Kotwiczny
    └── wachtownik/index.html
```

**Running locally:**
```bash
npx http-server ./pwa -p 8080
# open http://localhost:8080
```

Opening `index.html` directly via `file://` will not work — service workers require HTTP/HTTPS.

**Service Worker cache:** bump the cache version string in `sw.js` whenever you change cached assets.

**Adding a new module:**
1. Create `pwa/modules/<name>/index.html`.
2. Add a card in `pwa/index.html` pointing to `./modules/<name>/`.
3. Add a `← Menu` button linking back to `../../index.html`.
4. Update the SW cache list and `manifest.json` shortcuts.

## Android (`/android`)

```bash
cd android
./gradlew build
```

See `android/README.md` for details.

## CI

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy-pwa.yml` | push to `master` with changes in `pwa/**` | Deploys PWA to GitHub Pages |
| `screenshot.yml` | pull request | Captures Playwright screenshots (mobile + desktop) and uploads as artifact |
| `build.yml` | push / PR | Builds Android project |

## Commit messages

Follow the imperative, present-tense convention with an optional type prefix:

```
feat: add night vision mode to anchor alarm
fix: correct SW cache path for wachtownik module
ci: pin Playwright version
docs: update README structure
```
