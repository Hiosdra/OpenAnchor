# Anchor Alert Communication Protocol (iPad PWA <-> Android Native)

> **Protocol version:** 2.0
>
> This protocol is aligned with the OpenAnchor Android codebase. All data models, enum values,
> and field names match their Kotlin counterparts to allow direct (de)serialization.

## 1. Network Architecture

- **Transport layer:** WebSocket (WS) over a local Wi-Fi network.
- **Topology:**
  - **Android (WS Server):** Hosts a Wi-Fi hotspot (no cellular internet required). Runs a local WebSocket server on a configurable port (default `8080`). Located in the cabin, serving as the primary alarm pager.
  - **iPad / PWA (WS Client):** Connects to the Android hotspot, then opens a WebSocket connection. Located on the navigation table as the "master" device with a higher-accuracy GPS.

### 1.1. Connection Discovery

The Android device displays a QR code containing the full WebSocket URL after the hotspot and server are running. The URL format is:

```
ws://<hotspot_ip>:<port>
```

The hotspot IP depends on the Android version and hotspot mode (`startLocalOnlyHotspot` may assign a dynamic IP). The PWA must **not** hardcode any IP address -- it should always obtain the URL from the QR code.

### 1.2. Required Android Permissions

In addition to the existing app permissions, paired mode requires:

| Permission | Purpose |
|---|---|
| `CHANGE_WIFI_STATE` | Start/stop Wi-Fi hotspot |
| `ACCESS_WIFI_STATE` | Read hotspot IP address |
| `NEARBY_WIFI_DEVICES` (Android 13+) | Wi-Fi Direct / hotspot discovery |

### 1.3. Recommended WebSocket Library (Android)

The Android app currently uses OkHttp (client-only). For the server role, add one of:
- **Ktor Server** (`ktor-server-netty` + `ktor-server-websockets`) -- Kotlin-native, coroutine-friendly, fits the existing coroutine architecture.
- **Java-WebSocket** (`org.java-websocket:Java-WebSocket`) -- lightweight alternative.

## 2. Business Logic

### 2.1. Operational Modes

The Android app operates in one of two modes:

| Mode | GPS Behavior | Alarm Source | UI |
|---|---|---|---|
| **Standalone** | Continuous GPS (every `gpsIntervalSeconds`, default 3s). Android is the sole monitor. | Local `AlarmEngine` based on `ZoneCheckResult` | Shows own GPS data |
| **Paired** | Periodic fallback GPS (every ~10 min). iPad is the master monitor. | Primarily from PWA `TRIGGER_ALARM` messages; local verification as secondary check | Shows iPad telemetry + own verification status |

When a WebSocket connection is established and `FULL_SYNC` is received, Android switches to **Paired** mode. When the connection is lost (heartbeat timeout) or explicitly closed, Android either:
- Switches back to **Standalone** mode (if the anchor session is still active), OR
- Triggers a "Connection lost!" alarm and begins continuous GPS monitoring as a safety fallback.

### 2.2. Master-Slave with Verification

The iPad manages the application state (anchor position, zone geometry, alarm decisions). Android mirrors this state and displays it, but also has a **fallback GPS verification** capability.

### 2.3. First-Connect Sync

Immediately after the WebSocket connection is established, the iPad sends a full state snapshot (`FULL_SYNC`) containing all parameters needed for Android to reconstruct the zone geometry and begin monitoring. Android uses these parameters to:
1. Create an `AnchorZone` (either `Circle` or `SectorWithCircle`).
2. Render the radar/map view.
3. Know the alarm boundaries for local GPS verification.

### 2.4. Android GPS Verification (Paired Mode)

Android periodically activates its own GPS module (every ~10 minutes), obtains a fix, and calculates its distance to the anchor position received from the iPad.

> **Algorithm note:** The phone GPS in the cabin will have lower accuracy (e.g., ~15 m) and is physically located in a different part of the yacht than the iPad. Android should only raise a local verification alarm when:
>
> ```
> (android_distance - android_accuracy) > configured_anchor_radius
> ```
>
> This uses the same `GeoCalculations.distanceMeters()` and `GeoCalculations.checkZone()` functions
> that are used in Standalone mode.

The verification result is reported back to the iPad via `ANDROID_GPS_REPORT`.

