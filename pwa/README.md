# PWA (Progressive Web App)

This directory contains the iPad/browser anchor alarm PWA -- a single `index.html` file with no build system.

## Overview

The PWA runs on an iPad (or any modern browser) and serves as the **master** anchor monitoring device. It can be installed as a Progressive Web App on any device and provides:

- Real-time GPS tracking via the browser Geolocation API
- Anchor zone monitoring (circle or sector geometry)
- Drag detection with progressive alarm escalation (`SAFE` -> `CAUTION` -> `WARNING` -> `ALARM`)
- WebSocket pairing with an Android phone for redundant cabin alarm
- Watch timer and crew schedule management
- AI-powered anchoring advisor (via Google Gemini API)
- GPX track export and position sharing
- Night mode for cockpit use

## Features

### Core Functionality
- Set anchor position and monitoring radius
- Real-time GPS position tracking
- Visual and audio alarms when drifting outside safe zone
- Track history with GPX export
- Sector-based monitoring (limit alarm to specific directions)
- Offset calculation for stern anchoring
- Chain length calculator

### PWA Capabilities
- **Service Worker**: Provides offline caching and background notifications
- **Web App Manifest**: Makes the app installable on home screen
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Browser Notifications**: Local notifications for alarms
## Architecture

Everything is in a single `index.html` file. No framework, no bundler -- vanilla JavaScript with classes:

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
├── index.html          # Main application file (single-page app)
├── manifest.json       # PWA manifest for installability
├── sw.js              # Service Worker for offline support
└── README.md          # This file
```

## Technical Details

### Technologies Used
- **Leaflet.js**: Map visualization and GPS tracking
- **Tailwind CSS**: Styling and responsive design
- **Lucide Icons**: Icon library
- **Marked.js**: Markdown rendering for AI responses
- **Service Worker API**: Offline functionality
- **Geolocation API**: GPS position tracking
- **Web Audio API**: Alarm sounds
- **Notification API**: Local notifications
- **Wake Lock API**: Keep screen on during monitoring

### Browser Compatibility
- Chrome/Edge: Full support
- Safari (iOS 16.4+): Full support including installation
- Firefox: Full support (installation on Android)
- Opera: Full support

### PWA Features
- ✅ Offline support via Service Worker with runtime caching
- ✅ Installable as standalone app
- ✅ Responsive design
- ✅ Local notifications (Notification API)
- ✅ Background sync capability (Background Sync API)
- ✅ App-like experience

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
- **Runtime Caching**: CDN assets (Tailwind, Leaflet, etc.) are cached on first use for offline functionality
- **Stale-While-Revalidate**: Serves cached content immediately while updating in the background
- **Background Sync**: Syncs position data when connection is restored (requires app integration)
- **Periodic Sync**: Can periodically check anchor position in the background (Chrome-only feature)

Update the `CACHE_NAME` version when making changes that require cache refresh.

### Manifest
The `manifest.json` file uses properly URL-encoded SVG data URLs for icons. The anchor emoji (⚓) is displayed on a dark background matching the app's theme.

## Support

For issues, feature requests, or contributions, please visit the main repository.
