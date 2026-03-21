# PWA (Progressive Web App)

This directory contains the OpenAnchor Progressive Web App — a hub-and-spoke maritime superapp with three specialized modules, built with vanilla JavaScript and no build system.

## Overview

The PWA runs on any modern browser (iPad, desktop, mobile) and serves as a comprehensive maritime toolkit. It provides:

- **Alert Kotwiczny**: Anchor alarm with GPS tracking, zone monitoring, and WebSocket pairing
- **Wachtownik**: Crew watch scheduler with PDF export and QR sharing
- **Egzamin**: Maritime examination module with interactive quizzes

All modules are installable as Progressive Web Apps on any device with offline support, local notifications, and app-like experience.

## Modules

### 1. Alert Kotwiczny (Anchor Alarm)
**Location:** `modules/anchor/index.html`

The anchor alarm module serves as the **master** anchor monitoring device when paired with Android, or works standalone.

**Features:**
- Real-time GPS tracking via browser Geolocation API
- Anchor zone monitoring (circle or sector geometry)
- Drag detection with progressive alarm escalation (`SAFE` → `CAUTION` → `WARNING` → `ALARM`)
- WebSocket pairing with Android phone for redundant cabin alarm
- Visual and audio alarms when drifting outside safe zone
- Map visualization using Leaflet.js
- Track history with GPX export
- Sector-based monitoring (limit alarm to specific directions)
- Offset calculation for stern anchoring
- Chain length calculator
- AI-powered anchoring advisor (via Google Gemini API)
- Night vision mode for cockpit use
- Battery monitoring and reporting to paired Android device
- Speed over ground (SOG) and course over ground (COG) display
- Wake lock to keep screen on during monitoring

### 2. Wachtownik (Watch Scheduler)
**Location:** `modules/wachtownik/index.html`

Maritime watch scheduler for yacht crews with bilingual support (Polish/English).

**Features:**
- Crew rotation management
- Automatic watch schedule generation
- PDF export functionality
- QR code sharing for schedules
- State persistence via localStorage
- URL-based schedule sharing
- Built with React + Babel

### 3. Egzamin (Maritime Exam)
**Location:** `modules/egzamin/`

Interactive maritime examination module for Polish yacht sailor certifications (ŻJ/JSM).

**Features:**
- Question bank with images (`exam_questions.json`)
- Interactive quiz with image support
- Progress tracking and statistics
- Leitner spaced repetition system
- Learn mode with position persistence
- Category-based filtering
- localStorage persistence
- Responsive mobile layout

## Architecture

### Alert Kotwiczny (Anchor Module)

Everything is in a single `modules/anchor/index.html` file. No framework, no bundler — vanilla JavaScript with classes:

| Class | Responsibility |
|---|---|
| `GeoUtils` | Geodesic math (distance, bearing, sector polygon generation) |
| `AlertController` | Audio alarms, vibration, wake lock, battery monitoring, notifications |
| `MapController` | Leaflet map, boat/anchor/phone markers, safe zone rendering |
| `AIController` | Google Gemini API integration, weather data fetching |
| `SyncController` | WebSocket client -- protocol v2 communication with Android |
| `OnboardingController` | First-run tutorial overlay |
| `AnchorApp` | Main app state, GPS processing, zone checking, event binding |
| `UI` | Static helper for modals, dashboard, controls |

### PWA Shell

The main `index.html` serves as a hub-and-spoke launcher with:
- Module navigation cards with gradient styling
- Service Worker integration (`sw.js`) for offline support
- Web App Manifest for installability
- Responsive design for mobile, tablet, desktop
- Beta mode toggle for experimental features

### Testable Modules

Business logic has been refactored into testable ES6 modules in the `js/` directory:
- `dashboard.js` - Beta mode & settings management
- `sw-utils.js` - Service Worker utilities
- `exam-storage.js` - Exam progress & localStorage
- `leitner.js` - Spaced repetition algorithm
- `anchor-utils.js` - GPS calculations & alarm logic

These modules are tested with Vitest (149 tests, 96.52% coverage). See [tests/README.md](tests/README.md).

## Communication Protocol

The PWA communicates with the Android app over WebSocket using protocol v2.
See the [protocol documentation](../docs/protocol/README.md) for the full specification.

### Messages sent by PWA

| Message | Trigger |
|---|---|
| `FULL_SYNC` | On connect, anchor drop, radius/sector change |
| `STATE_UPDATE` | Every 2 seconds (position, alarmState, battery, SOG/COG) |
| `TRIGGER_ALARM` | Zone exit, drag detection, low battery, watch timer |
| `DISCONNECT` | Anchor lifted (`SESSION_ENDED`) or manual unpair (`USER_DISCONNECT`) |
| `PING` | Every 5 seconds (heartbeat) |

### Messages received by PWA

| Message | Action |
|---|---|
| `PING` | Resets heartbeat timeout (15s threshold) |
| `ACTION_COMMAND` (`MUTE_ALARM`) | Silences alarm, keeps monitoring |
| `ACTION_COMMAND` (`DISMISS_ALARM`) | Silences alarm and resets alarm state |
| `ANDROID_GPS_REPORT` | Shows phone position marker on map |

## Getting Started

### Running Locally

1. Navigate to the PWA directory:
```bash
cd pwa
```

