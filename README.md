# OpenAnchor

OpenAnchor is a maritime superapp — a PWA hub-and-spoke shell with two modules, plus companion native Android apps.

Live PWA: **https://hiosdra.github.io/OpenAnchor/**

## Modules

| Module | Description |
|---|---|
| **Alert Kotwiczny** | Anchor alarm with GPS tracking, map visualisation (Leaflet), audio/vibration/browser notifications, night vision mode |
| **Wachtownik** | Maritime watch scheduler for yacht crews — generates watch schedules, PDF export, QR sharing (React + Babel, PL/EN) |

## Project Structure

```
OpenAnchor/
├── pwa/                          # Progressive Web App (deployed to GitHub Pages)
│   ├── index.html                # Shell launcher
│   ├── manifest.json
│   ├── sw.js                     # Service Worker (offline cache)
│   ├── assets/                   # Icons
│   └── modules/
│       ├── anchor/index.html     # Alert Kotwiczny
│       └── wachtownik/index.html # Wachtownik
├── android/                      # Native Android app + Wear OS companion
└── docs/                         # Protocol documentation
```

## Running locally

```bash
npx http-server ./pwa -p 8080
# open http://localhost:8080
```

> Opening `index.html` directly via `file://` will not work — service workers require HTTP/HTTPS.

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

## Android

```bash
cd android
./gradlew build
```

See [android/README.md](android/README.md) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
