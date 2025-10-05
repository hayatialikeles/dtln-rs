/**
 * TypeScript example for @hayatialikeles/dtln-rs
 * Demonstrates real-time noise suppression with type safety
 */

import * as dtln from './index';
// or: import dtln from '@hayatialikeles/dtln-rs';

/**
 * Example 1: Basic usage with manual frame processing
 */
function basicExample(): void {
  console.log('=== Basic Example ===\n');

  // Create denoiser instance
  const denoiser = dtln.dtln_create();

  // Prepare audio buffers (16kHz, mono, Float32Array, 512 samples)
  const inputAudio = new Float32Array(512);
  const outputAudio = new Float32Array(512);

  // Fill with test audio (white noise)
  for (let i = 0; i < 512; i++) {
    inputAudio[i] = (Math.random() * 2 - 1) * 0.5;
  }

  // Process the frame
  const isStarved = dtln.dtln_denoise(denoiser, inputAudio, outputAudio);

  console.log(`✅ Processed ${inputAudio.length} samples`);
  console.log(`📊 Processor starved: ${isStarved ? 'Yes ⚠️' : 'No ✅'}`);

  // Calculate RMS to show noise reduction
  const inputRMS = calculateRMS(inputAudio);
  const outputRMS = calculateRMS(outputAudio);
  const reductionDB = 20 * Math.log10(outputRMS / inputRMS);

  console.log(`🔊 Input RMS: ${inputRMS.toFixed(4)}`);
  console.log(`🔇 Output RMS: ${outputRMS.toFixed(4)}`);
  console.log(`📉 Noise reduction: ${reductionDB.toFixed(2)} dB\n`);

  // Clean up
  dtln.dtln_stop(denoiser);
}

/**
 * Example 2: Processing multiple frames (streaming simulation)
 */
function streamingExample(): void {
  console.log('=== Streaming Example ===\n');

  const denoiser = dtln.dtln_create();
  const FRAME_SIZE = 512;
  const SAMPLE_RATE = 16000;
  const DURATION_SECONDS = 1.0;
  const totalFrames = Math.floor((SAMPLE_RATE * DURATION_SECONDS) / FRAME_SIZE);

  let totalStarved = 0;
  const startTime = Date.now();

  for (let frame = 0; frame < totalFrames; frame++) {
    // Generate test audio (sine wave + noise)
    const inputFrame = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) {
      const t = (frame * FRAME_SIZE + i) / SAMPLE_RATE;
      const signal = 0.3 * Math.sin(2 * Math.PI * 440 * t); // 440Hz tone
      const noise = (Math.random() - 0.5) * 0.2;
      inputFrame[i] = signal + noise;
    }

    const outputFrame = new Float32Array(FRAME_SIZE);
    const isStarved = dtln.dtln_denoise(denoiser, inputFrame, outputFrame);

    if (isStarved) totalStarved++;
  }

  const endTime = Date.now();
  const processingTime = endTime - startTime;
  const audioTime = DURATION_SECONDS * 1000;
  const rtf = processingTime / audioTime;

  console.log(`✅ Processed ${totalFrames} frames (${DURATION_SECONDS}s of audio)`);
  console.log(`⏱️  Processing time: ${processingTime}ms`);
  console.log(`📊 Real-time factor: ${rtf.toFixed(4)}x (${(1 / rtf).toFixed(1)}x faster than real-time)`);
  console.log(`⚠️  Starved frames: ${totalStarved}/${totalFrames} (${((totalStarved / totalFrames) * 100).toFixed(2)}%)\n`);

  dtln.dtln_stop(denoiser);
}

/**
 * Example 3: Using the RealtimeDenoiser helper class
 */
