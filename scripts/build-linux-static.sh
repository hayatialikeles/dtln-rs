#!/bin/bash
# Script to build dtln-rs on Ubuntu with static TensorFlow Lite linking
set -e

echo "🚀 Building dtln-rs for Linux x64 with static TFLite linking"
echo "============================================================"

# Check if we're on Linux
if [[ "$(uname)" != "Linux" ]]; then
    echo "❌ This script must be run on Linux"
    exit 1
fi

# Navigate to project directory
cd /home/siriusgrupsoftware/dtln-rs || {
    echo "❌ dtln-rs directory not found at ~/dtln-rs"
    echo "💡 Clone it first: git clone YOUR_REPO_URL ~/dtln-rs"
    exit 1
}

echo ""
echo "📋 Step 1: Install build dependencies"
echo "--------------------------------------"
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    curl \
    git \
    cmake \
    libc++-dev \
    libc++abi-dev \
    libstdc++-10-dev \
    pkg-config

echo ""
echo "🦀 Step 2: Install Rust (if not installed)"
echo "-------------------------------------------"
if ! command -v cargo &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
else
    echo "✅ Rust already installed: $(rustc --version)"
fi

echo ""
echo "📦 Step 3: Install Node.js (if not installed)"
echo "----------------------------------------------"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

echo ""
echo "📥 Step 4: Clone and build TensorFlow Lite"
echo "-------------------------------------------"
cd /home/siriusgrupsoftware/
if [ ! -d "tensorflow" ]; then
    echo "Cloning TensorFlow..."
    git clone --depth=1 https://github.com/tensorflow/tensorflow.git
else
    echo "✅ TensorFlow already cloned"
fi

cd tensorflow/tensorflow/lite
if [ ! -d "build" ]; then
    mkdir build
fi
cd build

echo "Building TensorFlow Lite with static libraries..."
cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF \
    -DTFLITE_ENABLE_XNNPACK=ON \
    -DCMAKE_POSITION_INDEPENDENT_CODE=ON

cmake --build . -j$(nproc)

echo "✅ TensorFlow Lite built successfully"

echo ""
echo "📂 Step 5: Copy TFLite libraries to dtln-rs"
echo "--------------------------------------------"
cd /home/siriusgrupsoftware/dtln-rs
mkdir -p tflite/lib

echo "Copying static libraries..."
cp ~/tensorflow/tensorflow/lite/build/*.a tflite/lib/ 2>/dev/null || true
cp ~/tensorflow/tensorflow/lite/build/_deps/*/build/*.a tflite/lib/ 2>/dev/null || true
cp ~/tensorflow/tensorflow/lite/build/_deps/*/build/*/*.a tflite/lib/ 2>/dev/null || true

echo "Libraries in tflite/lib:"
ls -lh tflite/lib/ | head -20

echo ""
echo "🔨 Step 6: Build dtln-rs native module"
echo "---------------------------------------"
npm install --ignore-scripts

echo "Building for linux-x64..."
cargo clean
npx cargo-cp-artifact -a cdylib dtln-rs index.node -- \
    cargo build -p dtln-rs --lib --release --target x86_64-unknown-linux-gnu

cp dtln.node.js dtln.js

echo "✅ Build completed"

echo ""
echo "✅ Step 7: Verify static linking"
echo "---------------------------------"
echo "Binary size:"
ls -lh index.node

echo ""
echo "Dependencies (should NOT include TensorFlow Lite):"
ldd index.node

echo ""
echo "Checking for TensorFlow symbols:"
if nm -D index.node | grep -i tflite > /dev/null 2>&1; then
    echo "⚠️  WARNING: TensorFlow Lite symbols found as UNDEFINED - dynamic linking detected!"
    nm -D index.node | grep -i tflite | head -10
    echo ""
    echo "❌ Build failed - TFLite not statically linked"
    exit 1
else
    echo "✅ No undefined TensorFlow Lite symbols - static linking successful!"
fi

echo ""
echo "🧪 Step 8: Test the binary"
echo "--------------------------"
node -e "
const dtln = require('./dtln.js');
console.log('Creating denoiser...');
const d = dtln.dtln_create();
console.log('✅ Denoiser created successfully!');

const input = new Float32Array(512);
const output = new Float32Array(512);
const isStarved = dtln.dtln_denoise(d, input, output);
console.log('✅ Processing test passed!');

dtln.dtln_stop(d);
console.log('✅ Cleanup successful!');
console.log('');
console.log('🎉 ALL TESTS PASSED! Binary is working correctly.');
"

echo ""
echo "📦 Step 9: Copy to prebuilt directory"
echo "--------------------------------------"
mkdir -p prebuilt/linux-x64
cp index.node prebuilt/linux-x64/
cp dtln.js prebuilt/linux-x64/

echo "✅ Binary copied to prebuilt/linux-x64/"
ls -lh prebuilt/linux-x64/

echo ""
echo "============================================================"
echo "✅ BUILD COMPLETE!"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. Commit changes: git add prebuilt/linux-x64/"
echo "2. Push to repository: git push"
echo "3. On macOS, pull and publish: npm version patch && npm publish"
echo ""
echo "Binary location: $(pwd)/prebuilt/linux-x64/index.node"
