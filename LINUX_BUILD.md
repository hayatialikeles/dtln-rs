# Linux Build Instructions

## Problem

The current Linux x64 binary has dynamic TensorFlow Lite linking issues:
```
undefined symbol: TfLiteInterpreterDelete
```

## Solution 1: Rebuild on Ubuntu Server (Recommended)

### Prerequisites on Ubuntu

```bash
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
```

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Build TensorFlow Lite Statically

```bash
cd ~/dtln-rs

# Clone TensorFlow Lite
git clone --depth=1 https://github.com/tensorflow/tensorflow.git tflite-src
cd tflite-src

# Build static libraries
cd tensorflow/lite
mkdir build && cd build

cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=OFF \
  -DTFLITE_ENABLE_XNNPACK=ON \
  -DCMAKE_POSITION_INDEPENDENT_CODE=ON

cmake --build . -j$(nproc)

# Copy static libraries
cd ~/dtln-rs
mkdir -p tflite/lib
cp tflite-src/tensorflow/lite/build/*.a tflite/lib/
cp tflite-src/tensorflow/lite/build/_deps/*/build/*.a tflite/lib/ 2>/dev/null || true
```

### Build dtln-rs

```bash
cd ~/dtln-rs
npm install
npm run install-linux-x64

# Verify
ls -lh index.node
ldd index.node  # Should show NO TensorFlow Lite dependencies
```

### Copy to Package

```bash
mkdir -p prebuilt/linux-x64
cp index.node prebuilt/linux-x64/
cp dtln.js prebuilt/linux-x64/
```

## Solution 2: Docker Build (Isolated Environment)

### Dockerfile for Building

```dockerfile
FROM ubuntu:22.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    cmake \
    libc++-dev \
    libc++abi-dev \
    libstdc++-10-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

WORKDIR /build

# Clone and build TensorFlow Lite
RUN git clone --depth=1 https://github.com/tensorflow/tensorflow.git tflite-src
RUN cd tflite-src/tensorflow/lite && \
    mkdir build && cd build && \
    cmake .. \
      -DCMAKE_BUILD_TYPE=Release \
      -DBUILD_SHARED_LIBS=OFF \
      -DTFLITE_ENABLE_XNNPACK=ON \
      -DCMAKE_POSITION_INDEPENDENT_CODE=ON && \
    cmake --build . -j$(nproc)

# Copy project files
COPY . /build/dtln-rs
WORKDIR /build/dtln-rs

# Setup TFLite libraries
RUN mkdir -p tflite/lib && \
    cp /build/tflite-src/tensorflow/lite/build/*.a tflite/lib/ && \
    cp /build/tflite-src/tensorflow/lite/build/_deps/*/build/*.a tflite/lib/ 2>/dev/null || true

# Build dtln-rs
RUN npm install
RUN npm run install-linux-x64

# Verify static linking
RUN ldd index.node || true
RUN ls -lh index.node

# Extract binary
FROM scratch AS export
COPY --from=builder /build/dtln-rs/index.node /
COPY --from=builder /build/dtln-rs/dtln.js /
```

### Build and Extract

```bash
# Build
docker build -t dtln-rs-builder -f Dockerfile.build .

# Extract binary
docker create --name temp dtln-rs-builder
docker cp temp:/index.node ./prebuilt/linux-x64/
docker cp temp:/dtln.js ./prebuilt/linux-x64/
docker rm temp

# Verify
file prebuilt/linux-x64/index.node
ldd prebuilt/linux-x64/index.node  # Should show minimal dependencies
```

## Solution 3: Use Prebuilt TFLite Archive

### Create Linux TFLite Archive

On a Linux machine with TFLite built:

```bash
cd ~/dtln-rs

# Create archive structure
mkdir -p tflite-package/lib
mkdir -p tflite-package/include

# Copy libraries
cp tflite-src/tensorflow/lite/build/*.a tflite-package/lib/
cp tflite-src/tensorflow/lite/build/_deps/*/build/*.a tflite-package/lib/ 2>/dev/null || true

# Copy headers
cp -r tflite-src/tensorflow/lite/*.h tflite-package/include/

# Create archive
cd tflite-package
tar -cjf ../tflite/tflite-prebuilt.linux.x64.tar.bz2 .
```

Then build normally:
```bash
npm run install-linux-x64
```

## Verification

### Check Static Linking

```bash
# Should show NO TensorFlow symbols as UNDEFINED
nm -D prebuilt/linux-x64/index.node | grep TfLite

# Should show minimal dependencies
ldd prebuilt/linux-x64/index.node
```

Expected output:
```
linux-vdso.so.1
libstdc++.so.6 => /lib/x86_64-linux-gnu/libstdc++.so.6
libgcc_s.so.1 => /lib/x86_64-linux-gnu/libgcc_s.so.1
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
```

### Test Binary

```bash
cd prebuilt/linux-x64
node -e "
const dtln = require('./dtln.js');
const d = dtln.dtln_create();
console.log('✅ SUCCESS!');
dtln.dtln_stop(d);
"
```

## Troubleshooting

### Issue: `undefined symbol: TfLiteInterpreterDelete`

**Cause:** TensorFlow Lite is dynamically linked but library not available at runtime.

**Solution:** Rebuild with static linking (Solution 1 or 2 above).

### Issue: `cannot find -ltensorflow-lite`

**Cause:** TFLite libraries not found.

**Solution:**
```bash
# Ensure libraries exist
ls -la tflite/lib/

# Check build.rs is finding them
cargo clean
cargo build --release --verbose 2>&1 | grep "rustc-link"
```

### Issue: Build succeeds but binary crashes

**Cause:** ABI incompatibility or missing symbols.

**Solution:**
```bash
# Check for undefined symbols
nm -u index.node | grep TfLite

# Use statically linked libc++ (add to build.rs)
println!("cargo:rustc-link-lib=static=c++");
println!("cargo:rustc-link-lib=static=c++abi");
```

## Current Status

The macOS ARM64 binary is correctly built with static TFLite linking.
The Linux x64 binary needs to be rebuilt following one of the solutions above.

## Quick Workaround for Users

Until a new binary is published, users can build from source:

```bash
# In your project
npm install @hayatialikeles/dtln-rs --build-from-source
```

This requires Rust and TFLite build dependencies on the target system.
