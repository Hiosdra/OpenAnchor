# Anchor Alert Communication Protocol (iPad PWA <-> Android Native)

## 1. Network Architecture

- **Transport layer:** WebSocket (WS) over a local Wi-Fi network.
- **Topology:**
  - **Android (WS Server):** Hosts a Wi-Fi hotspot (no cellular internet required). Runs a local WebSocket server on port `8080`. Located in the cabin, serving as the primary alarm pager.
  - **iPad / PWA (WS Client):** Connects to the Android hotspot, then opens a WebSocket connection (e.g., `ws://192.168.43.1:8080`). Located on the navigation table as the "master" device with a higher-accuracy GPS.

## 2. Business Logic

### 2.1. Master-Slave with Verification

The iPad manages the application state (anchor position, radius, sector). Android listens and mirrors the state, but also has a **fallback GPS verification** capability.

### 2.2. First-Connect Sync

Immediately after the WebSocket connection is established, the iPad sends a full state snapshot (`FULL_SYNC`) containing the anchor position, radius, sector settings, and other parameters. This allows Android to render its own radar view and know the alarm boundaries.

### 2.3. Android GPS Verification

Android periodically activates its own GPS module (e.g., every 10 minutes), obtains a fix, and calculates its distance to the anchor position received from the iPad.

> **Algorithm note:** The phone GPS in the cabin will have lower accuracy (e.g., ~15 m) and is physically located in a different part of the yacht than the iPad. Android should only raise a local verification alarm when:
>
> `(android_distance - android_accuracy) > configured_anchor_radius`

### 2.4. Heartbeat

The network on a yacht can be unreliable. Both devices must exchange heartbeat messages (`PING`) every **5 seconds**. If Android does not receive a heartbeat for **15 seconds**, it triggers a loud "Connection lost with navigation station!" alarm.

## 3. Message Format (JSON)

Every message sent over the WebSocket must be a JSON object containing at least a `type` field.

### 3.1. Full Sync (PWA -> Android)

Sent immediately after the socket opens (`onopen`). Synchronizes Android with the current iPad state.

```json
{
  "type": "FULL_SYNC",
  "timestamp": 1708500000000,
  "payload": {
    "isAnchored": true,
    "anchorPos": { "lat": 54.352, "lng": 18.646 },
    "radiusMeters": 50,
    "sector": {
      "enabled": true,
      "bearing": 180,
      "width": 90
    },
    "units": "m",
    "watchTimerActive": true
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"FULL_SYNC"` |
| `timestamp` | `number` | Unix timestamp in milliseconds |
| `payload.isAnchored` | `boolean` | Whether the anchor is currently deployed |
| `payload.anchorPos` | `object` | Anchor drop position (`lat`, `lng` in decimal degrees) |
| `payload.radiusMeters` | `number` | Safe zone radius in meters |
| `payload.sector.enabled` | `boolean` | Whether sector monitoring is active |
| `payload.sector.bearing` | `number` | Sector center bearing in degrees (0-360) |
| `payload.sector.width` | `number` | Sector arc width in degrees |
| `payload.units` | `string` | Display units (`"m"` or `"ft"`) |
| `payload.watchTimerActive` | `boolean` | Whether the watch timer is running |

### 3.2. Telemetry Update (PWA -> Android)

Sent periodically from the iPad (e.g., every 2 seconds). Updates the indicators on the Android display.

```json
{
  "type": "STATE_UPDATE",
  "timestamp": 1708500002000,
  "payload": {
    "currentPos": { "lat": 54.3521, "lng": 18.6462 },
    "gpsAccuracy": 4.5,
    "distanceToAnchor": 22.1,
    "sog": 0.2,
    "cog": 145,
    "batteryLevel": 0.85,
    "isCharging": true
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"STATE_UPDATE"` |
| `timestamp` | `number` | Unix timestamp in milliseconds |
| `payload.currentPos` | `object` | Current yacht position (`lat`, `lng`) |
| `payload.gpsAccuracy` | `number` | GPS accuracy in meters |
| `payload.distanceToAnchor` | `number` | Distance from current position to anchor in meters |
| `payload.sog` | `number` | Speed over ground in knots |
| `payload.cog` | `number` | Course over ground in degrees |
| `payload.batteryLevel` | `number` | iPad battery level (0.0 - 1.0) |
| `payload.isCharging` | `boolean` | Whether the iPad is currently charging |

> **Note:** Transmitting `batteryLevel` allows Android to wake the crew if the iPad on the navigation table stops charging and is about to die.

### 3.3. Alarms and Warnings (PWA -> Android)

