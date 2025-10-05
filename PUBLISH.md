# Publishing Guide for dtln-rs

This guide explains how to publish the dtln-rs package to npm with prebuilt binaries for all platforms.

## Prerequisites

Before publishing, ensure you have:

1. **Rust toolchain** installed from [rustup.rs](https://rustup.rs/)
2. **Cross-compilation targets** installed:
   ```bash
   # macOS targets
   rustup target add x86_64-apple-darwin
   rustup target add aarch64-apple-darwin

   # Linux targets
   rustup target add x86_64-unknown-linux-gnu
   rustup target add aarch64-unknown-linux-gnu

   # Windows targets (requires MSVC toolchain)
   rustup target add x86_64-pc-windows-msvc
   rustup target add aarch64-pc-windows-msvc
   ```

3. **npm account** and login:
   ```bash
   npm login
   ```

## Publishing Steps

### 1. Update Version

Update the version in `package.json`:
```json
{
  "version": "0.1.1"
}
```

### 2. Build Prebuilt Binaries

You have two options:

#### Option A: Build All Platforms (Recommended for Publishing)

```bash
# Build all available platforms
node scripts/build-all.js
```

This will attempt to build for all platforms. Some may be skipped if cross-compilation is not available.

#### Option B: Build Per Platform Manually

Build on each platform separately:

**On macOS (Intel):**
```bash
npm run install-mac-x86_64
```

**On macOS (Apple Silicon):**
```bash
npm run install-mac-arm64
```

**On Linux (x64):**
```bash
npm run install-linux-x64
```

**On Windows (x64):**
```bash
npm run install-win-x64
```

### 3. Include Prebuilt Binaries in Package

After building, make sure these files exist:
- `index.node` - The native binary
- `dtln.js` - The entry point (copied from dtln.node.js)

These will be included in the npm package.

### 4. Test the Package Locally

Test the package before publishing:

```bash
# Create a tarball
npm pack

# This creates dtln-rs-0.1.0.tgz

# Test in another directory
mkdir test-install
cd test-install
npm install ../dtln-rs-0.1.0.tgz
node -e "const dtln = require('dtln-rs'); console.log(dtln);"
```

### 5. Publish to npm

#### For Public Package:
```bash
npm publish --access public
```

#### For Private/Scoped Package:
```bash
npm publish
```

## Publishing Strategy: Prebuilt Binaries

The current setup includes prebuilt binaries in the npm package:

**Pros:**
- ✅ Users don't need Rust installed
- ✅ Fast installation (`npm install` completes in seconds)
- ✅ TAK-ÇALIŞTIR (plug-and-play) experience

**Cons:**
- ❌ Larger package size (~50-100MB with all binaries)
- ❌ Must build on each platform before publishing

### Alternative Strategy: Build on Install

If package size is a concern, you can modify the `postinstall` script to always build:

```json
{
  "scripts": {
    "postinstall": "npm run install-native"
  }
}
```

**Note:** This requires users to have Rust installed.

## Multi-Platform Binary Management

For professional deployment, consider using:

1. **GitHub Actions** - Build binaries for all platforms automatically
2. **npm optional dependencies** - Separate packages per platform
3. **@mapbox/node-pre-gyp** - Download prebuilt binaries from GitHub releases

Example GitHub Actions workflow:

```yaml
name: Build Binaries

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
        include:
          - os: macos-latest
            target: x86_64-apple-darwin
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - os: windows-latest
            target: x86_64-pc-windows-msvc

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
      - run: npm run install-${{ matrix.target }}
      - uses: actions/upload-artifact@v3
        with:
          name: binary-${{ matrix.target }}
          path: index.node
```

## Updating the Package

1. Make your changes
2. Update version in `package.json`
3. Build binaries for all platforms
4. Test locally
5. Publish:
   ```bash
   npm publish
   ```

## Troubleshooting

### "Module did not self-register"
This means the binary was built for a different Node.js version. Rebuild with the target Node.js version.

### "Cannot find module 'index.node'"
The binary was not included in the package. Check `package.json` `files` field.

### Cross-compilation fails
Some targets require specific toolchains. Build on the target platform directly or use Docker.

## Support

For issues, open a GitHub issue or contact the maintainer.
