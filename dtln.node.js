// Platform-independent native module loader
const path = require('path');
const fs = require('fs');

function loadNativeModule() {
  const platform = process.platform;
  const arch = process.arch;

  // Map platform-arch to directory names
  const platformMap = {
    'darwin-x64': 'darwin-x64',
    'darwin-arm64': 'darwin-arm64',
    'linux-x64': 'linux-x64',
    'linux-arm64': 'linux-arm64',
    'win32-x64': 'win32-x64',
    'win32-arm64': 'win32-arm64'
  };

  const platformKey = `${platform}-${arch}`;
  const platformDir = platformMap[platformKey];

  // Try prebuilt binary first
  if (platformDir) {
    const prebuiltPath = path.join(__dirname, 'prebuilt', platformDir, 'index.node');
    if (fs.existsSync(prebuiltPath)) {
      try {
        return require(prebuiltPath);
      } catch (err) {
        const isSymbolError = err.message && err.message.includes('undefined symbol');
        if (isSymbolError) {
          console.error(`[dtln-rs] ❌ Symbol error loading prebuilt binary from ${prebuiltPath}:`);
          console.error(`[dtln-rs]    ${err.message}`);
          console.error(`[dtln-rs] 💡 This indicates the binary needs to be rebuilt with static TensorFlow Lite linking.`);
          console.error(`[dtln-rs] 📖 See LINUX_BUILD.md for instructions or build from source with:`);
          console.error(`[dtln-rs]    npm install @hayatialikeles/dtln-rs --build-from-source`);
        } else {
          console.warn(`[dtln-rs] Failed to load prebuilt binary from ${prebuiltPath}: ${err.message}`);
        }
      }
    }
  }

  // Try root index.node (if built locally)
  try {
    return require("./index.node");
  } catch (err) {
    const isSymbolError = err.message && err.message.includes('undefined symbol');

    if (isSymbolError) {
      console.error(`[dtln-rs] ❌ Symbol linking error for ${platform}-${arch}:`);
      console.error(`[dtln-rs]    ${err.message}`);
      console.error(`[dtln-rs] 💡 The binary was found but TensorFlow Lite symbols are missing.`);
      console.error(`[dtln-rs] 🔧 Solutions:`);
      console.error(`[dtln-rs]    1. Wait for updated package with fixed binary`);
      console.error(`[dtln-rs]    2. Build from source: npm install --build-from-source`);
      console.error(`[dtln-rs]    3. See LINUX_BUILD.md for detailed instructions`);
    } else {
      console.warn(
        `[dtln-rs] Native module not available for ${platform}-${arch}. ` +
        `Error: ${err.message}`
      );
    }

    // Provide a fallback empty implementation
    const errorMsg = isSymbolError
      ? `dtln-rs binary found but TensorFlow Lite symbols are missing (${platform}-${arch}). ` +
        `This indicates the binary needs rebuilding. See console output for solutions.`
      : `dtln-rs native module is not available for ${platform}-${arch}. ` +
        `Please rebuild the module for your platform or install prebuilt binaries.`;

    return {
      dtln_create: function() {
        throw new Error(errorMsg);
      },
      dtln_denoise: function() {
        throw new Error(errorMsg);
      },
      dtln_stop: function() {
        throw new Error(errorMsg);
      }
    };
  }
}

module.exports = loadNativeModule();
