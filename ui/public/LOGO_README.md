# Logo and Favicon Files

## Created Files

✅ **logo.svg** - Main logo (512x512px)
   - Purple to cyan gradient lock icon
   - Dream particles/sparkles
   - "D" letter mark
   - Can be used for app icons, website headers, etc.

✅ **favicon.svg** - Browser favicon (64x64px)
   - Simplified lock icon
   - Purple to cyan gradient
   - Works in all modern browsers

## Usage

### Logo in Header
The Header component is configured to use `/logo.svg` from the public directory.

If you prefer to use a PNG version:
1. Convert `logo.svg` to PNG using an online converter or tool
2. Place it in `src/assets/drecate-logo.png`
3. Update `Header.tsx` import to use `@/assets/drecate-logo.png`

### Favicon
The `index.html` is configured to use:
- SVG favicon (modern browsers): `/favicon.svg`
- PNG fallback (older browsers): `/favicon.png` (needs to be generated)

## Converting SVG to PNG

### Quick Online Method
1. Visit https://svgtopng.com/
2. Upload the SVG file
3. Set size:
   - Logo: 512x512 or larger
   - Favicon: 32x32 or 64x64
4. Download and place in appropriate directory

### Command Line (ImageMagick)
```bash
# Logo PNG
convert -background none -resize 512x512 logo.svg src/assets/drecate-logo.png

# Favicon PNG
convert -background none -resize 64x64 favicon.svg public/favicon.png
```

### Node.js Script
Create `scripts/generate-assets.mjs`:
```javascript
import sharp from 'sharp';

// Generate logo PNG
await sharp('public/logo.svg')
  .resize(512, 512)
  .png()
  .toFile('src/assets/drecate-logo.png');

// Generate favicon PNG
await sharp('public/favicon.svg')
  .resize(64, 64)
  .png()
  .toFile('public/favicon.png');

console.log('Assets generated!');
```

Run: `node scripts/generate-assets.mjs`

## Design Elements

The logo features:
- **Lock Icon**: Represents encryption and security
- **Gradient**: Purple (#a855f7) to Cyan (#06b6d4) - matches the app theme
- **Sparkles**: Dream particles for the dream theme
- **Letter "D"**: Initial for DreCate

Colors:
- Primary Purple: `hsl(270 60% 65%)` / `#a855f7`
- Primary Cyan: `hsl(190 70% 55%)` / `#06b6d4`
- Background: `hsl(250 40% 8%)` / `#0f172a`


