#!/usr/bin/env node

/**
 * Example usage of dtln-rs noise suppression module
 *
 * This example demonstrates how to use the dtln-rs module to denoise audio.
 * The module processes audio in real-time, taking 16kHz PCM audio samples
 * and returning denoised samples.
 */

const dtln = require('./dtln.js');

// Example: Initialize the denoiser
console.log('Creating DTLN denoiser...');
const denoiser = dtln.dtln_create();
console.log('✓ Denoiser created successfully\n');

// Example audio samples (16kHz, mono)
// In real usage, these would come from your audio stream
const SAMPLE_RATE = 16000;
const FRAME_SIZE = 512; // 32ms at 16kHz

// Create a test audio frame (noise simulation)
const inputFrame = new Float32Array(FRAME_SIZE);
for (let i = 0; i < FRAME_SIZE; i++) {
  // Simulate noisy audio with random noise
  inputFrame[i] = Math.random() * 0.5 - 0.25; // Random noise between -0.25 and 0.25
}

// Prepare output buffer
const outputFrame = new Float32Array(FRAME_SIZE);

console.log('Processing audio frame...');
console.log(`Input frame size: ${inputFrame.length} samples`);
console.log(`Sample rate: ${SAMPLE_RATE}Hz`);
console.log(`Frame duration: ${(FRAME_SIZE / SAMPLE_RATE * 1000).toFixed(1)}ms\n`);

// Denoise the audio frame
const isStarved = dtln.dtln_denoise(denoiser, inputFrame, outputFrame);

if (isStarved) {
  console.warn('⚠️  Warning: Processor is starved (processing slower than real-time)');
} else {
  console.log('✓ Audio processed successfully');
}

console.log(`Output frame size: ${outputFrame.length} samples`);

// Check if output is not just silence (first frame might be silent)
const hasOutput = outputFrame.some(sample => Math.abs(sample) > 0.0001);
console.log(`Output contains audio: ${hasOutput ? 'Yes' : 'No (first frame or silent)'}\n`);

// Process multiple frames (simulate real-time processing)
console.log('Processing 10 frames...');
let starvedCount = 0;

for (let frame = 0; frame < 10; frame++) {
  // Simulate new audio data
  for (let i = 0; i < FRAME_SIZE; i++) {
    inputFrame[i] = Math.random() * 0.5 - 0.25;
  }

  const starved = dtln.dtln_denoise(denoiser, inputFrame, outputFrame);
  if (starved) starvedCount++;

  // In real application, you would send outputFrame to your audio output
  process.stdout.write(`  Frame ${frame + 1}/10 processed\r`);
}

console.log(`\n✓ Processed 10 frames successfully`);
if (starvedCount > 0) {
  console.log(`⚠️  Processor was starved ${starvedCount} times`);
}

// Clean up
console.log('\nStopping denoiser...');
dtln.dtln_stop(denoiser);
console.log('✓ Denoiser stopped');

console.log('\n' + '='.repeat(60));
console.log('Example completed successfully!');
console.log('='.repeat(60));
console.log('\nIntegration tips:');
console.log('1. Feed real audio data from your microphone/WebRTC stream');
console.log('2. Process frames in real-time (every 32ms for 512 samples @ 16kHz)');
console.log('3. Monitor isStarved flag to detect processing issues');
console.log('4. Call dtln_stop() when done to free resources');
console.log('\nFor WebRTC integration, see README.md');
