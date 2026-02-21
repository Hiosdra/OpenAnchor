# OpenAnchor Android

This directory contains the Android application for OpenAnchor, including both the mobile app and Wear OS components.

## Project Structure

- `app/` - Main Android mobile application
- `wear/` - Wear OS application

## Building

To build the Android project:

```bash
./gradlew build
```

## Running

To run the application on a connected device or emulator:

```bash
./gradlew installDebug
```

## Communication with PWA

For details on how the Android app communicates with the PWA, see the [protocol documentation](../docs/protocol/README.md).
