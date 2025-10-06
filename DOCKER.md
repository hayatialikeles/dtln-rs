# Docker Integration Guide

## Quick Fix for package-lock.json Error

If you see this error when building with Docker:

```
Invalid: lock file's @hayatialikeles/dtln-rs@0.2.0 does not satisfy @hayatialikeles/dtln-rs@0.2.1
```

**Solution:**

```bash
# Update package-lock.json locally
npm install @hayatialikeles/dtln-rs@latest

# Commit the updated lock file
git add package-lock.json package.json
git commit -m "Update @hayatialikeles/dtln-rs to latest"

# Rebuild Docker image
docker-compose build --no-cache
```

---

## Dockerfile Best Practices

### Example Dockerfile for Node.js with dtln-rs

```dockerfile
FROM node:18-slim

WORKDIR /app

# Install system dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build if needed
RUN npm run build --if-present

# Run application
CMD ["node", "dist/index.js"]
```

### Multi-stage Build (Recommended)

```dockerfile
# Build stage
FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Run application
CMD ["node", "dist/index.js"]
```

---

## Docker Compose Configuration

### Basic docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    volumes:
      # Don't mount node_modules from host
      - .:/app
      - /app/node_modules
    restart: unless-stopped
```

### With Health Check

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    healthcheck:
      test: ["CMD", "node", "-e", "require('@hayatialikeles/dtln-rs')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
```

---

## Platform-Specific Builds

### Building for Linux x64 (Most Common)

```dockerfile
FROM node:18-slim

# Explicitly set platform
ENV TARGETPLATFORM=linux/amd64

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Verify dtln-rs installation
RUN node -e "const dtln = require('@hayatialikeles/dtln-rs'); console.log('✅ dtln-rs loaded successfully');"

COPY . .
CMD ["node", "dist/index.js"]
```

### Multi-platform Support

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      platforms:
        - linux/amd64
        - linux/arm64
    image: myapp:latest
```

Build command:
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest .
```

---

## Troubleshooting

### 1. Binary Not Found Error

```
Error: dtln-rs native module is not available for linux-x64
```

**Solution:**
```dockerfile
# Add this after npm install
RUN ls -la node_modules/@hayatialikeles/dtln-rs/
RUN ls -la node_modules/@hayatialikeles/dtln-rs/prebuilt/linux-x64/ || echo "Prebuilt not found"
RUN node scripts/verify-install.js
```

### 2. Permission Errors

```dockerfile
# Fix file permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node
```

### 3. Missing System Libraries

```dockerfile
# Install required system libraries
RUN apt-get update && apt-get install -y \
    libc++-dev \
    libc++abi-dev \
    libstdc++-10-dev \
    && rm -rf /var/lib/apt/lists/*
```

---

## Verification Script

Create `scripts/verify-install.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying @hayatialikeles/dtln-rs installation...\n');

const platform = process.platform;
const arch = process.arch;
const platformKey = `${platform}-${arch}`;

console.log(`Platform: ${platformKey}`);

const packagePath = path.join(process.cwd(), 'node_modules', '@hayatialikeles', 'dtln-rs');

// Check package exists
if (!fs.existsSync(packagePath)) {
  console.error('❌ Package not found');
  process.exit(1);
}

// Check prebuilt binary
const prebuiltPath = path.join(packagePath, 'prebuilt', platformKey, 'index.node');
if (fs.existsSync(prebuiltPath)) {
  const stats = fs.statSync(prebuiltPath);
  console.log(`✅ Prebuilt binary found: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

// Check root binary
const rootBinary = path.join(packagePath, 'index.node');
if (fs.existsSync(rootBinary)) {
  const stats = fs.statSync(rootBinary);
  console.log(`✅ Root binary found: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

// Try to load module
try {
  const dtln = require('@hayatialikeles/dtln-rs');
  const denoiser = dtln.dtln_create();
  console.log('✅ Module loaded successfully');

  // Test processing
  const input = new Float32Array(512);
  const output = new Float32Array(512);
  dtln.dtln_denoise(denoiser, input, output);
  console.log('✅ Processing test passed');

  dtln.dtln_stop(denoiser);
  console.log('\n✅ All checks passed!');
  process.exit(0);
} catch (err) {
  console.error('❌ Module load failed:', err.message);
  process.exit(1);
}
```

Add to Dockerfile:
```dockerfile
COPY scripts/verify-install.js ./scripts/
RUN node scripts/verify-install.js
```

---

## CI/CD Pipeline Example

### GitHub Actions

```yaml
name: Docker Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Build and test
        run: |
          docker-compose build
          docker-compose run --rm app node scripts/verify-install.js

      - name: Run tests
        run: docker-compose run --rm app npm test
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `npm ci` lock file mismatch | Run `npm install @hayatialikeles/dtln-rs@latest` locally and commit |
| Binary not found in Docker | Check platform matches (`linux/amd64`), verify prebuilt exists |
| Slow Docker builds | Use multi-stage builds, layer caching |
| Permission errors | Use `USER node` directive after installation |
| Module load fails | Install system dependencies (`libc++`, `libstdc++`) |

---

## Performance Tips

1. **Cache npm dependencies:**
   ```dockerfile
   # Copy package files first
   COPY package*.json ./
   RUN npm ci --only=production

   # Then copy application code
   COPY . .
   ```

2. **Use .dockerignore:**
   ```
   node_modules
   npm-debug.log
   .git
   .gitignore
   README.md
   .env
   dist
   ```

3. **Minimize image size:**
   ```dockerfile
   # Use slim base image
   FROM node:18-slim

   # Remove unnecessary files
   RUN apt-get clean && rm -rf /var/lib/apt/lists/*
   ```

---

## Support

- 📦 **npm Package**: https://www.npmjs.com/package/@hayatialikeles/dtln-rs
- 🐛 **Issues**: https://github.com/hayatialikeles/dtln-rs/issues
- 📧 **Email**: hayati.alikeles@gmail.com

---

**Last Updated:** 2025-10-06
**Package Version:** 0.2.1+
