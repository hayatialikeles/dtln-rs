#!/bin/bash
# Build dtln-rs for Linux using Docker

set -e

echo "🐳 Building dtln-rs for Linux x64 using Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Build Docker image
echo "📦 Building Docker image..."
docker build -f Dockerfile.linux -t dtln-rs-builder-linux .

# Run container and build
echo "🔨 Building binary in container..."
docker run --rm \
    -v "$(pwd)/target:/build/target" \
    -v "$(pwd)/prebuilt:/build/prebuilt" \
    dtln-rs-builder-linux \
    bash -c "
        set -e
        echo '🔧 Installing Node dependencies...'
        npm install --ignore-scripts

        echo '🦀 Building Rust binary for x64...'
        npx cargo-cp-artifact -a cdylib dtln-rs index.node -- \
            cargo build -p dtln-rs --lib --release \
            --message-format=json-render-diagnostics \
            --target x86_64-unknown-linux-gnu

        echo '📋 Copying artifacts...'
        cp dtln.node.js dtln.js

        # Copy to prebuilt directory
        mkdir -p /build/prebuilt/linux-x64
        cp index.node /build/prebuilt/linux-x64/
        cp dtln.js /build/prebuilt/linux-x64/

        echo '✅ Build completed successfully!'
    "

echo ""
echo "✅ Linux x64 binary built successfully!"
echo "📁 Binary location: $(pwd)/prebuilt/linux-x64/index.node"
