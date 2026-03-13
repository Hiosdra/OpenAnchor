# PWA Test Suite

Comprehensive test suite for the OpenAnchor Progressive Web App.

## Overview

This test suite provides comprehensive coverage for the OpenAnchor PWA, including:

- **Dashboard functionality** - Beta mode, settings, module navigation
- **Service Worker lifecycle** - Installation, caching, updates, offline fallback
- **Exam module** - Progress tracking, localStorage persistence, statistics
- **Leitner spaced repetition** - Box advancement, review scheduling, state management
- **Anchor utilities** - GPS calculations, alarm states, distance/bearing calculations

## Setup

Install dependencies:

```bash
cd pwa
npm install
```

## Running Tests

Run all tests:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Test Structure

```
pwa/
├── js/                      # Refactored testable modules
│   ├── dashboard.js         # Dashboard beta mode & settings
│   ├── sw-utils.js          # Service worker utilities
│   ├── exam-storage.js      # Exam progress & localStorage
│   ├── leitner.js           # Leitner spaced repetition algorithm
│   └── anchor-utils.js      # GPS calculations & alarm logic
├── tests/                   # Test files
│   ├── setup.js             # Test environment setup
│   ├── dashboard.test.js    # Dashboard tests (25+ tests)
│   ├── exam-storage.test.js # Exam storage tests (20+ tests)
│   ├── leitner.test.js      # Leitner algorithm tests (25+ tests)
│   ├── anchor-utils.test.js # Anchor utilities tests (35+ tests)
│   ├── sw-utils.test.js     # SW utilities tests (15+ tests)
│   └── service-worker.test.js # SW core tests (15+ tests)
└── vitest.config.js         # Vitest configuration
```

## Test Coverage

### Dashboard Module (25+ tests)
- ✅ Beta mode enable/disable
- ✅ localStorage persistence
- ✅ Module visibility toggling
- ✅ Settings modal open/close
- ✅ Backdrop click handling

### Service Worker (30+ tests)
- ✅ Cache installation & management
- ✅ Update detection & SKIP_WAITING
- ✅ Cache-first fetch strategy
- ✅ Offline fallback behavior
- ✅ Cache clearing utilities
- ✅ Background sync events

### Exam Storage (20+ tests)
- ✅ Progress save/load
- ✅ Learn position persistence
- ✅ Leitner state management
- ✅ Statistics calculation
- ✅ Category statistics
- ✅ Data reset functionality

### Leitner Algorithm (25+ tests)
- ✅ Question initialization
- ✅ Box advancement (correct answers)
- ✅ Box reset (incorrect answers)
- ✅ Due date calculations
- ✅ Review scheduling (1, 2, 4, 8, 16 day intervals)
- ✅ State updates & persistence
- ✅ Statistics by box

### Anchor Utilities (35+ tests)
- ✅ Haversine distance calculation
- ✅ Alarm state transitions (Safe → Caution → Warning → Alarm)
- ✅ Chain length calculations
- ✅ Swing radius calculations
- ✅ Bearing calculations
- ✅ Sector containment checks
- ✅ Speed Over Ground (SOG)
- ✅ Course Over Ground (COG)
- ✅ GPS coordinate validation

**Total: 135+ comprehensive tests**

## Code Architecture

The PWA has been refactored to separate business logic from UI code:

### Before
- All logic embedded in HTML `<script>` tags
- Difficult to test
- No separation of concerns

### After
- Testable JavaScript modules in `js/` directory
- Pure functions with no DOM dependencies
- Easy to import and test
- Can be reused across modules

### Integration

The refactored modules are designed to be imported into the existing HTML files:

```html
<script type="module">
  import { initBetaMode, toggleBetaMode } from './js/dashboard.js';

  window.addEventListener('load', () => {
    initBetaMode();
  });
</script>
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Install PWA dependencies
  run: cd pwa && npm install

- name: Run PWA tests
  run: cd pwa && npm test

- name: Generate coverage report
  run: cd pwa && npm run test:coverage
```

## Writing New Tests

Example test structure:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { myFunction } from '../js/my-module.js';

describe('My Module', () => {
  beforeEach(() => {
    // Setup before each test
    localStorage.clear();
  });

  it('should do something correctly', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

## Benefits

1. **Confidence** - Comprehensive test coverage ensures features work correctly
2. **Refactoring** - Safe to refactor code without breaking functionality
3. **Documentation** - Tests serve as living documentation
4. **Bug Prevention** - Catch regressions early
5. **Maintainability** - Easier to maintain and extend codebase

## Next Steps

To integrate these tests with the existing PWA:

1. Update HTML files to import the refactored modules
2. Remove duplicate code from HTML `<script>` tags
3. Add CI/CD workflow to run tests on PRs
4. Consider adding E2E tests with Playwright
5. Add visual regression tests for UI components

## Notes

- Tests use `happy-dom` for DOM simulation (faster than jsdom)
- localStorage is mocked in test environment
- Service worker APIs are mocked for testing
- All tests are isolated and can run in parallel
