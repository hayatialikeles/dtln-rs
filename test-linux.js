#!/usr/bin/env node

/**
 * Linux test - uses installed package from node_modules
 */

const fs = require('fs');
const path = require('path');
const dtln = require('dtln-rs');

console.log('🐧 DTLN-RS Linux Test');
console.log('═'.repeat(60));
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log('');

// Simple WAV reader
function readWavFile(filepath) {
  const buffer = fs.readFileSync(filepath);
  const dataOffset = 44;
  const pcmData = buffer.slice(dataOffset);
  const samples = new Float32Array(pcmData.length / 2);
  for (let i = 0; i < samples.length; i++) {
    const int16 = pcmData.readInt16LE(i * 2);
    samples[i] = int16 / 32768.0;
  }
  return samples;
}

// Write WAV file
function writeWavFile(filepath, samples, sampleRate = 16000) {
  const numSamples = samples.length;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = numSamples * numChannels * bitsPerSample / 8;

  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const int16 = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  fs.writeFileSync(filepath, buffer);
}

// Test with first clip
const clipsDir = path.join(__dirname, 'clips');
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const testFile = path.join(clipsDir, 'dog_barking_noisy.wav');

if (!fs.existsSync(testFile)) {
  console.error(`❌ Test file not found: ${testFile}`);
  process.exit(1);
}

console.log(`📁 Processing: ${path.basename(testFile)}`);
const inputSamples = readWavFile(testFile);
console.log(`✓ Loaded ${inputSamples.length} samples (${(inputSamples.length / 16000).toFixed(2)}s)`);

const denoiser = dtln.dtln_create();
console.log('✓ Denoiser created');

const FRAME_SIZE = 512;
const outputSamples = new Float32Array(inputSamples.length);
let processedFrames = 0;
const startTime = Date.now();

for (let i = 0; i < inputSamples.length; i += FRAME_SIZE) {
  const end = Math.min(i + FRAME_SIZE, inputSamples.length);
  const frameSize = end - i;
  const inputFrame = inputSamples.slice(i, end);
  const outputFrame = new Float32Array(frameSize);

  if (inputFrame.length < FRAME_SIZE) {
    const padded = new Float32Array(FRAME_SIZE);
    padded.set(inputFrame);
    const paddedOutput = new Float32Array(FRAME_SIZE);
    dtln.dtln_denoise(denoiser, padded, paddedOutput);
    outputSamples.set(paddedOutput.slice(0, frameSize), i);
  } else {
    dtln.dtln_denoise(denoiser, inputFrame, outputFrame);
    outputSamples.set(outputFrame, i);
  }

  processedFrames++;
}

const processingTime = Date.now() - startTime;
console.log(`✓ Processed ${processedFrames} frames in ${processingTime}ms`);

const audioDuration = (inputSamples.length / 16000) * 1000;
const rtf = processingTime / audioDuration;
console.log(`✓ Real-time factor: ${rtf.toFixed(3)}x ${rtf < 1 ? '(faster than real-time ✓)' : ''}`);

dtln.dtln_stop(denoiser);

const outputPath = path.join(outputDir, 'linux_test_denoised.wav');
writeWavFile(outputPath, outputSamples);
console.log(`✓ Saved to: ${outputPath}`);

console.log('');
console.log('═'.repeat(60));
console.log('✅ LINUX TEST SUCCESSFUL!');
console.log('═'.repeat(60));