### 2.5. Heartbeat

Both devices exchange heartbeat messages (`PING`) every **5 seconds**. If a device does not receive a heartbeat for **15 seconds**, it should:
- **Android:** Trigger a loud "Connection lost with navigation station!" alarm and switch to Standalone mode as a safety fallback.
- **iPad/PWA:** Display a "Connection lost with cabin alarm!" warning.

> **Note:** The heartbeat mechanism is separate from the Android GPS watchdog (which monitors local GPS signal loss with a 60-second timeout). Both mechanisms coexist independently:
> - **Heartbeat** = "Is the other device still connected?"
> - **GPS Watchdog** = "Is my own GPS hardware working?"

## 3. Message Format (JSON)

Every message sent over the WebSocket must be a JSON object containing at least a `type` field and a `timestamp` field.

```json
{
  "type": "<MESSAGE_TYPE>",
  "timestamp": 1708500000000,
  "payload": { ... }
}
```

### 3.1. Full Sync (PWA -> Android)

Sent immediately after the socket opens (`onopen`). Synchronizes Android with the current iPad state. Android uses this to construct an `AnchorZone` object and enter Paired mode.

```json
{
  "type": "FULL_SYNC",
  "timestamp": 1708500000000,
  "payload": {
    "isAnchored": true,
    "anchorPos": { "lat": 54.352, "lng": 18.646 },
    "zoneType": "SECTOR",
    "radiusMeters": 30,
    "bufferRadiusMeters": 50,
    "sector": {
      "bearingDeg": 180,
      "halfAngleDeg": 60,
      "radiusMeters": 80
    },
    "units": "m",
    "chainLengthM": 40,
    "depthM": 6
  }
}
```

| Field | Type | Required | Maps to | Description |
|-------|------|----------|---------|-------------|
| `payload.isAnchored` | `boolean` | Yes | `MonitorState.isActive` | Whether the anchor is currently deployed. `false` signals Android to stop monitoring. |
| `payload.anchorPos` | `object` | Yes | `AnchorZone.anchorPosition` | Anchor drop position (`lat`, `lng` in decimal degrees). |
| `payload.zoneType` | `string` | Yes | `ZoneType` enum | `"CIRCLE"` or `"SECTOR"`. Determines which `AnchorZone` subclass to create. |
| `payload.radiusMeters` | `number` | Yes | `AnchorZone.radiusMeters` | Primary safe zone radius in meters. |
| `payload.bufferRadiusMeters` | `number` | No | `AnchorZone.bufferRadiusMeters` | Outer buffer ring radius in meters. If omitted, no buffer zone (`CAUTION` state disabled). |
| `payload.sector` | `object` | If `zoneType == "SECTOR"` | `AnchorZone.SectorWithCircle` | Sector geometry. Required when `zoneType` is `"SECTOR"`, ignored otherwise. |
| `payload.sector.bearingDeg` | `number` | Yes | `SectorWithCircle.sectorBearingDeg` | Sector center bearing in degrees (0 = north, clockwise). |
| `payload.sector.halfAngleDeg` | `number` | Yes | `SectorWithCircle.sectorHalfAngleDeg` | **Half**-angle of the sector in degrees. E.g., `60` means a 120-degree total arc. |
| `payload.sector.radiusMeters` | `number` | Yes | `SectorWithCircle.sectorRadiusMeters` | Sector radius in meters (typically larger than `radiusMeters`). |
| `payload.units` | `string` | Yes | `DistanceUnit` | Display unit: `"m"`, `"ft"`, or `"nm"`. |
| `payload.chainLengthM` | `number` | No | `AnchorSession.chainLengthM` | Deployed chain length in meters. Informational. |
| `payload.depthM` | `number` | No | `AnchorSession.depthM` | Water depth at anchor in meters. Informational. |

**Sector geometry note:** The `sector.halfAngleDeg` field uses the **half-angle** convention to match the Android `SectorWithCircle` data class. A value of `60` means the sector spans 120 degrees total (60 degrees on each side of `bearingDeg`).

### 3.2. Telemetry Update (PWA -> Android)

Sent periodically from the iPad (every 2 seconds). Updates the real-time indicators on the Android display.

