# Ubuntu Server Build Commands

## Connect to Server

```bash
gcloud compute ssh --zone "us-central1-a" "embedding-service" --project "ai-services-464810"
```

## Build Commands (Run on Ubuntu Server)

```bash
# 1. Navigate to home directory
cd ~

# 2. Clone or update dtln-rs repository
if [ -d "dtln-rs" ]; then
    cd dtln-rs
    git pull
else
    git clone https://github.com/hayatialikeles/dtln-rs.git
    cd dtln-rs
fi

# 3. Run the build script
chmod +x scripts/build-linux-static.sh
./scripts/build-linux-static.sh

# 4. After successful build, commit the binary
git add prebuilt/linux-x64/
git commit -m "Add statically linked Linux x64 binary"
git push
```

## Alternative: Manual Build Steps

If the script fails, run these commands manually:

```bash
cd ~/dtln-rs

# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential curl git cmake libc++-dev libc++abi-dev libstdc++-10-dev pkg-config

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and build TensorFlow Lite
cd ~/
git clone --depth=1 https://github.com/tensorflow/tensorflow.git
cd tensorflow/tensorflow/lite
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DTFLITE_ENABLE_XNNPACK=ON -DCMAKE_POSITION_INDEPENDENT_CODE=ON
cmake --build . -j$(nproc)

# Copy TFLite libraries
cd ~/dtln-rs
mkdir -p tflite/lib
cp ~/tensorflow/tensorflow/lite/build/*.a tflite/lib/ 2>/dev/null || true
cp ~/tensorflow/tensorflow/lite/build/_deps/*/build/*.a tflite/lib/ 2>/dev/null || true
cp ~/tensorflow/tensorflow/lite/build/_deps/*/build/*/*.a tflite/lib/ 2>/dev/null || true

# Build dtln-rs
npm install --ignore-scripts
cargo clean
npx cargo-cp-artifact -a cdylib dtln-rs index.node -- cargo build -p dtln-rs --lib --release --target x86_64-unknown-linux-gnu
cp dtln.node.js dtln.js

# Verify
ldd index.node  # Should NOT show TensorFlow Lite
node -e "const d=require('./dtln.js').dtln_create(); console.log('SUCCESS'); require('./dtln.js').dtln_stop(d);"

# Copy to prebuilt
mkdir -p prebuilt/linux-x64
cp index.node prebuilt/linux-x64/
cp dtln.js prebuilt/linux-x64/

# Commit
git add prebuilt/linux-x64/
git commit -m "Add statically linked Linux x64 binary"
git push
```

## Verification

```bash
# Check binary size (should be ~5-10 MB)
ls -lh prebuilt/linux-x64/index.node

# Check dependencies (should NOT include TensorFlow Lite)
ldd prebuilt/linux-x64/index.node

# Test loading
cd ~/dtln-rs
node -e "
const dtln = require('./prebuilt/linux-x64/dtln.js');
const d = dtln.dtln_create();
console.log('✅ SUCCESS!');
dtln.dtln_stop(d);
"
```

## After Build - On macOS

```bash
# Pull the changes
cd ~/Desktop/projects/custom_package/noise\ suppression
git pull

# Verify the binary is there
ls -lh prebuilt/linux-x64/index.node

# Update version and publish
npm version minor  # 0.2.3 -> 0.3.0
npm publish --access public
```

## Troubleshooting

### Issue: Git authentication

```bash
# On Ubuntu server, configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@gmail.com"

# Use personal access token for HTTPS
# Or set up SSH key
```

### Issue: CMake fails

```bash
# Install newer CMake
sudo apt-get remove cmake
wget https://github.com/Kitware/CMake/releases/download/v3.28.0/cmake-3.28.0-linux-x86_64.sh
sudo sh cmake-3.28.0-linux-x86_64.sh --prefix=/usr/local --skip-license
```

### Issue: Out of disk space

```bash
# Clean up
sudo apt-get clean
docker system prune -a  # If Docker is installed
```

## Expected Output

```
✅ BUILD COMPLETE!

Binary location: /home/YOUR_USER/dtln-rs/prebuilt/linux-x64/index.node
Binary size: ~5-10 MB

Dependencies:
  linux-vdso.so.1
  libstdc++.so.6
  libgcc_s.so.1
  libc.so.6

✅ No TensorFlow Lite dependencies (statically linked)
```
