const fs = require('fs');
const path = require('path');

const rootPackagePath = path.join(__dirname, '..', 'package.json');
const chromeManifestPath = path.join(__dirname, '..', 'chrome', 'manifest.json');
const firefoxManifestPath = path.join(__dirname, '..', 'firefox', 'manifest.json');
const wwwManifestPath = path.join(__dirname, '..', 'www', 'manifest.json');
const androidGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
const version = rootPackage.version;

const swPath = path.join(__dirname, '..', 'www', 'sw.js');

const envPath = path.join(__dirname, '..', 'core', 'js', 'adapter', 'env.js');

function updateManifest(filePath) {
    if (fs.existsSync(filePath)) {
        const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        manifest.version = version;
        fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2) + '\n');
        console.log(`✅ Updated ${path.relative(path.join(__dirname, '..'), filePath)} to v${version}`);
    }
}

function updateAndroidVersion(filePath) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Compute versionCode from version string (e.g., "1.1.0" -> 10100)
        const versionParts = version.split('.');
        const versionCode = parseInt(versionParts[0]) * 10000 +
            parseInt(versionParts[1]) * 100 +
            parseInt(versionParts[2] || '0');

        // Update versionCode
        content = content.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);

        // Update versionName "x.x.x"
        content = content.replace(/versionName\s+".*?"/g, `versionName "${version}"`);

        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${path.relative(path.join(__dirname, '..'), filePath)} to v${version} (versionCode: ${versionCode})`);
    }
}

function updateSwVersion(filePath) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Update const CACHE_NAME = '...';
        content = content.replace(/const CACHE_NAME = '.*?';/g, `const CACHE_NAME = 'wird-reminder-v${version}';`);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${path.relative(path.join(__dirname, '..'), filePath)} cache name to v${version}`);
    }
}

function updateEnvVersion(filePath) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Update version: '...'
        content = content.replace(/version:\s+'.*?'/g, `version: '${version}'`);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${path.relative(path.join(__dirname, '..'), filePath)} to v${version}`);
    }
}

updateManifest(chromeManifestPath);
updateManifest(firefoxManifestPath);
updateManifest(wwwManifestPath);
updateAndroidVersion(androidGradlePath);
updateSwVersion(swPath);
updateEnvVersion(envPath);
