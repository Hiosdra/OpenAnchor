# OpenAnchor Android

Native Android application for OpenAnchor maritime monitoring, including both mobile and Wear OS companion apps.

## Overview

The Android app provides comprehensive anchor monitoring with three operational modes:

- **Standalone Mode**: Independent GPS monitoring with local alarms
- **Paired Mode**: Master-slave architecture with iPad PWA via WebSocket (iPad is master)
- **Client Mode**: Android-to-Android WiFi-based redundancy

## Project Structure

```
android/
├── app/                        # Main mobile application
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/hiosdra/openanchor/
│   │   │   │   ├── domain/    # Business logic & models
│   │   │   │   ├── data/      # Data sources & repositories
│   │   │   │   ├── service/   # Background services
│   │   │   │   ├── ui/        # Jetpack Compose screens
│   │   │   │   └── di/        # Dependency injection (Hilt)
│   │   │   └── assets/
│   │   │       └── exam_questions.json  # Synced with PWA
│   │   ├── test/              # Unit tests
│   │   └── androidTest/       # Instrumented tests
│   └── build.gradle.kts
└── wear/                       # Wear OS companion app
    ├── src/main/java/com/hiosdra/openanchor/
    │   ├── AnchorDataListenerService.kt
    │   ├── WearMonitorScreen.kt
    │   └── WearMainActivity.kt
    └── build.gradle.kts
```

## Features

### Core Anchor Monitoring

- **Real-time GPS Tracking**: Continuous position monitoring with 60-second watchdog timeout
- **Zone Checking**: Circle and sector-based anchor zones
- **Alarm States**: Progressive escalation (SAFE → CAUTION → WARNING → ALARM)
- **Drift Detection**: Advanced drift analysis (Faza 4.5) with DriftAnalysis model
- **Visual Monitoring**: Radar view and map display
- **Audio Alarms**: Override system silent mode for critical alerts
- **Foreground Service**: Persistent monitoring with notification
- **Battery Awareness**: Battery level monitoring and low battery warnings

### Operational Modes

#### 1. Standalone Mode
- Independent GPS monitoring every 3 seconds
- Local alarm triggering based on zone violations
- No network connection required
- Full-featured anchor monitoring

#### 2. Paired Mode (with iPad PWA)
- iPad acts as master monitoring device
- Android provides redundant cabin alarm
- Fallback GPS verification every ~10 minutes
- WebSocket communication (protocol v2)
- QR code discovery for easy pairing
- Android creates WiFi hotspot for connection
- Heartbeat monitoring (5s intervals, 15s timeout)
- Connection loss detection with alarms
- Battery status reporting to paired device

#### 3. Client Mode
- Connect to another Android device for redundancy
- WiFi-based communication
- Similar to paired mode but Android-to-Android

### Advanced Features

- **Wear OS Integration**: Real-time data sync to smartwatch companion app
- **Crew Watch Management**: Watch schedule generation and tracking
- **AI Advisor**: Anchoring recommendations powered by AI
- **Maritime Exam**: Interactive quiz module (ŻJ/JSM) synced with PWA
- **Session History**: SQLite database for session tracking and analysis
- **GPS Accuracy**: Visual accuracy indicators and reliability checks
- **Compass Support**: Heading data integration
- **Weather Integration**: Weather data display and advisories
- **Digital Logbook**: Comprehensive logging of anchoring sessions
- **Navigation**: Routing and navigation features

## Architecture

### Domain Layer

**Models:**
- `AnchorZone` (Circle, SectorWithCircle)
- `AlarmState` (SAFE, CAUTION, WARNING, ALARM)
- `Position` (latitude, longitude, accuracy)
- `ZoneCheckResult`
- `AnchorSession`
- `DriftAnalysis` (Faza 4.5)

**Business Logic:**
- `GeoCalculations`: Distance, bearing, zone containment checks
- `Catenary`: Anchor chain physics calculations
- `DriftDetector`: Drift pattern analysis

### Data Layer

**Providers:**
- `LocationProvider`: GPS with watchdog timeout
- `BatteryProvider`: Battery level and charging status
- `PreferencesManager`: User settings persistence

**Repositories:**
- `AnchorSessionRepository`: SQLite session storage

**Network:**
- `WebSocketServer`: Hotspot server for iPad pairing
- `WebSocketClient`: Client mode for Android-to-Android
- `HotspotManager`: WiFi hotspot management
- `PairedModeManager`: Pairing state and heartbeat logic

### Service Layer

**AnchorMonitorService:**
- Core foreground service
- GPS tracking coordination
- Alarm engine management
- WebSocket server/client lifecycle
- Wear OS data synchronization

**AlarmEngine:**
- Zone checking state machine
- Alarm state transitions
- Alarm triggering logic

**AlarmPlayer:**
- Audio alarm playback
- Override system silent mode
- Volume management

**CrewWatchManager:**
- Watch schedule calculations
- Crew rotation logic

**WearDataSender:**
- Wear OS Data Layer API communication
- Real-time status updates to watch

### UI Layer (Jetpack Compose)

**Screens:**
- `HomeScreen`: Main dashboard
- `MonitorScreen`: Real-time monitoring radar/map
- `SetupScreen`: Initial anchor configuration
- `PairingScreen`: QR code generation and scanning for PWA pairing
- `PairedScreen`: Paired mode display with PWA telemetry
- `NavigationScreen`: Navigation and routing
- `AdvisorScreen`: AI-powered anchoring advisor
- `CrewWatchScreen`: Watch schedule management
- `ExamScreen`: Examination module
- `HistoryScreen`: Session history and statistics
- `HistoryDetailScreen`: Detailed session analysis
- `LogbookScreen`: Digital logbook
- `WeatherScreen`: Weather information
- `SettingsScreen`: App configuration
- `ClientScreen`: Client mode for connecting to another Android

