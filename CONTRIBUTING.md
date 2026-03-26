# Contributing to OpenAnchor

## Branching

- Never commit directly to `master`.
- Create a feature branch for every change: `feature/<short-description>` or `fix/<short-description>`.
- Open a pull request into `master` and wait for CI to pass before merging.

## Pull Requests

- One logical change per PR.
- Keep the title concise and in the imperative mood: _"Add anchor alarm sound"_, not _"Added..."_.
- The screenshot CI workflow runs automatically on every PR — check the artifact to verify visual changes look correct.
- PR preview sites are automatically deployed for PWA changes to `https://hiosdra.github.io/OpenAnchor/<PR-number>/`.

## PWA (`/pwa`)

The PWA is vanilla JS — no build step, no npm dependencies for production, no bundler.

**Structure:**
```
pwa/
├── index.html              # Shell launcher
├── manifest.json
├── sw.js                   # Service Worker
├── js/                     # Testable JavaScript modules
├── tests/                  # Vitest unit tests
├── assets/                 # Icons
└── modules/
    ├── anchor/index.html   # Alert Kotwiczny
    ├── wachtownik/index.html # Wachtownik
    └── egzamin/            # Egzamin
```

**Running locally:**
```bash
npx http-server ./pwa -p 8080
# open http://localhost:8080
```

Opening `index.html` directly via `file://` will not work — service workers require HTTP/HTTPS.

**Testing:**
```bash
cd pwa
npm install                              # Install dev dependencies
npx playwright install chromium          # Install Playwright browser binaries (use --with-deps on Linux if needed)
npm test                                 # Run unit tests (Vitest)
npm run test:coverage                    # Generate coverage report
npm run test:e2e                         # Run E2E tests (Playwright)
```

**Service Worker cache:** Bump the cache version string in `sw.js` whenever you change cached assets.

**Adding a new module:**
1. Create `pwa/modules/<name>/index.html`.
2. Add a card in `pwa/index.html` pointing to `./modules/<name>/`.
3. Add a `← Menu` button linking back to `../../index.html`.
4. Update the SW cache list and `manifest.json` shortcuts.
5. Add unit tests in `pwa/tests/<name>.test.js` for business logic.

## Android (`/android`)

**Building:**
```bash
cd android
./gradlew build
```

**Testing:**
```bash
# Unit tests
./gradlew test

# Instrumented tests
./gradlew assembleDebugAndroidTest
./gradlew connectedDebugAndroidTest

# Code coverage
./gradlew testDebugUnitTest jacocoTestReport
```

See `android/README.md` for detailed architecture and features.

## Data Synchronization

When updating the exam question bank, both files must be kept in sync:
- `pwa/modules/egzamin/exam_questions.json`
- `android/app/src/main/assets/exam_questions.json`

## CI

All PRs trigger the following CI checks:

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy-pwa.yml` | push to `master` with changes in `pwa/**` | Deploys PWA to GitHub Pages |
| `deploy-pr-preview.yml` | pull request with changes in `pwa/**` | Deploys PR preview site |
| `screenshot.yml` | pull request | Captures Playwright screenshots (mobile + desktop) and uploads as artifact |
| `build.yml` | push / PR | Builds Android project (debug + release), Wear OS, generates code coverage |
| `e2e-pwa.yml` | push / PR with changes in `pwa/**` | Runs end-to-end tests for PWA with Playwright |
| `e2e-android.yml` | push / PR with changes in `android/**` | Runs instrumented tests on Android emulator |

## Commit messages

Follow the imperative, present-tense convention with an optional type prefix:

```
feat: add night vision mode to anchor alarm
fix: correct SW cache path for wachtownik module
ci: pin Playwright version
docs: update README structure
```
