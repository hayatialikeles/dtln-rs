/**
 * TypeScript definitions for @hayatialikeles/dtln-rs
 * High-performance real-time noise suppression using DTLN neural network
 */

/**
 * Opaque handle to a DTLN denoiser instance
 */
export type DenoiserHandle = unknown;

/**
 * Creates a new DTLN denoiser instance.
 *
 * The denoiser must be stopped with `dtln_stop()` when no longer needed
 * to properly free resources.
 *
 * @returns A handle to the denoiser instance
 *
 * @example
 * ```typescript
 * const denoiser = dtln_create();
 * // ... use denoiser ...
 * dtln_stop(denoiser);
 * ```
 */
export function dtln_create(): DenoiserHandle;

/**
 * Processes audio samples to remove noise.
 *
 * Both input and output buffers must be Float32Array with exactly 512 samples.
 * Audio must be:
 * - Sample rate: 16kHz (16000 Hz)
 * - Channels: Mono (1 channel)
 * - Format: Float32 samples in range [-1.0, 1.0]
 * - Frame size: 512 samples (32ms at 16kHz)
 *
 * @param denoiser - Handle to the denoiser instance from `dtln_create()`
 * @param inputSamples - Input audio samples (noisy audio)
 * @param outputSamples - Output buffer to receive denoised audio
 * @returns `true` if the processor is starved (processing slower than real-time), `false` otherwise
 *
 * @example
 * ```typescript
 * const denoiser = dtln_create();
 * const input = new Float32Array(512); // Your noisy audio
 * const output = new Float32Array(512); // Will receive clean audio
 *
 * const isStarved = dtln_denoise(denoiser, input, output);
 * if (isStarved) {
 *   console.warn('Processing slower than real-time');
 * }
 *
 * // Use output for clean audio
 * dtln_stop(denoiser);
 * ```
 */
export function dtln_denoise(
  denoiser: DenoiserHandle,
  inputSamples: Float32Array,
  outputSamples: Float32Array
): boolean;

/**
 * Stops and cleans up a denoiser instance.
 *
 * This must be called when you're done using the denoiser to properly
 * free allocated resources. After calling this, the denoiser handle
 * should not be used again.
 *
 * @param denoiser - Handle to the denoiser instance to stop
 *
 * @example
 * ```typescript
 * const denoiser = dtln_create();
 * // ... use denoiser ...
 * dtln_stop(denoiser);
 * ```
 */
export function dtln_stop(denoiser: DenoiserHandle): void;

/**
 * Audio processing configuration
 */
export interface AudioConfig {
  /** Sample rate in Hz (must be 16000) */
  sampleRate: 16000;
  /** Number of channels (must be 1 for mono) */
  channels: 1;
  /** Frame size in samples (must be 512) */
  frameSize: 512;
  /** Frame duration in milliseconds (32ms at 16kHz) */
  frameDuration: 32;
}

/**
 * Recommended audio configuration for DTLN
 */
export const AUDIO_CONFIG: AudioConfig;

/**
 * Helper class for real-time audio denoising with streaming support
 *
 * @example
 * ```typescript
 * const denoiser = new RealtimeDenoiser();
 *
 * // Process streaming audio
 * const noisyAudio = new Float32Array(1024); // Any length
 * const cleanAudio = denoiser.process(noisyAudio);
 *
 * // Clean up when done
 * denoiser.destroy();
 * ```
 */
export class RealtimeDenoiser {
  /**
   * Creates a new real-time denoiser
   * @param frameSize - Frame size in samples (default: 512)
   */
  constructor(frameSize?: number);

  /**
   * Process audio data of any length
   *
   * Input audio is automatically chunked into frames of the configured size.
   * Frames smaller than frameSize are zero-padded.
   *
   * @param audioData - Input audio samples (16kHz, mono, Float32Array)
   * @returns Denoised audio samples
   */
  process(audioData: Float32Array): Float32Array;

  /**
   * Destroy the denoiser and free resources
   * Must be called when done to prevent memory leaks
   */
  destroy(): void;

  /**
   * Get the configured frame size
   */
  readonly frameSize: number;
}

// Export default module
declare const dtln: {
  dtln_create: typeof dtln_create;
  dtln_denoise: typeof dtln_denoise;
  dtln_stop: typeof dtln_stop;
  AUDIO_CONFIG: AudioConfig;
  RealtimeDenoiser: typeof RealtimeDenoiser;
};

export default dtln;
