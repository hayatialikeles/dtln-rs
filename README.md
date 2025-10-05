# dtln-rs

dtln-rs provides near real-time noise suppression for audio.

Built on a Dual-Signal Transformation LSTM Network (DTLN) approach but designed to be lightweight and portable, this module provide an embeddable noise reduction solution. It is packaged as a small Rust project that produces a WebAssembly module, a native Rust target library, and a NodeJS native module that can be easily embedded in your clients, and interfaced with WebRTC.

## Description

This project is a noise reduction module that utilizes Rust and Node.js. It provides various scripts for building and installing the module on different platforms.

## Installation

### Automatic Installation (Recommended)

Simply run `npm install` and the module will automatically detect your platform and build accordingly:

```bash
npm install
```

This will automatically build the native module for your current platform (macOS, Linux, or Windows).

### Manual Platform-Specific Installation

If automatic installation fails, you can manually specify your platform:

#### macOS
- **Mac x86_64**: `npm run install-mac-x86_64`
- **Mac ARM64**: `npm run install-mac-arm64`

#### Linux
- **Linux x86_64**: `npm run install-linux-x64`
- **Linux ARM64**: `npm run install-linux-arm64`

#### Windows
- **Windows x86_64**: `npm run install-win-x64`
- **Windows ARM64**: `npm run install-win-arm64`

#### WebAssembly
- **WASM**: `npm run install-wasm`

### Generic Native Build
- **Auto-detect platform**: `npm run install-native`

## Build Steps

The following build steps are available in the `package.json`:

- **install-native**: Automatically detects your platform and architecture, then runs the appropriate installation script. Supports macOS (x64/ARM64), Linux (x64/ARM64), and Windows (x64/ARM64).

- **install-mac-x86_64**: Builds for x86_64 architecture on macOS
- **install-mac-arm64**: Builds for ARM64 architecture on macOS
- **install-linux-x64**: Builds for x86_64 architecture on Linux
- **install-linux-arm64**: Builds for ARM64 architecture on Linux
- **install-win-x64**: Builds for x86_64 architecture on Windows
- **install-win-arm64**: Builds for ARM64 architecture on Windows

- **install-wasm**: Builds the WebAssembly version of the module

- **build**: Builds the project using `cargo` with JSON-rendered diagnostics
- **build-debug**: Runs the `build` script in debug mode
- **build-release**: Runs the `build` script in release mode

- **test**: Runs the test suite using `cargo test`

## Supported Platforms

- **macOS**: x86_64, ARM64 (Apple Silicon)
- **Linux**: x86_64, ARM64
- **Windows**: x86_64, ARM64
- **WebAssembly**: WASM32

## Prerequisites

- **Rust**: Install from [rustup.rs](https://rustup.rs/)
- **Node.js**: Version 14 or higher
- **Platform-specific build tools**:
  - macOS: Xcode Command Line Tools
  - Linux: build-essential, gcc
  - Windows: Visual Studio Build Tools with C++ support

## Usage

### Quick Start

```javascript
const dtln = require('dtln-rs');

// Create denoiser instance
const denoiser = dtln.dtln_create();

// Prepare audio buffers (16kHz, mono, Float32Array)
const FRAME_SIZE = 512; // 32ms at 16kHz
const inputFrame = new Float32Array(FRAME_SIZE);
const outputFrame = new Float32Array(FRAME_SIZE);

// Fill inputFrame with your audio data...

// Process audio
const isStarved = dtln.dtln_denoise(denoiser, inputFrame, outputFrame);

// Use outputFrame (denoised audio)...

// Clean up when done
dtln.dtln_stop(denoiser);
```

### API Reference

#### `dtln_create()`
Creates a new DTLN denoiser instance.

**Returns:** Denoiser handle

**Example:**
```javascript
const denoiser = dtln.dtln_create();
```

#### `dtln_denoise(denoiser, inputSamples, outputSamples)`
Processes audio samples and removes noise.

**Parameters:**
- `denoiser`: Denoiser handle from `dtln_create()`
- `inputSamples`: Float32Array of input audio samples (16kHz, mono)
- `outputSamples`: Float32Array to receive denoised audio (same length as input)

**Returns:** Boolean indicating if processor is starved (processing slower than real-time)

**Example:**
```javascript
const inputFrame = new Float32Array(512);
const outputFrame = new Float32Array(512);
const isStarved = dtln.dtln_denoise(denoiser, inputFrame, outputFrame);

if (isStarved) {
  console.warn('Processor cannot keep up with real-time');
}
```

#### `dtln_stop(denoiser)`
Stops and cleans up the denoiser instance.

**Parameters:**
- `denoiser`: Denoiser handle to stop

**Example:**
```javascript
dtln.dtln_stop(denoiser);
```

### Audio Requirements

- **Sample Rate:** 16kHz (16000 Hz)
- **Format:** Mono (single channel)
- **Data Type:** Float32Array (-1.0 to 1.0)
- **Frame Size:** Typically 512 samples (32ms)

### Example: WebRTC Integration

```javascript
const dtln = require('dtln-rs');

class AudioDenoiser {
  constructor() {
    this.denoiser = dtln.dtln_create();
    this.frameSize = 512;
  }

  process(audioData) {
    // Ensure audio is 16kHz mono Float32Array
    const input = new Float32Array(audioData);
    const output = new Float32Array(input.length);

    // Process in chunks
    for (let i = 0; i < input.length; i += this.frameSize) {
      const chunk = input.slice(i, i + this.frameSize);
      const outChunk = new Float32Array(this.frameSize);

      dtln.dtln_denoise(this.denoiser, chunk, outChunk);

      output.set(outChunk, i);
    }

    return output;
  }

  destroy() {
    dtln.dtln_stop(this.denoiser);
  }
}

// Usage
const denoiser = new AudioDenoiser();
const cleanAudio = denoiser.process(noisyAudio);
denoiser.destroy();
```

### Running the Example

Try the included example:

```bash
node example.js
```

This demonstrates basic usage with simulated audio data.

## Contributing

We welcome contributions to the dtln-rs project! If you would like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and commit them with clear and concise messages.
4. Push your changes to your fork.
5. Submit a pull request to the main repository.

Please ensure that your code adheres to the project's coding standards and includes appropriate tests.

## Support

If you encounter any issues or have questions, please open an issue in the GitHub repository. We will do our best to assist you.

## Author

Jason Thomas

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
