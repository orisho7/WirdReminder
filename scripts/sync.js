const fs = require('fs');
const path = require('path');

const CORE_DIR = path.join(__dirname, '..', 'core');
const TARGETS = [
    path.join(__dirname, '..', 'www', 'core'),
    path.join(__dirname, '..', 'chrome', 'src', 'core'),
    path.join(__dirname, '..', 'firefox', 'src', 'core')
];

console.log('🔄 Starting core synchronization...');

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

TARGETS.forEach(target => {
    console.log(`  >> Syncing to ${path.relative(path.join(__dirname, '..'), target)}...`);
    if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
    }
    copyRecursiveSync(CORE_DIR, target);
    console.log(`  ✅ Done.`);
});

console.log('🎉 All platforms synchronized.');
