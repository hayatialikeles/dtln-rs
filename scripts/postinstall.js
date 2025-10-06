#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const platform = process.platform;
const arch = process.arch;

console.log(`🔍 Platform: ${platform}-${arch}`);

// Determine the package root directory
const packageRoot = path.join(__dirname, '..');

// Check if already installed in root
const rootIndexNode = path.join(packageRoot, 'index.node');
const rootDtlnJs = path.join(packageRoot, 'dtln.js');

if (fs.existsSync(rootIndexNode) && fs.existsSync(rootDtlnJs)) {
  console.log('✅ Binaries already installed in root directory');
  process.exit(0);
}

// Map platform/arch to prebuilt directory
const platformMap = {
  'darwin-x64': 'darwin-x64',
  'darwin-arm64': 'darwin-arm64',
  'linux-x64': 'linux-x64',
  'linux-arm64': 'linux-arm64',
  'win32-x64': 'win32-x64',
  'win32-arm64': 'win32-arm64'
};

const platformKey = `${platform}-${arch}`;
const prebuiltDir = platformMap[platformKey];

if (!prebuiltDir) {
  console.log(`⚠️  No prebuilt binary for ${platformKey}`);

  if (process.env.npm_config_build_from_source === 'true') {
    console.log('🔨 Building from source...');
    const { execSync } = require('child_process');
    try {
      execSync('npm run install-native', { stdio: 'inherit' });
      console.log('✅ Build completed successfully');
      process.exit(0);
    } catch (err) {
      console.error('❌ Build failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('💡 To build from source, run: npm install --build-from-source');
    console.log('⚠️  Package may not work without native binary');
    process.exit(0);
  }
}

const prebuiltPath = path.join(packageRoot, 'prebuilt', prebuiltDir);

if (!fs.existsSync(prebuiltPath)) {
  console.log(`❌ Prebuilt directory not found: ${prebuiltPath}`);
  console.log('💡 To build from source, run: npm install --build-from-source');
  console.log('ℹ️  Note: dtln.node.js will attempt to load from prebuilt directory at runtime');
  process.exit(0);
}

console.log(`📦 Found prebuilt binaries for ${platformKey}`);

// Copy files from prebuilt directory to root
const filesToCopy = ['index.node', 'dtln.js'];
let copiedFiles = 0;

filesToCopy.forEach(file => {
  const src = path.join(prebuiltPath, file);
  const dest = path.join(packageRoot, file);

  if (fs.existsSync(src)) {
    try {
      fs.copyFileSync(src, dest);
      const stats = fs.statSync(dest);
      const sizeMB = stats.size / 1024 / 1024;
      if (sizeMB >= 0.01) {
        console.log(`  ✓ Copied ${file} (${sizeMB.toFixed(2)} MB)`);
      } else {
        console.log(`  ✓ Copied ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      }
      copiedFiles++;
    } catch (err) {
      console.error(`  ✗ Failed to copy ${file}:`, err.message);
    }
  } else {
    console.log(`  ⚠ ${file} not found in prebuilt directory`);
  }
});

if (copiedFiles === filesToCopy.length) {
  console.log(`✅ Successfully installed prebuilt binaries for ${platformKey}`);
  process.exit(0);
} else {
  console.log(`⚠️  Only ${copiedFiles}/${filesToCopy.length} files copied`);
  process.exit(0);
}
