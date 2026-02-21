# Communication Protocol

This folder contains the specification for the WebSocket-based communication protocol used between the **iPad PWA** (master navigation station) and the **Android native app** (cabin alarm pager).

## Contents

| File | Description |
|------|-------------|
| [protocol.md](protocol.md) | Full protocol specification -- network architecture, message format, business logic, and sequence diagrams |

## Quick Summary

OpenAnchor uses a local Wi-Fi network (Android hotspot) with a WebSocket server to enable real-time communication between two devices on a yacht:

- **iPad / PWA (Client)** -- sits on the navigation table with a high-accuracy GPS. Acts as the master device that manages anchor state, monitors position, and triggers alarms.
- **Android (Server)** -- stays in the cabin as a loud alarm pager. Runs its own fallback GPS verification and alerts the crew if the anchor drags or the connection is lost.

### Key Design Principles

1. **Master-slave with fallback** -- iPad controls state; Android independently verifies via its own GPS.
2. **Full sync on connect** -- iPad sends a complete state snapshot immediately after the WebSocket connection opens.
3. **Heartbeat monitoring** -- Both devices exchange pings every 5 seconds. A 15-second silence triggers a connection-loss alarm.
4. **Battery awareness** -- iPad reports its battery level so Android can warn the crew before it dies.

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `FULL_SYNC` | PWA -> Android | Initial state synchronization |
| `STATE_UPDATE` | PWA -> Android | Periodic telemetry (position, speed, battery) |
| `TRIGGER_ALARM` | PWA -> Android | Alarm event (drag, zone exit, low battery, etc.) |
| `ANDROID_GPS_REPORT` | Android -> PWA | Fallback GPS verification result |
| `ACTION_COMMAND` | Android -> PWA | Remote control (mute alarm, acknowledge watch) |
| `PING` | Bidirectional | Heartbeat / keep-alive |

See [protocol.md](protocol.md) for the full specification including JSON schemas and the data exchange sequence.
