const sharp = require('sharp');
const path = require('path');

const logo = path.join(__dirname, 'agrosmart_logo.png');
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Android mipmap sizes
const sizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

// Foreground sizes (108dp * density factor, with padding for safe zone)
const fgSizes = [
  { folder: 'mipmap-mdpi', size: 108 },
  { folder: 'mipmap-hdpi', size: 162 },
  { folder: 'mipmap-xhdpi', size: 216 },
  { folder: 'mipmap-xxhdpi', size: 324 },
  { folder: 'mipmap-xxxhdpi', size: 432 },
];

async function run() {
  for (const { folder, size } of sizes) {
    // ic_launcher.png (square icon)
    await sharp(logo)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(resDir, folder, 'ic_launcher.png'));
    console.log(`✅ ${folder}/ic_launcher.png (${size}x${size})`);

    // ic_launcher_round.png (circular icon)
    const roundMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    );
    await sharp(logo)
      .resize(size, size, { fit: 'cover' })
      .composite([{ input: roundMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(resDir, folder, 'ic_launcher_round.png'));
    console.log(`✅ ${folder}/ic_launcher_round.png (${size}x${size} round)`);
  }

  // Foreground for adaptive icon (Android 8+)
  for (const { folder, size } of fgSizes) {
    await sharp(logo)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(resDir, folder, 'ic_launcher_foreground.png'));
    console.log(`✅ ${folder}/ic_launcher_foreground.png (${size}x${size})`);
  }

  console.log('\n🎉 All icons replaced successfully!');
}

run().catch(console.error);
