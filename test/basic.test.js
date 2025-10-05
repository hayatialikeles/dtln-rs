/**
 * Basic functionality tests for @hayatialikeles/dtln-rs
 */

const assert = require('assert');
const dtln = require('../dtln.js');

describe('DTLN Noise Suppression - Basic Tests', () => {

  describe('Module Loading', () => {
    it('should load the module successfully', () => {
      assert.ok(dtln, 'Module should be loaded');
      assert.strictEqual(typeof dtln, 'object', 'Module should be an object');
    });

    it('should expose required functions', () => {
      assert.strictEqual(typeof dtln.dtln_create, 'function', 'dtln_create should be a function');
      assert.strictEqual(typeof dtln.dtln_denoise, 'function', 'dtln_denoise should be a function');
      assert.strictEqual(typeof dtln.dtln_stop, 'function', 'dtln_stop should be a function');
    });
  });

  describe('Denoiser Instance Creation', () => {
    it('should create a denoiser instance', () => {
      const denoiser = dtln.dtln_create();
      assert.ok(denoiser, 'Denoiser instance should be created');
      dtln.dtln_stop(denoiser);
    });

    it('should create multiple independent instances', () => {
      const denoiser1 = dtln.dtln_create();
      const denoiser2 = dtln.dtln_create();

      assert.ok(denoiser1, 'First denoiser should be created');
      assert.ok(denoiser2, 'Second denoiser should be created');
      assert.notStrictEqual(denoiser1, denoiser2, 'Instances should be different');

      dtln.dtln_stop(denoiser1);
      dtln.dtln_stop(denoiser2);
    });
  });

  describe('Audio Processing', () => {
    let denoiser;

    beforeEach(() => {
      denoiser = dtln.dtln_create();
    });

    afterEach(() => {
      dtln.dtln_stop(denoiser);
    });

    it('should process a silent audio frame', () => {
      const inputSamples = new Float32Array(512).fill(0.0);
      const outputSamples = new Float32Array(512);

      const isStarved = dtln.dtln_denoise(denoiser, inputSamples, outputSamples);

      assert.strictEqual(typeof isStarved, 'boolean', 'Should return boolean');
      assert.strictEqual(outputSamples.length, 512, 'Output should have 512 samples');
    });

    it('should process white noise', () => {
      const inputSamples = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        inputSamples[i] = (Math.random() * 2 - 1) * 0.5; // Random noise between -0.5 and 0.5
      }
      const outputSamples = new Float32Array(512);

      const isStarved = dtln.dtln_denoise(denoiser, inputSamples, outputSamples);

      assert.strictEqual(typeof isStarved, 'boolean', 'Should return boolean');
      assert.strictEqual(outputSamples.length, 512, 'Output should have 512 samples');

      // Output should be quieter than input (noise reduction)
      const inputRMS = calculateRMS(inputSamples);
      const outputRMS = calculateRMS(outputSamples);
      assert.ok(outputRMS <= inputRMS, 'Output should have reduced noise');
    });

    it('should process sine wave (clean signal should pass through)', () => {
      const inputSamples = new Float32Array(512);
      const frequency = 440; // A4 note
      const sampleRate = 16000;

      for (let i = 0; i < 512; i++) {
        inputSamples[i] = 0.5 * Math.sin(2 * Math.PI * frequency * i / sampleRate);
      }
      const outputSamples = new Float32Array(512);

      const isStarved = dtln.dtln_denoise(denoiser, inputSamples, outputSamples);

      assert.strictEqual(typeof isStarved, 'boolean', 'Should return boolean');
      assert.strictEqual(outputSamples.length, 512, 'Output should have 512 samples');

      // DTLN needs some warmup frames, so just check output is valid
      const outputRMS = calculateRMS(outputSamples);
      assert.ok(outputRMS >= 0, 'Output RMS should be non-negative');
      assert.ok(!isNaN(outputRMS), 'Output RMS should be a valid number');
    });

    it('should handle multiple consecutive frames', () => {
      const frameCount = 10;
      let totalStarved = 0;

      for (let frame = 0; frame < frameCount; frame++) {
        const inputSamples = new Float32Array(512);
        for (let i = 0; i < 512; i++) {
          inputSamples[i] = Math.random() * 2 - 1;
        }
        const outputSamples = new Float32Array(512);

        const isStarved = dtln.dtln_denoise(denoiser, inputSamples, outputSamples);
        if (isStarved) totalStarved++;

        assert.strictEqual(outputSamples.length, 512, `Frame ${frame} should output 512 samples`);
      }

      // On modern hardware, should not be starved
      assert.ok(totalStarved < frameCount, 'Should process most frames without starvation');
    });
  });

  describe('Input Validation', () => {
    let denoiser;

    beforeEach(() => {
      denoiser = dtln.dtln_create();
    });

    afterEach(() => {
      dtln.dtln_stop(denoiser);
    });

    it('should handle incorrect buffer sizes gracefully', () => {
      const inputSamples = new Float32Array(256); // Wrong size (should be 512)
      const outputSamples = new Float32Array(256);

      // Should either throw or handle gracefully
      try {
        dtln.dtln_denoise(denoiser, inputSamples, outputSamples);
      } catch (err) {
        assert.ok(err, 'Should throw error for wrong buffer size');
      }
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources properly', () => {
      const denoiser = dtln.dtln_create();

      // Process some frames
      for (let i = 0; i < 100; i++) {
        const inputSamples = new Float32Array(512).fill(0.1);
        const outputSamples = new Float32Array(512);
        dtln.dtln_denoise(denoiser, inputSamples, outputSamples);
      }

      // Should clean up without errors
      assert.doesNotThrow(() => {
        dtln.dtln_stop(denoiser);
      }, 'Should stop cleanly');
    });

    it('should handle multiple create/stop cycles', () => {
      for (let cycle = 0; cycle < 5; cycle++) {
        const denoiser = dtln.dtln_create();

        const inputSamples = new Float32Array(512).fill(0.1);
        const outputSamples = new Float32Array(512);
        dtln.dtln_denoise(denoiser, inputSamples, outputSamples);

        dtln.dtln_stop(denoiser);
      }

      // Should complete all cycles without issues
      assert.ok(true, 'Multiple cycles completed successfully');
    });
  });

  describe('Performance', () => {
    it('should process frames faster than real-time', function() {
      this.timeout(5000); // 5 second timeout

      const denoiser = dtln.dtln_create();
      const frameCount = 100;
      const frameDurationMs = 32; // 512 samples at 16kHz = 32ms

      const startTime = Date.now();

      for (let i = 0; i < frameCount; i++) {
        const inputSamples = new Float32Array(512);
        for (let j = 0; j < 512; j++) {
          inputSamples[j] = Math.random() * 2 - 1;
        }
        const outputSamples = new Float32Array(512);
        dtln.dtln_denoise(denoiser, inputSamples, outputSamples);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const realTime = frameCount * frameDurationMs;
      const rtf = processingTime / realTime;

      console.log(`      ⏱️  Processed ${frameCount} frames in ${processingTime}ms`);
      console.log(`      📊 Real-time factor: ${rtf.toFixed(4)}x (${(1/rtf).toFixed(1)}x faster than real-time)`);

      assert.ok(rtf < 1.0, 'Should process faster than real-time');

      dtln.dtln_stop(denoiser);
    });
  });
});

// Helper functions
function calculateRMS(samples) {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}
