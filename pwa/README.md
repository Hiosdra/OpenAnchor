# PWA (Progressive Web App)

This directory contains the Progressive Web App component of OpenAnchor - an anchor alarm monitoring system for boats and yachts.

## Overview

The PWA provides a web-based interface that can be installed on any device and used to monitor anchor drift. It features:

- **GPS Tracking**: Real-time position monitoring using device GPS
- **Visual Alarm System**: Map-based visualization with customizable radius
- **Offline Support**: Service Worker enables offline functionality
- **Installable**: Can be installed as a standalone app on mobile devices
- **Multiple Notification Methods**: Audio alarms, vibration, and push notifications
- **Night Vision Mode**: Special display mode for use at night
- **AI Assistant**: Integration with AI for weather and navigation assistance

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
- **Push Notifications**: Browser notifications for alarms

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

### Installing as PWA

1. Open the app in a supported browser (Chrome, Edge, Safari on iOS 16.4+)
2. Look for the "Install" or "Add to Home Screen" option
3. Follow the prompts to install the app
4. Launch the app from your home screen or app drawer

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
- **Notification API**: Push notifications
- **Wake Lock API**: Keep screen on during monitoring

### Browser Compatibility
- Chrome/Edge: Full support
- Safari (iOS 16.4+): Full support including installation
- Firefox: Full support (installation on Android)
- Opera: Full support

### PWA Features
- ✅ Offline support via Service Worker
- ✅ Installable as standalone app
- ✅ Responsive design
- ✅ Push notifications
- ✅ Background sync capability
- ✅ App-like experience

## Communication Protocol

For details on how the PWA communicates with the native Android app, see the [protocol documentation](../docs/protocol/README.md).

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
The service worker (`sw.js`) caches essential files for offline use. Update the `CACHE_NAME` version when making changes that require cache refresh.

### Manifest
The `manifest.json` file currently uses SVG data URLs for icons. For production, consider replacing with proper PNG icons at 192x192 and 512x512 sizes.

## Support

For issues, feature requests, or contributions, please visit the main repository.
