# PWA (Progressive Web App)

This directory contains the iPad/browser anchor alarm PWA -- a single `index.html` file with no build system.

## Overview

The PWA runs on an iPad (or any modern browser) and serves as the **master** anchor monitoring device.
It provides:

- Real-time GPS tracking via the browser Geolocation API
- Anchor zone monitoring (circle or sector geometry)
- Drag detection with progressive alarm escalation (`SAFE` -> `CAUTION` -> `WARNING` -> `ALARM`)
- WebSocket pairing with an Android phone for redundant cabin alarm
- Watch timer and crew schedule management
- AI-powered anchoring advisor (via Google Gemini API)
- GPX track export and position sharing
- Night mode for cockpit use

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

1. Serve the `pwa/` directory over HTTPS (required for Geolocation API)
2. Open `index.html` on an iPad or browser
3. Grant GPS permission when prompted
4. To pair with Android: tap the "Android" tool button and enter the WebSocket URL from the Android QR code
