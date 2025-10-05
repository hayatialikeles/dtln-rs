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
        console.warn(`[dtln-rs] Failed to load prebuilt binary from ${prebuiltPath}: ${err.message}`);
      }
    }
  }

  // Try root index.node (if built locally)
  try {
    return require("./index.node");
  } catch (err) {
    console.warn(
      `[dtln-rs] Native module not available for ${platform}-${arch}. ` +
      `Error: ${err.message}`
    );

    // Provide a fallback empty implementation
    return {
      dtln_create: function() {
        throw new Error(
          `dtln-rs native module is not available for ${platform}-${arch}. ` +
          `Please rebuild the module for your platform or install prebuilt binaries.`
        );
      },
      dtln_denoise: function() {
        throw new Error(
          `dtln-rs native module is not available for ${platform}-${arch}. ` +
          `Please rebuild the module for your platform or install prebuilt binaries.`
        );
      },
      dtln_stop: function() {
        throw new Error(
          `dtln-rs native module is not available for ${platform}-${arch}. ` +
          `Please rebuild the module for your platform or install prebuilt binaries.`
        );
      }
    };
  }
}

module.exports = loadNativeModule();
