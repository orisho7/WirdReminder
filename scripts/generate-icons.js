const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const sourceIcon = path.join(rootDir, 'assets', 'icon.png');
const sourceIconTrans = path.join(rootDir, 'assets', 'icon_transparent.png');

const androidResDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

const iconSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
};

const foregroundSizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432
};

function run(command) {
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (e) {
        console.error(`Failed: ${command}`);
    }
}

console.log('Generating Android Icons...');

Object.entries(iconSizes).forEach(([dir, size]) => {
    const targetDir = path.join(androidResDir, dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // Legacy Icons
    run(`magick "${sourceIcon}" -resize ${size}x${size} "${path.join(targetDir, 'ic_launcher.png')}"`);
    run(`magick "${sourceIcon}" -resize ${size}x${size} "${path.join(targetDir, 'ic_launcher_round.png')}"`);
});

Object.entries(foregroundSizes).forEach(([dir, size]) => {
    const targetDir = path.join(androidResDir, dir);
    // Adaptive Foreground (should be larger and padded usually, but we'll scale the transparent icon)
    // Adaptive icons should be 108dp. For xxxhdpi (4x), that's 432px.
    // The safe zone is the center 66dp (264px at 4x).

    run(`magick "${sourceIconTrans}" -resize ${Math.floor(size * 0.7)}x${Math.floor(size * 0.7)} -gravity center -background none -extent ${size}x${size} "${path.join(targetDir, 'ic_launcher_foreground.png')}"`);
});

console.log('Generating Web/Extension Icons...');

const webIconDir = path.join(rootDir, 'core', 'assets', 'icons');
if (!fs.existsSync(webIconDir)) fs.mkdirSync(webIconDir, { recursive: true });

run(`magick "${sourceIcon}" -resize 16x16 "${path.join(webIconDir, 'icon16.png')}"`);
run(`magick "${sourceIcon}" -resize 48x48 "${path.join(webIconDir, 'icon48.png')}"`);
run(`magick "${sourceIcon}" -resize 128x128 "${path.join(webIconDir, 'icon128.png')}"`);

console.log('Syncing across platforms...');
run('node scripts/sync.js');

console.log('Done! Icons generated and synced.');