```json
{
  "type": "STATE_UPDATE",
  "timestamp": 1708500002000,
  "payload": {
    "currentPos": { "lat": 54.3521, "lng": 18.6462 },
    "gpsAccuracy": 4.5,
    "distanceToAnchor": 22.1,
    "alarmState": "SAFE",
    "sog": 0.2,
    "cog": 145,
    "batteryLevel": 0.85,
    "isCharging": true
  }
}
```

| Field | Type | Required | Maps to | Description |
|-------|------|----------|---------|-------------|
| `payload.currentPos` | `object` | Yes | `MonitorState.boatPosition` | Current yacht position (`lat`, `lng`). |
| `payload.gpsAccuracy` | `number` | Yes | `MonitorState.gpsAccuracyMeters` | GPS accuracy in meters. |
| `payload.distanceToAnchor` | `number` | Yes | `MonitorState.distanceToAnchor` | Distance from current position to anchor in meters. |
| `payload.alarmState` | `string` | Yes | `AlarmState` enum | Current alarm state on the iPad. One of: `"SAFE"`, `"CAUTION"`, `"WARNING"`, `"ALARM"`. |
| `payload.sog` | `number` | No | *(not yet in MonitorState)* | Speed over ground in knots. Future: add to `MonitorState`. |
| `payload.cog` | `number` | No | *(not yet in MonitorState)* | Course over ground in degrees. Future: add to `MonitorState`. |
| `payload.batteryLevel` | `number` | No | *(new field needed)* | iPad battery level (0.0 - 1.0). |
| `payload.isCharging` | `boolean` | No | *(new field needed)* | Whether the iPad is currently charging. |

> **Note:** Transmitting `batteryLevel` allows Android to wake the crew if the iPad on the navigation table stops charging and is about to die. When `batteryLevel < 0.1 && !isCharging`, Android should display a warning notification.

### 3.3. Alarms and Warnings (PWA -> Android)

Sent immediately when a triggering event occurs. Android should override phone silent mode and activate the alarm via `AlarmPlayer`.

```json
{
  "type": "TRIGGER_ALARM",
  "timestamp": 1708500045000,
  "payload": {
    "reason": "OUT_OF_ZONE",
    "message": "Yacht outside safe zone! (55m)",
    "alarmState": "ALARM"
  }
}
```

| Field | Type | Required | Maps to | Description |
|-------|------|----------|---------|-------------|
| `payload.reason` | `string` | Yes | -- | Alarm reason (see table below). |
| `payload.message` | `string` | Yes | -- | Human-readable alarm description for display. |
| `payload.alarmState` | `string` | Yes | `AlarmState` enum | Alarm severity. One of: `"CAUTION"`, `"WARNING"`, `"ALARM"`. |

**Alarm state behavior on Android:**

| `alarmState` | Android behavior | Matches |
|---|---|---|
| `"ALARM"` | Full siren at max volume + vibration + LED flash via `AlarmPlayer.startAlarm()` | `AlarmState.ALARM` |
| `"WARNING"` | Vibration only, high-priority notification | `AlarmState.WARNING` |
| `"CAUTION"` | Silent notification, visual indicator only | `AlarmState.CAUTION` |

**Alarm reasons:**

| Reason | Status | Description |
|---|---|---|
| `OUT_OF_ZONE` | **Implemented** | Yacht position is outside the safe zone (circle or sector + circle combined). Maps to `ZoneCheckResult.OUTSIDE`. |
| `SECTOR_EXIT` | **Planned** | Yacht exited the sector boundary specifically. Requires extending `GeoCalculations.checkZone()` to distinguish circle vs. sector exit. |
| `LOW_BATTERY` | **Planned** | iPad battery critically low. Requires battery monitoring on PWA side. |
| `CONNECTION_LOST` | **Android-local** | Not sent over WebSocket. Triggered locally by Android when heartbeat times out. |

> **Implementation note:** For the initial implementation, only `OUT_OF_ZONE` is supported. The PWA should send this reason whenever the iPad's `AlarmEngine` transitions to `WARNING` or `ALARM` state. Additional reasons can be added incrementally.

### 3.4. Android GPS Report (Android -> PWA) -- Optional

Android sends its fallback GPS verification result to the iPad. This allows the master display to show a second marker (e.g., "Phone in cabin") and cross-check positions.

