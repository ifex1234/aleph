/**
 * Pure audio/format helpers for the local Whisper engine. No Electron
 * imports here so these unit-test cleanly: wrap raw 16 kHz mono PCM16 into
 * a WAV container, parse whisper-cli stdout, and measure RMS for the
 * speech indicator.
 */

export const WHISPER_SAMPLE_RATE = 16000

/** Wraps 16-bit LE mono PCM samples in a minimal 44-byte WAV header. */
export function pcm16ToWav(pcm: Buffer): Buffer {
  const wav = Buffer.alloc(44 + pcm.length)
  wav.write("RIFF", 0)
  wav.writeUInt32LE(36 + pcm.length, 4)
  wav.write("WAVE", 8)
  wav.write("fmt ", 12)
  wav.writeUInt32LE(16, 16) // fmt chunk size
  wav.writeUInt16LE(1, 20) // format: PCM
  wav.writeUInt16LE(1, 22) // channels: mono
  wav.writeUInt32LE(WHISPER_SAMPLE_RATE, 24)
  wav.writeUInt32LE(WHISPER_SAMPLE_RATE * 2, 28) // byte rate
  wav.writeUInt16LE(2, 32) // block align
  wav.writeUInt16LE(16, 34) // bits per sample
  wav.write("data", 36)
  wav.writeUInt32LE(pcm.length, 40)
  pcm.copy(wav, 44)
  return wav
}

/**
 * Joins the non-empty stdout lines of `whisper-cli -nt` into one
 * transcript, dropping any bracketed progress/system lines.
 */
export function parseWhisperStdout(stdout: string): string {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("["))
    .join(" ")
    .trim()
}

/** Normalized RMS (0..1) of a 16-bit LE PCM buffer. */
export function rmsOfPcm16(pcm: Buffer): number {
  const count = pcm.length >> 1
  if (count === 0) return 0
  let sumSquares = 0
  for (let i = 0; i < count; i++) {
    const sample = pcm.readInt16LE(i * 2)
    sumSquares += sample * sample
  }
  return Math.sqrt(sumSquares / count) / 32768
}