Sent immediately when a triggering event occurs. Android should override phone silent mode and play the alarm at maximum volume.

```json
{
  "type": "TRIGGER_ALARM",
  "timestamp": 1708500045000,
  "payload": {
    "reason": "DRAG",
    "message": "Yacht outside safe zone! (55m)",
    "severity": "CRITICAL"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `payload.reason` | `string` | Alarm reason. One of: `OUT_OF_ZONE`, `SECTOR_EXIT`, `DRAG_WARNING`, `WATCH_TIMER`, `LOW_BATTERY` |
| `payload.message` | `string` | Human-readable alarm description |
| `payload.severity` | `string` | `"CRITICAL"` (full siren) or `"WARNING"` (vibration / beep only) |

### 3.4. Android GPS Report (Android -> PWA) -- Optional

Android verifies its position locally and may send a report back to the iPad. This allows the master display to show a second marker (e.g., "Phone in cabin").

```json
{
  "type": "ANDROID_GPS_REPORT",
  "timestamp": 1708500120000,
  "payload": {
    "lat": 54.3523,
    "lng": 18.6464,
    "accuracy": 12.0,
    "verificationStatus": "OK"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `payload.lat` | `number` | Android GPS latitude |
| `payload.lng` | `number` | Android GPS longitude |
| `payload.accuracy` | `number` | GPS accuracy in meters |
| `payload.verificationStatus` | `string` | `"OK"` if within safe zone, `"CONFLICT"` if Android believes the anchor is dragging |

### 3.5. Remote Control (Android -> PWA)

When the crew hears an alarm in the cabin and determines it is a false alarm (or has verified the situation), they can silence the iPad from the phone.

```json
{
  "type": "ACTION_COMMAND",
  "timestamp": 1708500050000,
  "payload": {
    "command": "MUTE_ALARM"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `payload.command` | `string` | Command to execute. One of: `MUTE_ALARM`, `ACKNOWLEDGE_WATCH` (resets the watch timer) |

### 3.6. Heartbeat (Bidirectional)

Safety-critical. Sent by both devices every 5 seconds. Each received heartbeat must reset the local "last seen" timer.

```json
{
  "type": "PING",
  "timestamp": 1708500005000
}
```

If no `PING` is received within **15 seconds**, the device should trigger a connection-loss alarm.

## 4. Data Exchange Sequence

```
  iPad / PWA                                          Android
  ─────────                                          ───────
       │                                                 │
       │         [1] Start Hotspot + WS Server           │
       │              (ws://192.168.43.1:8080)           │
       │              Display QR code                    │
       │                                                 │
       │  ──── [2] Scan QR, connect Wi-Fi + WS ────>    │
       │                                                 │
       │  ──── [3] FULL_SYNC ──────────────────────>     │
       │                                                 │
       │         [4] Store anchor pos & radius,          │
       │              render UI                          │
       │                                                 │
       │  ──── [5] STATE_UPDATE (every 2s) ────────>     │
       │                                                 │
       │  <─── [6] PING (every 5s) ───────────────>      │
       │                                                 │
       │         [7] Every ~10 min: activate GPS,        │
       │              compute distance to anchor,        │
       │              sleep GPS if OK                    │
       │                                                 │
       │  ──── [8] TRIGGER_ALARM (zone exit) ──────>     │
       │                                                 │
       │         [9] Vibrate, flash LED,                 │
       │              play siren at max volume           │
       │                                                 │
       │  <─── [10] ACTION_COMMAND (MUTE_ALARM) ────     │
       │                                                 │
       │  [11] Silence local alarm                       │
       │                                                 │
```

### Sequence Steps

1. **Android** starts the Wi-Fi hotspot and WebSocket server. Displays a QR code for easy connection.
2. **iPad** scans the QR code, joins the Wi-Fi network, and establishes a WebSocket connection.
3. **iPad** immediately sends `FULL_SYNC` with the current anchor state.
4. **Android** persists the anchor position and radius in local memory and renders its UI.
5. **iPad** sends `STATE_UPDATE` every 2 seconds with current telemetry.
6. **Both** exchange `PING` heartbeats every 5 seconds.
7. **Android** activates its native GPS every ~10 minutes, obtains a fix, computes its own distance to the anchor, and sleeps the GPS if everything is within limits.
8. **iPad** detects the yacht has left the safe zone and sends `TRIGGER_ALARM`.
9. **Android** receives the alarm and activates vibration, LED flash, and maximum-volume siren.
10. **Android** user taps "Mute" in the cabin and sends `ACTION_COMMAND` with `MUTE_ALARM`.
11. **iPad** receives the command and silences its own alarm on the navigation table.