```json
{
  "type": "ANDROID_GPS_REPORT",
  "timestamp": 1708500120000,
  "payload": {
    "pos": { "lat": 54.3523, "lng": 18.6464 },
    "accuracy": 12.0,
    "distanceToAnchor": 24.5,
    "zoneCheckResult": "INSIDE",
    "alarmState": "SAFE"
  }
}
```

| Field | Type | Required | Maps to | Description |
|-------|------|----------|---------|-------------|
| `payload.pos` | `object` | Yes | `Position` | Android GPS position (`lat`, `lng`). |
| `payload.accuracy` | `number` | Yes | `Position.accuracy` | GPS accuracy in meters. |
| `payload.distanceToAnchor` | `number` | Yes | -- | Computed distance to anchor using `GeoCalculations.distanceMeters()`. |
| `payload.zoneCheckResult` | `string` | Yes | `ZoneCheckResult` enum | `"INSIDE"`, `"BUFFER"`, or `"OUTSIDE"`. Result of `GeoCalculations.checkZone()`. |
| `payload.alarmState` | `string` | Yes | `AlarmState` enum | Android's local `AlarmEngine` state after processing the zone check. |

### 3.5. Remote Control (Android -> PWA)

When the crew hears an alarm in the cabin, they can control the iPad remotely from the phone.

```json
{
  "type": "ACTION_COMMAND",
  "timestamp": 1708500050000,
  "payload": {
    "command": "MUTE_ALARM"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.command` | `string` | Yes | Command to execute (see table below). |

**Available commands:**

| Command | Semantics | Android equivalent |
|---|---|---|
| `MUTE_ALARM` | Silence the alarm sound but **keep monitoring**. The alarm will re-trigger if a new violation occurs. | *(new -- needs `muteAlarm()` method that stops `AlarmPlayer` without resetting `AlarmEngine`)* |
| `DISMISS_ALARM` | Silence the alarm **and reset** the violation counter. The alarm will not re-trigger until the boat re-enters the safe zone and exits again. | `AnchorMonitorService.dismissAlarm()` (stops player + resets engine) |

> **Implementation note:** The current codebase only has `dismissAlarm()` which resets the `AlarmEngine`. A new `muteAlarm()` method should be added that calls `AlarmPlayer.stopAlarm()` without calling `AlarmEngine.reset()`.

### 3.6. Heartbeat (Bidirectional)

Safety-critical. Sent by both devices every **5 seconds**. Each received heartbeat must reset the local "last seen" timer.

```json
{
  "type": "PING",
  "timestamp": 1708500005000
}
```

**Timeout behavior:**

| Condition | Action |
|---|---|
| No `PING` received for **15 seconds** (Android) | Trigger "Connection lost!" alarm, switch to Standalone mode with continuous GPS |
| No `PING` received for **15 seconds** (iPad) | Display "Connection lost with cabin alarm!" warning |

This is independent from the Android GPS watchdog, which triggers `gpsSignalLost = true` after **60 seconds** without a local GPS fix.

### 3.7. Connection Closed (PWA -> Android) -- New

Sent when the iPad intentionally disconnects (e.g., user stops the session). Allows Android to cleanly transition back to Standalone mode instead of triggering a connection-loss alarm.

```json
{
  "type": "DISCONNECT",
  "timestamp": 1708500200000,
  "payload": {
    "reason": "SESSION_ENDED"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.reason` | `string` | Yes | `"SESSION_ENDED"` (anchor weighed) or `"USER_DISCONNECT"` (manual unpair). |

On receiving `DISCONNECT`:
- If `reason == "SESSION_ENDED"`: Android stops monitoring entirely.
- If `reason == "USER_DISCONNECT"`: Android switches to Standalone mode if the anchor is still deployed.

## 4. Data Exchange Sequence

### 4.1. Normal Flow (Paired Mode)

