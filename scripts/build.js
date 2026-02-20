const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;

console.log(`🚀 Starting Universal Build for Wird Reminder v${version}`);
console.log('================================================');

// 1. Ensure Build Directory
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
}

function run(command, cwd = rootDir, failOnError = true) {
    try {
        execSync(command, { cwd, stdio: 'inherit' });
    } catch (e) {
        if (failOnError) {
            console.error(`❌ Command failed: ${command}`);
            process.exit(1);
        }
        throw e;
    }
}

// 2. Sync Core Assets & Versions
console.log('\n📦 Phase 1: Synchronizing Core Assets & Versions...');
run('node scripts/version-sync.js');
run('node scripts/sync.js');

// 3. Build Web/Extensions
console.log('\n🌐 Phase 2: Building Browser Extensions...');

function buildExtension(platform) {
    const platformDir = path.join(rootDir, platform);
    const zipName = `wird-reminder-${platform}-v${version}.zip`;
    const zipPath = path.join(buildDir, zipName);

    console.log(`  >> Packaging ${platform}...`);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    run(`zip -r "${zipPath}" manifest.json src -x "*.DS_Store" -x "*__MACOSX*"`, platformDir);
}

buildExtension('chrome');
buildExtension('firefox');

// 4. Build Android
// 4. Build Android
console.log('\n🤖 Phase 3: Building Android App...');

console.log('  >> Syncing Capacitor...');
run('npx cap sync android');

// 4.1 Patch Proguard (AGP 8.13+ Compatibility)
// This is necessary because Capacitor 8 / AGP 8.13+ deprecated proguard-android.txt
console.log('  >> Patching Proguard for AGP 8.13+ compatibility...');
function patchProguardFile(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'build' && file !== '.git') patchProguardFile(fullPath);
        } else if (file === 'build.gradle') {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes("'proguard-android.txt'")) {
                content = content.replace(/'proguard-android\.txt'/g, "'proguard-android-optimize.txt'");
                fs.writeFileSync(fullPath, content);
                console.log(`     ✓ Patched: ${path.relative(rootDir, fullPath)}`);
            }
        }
    });
}

patchProguardFile(path.join(rootDir, 'node_modules/@capacitor'));
patchProguardFile(path.join(rootDir, 'android'));

console.log('  >> Running Gradle Build (APK & AAB)...');
const androidDir = path.join(rootDir, 'android');
try {
    if (process.platform === 'win32') {
        run('gradlew.bat assembleDebug', androidDir, false);
        run('gradlew.bat bundleRelease', androidDir, false);
    } else {
        run('chmod +x gradlew && ./gradlew assembleDebug', androidDir, false);
        run('chmod +x gradlew && ./gradlew bundleRelease', androidDir, false);
    }
} catch (e) {
    const errorOutput = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '') + (e.message || '');
    if (errorOutput.includes('major version 70')) { // Major 70 is JDK 26
        console.error('\n❌ ERROR: Unsupported Java version detected (JDK 26+).');
        console.error('This project supports JDK 17, 21, and 25.');
    } else {
        console.error('\n❌ Android build failed. Check your Java/Android Studio setup.');
        console.error('Current Setup: Gradle 9.2.1 + AGP 8.13.0 (Supports JDK 25)');
    }
    // Don't exit here, so the user still has their extension build
}

// 5. Collect Artifacts
console.log('\n📦 Phase 4: Collecting Artifacts...');

// APK
const apkSrc = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (fs.existsSync(apkSrc)) {
    const apkDest = path.join(buildDir, `wird-reminder-v${version}.apk`);
    fs.copyFileSync(apkSrc, apkDest);
    console.log(`  ✅ Android APK: ${path.relative(rootDir, apkDest)}`);
}

// AAB
const aabSrc = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
if (fs.existsSync(aabSrc)) {
    const aabDest = path.join(buildDir, `wird-reminder-v${version}.aab`);
    fs.copyFileSync(aabSrc, aabDest);
    console.log(`  ✅ Android AAB: ${path.relative(rootDir, aabDest)}`);
} else {
    // If release fails (e.g. signing), try debug bundle just in case
    const aabDebugSrc = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'debug', 'app-debug.aab');
    if (fs.existsSync(aabDebugSrc)) {
        const aabDest = path.join(buildDir, `wird-reminder-v${version}-debug.aab`);
        fs.copyFileSync(aabDebugSrc, aabDest);
        console.log(`  ✅ Android AAB (Debug): ${path.relative(rootDir, aabDest)}`);
    }
}

console.log('\n🎉 Universal Build Complete!');
console.log('Combined artifacts are in the /build directory.');
