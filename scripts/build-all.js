#!/usr/bin/env node

/**
 * Build script to compile binaries for all supported platforms.
 * Run this before publishing to npm.
 *
 * Usage:
 *   node scripts/build-all.js
 *
 * Requirements:
 *   - Rust toolchain installed
 *   - Cross-compilation targets installed (see below)
 *
 * To install cross-compilation targets:
 *   rustup target add x86_64-apple-darwin
 *   rustup target add aarch64-apple-darwin
 *   rustup target add x86_64-unknown-linux-gnu
 *   rustup target add aarch64-unknown-linux-gnu
 *   rustup target add x86_64-pc-windows-msvc
 *   rustup target add aarch64-pc-windows-msvc
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PLATFORMS = [
  { name: 'macOS x64', script: 'install-mac-x86_64', target: 'x86_64-apple-darwin' },
  { name: 'macOS ARM64', script: 'install-mac-arm64', target: 'aarch64-apple-darwin' },
  { name: 'Linux x64', script: 'install-linux-x64', target: 'x86_64-unknown-linux-gnu' },
  { name: 'Linux ARM64', script: 'install-linux-arm64', target: 'aarch64-unknown-linux-gnu' },
  { name: 'Windows x64', script: 'install-win-x64', target: 'x86_64-pc-windows-msvc' },
  { name: 'Windows ARM64', script: 'install-win-arm64', target: 'aarch64-pc-windows-msvc' },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'prebuilt');

function checkRustInstalled() {
  try {
    execSync('rustc --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkTargetInstalled(target) {
  try {
    const output = execSync('rustup target list --installed', { encoding: 'utf8' });
    return output.includes(target);
  } catch {
    return false;
  }
}

function buildPlatform(platform) {
  console.log(`\n📦 Building ${platform.name}...`);

  if (!checkTargetInstalled(platform.target)) {
    console.log(`⚠️  Target ${platform.target} not installed. Skipping.`);
    console.log(`   Install with: rustup target add ${platform.target}`);
    return false;
  }

  try {
    execSync(`npm run ${platform.script}`, {
      stdio: 'inherit',
      env: { ...process.env, CARGO_BUILD_TARGET: platform.target }
    });
    console.log(`✅ ${platform.name} built successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to build ${platform.name}`);
    return false;
  }
}

function main() {
  console.log('🚀 Building dtln-rs for all platforms...\n');

  if (!checkRustInstalled()) {
    console.error('❌ Rust is not installed. Please install from https://rustup.rs/');
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (const platform of PLATFORMS) {
    const result = buildPlatform(platform);
    if (result) {
      results.success.push(platform.name);
    } else {
      results.skipped.push(platform.name);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Build Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${results.success.length}/${PLATFORMS.length}`);
  if (results.success.length > 0) {
    results.success.forEach(name => console.log(`   - ${name}`));
  }

  if (results.skipped.length > 0) {
    console.log(`⚠️  Skipped: ${results.skipped.length}`);
    results.skipped.forEach(name => console.log(`   - ${name}`));
  }

  console.log('='.repeat(60));

  if (results.success.length === 0) {
    console.error('\n❌ No platforms were built successfully!');
    process.exit(1);
  }

  if (results.success.length < PLATFORMS.length) {
    console.log('\n⚠️  Not all platforms were built. This is OK for testing,');
    console.log('   but you should build all platforms before publishing to npm.');
  } else {
    console.log('\n🎉 All platforms built successfully!');
    console.log('   You can now publish to npm with: npm publish');
  }
}

main();