```
  iPad / PWA                                          Android
  ─────────                                          ───────
       │                                                 │
       │         [1] Start Hotspot + WS Server           │
       │              Display QR code with WS URL        │
       │                                                 │
       │  ──── [2] Scan QR, connect Wi-Fi + WS ────>    │
       │                                                 │
       │  ──── [3] FULL_SYNC ──────────────────────>     │
       │                                                 │
       │         [4] Create AnchorZone from payload,     │
       │              switch to Paired mode,             │
       │              render radar UI                    │
       │                                                 │
       │  ──── [5] STATE_UPDATE (every 2s) ────────>     │
       │                                                 │
       │  <─── [6] PING ──────────────────────────>      │
       │       (bidirectional, every 5s)                 │
       │                                                 │
       │         [7] Every ~10 min: activate GPS,        │
       │              run GeoCalculations.checkZone(),   │
       │              sleep GPS if OK                    │
       │                                                 │
       │  <─── [8] ANDROID_GPS_REPORT ─────────────      │
       │                                                 │
       │  ──── [9] TRIGGER_ALARM (OUT_OF_ZONE) ───>      │
       │                                                 │
       │         [10] AlarmPlayer.startAlarm(),          │
       │              vibrate, LED, max volume siren     │
       │                                                 │
       │  <─── [11] ACTION_COMMAND (MUTE_ALARM) ───      │
       │                                                 │
       │  [12] Silence local alarm                       │
       │                                                 │
```

### 4.2. Connection Loss Recovery

```
  iPad / PWA                                          Android
  ─────────                                          ───────
       │                                                 │
       │  ──── STATE_UPDATE ───────────────────────>     │
       │                                                 │
       │         ... Wi-Fi drops ...                     │
       │                                                 │
       │         [1] 15s without PING:                   │
       │              trigger "Connection lost!" alarm,  │
       │              switch to Standalone mode,         │
       │              start continuous GPS monitoring    │
       │                                                 │
       │         ... Wi-Fi recovers ...                  │
       │                                                 │
       │  ──── [2] Reconnect WS ───────────────────>     │
       │                                                 │
       │  ──── [3] FULL_SYNC ──────────────────────>     │
       │                                                 │
       │         [4] Dismiss connection-loss alarm,      │
       │              switch back to Paired mode         │
       │                                                 │
```

### 4.3. Graceful Disconnect

```
  iPad / PWA                                          Android
  ─────────                                          ───────
       │                                                 │
       │  ──── DISCONNECT (SESSION_ENDED) ─────────>     │
       │                                                 │
       │         [1] Stop monitoring,                    │
       │              close WS,                          │
       │              return to home screen              │
       │                                                 │
```

## 5. Implementation Checklist

Changes needed in the Android codebase to support this protocol:

### New Code

| Component | Description |
|---|---|
| `WebSocketServer` | WS server using Ktor or Java-WebSocket. Runs inside a foreground service. |
| `HotspotManager` | Manages Wi-Fi hotspot lifecycle, reads assigned IP, generates QR code data. |
| `ProtocolMessageParser` | JSON (de)serialization for all message types. Use Gson (already in deps). |
| `PairedModeManager` | Orchestrates the transition between Standalone and Paired mode. |
| `muteAlarm()` | New method in `AnchorMonitorService`: stops `AlarmPlayer` without resetting `AlarmEngine`. |

### Modified Code

| File | Change |
|---|---|
| `AnchorMonitorService.kt` | Add Paired mode branch: reduce GPS interval, process incoming `STATE_UPDATE` and `TRIGGER_ALARM`, manage heartbeat timer. |
| `MonitorState.kt` | Add fields: `isPairedMode`, `peerConnected`, `peerBatteryLevel`, `peerIsCharging`, `sog`, `cog`. |
| `AlarmEngine.kt` | Add method to accept external alarm state from PWA (bypass local zone checking in Paired mode). |
| `AndroidManifest.xml` | Add `CHANGE_WIFI_STATE`, `ACCESS_WIFI_STATE`, `NEARBY_WIFI_DEVICES` permissions. |
| `build.gradle.kts` | Add WebSocket server library dependency. |

### Not Yet Needed (Future)

| Feature | Protocol Field | Status |
|---|---|---|
| Sector-specific exit detection | `reason: "SECTOR_EXIT"` | Needs `GeoCalculations` extension |
| Battery monitoring | `reason: "LOW_BATTERY"` | Needs PWA-side implementation |
| SOG/COG display | `sog`, `cog` in `STATE_UPDATE` | Needs `MonitorState` + UI update |
