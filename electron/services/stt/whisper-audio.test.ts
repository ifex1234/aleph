import { describe, expect, it } from "vitest"
import {
  WHISPER_SAMPLE_RATE,
  parseWhisperStdout,
  pcm16ToWav,
  rmsOfPcm16,
} from "./whisper-audio"

describe("pcm16ToWav", () => {
  it("wraps PCM data in a valid 44-byte WAV header", () => {
    const pcm = Buffer.alloc(8)
    pcm.writeInt16LE(1000, 0)
    pcm.writeInt16LE(-1000, 2)

    const wav = pcm16ToWav(pcm)

    expect(wav.length).toBe(44 + 8)
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF")
    expect(wav.readUInt32LE(4)).toBe(36 + 8) // RIFF chunk size
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE")
    expect(wav.toString("ascii", 12, 16)).toBe("fmt ")
    expect(wav.readUInt32LE(16)).toBe(16) // fmt chunk size
    expect(wav.readUInt16LE(20)).toBe(1) // PCM format
    expect(wav.readUInt16LE(22)).toBe(1) // mono
    expect(wav.readUInt32LE(24)).toBe(WHISPER_SAMPLE_RATE)
    expect(wav.readUInt32LE(28)).toBe(WHISPER_SAMPLE_RATE * 2) // byte rate
    expect(wav.readUInt16LE(32)).toBe(2) // block align
    expect(wav.readUInt16LE(34)).toBe(16) // bits per sample
    expect(wav.toString("ascii", 36, 40)).toBe("data")
    expect(wav.readUInt32LE(40)).toBe(8) // data chunk size
    expect(wav.readInt16LE(44)).toBe(1000)
    expect(wav.readInt16LE(46)).toBe(-1000)
  })

  it("handles empty PCM", () => {
    const wav = pcm16ToWav(Buffer.alloc(0))
    expect(wav.length).toBe(44)
    expect(wav.readUInt32LE(40)).toBe(0)
  })
})

describe("parseWhisperStdout", () => {
  it("joins transcript lines and drops bracketed system lines", () => {
    const stdout = [
      "",
      "  In the beginning God created the heavens.  ",
      "[whisper_print_system_info: blah]",
      "",
      "And the earth was without form.",
      "",
    ].join("\n")

    expect(parseWhisperStdout(stdout)).toBe(
      "In the beginning God created the heavens. And the earth was without form."
    )
  })

  it("returns empty string for blank output", () => {
    expect(parseWhisperStdout("\n \n\r\n")).toBe("")
  })

  it("handles CRLF line endings", () => {
    expect(parseWhisperStdout("line one.\r\nline two.\r\n")).toBe(
      "line one. line two."
    )
  })
})

describe("rmsOfPcm16", () => {
  it("returns 0 for silence", () => {
    expect(rmsOfPcm16(Buffer.alloc(1024))).toBe(0)
  })

  it("returns 0 for an empty buffer", () => {
    expect(rmsOfPcm16(Buffer.alloc(0))).toBe(0)
  })

  it("measures a full-scale square wave as 1.0", () => {
    const pcm = Buffer.alloc(64 * 2)
    for (let i = 0; i < 64; i++) {
      pcm.writeInt16LE(i % 2 === 0 ? 32767 : -32768, i * 2)
    }
    expect(rmsOfPcm16(pcm)).toBeCloseTo(1.0, 3)
  })

  it("measures a half-scale alternating wave as ~0.5", () => {
    const pcm = Buffer.alloc(32 * 2)
    for (let i = 0; i < 32; i++) {
      pcm.writeInt16LE(i % 2 === 0 ? 16384 : -16384, i * 2)
    }
    expect(rmsOfPcm16(pcm)).toBeCloseTo(0.5, 3)
  })
})
