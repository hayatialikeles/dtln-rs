#!/usr/bin/env node

/**
 * Real audio test with WAV files from clips/
 * Tests the dtln-rs module with actual noisy audio
 */

const fs = require('fs');
const path = require('path');
const dtln = require('./dtln.js');

// WAV file reader (simple implementation for 16kHz mono PCM)
function readWavFile(filepath) {
  const buffer = fs.readFileSync(filepath);

  // Simple WAV parser - skip header (44 bytes) and read PCM data
  const dataOffset = 44;
  const pcmData = buffer.slice(dataOffset);

  // Convert 16-bit PCM to Float32Array (-1.0 to 1.0)
  const samples = new Float32Array(pcmData.length / 2);
  for (let i = 0; i < samples.length; i++) {
    const int16 = pcmData.readInt16LE(i * 2);
    samples[i] = int16 / 32768.0; // Normalize to -1.0 to 1.0
  }

  return samples;
}

// Write Float32Array to WAV file
function writeWavFile(filepath, samples, sampleRate = 16000) {
  const numSamples = samples.length;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = numSamples * numChannels * bitsPerSample / 8;

  const buffer = Buffer.alloc(44 + dataSize);

  // WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write PCM data
  for (let i = 0; i < numSamples; i++) {
    const int16 = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  fs.writeFileSync(filepath, buffer);
}

// Process audio file
function processAudioFile(inputPath, outputPath) {
  console.log(`\n📁 Processing: ${path.basename(inputPath)}`);
  console.log('─'.repeat(60));

  // Read input WAV
  const inputSamples = readWavFile(inputPath);
  console.log(`✓ Loaded ${inputSamples.length} samples`);
  console.log(`  Duration: ${(inputSamples.length / 16000).toFixed(2)}s @ 16kHz`);

  // Create denoiser
  const denoiser = dtln.dtln_create();
  console.log('✓ Denoiser created');

  // Process in chunks
  const FRAME_SIZE = 512;
  const outputSamples = new Float32Array(inputSamples.length);
  let processedFrames = 0;
  let starvedFrames = 0;

  const startTime = Date.now();

  for (let i = 0; i < inputSamples.length; i += FRAME_SIZE) {
    const end = Math.min(i + FRAME_SIZE, inputSamples.length);
    const frameSize = end - i;

    const inputFrame = inputSamples.slice(i, end);
    const outputFrame = new Float32Array(frameSize);

    // Pad if necessary
    if (inputFrame.length < FRAME_SIZE) {
      const padded = new Float32Array(FRAME_SIZE);
      padded.set(inputFrame);
      const paddedOutput = new Float32Array(FRAME_SIZE);

      const isStarved = dtln.dtln_denoise(denoiser, padded, paddedOutput);
      outputSamples.set(paddedOutput.slice(0, frameSize), i);

      if (isStarved) starvedFrames++;
    } else {
      const isStarved = dtln.dtln_denoise(denoiser, inputFrame, outputFrame);
      outputSamples.set(outputFrame, i);

      if (isStarved) starvedFrames++;
    }

    processedFrames++;

    // Progress indicator
    const progress = Math.floor((i / inputSamples.length) * 100);
    if (processedFrames % 10 === 0) {
      process.stdout.write(`  Processing: ${progress}%\r`);
    }
  }

  const processingTime = Date.now() - startTime;
  console.log(`\n✓ Processed ${processedFrames} frames in ${processingTime}ms`);

  if (starvedFrames > 0) {
    console.log(`  ⚠️  Processor starved ${starvedFrames} times`);
  } else {
    console.log(`  ✓ No starvation detected`);
  }

  // Calculate real-time factor
  const audioDuration = (inputSamples.length / 16000) * 1000; // in ms
  const rtf = processingTime / audioDuration;
  console.log(`  Real-time factor: ${rtf.toFixed(3)}x ${rtf < 1 ? '(faster than real-time ✓)' : '(slower than real-time ⚠️)'}`);

  // Stop denoiser
  dtln.dtln_stop(denoiser);

  // Write output WAV
  writeWavFile(outputPath, outputSamples);
  console.log(`✓ Saved to: ${path.basename(outputPath)}`);

  return {
    inputFile: path.basename(inputPath),
    samples: inputSamples.length,
    duration: inputSamples.length / 16000,
    processingTime,
    rtf,
    starvedFrames
  };
}

// Main test
console.log('🎵 DTLN-RS Real Audio Test');
console.log('═'.repeat(60));

const clipsDir = path.join(__dirname, 'clips');
const outputDir = path.join(__dirname, 'output');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Get all WAV files
const wavFiles = fs.readdirSync(clipsDir)
  .filter(f => f.endsWith('.wav'))
  .map(f => path.join(clipsDir, f));

console.log(`Found ${wavFiles.length} audio files to process\n`);

// Process each file
const results = [];
for (const inputPath of wavFiles) {
  const filename = path.basename(inputPath, '.wav');
  const outputPath = path.join(outputDir, `${filename}_denoised.wav`);

  try {
    const result = processAudioFile(inputPath, outputPath);
    results.push(result);
  } catch (err) {
    console.error(`❌ Error processing ${path.basename(inputPath)}: ${err.message}`);
  }
}

// Summary
console.log('\n' + '═'.repeat(60));
console.log('📊 Summary');
console.log('═'.repeat(60));

if (results.length > 0) {
  const avgRtf = results.reduce((sum, r) => sum + r.rtf, 0) / results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);

  console.log(`Processed: ${results.length}/${wavFiles.length} files`);
  console.log(`Total audio: ${totalDuration.toFixed(2)}s`);
  console.log(`Total processing time: ${totalProcessingTime}ms`);
  console.log(`Average RTF: ${avgRtf.toFixed(3)}x`);

  console.log('\nDetailed results:');
  results.forEach(r => {
    console.log(`  • ${r.inputFile}: ${r.duration.toFixed(2)}s, RTF ${r.rtf.toFixed(3)}x${r.starvedFrames > 0 ? ` (starved ${r.starvedFrames}x)` : ''}`);
  });

  console.log(`\n✅ Denoised files saved to: ${outputDir}/`);
  console.log('\n🎧 Compare original and denoised files to hear the difference!');
} else {
  console.log('❌ No files were processed successfully');
}
