#!/usr/bin/env node

/**
 * Generate PNG assets from SVG files
 * Requires: npm install -D sharp
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const assetsDir = join(rootDir, 'src', 'assets');

// Ensure directories exist
if (!existsSync(assetsDir)) {
  mkdirSync(assetsDir, { recursive: true });
}

async function generateAssets() {
  console.log('Generating PNG assets from SVG...\n');

  try {
    // Generate logo PNG
    const logoSvg = join(publicDir, 'logo.svg');
    const logoPng = join(assetsDir, 'drecate-logo.png');
    
    if (existsSync(logoSvg)) {
      console.log('Generating logo PNG (512x512)...');
      await sharp(logoSvg)
        .resize(512, 512)
        .png()
        .toFile(logoPng);
      console.log('✓ Logo generated:', logoPng);
    } else {
      console.warn('⚠ Logo SVG not found:', logoSvg);
    }

    // Generate favicon PNG
    const faviconSvg = join(publicDir, 'favicon.svg');
    const faviconPng = join(publicDir, 'favicon.png');
    
    if (existsSync(faviconSvg)) {
      console.log('Generating favicon PNG (64x64)...');
      await sharp(faviconSvg)
        .resize(64, 64)
        .png()
        .toFile(faviconPng);
      console.log('✓ Favicon generated:', faviconPng);
    } else {
      console.warn('⚠ Favicon SVG not found:', faviconSvg);
    }

    // Generate multiple favicon sizes
    const sizes = [16, 32, 180];
    for (const size of sizes) {
      const output = join(publicDir, `favicon-${size}.png`);
      await sharp(faviconSvg)
        .resize(size, size)
        .png()
        .toFile(output);
      console.log(`✓ Favicon ${size}x${size} generated:`, output);
    }

    console.log('\n✅ All assets generated successfully!');
  } catch (error) {
    console.error('\n❌ Error generating assets:', error.message);
    console.error('\nMake sure sharp is installed: npm install -D sharp');
    process.exit(1);
  }
}

generateAssets();