2. Serve the files using a local web server:
```bash
# Using Python 3
python3 -m http.server 8000

# Or using Node.js http-server
npx http-server -p 8000
```

3. Open your browser and navigate to `http://localhost:8000`

**Note:** HTTPS is required for Geolocation API. When testing locally, localhost over HTTP is treated as a secure context by browsers.

### Installing as PWA

1. Open the app in a supported browser (Chrome, Edge, Safari on iOS 16.4+)
2. Look for the "Install" or "Add to Home Screen" option
3. Follow the prompts to install the app
4. Launch the app from your home screen or app drawer

### Pairing with Android

To pair with the Android app for redundant cabin alarm:
1. Tap the "Android" tool button in the PWA
2. Enter the WebSocket URL from the Android QR code

## GitHub Pages Deployment

The PWA is automatically deployed to GitHub Pages using GitHub Actions.

### Setup Requirements

1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Under "Build and deployment", set Source to "GitHub Actions"

2. **Automatic Deployment**:
   - The workflow runs automatically on push to `main` branch
   - Manual deployment can be triggered from Actions tab
   - Workflow file: `.github/workflows/deploy-pwa.yml`

3. **Access the Live App**:
   - URL: `https://hiosdra.github.io/OpenAnchor/`
   - Updates are deployed automatically within minutes of pushing to main

## File Structure

```
pwa/
├── index.html          # Shell launcher (hub-and-spoke)
├── manifest.json       # PWA manifest for installability
├── sw.js              # Service Worker for offline support
├── js/                # Testable JavaScript modules
│   ├── dashboard.js
│   ├── sw-utils.js
│   ├── exam-storage.js
│   ├── leitner.js
│   └── anchor-utils.js
├── tests/             # Vitest test suite
│   └── *.test.js      # 149 tests, 96.52% coverage
├── assets/            # Icons and images
└── modules/           # Three specialized modules
    ├── anchor/
    │   └── index.html # Alert Kotwiczny (anchor alarm)
    ├── wachtownik/
    │   └── index.html # Watch scheduler (React + Babel)
    └── egzamin/       # Maritime exam module
        ├── index.html
        ├── exam_questions.json
        └── exam_images/
```

## Technical Details

### Technologies Used
- **Leaflet.js**: Map visualization and GPS tracking (Alert Kotwiczny)
- **React + Babel**: UI framework (Wachtownik)
- **Tailwind CSS**: Styling and responsive design (all modules)
- **Lucide Icons**: Icon library
- **Marked.js**: Markdown rendering for AI responses
- **Service Worker API**: Offline functionality
- **Geolocation API**: GPS position tracking
- **Web Audio API**: Alarm sounds
- **Notification API**: Local notifications
- **Wake Lock API**: Keep screen on during monitoring
- **WebSocket API**: Real-time communication with Android

### Testing
- **Vitest**: Unit tests (149 tests, 96.52% coverage)
- **happy-dom**: DOM simulation for testing

### Browser Compatibility
- Chrome/Edge: Full support
- Safari (iOS 16.4+): Full support including installation
- Firefox: Full support (installation on Android)
- Opera: Full support

### PWA Features
- ✅ Offline support via Service Worker with runtime caching
- ✅ Installable as standalone app on mobile, tablet, desktop
- ✅ Responsive design across all devices
- ✅ Local notifications (Notification API)
- ✅ Background sync capability (Background Sync API)
- ✅ App-like experience with full-screen mode
- ✅ Wake lock support to prevent screen dimming
- ✅ WebSocket communication for real-time pairing

## Data Synchronization

The Egzamin module maintains synchronized exam question data between PWA and Android:
- **PWA**: `modules/egzamin/exam_questions.json`
- **Android**: `android/app/src/main/assets/exam_questions.json`

Both files must be kept in sync when updating the question bank.

## Future Enhancements

Planned improvements:
- Background geolocation tracking
- Battery optimization
- Multi-anchor support
- Weather integration
- AIS vessel tracking
- Tide and current data

## Development Notes

### Service Worker
The service worker (`sw.js`) implements:
- **Runtime Caching**: CDN assets (Tailwind, Leaflet, React, etc.) are cached on first use for offline functionality
- **Stale-While-Revalidate**: Serves cached content immediately while updating in the background
- **Cache Versioning**: Update the `CACHE_NAME` version when making changes that require cache refresh
- **Offline Fallback**: Graceful degradation when network is unavailable

### Manifest
The `manifest.json` file uses properly URL-encoded SVG data URLs for icons. The anchor emoji (⚓) is displayed on a dark background matching the app's theme.

### Adding a New Module

To add a new module to the PWA:

1. Create a new directory in `modules/<module-name>/`
2. Create `modules/<module-name>/index.html` with your module content
3. Add a "← Menu" button linking back to `../../index.html`
4. Update `pwa/index.html` to add a navigation card for your module
5. Update `sw.js` cache list with any assets your module needs
6. (Optional) Add shortcuts in `manifest.json`
7. (Optional) Add unit tests in `tests/<module-name>.test.js` for business logic

## Testing

### Unit Tests
```bash
cd pwa
npm install
npm test                # Run all tests
npm run test:ui         # Run tests with UI
npm run test:coverage   # Generate coverage report
```

See [tests/README.md](tests/README.md) for detailed test documentation.

## Support

For issues, feature requests, or contributions, please visit the main repository.
