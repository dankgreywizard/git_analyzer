# Frontend Directory

This directory contains frontend assets and components for the AI Interface application.

## Structure

- `styles/` - CSS and styling files
- `components/` - Reusable UI components
- `assets/` - Images, icons, and other static assets
- `utils/` - Frontend utility functions

## Packages Installed

- **Tailwind CSS** - Utility-first CSS framework
- **Animate.css** - CSS animation library
- **AOS (Animate On Scroll)** - Scroll animation library

## Usage

Import Tailwind CSS in your main CSS file:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Import animation libraries in your JavaScript:
```javascript
import 'animate.css';
import AOS from 'aos';
import 'aos/dist/aos.css';

AOS.init();
```

