# OpenAnchor

OpenAnchor is a maritime superapp — a PWA hub-and-spoke shell with three modules, plus companion native Android apps and Wear OS support.

Live PWA: **https://hiosdra.github.io/OpenAnchor/**

## Modules

| Module | Description |
|---|---|
| **Alert Kotwiczny** | Anchor alarm with GPS tracking, map visualisation (Leaflet), audio/vibration/browser notifications, night vision mode, WebSocket pairing with Android for redundant cabin alarm |
| **Wachtownik** | Maritime watch scheduler for yacht crews — generates watch schedules, PDF export, QR sharing (React + Babel, PL/EN) |
| **Egzamin** | Maritime examination module (ŻJ/JSM) with Learn, Exam (45 min timed), and Leitner spaced-repetition modes. Questions rendered from user-imported PDF — no copyrighted content bundled |

## Project Structure

```
OpenAnchor/
├── pwa/                          # Progressive Web App (deployed to GitHub Pages)
│   ├── index.html                # Shell launcher
│   ├── manifest.json
│   ├── sw.js                     # Service Worker (offline cache)
│   ├── js/                       # Testable JavaScript modules
│   ├── tests/                    # Vitest test suite (149 tests, 96.52% coverage)
│   ├── assets/                   # Icons
│   └── modules/
│       ├── anchor/index.html     # Alert Kotwiczny
│       ├── wachtownik/index.html # Wachtownik
│       └── egzamin/              # Egzamin (exam module)
│           ├── index.html
│           └── exam_questions.json  # Question metadata (no copyrighted content)
├── android/                      # Native Android app + Wear OS companion
│   ├── app/                      # Main mobile application (Jetpack Compose)
│   └── wear/                     # Wear OS companion app
└── docs/                         # Protocol documentation
    └── protocol/                 # WebSocket protocol v2 specification
```

## Running locally

```bash
npx http-server ./pwa -p 8080
# open http://localhost:8080
```

> Opening `index.html` directly via `file://` will not work — service workers require HTTP/HTTPS.

## Moduł Egzaminacyjny (Exam Module)

The exam module does **not** bundle any copyrighted question content. Users must import their own legally-obtained PDF with the exam question bank.

### How it works
1. Open the Egzamin module from the main menu
2. On first use, you'll see an import screen — select your PDF file
3. The app verifies the file with a SHA-256 checksum (warning if mismatch, non-blocking)
4. The PDF is stored **locally on your device** (IndexedDB on web, Internal Storage on Android) and persists through app updates
5. Questions are rendered directly from the imported PDF

### Quiz modes
- **Nauka** — Browse all questions with immediate answer feedback
- **Egzamin** — Timed 45-minute exam simulation (30 random questions)
- **Leitner** — Spaced repetition system with 5 boxes for long-term learning

### Data storage
- `exam_questions.json` contains only metadata (question ID, category, correct answer, PDF page coordinates) — no copyrighted content
- The imported PDF never leaves the device and is never uploaded or distributed

## CI / Deploy

| Workflow | Trigger | Action |
|---|---|---|
| `deploy-pwa.yml` | push to `master` (`pwa/**`) | Deploy to GitHub Pages (production) |
| `deploy-pr-preview.yml` | pull request (`pwa/**`) | Deploy PR preview to `https://hiosdra.github.io/OpenAnchor/<PR-number>/` |
| `screenshot.yml` | pull request | Playwright screenshots (mobile + desktop) → artifact + PR comment |
| `build.yml` | push / PR | Android build |

### PR Preview Sites

When a pull request is opened that modifies files in the `pwa/` directory, a preview site is automatically deployed to:

```
https://hiosdra.github.io/OpenAnchor/<PR-number>/
```

For example:
- PR #27 → https://hiosdra.github.io/OpenAnchor/27/
- PR #28 → https://hiosdra.github.io/OpenAnchor/28/

The preview site updates automatically when new commits are pushed to the PR and is cleaned up when the PR is closed.

**Note:** PR previews are only deployed for pull requests from the same repository, not from forks (for security reasons).

## Android

The Android app provides native mobile functionality with advanced features:

### Key Features
- **Standalone Mode**: Independent GPS monitoring with local alarms
- **Paired Mode**: Master-slave architecture with iPad PWA via WebSocket
- **Client Mode**: Android-to-Android WiFi-based redundancy
- **Wear OS Integration**: Companion app for smartwatches
- **Drift Detection**: Advanced drift analysis (Faza 4.5)
- **Battery Awareness**: Low battery warnings between paired devices
- **Offline Operation**: Full functionality without internet connection
- **Crew Watch Management**: Watch schedule generation and tracking
- **AI Advisor**: Anchoring recommendations powered by AI

### Building

```bash
cd android
./gradlew build
```

### Running

```bash
cd android
./gradlew installDebug
```

See [android/README.md](android/README.md) for detailed architecture and features.

## Testing

### PWA Tests
```bash
cd pwa
npm install
npm test                # Run unit tests (Vitest)
npm run test:coverage   # Generate coverage report
```

### Android Tests
```bash
cd android
./gradlew test                      # Run unit tests
./gradlew assembleDebugAndroidTest  # Build instrumented tests
```

See [pwa/tests/README.md](pwa/tests/README.md) for PWA test documentation.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