function helperClassExample(): void {
  console.log('=== Helper Class Example ===\n');

  // Create a RealtimeDenoiser instance
  const denoiser = new dtln.RealtimeDenoiser();

  // Generate variable-length audio (doesn't have to be 512 samples!)
  const audioLength = 2048; // 2048 samples = ~128ms at 16kHz
  const noisyAudio = new Float32Array(audioLength);

  for (let i = 0; i < audioLength; i++) {
    const t = i / 16000;
    const signal = 0.5 * Math.sin(2 * Math.PI * 440 * t);
    const noise = (Math.random() - 0.5) * 0.3;
    noisyAudio[i] = signal + noise;
  }

  // Process audio of any length - the helper handles chunking
  const cleanAudio = denoiser.process(noisyAudio);

  console.log(`✅ Processed ${audioLength} samples (~${(audioLength / 16000 * 1000).toFixed(1)}ms)`);
  console.log(`📦 Frame size: ${denoiser.frameSize}`);
  console.log(`🔊 Input length: ${noisyAudio.length}`);
  console.log(`🔇 Output length: ${cleanAudio.length}\n`);

  // Clean up
  denoiser.destroy();
}

/**
 * Example 4: Multiple concurrent denoisers
 */
function concurrentExample(): void {
  console.log('=== Concurrent Denoisers Example ===\n');

  const instanceCount = 3;
  const denoisers: dtln.DenoiserHandle[] = [];

  // Create multiple instances
  for (let i = 0; i < instanceCount; i++) {
    denoisers.push(dtln.dtln_create());
  }

  console.log(`✅ Created ${instanceCount} denoiser instances`);

  // Process different audio on each
  denoisers.forEach((denoiser, index) => {
    const frequency = 440 + index * 110; // Different frequencies
    const inputFrame = new Float32Array(512);

    for (let i = 0; i < 512; i++) {
      inputFrame[i] = 0.5 * Math.sin(2 * Math.PI * frequency * i / 16000);
    }

    const outputFrame = new Float32Array(512);
    dtln.dtln_denoise(denoiser, inputFrame, outputFrame);

    console.log(`  Instance ${index + 1}: Processed ${frequency}Hz tone`);
  });

  // Clean up all instances
  denoisers.forEach(denoiser => dtln.dtln_stop(denoiser));

  console.log(`🧹 Cleaned up all instances\n`);
}

/**
 * Example 5: Error handling and edge cases
 */
function errorHandlingExample(): void {
  console.log('=== Error Handling Example ===\n');

  const denoiser = dtln.dtln_create();

  try {
    // Test with correct size
    const correctInput = new Float32Array(512).fill(0.5);
    const correctOutput = new Float32Array(512);
    dtln.dtln_denoise(denoiser, correctInput, correctOutput);
    console.log('✅ Correct buffer size: Success');

    // Test with incorrect size (will likely throw or behave unexpectedly)
    try {
      const wrongInput = new Float32Array(256); // Wrong size!
      const wrongOutput = new Float32Array(256);
      dtln.dtln_denoise(denoiser, wrongInput, wrongOutput);
      console.log('⚠️  Wrong buffer size: Processed (may be unexpected)');
    } catch (err) {
      console.log('❌ Wrong buffer size: Error caught (as expected)');
    }

    // Test with extreme values
    const extremeInput = new Float32Array(512).fill(1.0); // Max amplitude
    const extremeOutput = new Float32Array(512);
    dtln.dtln_denoise(denoiser, extremeInput, extremeOutput);
    console.log('✅ Extreme values: Handled');

  } finally {
    dtln.dtln_stop(denoiser);
    console.log('🧹 Cleanup completed\n');
  }
}

/**
 * Helper function: Calculate RMS (Root Mean Square) of audio samples
 */
function calculateRMS(samples: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}

/**
 * Main entry point - run all examples
 */
function main(): void {
  console.log('🎙️  DTLN-RS TypeScript Examples\n');
  console.log('================================================\n');

  basicExample();
  streamingExample();
  helperClassExample();
  concurrentExample();
  errorHandlingExample();

  console.log('================================================');
  console.log('✅ All examples completed successfully!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  main();
}

export { basicExample, streamingExample, helperClassExample, concurrentExample, errorHandlingExample };
