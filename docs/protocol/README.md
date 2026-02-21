# Communication Protocol

This folder contains the specification for the WebSocket-based communication protocol used between the **iPad PWA** (master navigation station) and the **Android native app** (cabin alarm pager).

> **Protocol version:** 2.0 -- aligned with the Android codebase data models and enums.

## Contents

| File | Description |
|------|-------------|
| [protocol.md](protocol.md) | Full protocol specification -- network architecture, message format, business logic, sequence diagrams, and implementation checklist |

## Quick Summary

OpenAnchor uses a local Wi-Fi network (Android hotspot) with a WebSocket server to enable real-time communication between two devices on a yacht:

- **iPad / PWA (Client)** -- sits on the navigation table with a high-accuracy GPS. Acts as the master device that manages anchor state, monitors position, and triggers alarms.
- **Android (Server)** -- stays in the cabin as a loud alarm pager. Runs its own fallback GPS verification and alerts the crew if the anchor drags or the connection is lost.

### Operational Modes

The Android app supports two modes:

| Mode | Description |
|---|---|
| **Standalone** | Android monitors its own GPS continuously (default, current behavior). |
| **Paired** | iPad is the master. Android displays iPad telemetry and only runs periodic fallback GPS verification (~10 min). Entered when a `FULL_SYNC` is received over WebSocket. |

### Key Design Principles

1. **Master-slave with fallback** -- iPad controls state; Android independently verifies via its own GPS.
2. **Full sync on connect** -- iPad sends a complete state snapshot immediately after the WebSocket connection opens.
3. **Heartbeat monitoring** -- Both devices exchange pings every 5 seconds. A 15-second silence triggers a connection-loss alarm and fallback to Standalone mode.
4. **Battery awareness** -- iPad reports its battery level so Android can warn the crew before it dies.
5. **Graceful disconnect** -- A `DISCONNECT` message allows clean transitions without false connection-loss alarms.

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `FULL_SYNC` | PWA -> Android | Initial state synchronization (zone geometry, anchor position) |
| `STATE_UPDATE` | PWA -> Android | Periodic telemetry (position, alarm state, speed, battery) |
| `TRIGGER_ALARM` | PWA -> Android | Alarm event with 4-level severity (`CAUTION`/`WARNING`/`ALARM`) |
| `ANDROID_GPS_REPORT` | Android -> PWA | Fallback GPS verification result with zone check |
| `ACTION_COMMAND` | Android -> PWA | Remote control (`MUTE_ALARM`, `DISMISS_ALARM`) |
| `PING` | Bidirectional | Heartbeat / keep-alive |
| `DISCONNECT` | PWA -> Android | Graceful session end or unpair |

### Codebase Alignment

All protocol fields map directly to existing Kotlin data classes and enums:

| Protocol Concept | Kotlin Type |
|---|---|
| Alarm severity | `AlarmState` enum (`SAFE`, `CAUTION`, `WARNING`, `ALARM`) |
| Zone geometry | `AnchorZone` sealed class (`Circle`, `SectorWithCircle`) |
| Zone type | `ZoneType` enum (`CIRCLE`, `SECTOR`) |
| Zone check result | `ZoneCheckResult` enum (`INSIDE`, `BUFFER`, `OUTSIDE`) |
| Position | `Position` data class (`latitude`, `longitude`, `accuracy`, `timestamp`) |
| Display units | `DistanceUnit` enum (`METERS`, `NAUTICAL_MILES`, `FEET`) |

See [protocol.md](protocol.md) for the full specification.