## Communication Protocol

The Android app communicates with the iPad PWA using WebSocket protocol v2.

See [../docs/protocol/README.md](../docs/protocol/README.md) for the full specification.

### Network Architecture
- Android acts as WebSocket server with WiFi hotspot
- iPad acts as WebSocket client
- QR code contains WebSocket URL for discovery
- Local network (no cellular internet required)

### Message Types

1. **FULL_SYNC** - Initial state synchronization
2. **STATE_UPDATE** - Periodic telemetry (every 2s)
3. **TRIGGER_ALARM** - Alarm events with severity
4. **ANDROID_GPS_REPORT** - Fallback GPS verification result
5. **ACTION_COMMAND** - Remote control (MUTE_ALARM, DISMISS_ALARM)
6. **PING** - Heartbeat (bidirectional, every 5s, 15s timeout)
7. **DISCONNECT** - Graceful session end

### Alarm Severity Levels

- **CAUTION**: Silent notification
- **WARNING**: Vibration + high-priority notification
- **ALARM**: Full siren + vibration + LED flash

## Building

### Prerequisites
- Android Studio Hedgehog or later
- JDK 17
- Android SDK API 36

### Build Commands

```bash
cd android

# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Build all variants
./gradlew build
```

## Running

### On Physical Device

```bash
# Install debug build
./gradlew installDebug

# Launch app (optional - can also launch from device)
adb shell am start -n com.hiosdra.openanchor/.MainActivity
```

### On Emulator

1. Create an AVD in Android Studio with:
   - API Level 34 (Android 14) or higher
   - Google APIs (for GPS simulation)
   - x86_64 architecture

2. Run the app:
```bash
./gradlew installDebug
```

3. Simulate GPS location in AVD:
   - Extended Controls → Location
   - Enter coordinates or load GPX file

## Testing

### Unit Tests

```bash
# Run unit tests
./gradlew test

# Run unit tests with coverage
./gradlew testDebugUnitTest jacocoTestReport
```

### Instrumented Tests

```bash
# Build test APK
./gradlew assembleDebugAndroidTest

# Run instrumented tests
./gradlew connectedAndroidTest
```

The app uses the standard `AndroidJUnitRunner` for instrumented tests.

### Test Infrastructure

- **Unit Tests**: JUnit, MockK, `java.time.Clock` for time operations
- **Instrumented Tests**: Compose UI Testing, AndroidJUnitRunner

## Data Synchronization

The Egzamin (exam) module maintains synchronized question data between Android and PWA:

- **Android**: `android/app/src/main/assets/exam_questions.json`
- **PWA**: `pwa/modules/egzamin/exam_questions.json`

Both files must be kept in sync when updating the question bank.

## Wear OS Companion

The Wear OS app provides real-time anchor monitoring on smartwatches.

### Features
- Real-time position display
- Alarm state indicators
- Distance to anchor
- Battery level
- GPS accuracy

### Communication
- Uses Wear OS Data Layer API
- Automatic synchronization with phone app
- No manual pairing required

### Building Wear OS App

```bash
cd android
./gradlew :wear:assembleDebug
```

## Dependency Injection

The app uses Hilt (Dagger) for dependency injection.

**Key Modules:**
- `AppModule`: Provides `Clock.systemDefaultZone()` for time operations
- Use `java.time.Clock` instead of `System.currentTimeMillis()` for testability

## Development Guidelines

### Time Operations

Always use `java.time.Clock` for time operations instead of `System.currentTimeMillis()` or custom interfaces:

```kotlin
@Inject lateinit var clock: Clock

val now = clock.instant()
val timestamp = clock.millis()
```

This allows for deterministic testing with `TestClock`.

### GPS Watchdog

The app implements a 60-second GPS watchdog timeout. If no GPS update is received within 60 seconds, an alarm is triggered.

### Battery Monitoring

Battery level is monitored continuously and reported to paired devices. Low battery warnings are triggered at configurable thresholds.

### Connection Loss Handling

In paired mode, if the connection to the iPad is lost for more than 15 seconds (heartbeat timeout), the app:
1. Triggers a connection loss alarm
2. Switches to standalone mode
3. Continues GPS monitoring independently

## Troubleshooting

### WiFi Hotspot Issues

If pairing fails:
1. Ensure Location permission is granted
2. Check that WiFi hotspot is enabled
3. Verify no other apps are using hotspot
4. Try restarting the Android device

### GPS Not Working

If GPS position is not updating:
1. Ensure Location permission is granted (Fine Location)
2. Check that GPS is enabled in device settings
3. Ensure clear view of sky (GPS requires satellite visibility)
4. Check for GPS interference from nearby electronic devices

### Alarm Not Sounding

If alarms are silent:
1. Check Do Not Disturb settings
2. Verify app notification permissions
3. Ensure battery optimization is disabled for the app
4. Check alarm volume settings in app

## CI/CD

The Android app is built automatically in GitHub Actions:

- **Workflow**: `.github/workflows/build.yml`
- **Triggers**: `push` and `pull_request` on `main` and `master` branches

## Contributing

See [../CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## Support

For issues, feature requests, or contributions, please visit the main repository at https://github.com/Hiosdra/OpenAnchor
