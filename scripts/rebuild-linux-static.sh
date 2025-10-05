#!/bin/bash
# Rebuild Linux binary with static TFLite linking

set -e

echo "🔧 Rebuilding Linux x64 binary with static TFLite..."

# Create Dockerfile for static build
cat > Dockerfile.linux-static <<'EOF'
FROM --platform=linux/amd64 rust:1.75-slim-bullseye

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    curl \
    tar \
    bzip2 \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy project files
COPY . .

# Build with static linking
RUN cargo build --release --lib --target x86_64-unknown-linux-gnu && \
    npx cargo-cp-artifact -a cdylib dtln-rs index.node -- \
    cargo build --release --lib --target x86_64-unknown-linux-gnu

CMD ["bash"]
EOF

# Build Docker image
docker build -f Dockerfile.linux-static -t dtln-rs-builder-static .

# Extract binary
docker run --rm \
    -v "$(pwd)/prebuilt/linux-x64:/output" \
    dtln-rs-builder-static \
    bash -c "cp /build/index.node /output/ && cp /build/dtln.node.js /output/dtln.js"

# Cleanup
rm Dockerfile.linux-static
docker rmi dtln-rs-builder-static

echo "✅ Linux binary rebuilt!"
echo "📁 Location: $(pwd)/prebuilt/linux-x64/index.node"

# Check if it's truly static
docker run --rm -v "$(pwd)/prebuilt/linux-x64:/test" --platform=linux/amd64 debian:bullseye-slim \
    bash -c "apt-get update -qq && apt-get install -y -qq file > /dev/null 2>&1 && file /test/index.node && echo '' && echo 'Dependencies:' && (ldd /test/index.node 2>&1 || echo 'Static binary - no dependencies')"
