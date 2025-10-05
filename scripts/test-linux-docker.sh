#!/bin/bash
# Test dtln-rs package on Linux using Docker

set -e

echo "🐧 Testing dtln-rs on Linux (Docker)..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Create a simple test Dockerfile
cat > Dockerfile.test <<'EOF'
FROM --platform=linux/amd64 node:18-slim

WORKDIR /test

# Copy the package tarball
COPY dtln-rs-0.1.0.tgz .

# Install the package
RUN npm install --ignore-scripts dtln-rs-0.1.0.tgz

# Copy test script and clips
COPY test-linux.js .
COPY clips/ ./clips/

CMD ["node", "test-linux.js"]
EOF

echo "📦 Building test Docker image (linux/amd64)..."
docker build -f Dockerfile.test -t dtln-rs-test-linux .

echo ""
echo "🧪 Running tests in Linux container..."
echo "─────────────────────────────────────────────"

docker run --rm \
    -v "$(pwd)/output-linux:/test/output" \
    dtln-rs-test-linux

echo ""
echo "✅ Linux test completed!"
echo "📁 Output files saved to: $(pwd)/output-linux/"

# Cleanup
rm -f Dockerfile.test
docker rmi dtln-rs-test-linux 2>/dev/null || true

echo ""
echo "🎉 Test successful!"
