# Dark Mode Implementation

## Overview
Dark mode has been implemented in the core files to ensure consistent theming across all platforms:
- ✅ Chrome Extension
- ✅ Firefox Extension  
- ✅ PWA (Progressive Web App)
- ✅ Android App (via Capacitor)

## Architecture

### Core Files (Shared Across All Platforms)

#### 1. CSS Variables (`core/css/base.css`)
- Light mode variables defined in `:root`
- Dark mode variables defined in `.dark` class selector
- Uses HSL color system for easy theming
- Includes proper contrast ratios for accessibility

#### 2. Theme Toggle Styles (`core/css/theme-toggle.css`)
- Standalone CSS for the theme toggle button
- Animated icon transitions
- Responsive hover/focus states
- Automatic icon switching based on theme

#### 3. Theme Manager (`core/js/theme.js`)
- Centralized theme control logic
- Persists theme preference using storage adapter
- System theme preference detection
- Auto-initialization on page load
- Provides `createToggleButton()` helper for UI integration

### Platform Integration

#### Browser Extensions (Chrome/Firefox)
Files modified:
- `chrome/src/popup/popup.html` - Added theme toggle container
- `chrome/src/popup/popup.js` - Import and initialize theme manager
- `firefox/src/popup/popup.html` - Added theme toggle container
- `firefox/src/popup/popup.js` - Import and initialize theme manager

#### PWA/Android (www/)
Files modified:
- `www/index.html` - Added theme toggle container
- `www/app.js` - Import and initialize theme manager

## Features

### 🎨 Theme Persistence
- User's theme preference is saved to storage
- Theme persists across sessions and app restarts
- Works consistently across all platforms

### 🌓 System Theme Detection
- Automatically detects system dark/light mode preference
- Falls back to system preference if no saved theme
- Watches for system theme changes (optional)

### 🔘 Toggle Button
- Clean, accessible toggle button in the header
- Smooth icon transitions (Sun ☀️ for light, Moon 🌙 for dark)
- Proper ARIA labels for accessibility

### 📱 Responsive Design
- Works on all screen sizes
- Consistent behavior across platforms
- Proper contrast in both themes

## Usage

### For Developers

#### Initialize Theme (Automatic)
The theme manager auto-initializes when the DOM loads. No manual initialization needed.

#### Manual Theme Control
```javascript
import { themeManager } from './core/js/theme.js';

// Toggle theme
await themeManager.toggle();

// Set specific theme
await themeManager.setTheme('dark');
await themeManager.setTheme('light');

// Get current theme
const currentTheme = themeManager.getCurrentTheme(); // 'light' or 'dark'

// Create a toggle button
const button = themeManager.createToggleButton();
document.body.appendChild(button);
```

#### Add Custom Dark Mode Styles
Update your CSS to use CSS variables:

```css
/* Instead of hardcoded colors */
.my-element {
  background-color: #ffffff;
  color: #000000;
}

/* Use CSS variables for automatic theme support */
.my-element {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

Available CSS variables:
- `--background` / `--foreground`
- `--card` / `--card-foreground`
- `--primary` / `--primary-foreground`
- `--secondary` / `--secondary-foreground`
- `--muted` / `--muted-foreground`
- `--accent` / `--accent-foreground`
- `--border` / `--input` / `--ring`
- `--quran-green` (semantic color)

### For Users

1. **Toggle Theme**: Click the sun/moon icon in the header
2. **Auto Theme**: If you haven't set a preference, the app uses your system theme
3. **Persistent**: Your choice is saved and applies across all platforms

## Testing

To test dark mode across all platforms:

1. **Chrome Extension**: 
   - Load unpacked extension from `chrome/`
   - Open popup and toggle theme

2. **Firefox Extension**:
   - Load temporary addon from `firefox/`
   - Open popup and toggle theme

3. **PWA (Web)**:
   - Run `npm run dev`
   - Navigate to app mode (not landing page)
   - Toggle theme

4. **Android**:
   - Run `npm run sync && npx cap run android`
   - Open app and toggle theme

## Sync Process

When running `npm run sync`, the core files (including theme files) are automatically copied to:
- `chrome/src/core/`
- `firefox/src/core/`
- `www/core/`
- `android/app/src/main/assets/public/core/`

This ensures all platforms use the same theme implementation.

## Future Enhancements

- [ ] Add theme preference in settings tab
- [ ] Support for custom color themes
- [ ] Add transition animations when switching themes
- [ ] Reader view dark mode optimization
- [ ] High contrast mode for accessibility
