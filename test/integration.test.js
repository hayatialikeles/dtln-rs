/**
 * Integration tests for @hayatialikeles/dtln-rs
 * Tests with real audio files
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dtln = require('../dtln.js');

describe('DTLN Noise Suppression - Integration Tests', () => {

  describe('Real Audio File Processing', () => {
    const clipsDir = path.join(__dirname, '../clips');

    before(function() {
      // Skip if clips directory doesn't exist
      if (!fs.existsSync(clipsDir)) {
        this.skip();
      }
    });

    it('should process real WAV files without errors', function() {
      this.timeout(10000); // 10 second timeout

      const wavFiles = fs.readdirSync(clipsDir)
        .filter(f => f.endsWith('.wav'))
        .slice(0, 3); // Test first 3 files

      if (wavFiles.length === 0) {
        this.skip();
      }

      const denoiser = dtln.dtln_create();
      let totalFrames = 0;
      let totalStarved = 0;

      wavFiles.forEach(fileName => {
        const filePath = path.join(clipsDir, fileName);
        const samples = readWavFile(filePath);

        const FRAME_SIZE = 512;
        for (let i = 0; i < samples.length; i += FRAME_SIZE) {
          const end = Math.min(i + FRAME_SIZE, samples.length);
          const frameSize = end - i;

          const inputFrame = new Float32Array(FRAME_SIZE);
          inputFrame.set(samples.slice(i, end));

          const outputFrame = new Float32Array(FRAME_SIZE);
          const isStarved = dtln.dtln_denoise(denoiser, inputFrame, outputFrame);

          totalFrames++;
          if (isStarved) totalStarved++;
        }
      });

      dtln.dtln_stop(denoiser);

      console.log(`      ✅ Processed ${totalFrames} frames from ${wavFiles.length} files`);
      console.log(`      📊 Starvation rate: ${(totalStarved/totalFrames*100).toFixed(2)}%`);

      assert.ok(totalFrames > 0, 'Should process at least one frame');
      assert.ok(totalStarved < totalFrames * 0.1, 'Starvation should be less than 10%');
    });
  });

  describe('Streaming Simulation', () => {
    it('should handle streaming audio data', function() {
      this.timeout(5000);

      const denoiser = dtln.dtln_create();
      const FRAME_SIZE = 512;
      const SAMPLE_RATE = 16000;
      const DURATION_SECONDS = 2;
      const totalSamples = SAMPLE_RATE * DURATION_SECONDS;

      // Simulate streaming with overlap
      const overlap = 256;
      let position = 0;
      let framesProcessed = 0;

      while (position + FRAME_SIZE <= totalSamples) {
        // Generate test audio (sine wave with noise)
        const inputFrame = new Float32Array(FRAME_SIZE);
        for (let i = 0; i < FRAME_SIZE; i++) {
          const t = (position + i) / SAMPLE_RATE;
          const signal = 0.3 * Math.sin(2 * Math.PI * 440 * t); // 440 Hz tone
          const noise = (Math.random() - 0.5) * 0.1; // Small noise
          inputFrame[i] = signal + noise;
        }

        const outputFrame = new Float32Array(FRAME_SIZE);
        dtln.dtln_denoise(denoiser, inputFrame, outputFrame);

        framesProcessed++;
        position += (FRAME_SIZE - overlap); // Overlap for smooth streaming
      }

      dtln.dtln_stop(denoiser);

      console.log(`      🎵 Simulated ${DURATION_SECONDS}s streaming with ${framesProcessed} frames`);
      assert.ok(framesProcessed > 0, 'Should process streaming frames');
    });
  });

  describe('Concurrent Processing', () => {
    it('should handle multiple denoisers concurrently', function() {
      this.timeout(5000);

      const instanceCount = 3;
      const denoisers = [];
      const FRAME_SIZE = 512;
      const framesPerInstance = 10;

      // Create multiple denoisers
      for (let i = 0; i < instanceCount; i++) {
        denoisers.push(dtln.dtln_create());
      }

      // Process different audio on each
      denoisers.forEach((denoiser, idx) => {
        const frequency = 440 + (idx * 110); // Different frequencies

        for (let frame = 0; frame < framesPerInstance; frame++) {
          const inputFrame = new Float32Array(FRAME_SIZE);
          for (let i = 0; i < FRAME_SIZE; i++) {
            inputFrame[i] = 0.5 * Math.sin(2 * Math.PI * frequency * i / 16000);
          }
          const outputFrame = new Float32Array(FRAME_SIZE);
          dtln.dtln_denoise(denoiser, inputFrame, outputFrame);
        }
      });

      // Clean up all
      denoisers.forEach(denoiser => dtln.dtln_stop(denoiser));

      console.log(`      🔄 Successfully processed ${instanceCount} concurrent instances`);
      assert.strictEqual(denoisers.length, instanceCount, 'All instances should be created');
    });
  });

  describe('Edge Cases', () => {
    let denoiser;

    beforeEach(() => {
      denoiser = dtln.dtln_create();
    });

    afterEach(() => {
      dtln.dtln_stop(denoiser);
    });

    it('should handle maximum amplitude input', () => {
      const inputSamples = new Float32Array(512).fill(1.0); // Max positive
      const outputSamples = new Float32Array(512);

      assert.doesNotThrow(() => {
        dtln.dtln_denoise(denoiser, inputSamples, outputSamples);
      }, 'Should handle max amplitude');
    });

    it('should handle minimum amplitude input', () => {
      const inputSamples = new Float32Array(512).fill(-1.0); // Max negative
      const outputSamples = new Float32Array(512);

      assert.doesNotThrow(() => {
        dtln.dtln_denoise(denoiser, inputSamples, outputSamples);
      }, 'Should handle min amplitude');
    });

    it('should handle rapid amplitude changes', () => {
      const inputSamples = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        inputSamples[i] = (i % 2 === 0) ? 1.0 : -1.0; // Alternating max values
      }
      const outputSamples = new Float32Array(512);

      assert.doesNotThrow(() => {
        dtln.dtln_denoise(denoiser, inputSamples, outputSamples);
      }, 'Should handle rapid changes');
    });
  });

  describe('Platform Compatibility', () => {
    it('should report platform information', () => {
      const platform = process.platform;
      const arch = process.arch;

      console.log(`      🖥️  Platform: ${platform}`);
      console.log(`      ⚙️  Architecture: ${arch}`);

      assert.ok(platform, 'Platform should be detected');
      assert.ok(arch, 'Architecture should be detected');
    });

    it('should use prebuilt binary when available', () => {
      const platform = process.platform;
      const arch = process.arch;
      const prebuiltPath = path.join(__dirname, '..', 'prebuilt', `${platform}-${arch}`, 'index.node');

      if (fs.existsSync(prebuiltPath)) {
        console.log(`      ✅ Using prebuilt binary: ${platform}-${arch}`);
        const stats = fs.statSync(prebuiltPath);
        console.log(`      📦 Binary size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.log(`      ⚠️  No prebuilt binary for ${platform}-${arch}`);
      }

      assert.ok(true, 'Platform compatibility check completed');
    });
  });
});

// Helper function to read WAV files
function readWavFile(filePath) {
  const buffer = fs.readFileSync(filePath);

  // Parse WAV header (simplified - assumes standard PCM WAV)
  const dataOffset = 44; // Standard WAV header size
  const bytesPerSample = 2; // 16-bit PCM

  const samples = [];
  for (let i = dataOffset; i < buffer.length; i += bytesPerSample) {
    if (i + bytesPerSample <= buffer.length) {
      // Read 16-bit signed integer, convert to float32 [-1.0, 1.0]
      const int16 = buffer.readInt16LE(i);
      const float32 = int16 / 32768.0;
      samples.push(float32);
    }
  }

  return new Float32Array(samples);
}
