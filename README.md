# OpenAnchor

OpenAnchor is a multi-platform project consisting of native Android applications and a Progressive Web App (PWA).

## Project Structure

The repository is organized into the following main directories:

### `/android` - Native Android Application
Contains the Android project with mobile and Wear OS applications.

- **Mobile App** (`android/app/`) - Main Android application
- **Wear OS App** (`android/wear/`) - Companion Wear OS application

See [android/README.md](android/README.md) for Android-specific documentation.

### `/pwa` - Progressive Web App
Contains the Progressive Web App that provides a web-based interface for OpenAnchor.

**Features:**
- Fully functional Progressive Web App with offline support
- Service Worker for caching and offline functionality
- Web App Manifest for installability
- Anchor alarm monitoring with GPS tracking
- Map visualization with Leaflet
- Multiple notification methods (audio, vibration, browser notifications, push notifications)

**Hosted on GitHub Pages:**
The PWA is automatically deployed to GitHub Pages via GitHub Actions.

Access the live PWA at: `https://hiosdra.github.io/OpenAnchor/`

See [pwa/README.md](pwa/README.md) for PWA-specific documentation.

### `/docs` - Documentation
Contains project documentation, including:

- **Protocol Documentation** (`docs/protocol/`) - Communication protocol between PWA and native Android app

See [docs/protocol/README.md](docs/protocol/README.md) for protocol documentation.

## Getting Started

### Android Application
```bash
cd android
./gradlew build
```

### PWA
To run the PWA locally, you must use a local HTTP server (service workers require HTTP/HTTPS):
```bash
cd pwa
# Using Python 3
python3 -m http.server 8000
# Then navigate to http://localhost:8000

# Or using Node.js http-server
npx http-server -p 8000
```

**Note:** Opening `index.html` directly in a browser (`file://` protocol) will not work for PWA features like service workers and offline functionality.

To deploy the PWA to GitHub Pages:
1. Push changes to the `main` branch
2. GitHub Actions will automatically deploy the PWA
3. Access the live application at `https://hiosdra.github.io/OpenAnchor/`

**Note:** GitHub Pages must be enabled in the repository settings with the source set to "GitHub Actions".

## Contributing

_To be implemented_

## License

_To be implemented_
