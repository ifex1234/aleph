/**
 * Inline page for the hidden capture window. Owns getUserMedia +
 * ScriptProcessor: mono downmix, gain, linear resample to 16 kHz,
 * Int16 conversion and RMS/peak metering. Communicates only through the
 * preload bridge (`window.aleph.invoke`) and aleph:event messages.
 */
export const CAPTURE_HTML = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>aleph-capture</title></head>
  <body>
    <script>
      const TARGET_RATE = 16000

      let ctx = null
      let processor = null
      let stream = null
      let resamplePos = 0
      let lastLevelSent = 0
      let lastGain = 1

      function invoke(cmd, args) {
        if (window.aleph) return window.aleph.invoke(cmd, args).catch(() => {})
        return Promise.resolve()
      }

      window.addEventListener("DOMContentLoaded", () => {
        if (!window.aleph) return
        window.aleph.addEventListener((event, payload) => {
          if (event === "audio:start") startCapture(payload || {})
          else if (event === "audio:stop") stopCapture()
          else if (event === "audio:enumerate") enumerateDevices()
        })
        invoke("__capture_status", { event: "ready" })
      })

      async function enumerateDevices() {
        try {
          // Opening once primes permission so labels are populated.
          let defaultLabel = null
          try {
            const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
            defaultLabel = probe.getAudioTracks()[0]?.label ?? null
            probe.getTracks().forEach((t) => t.stop())
          } catch {}
          const devices = await navigator.mediaDevices.enumerateDevices()
          const mics = devices.filter((d) => d.kind === "audioinput")
          const result = mics.map((d, i) => ({
            id: d.label || d.deviceId,
            name: d.label || ("Microphone " + (i + 1)),
            sample_rate: TARGET_RATE,
            channels: 1,
            is_default: defaultLabel ? d.label === defaultLabel : i === 0,
          }))
          invoke("__capture_devices", { devices: result })
        } catch (e) {
          invoke("__capture_devices", { devices: [] })
        }
      }

      function stopCapture() {
        if (processor) { try { processor.disconnect() } catch {} processor = null }
        if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null }
        if (ctx) { try { ctx.close() } catch {} ctx = null }
      }

      async function startCapture(opts) {
        const isRetry = opts.gain === "retry"
        if (isRetry) opts.gain = lastGain
        else lastGain = typeof opts.gain === "number" ? opts.gain : 1

        stopCapture()

        const constraints = {
          audio: {
            deviceId: opts.deviceId ? { ideal: opts.deviceId } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
          },
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
        } catch (e) {
          invoke("__capture_status", { event: "error", detail: String(e) })
          return
        }

        const track = stream.getAudioTracks()[0]
        if (track) track.onended = () => invoke("__capture_status", { event: "lost" })

        ctx = new AudioContext()
        const src = ctx.createMediaStreamSource(stream)
        processor = ctx.createScriptProcessor(4096, Math.max(1, src.channelCount), 1)
        const gainValue = Math.max(0, Math.min(2, Number(opts.gain) || 1))

        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer
          const channels = []
          for (let c = 0; c < input.numberOfChannels; c++) channels.push(input.getChannelData(c))
          const frameLen = input.length

          // Downmix to mono, apply gain, clamp to [-1, 1].
          const mono = new Float32Array(frameLen)
          for (let i = 0; i < frameLen; i++) {
            let s = 0
            for (let c = 0; c < channels.length; c++) s += channels[c][i]
            let v = (s / channels.length) * gainValue
            if (v > 1) v = 1
            else if (v < -1) v = -1
            mono[i] = v
          }

          // Meter (~15 Hz), same normalization as the Rust meter (/32767 of i16).
          const now = Date.now()
          if (now - lastLevelSent >= 60) {
            lastLevelSent = now
            let sumSq = 0
            let peak = 0
            for (let i = 0; i < frameLen; i++) {
              sumSq += mono[i] * mono[i]
              const a = Math.abs(mono[i])
              if (a > peak) peak = a
            }
            invoke("__capture_level", {
              rms: Math.sqrt(sumSq / frameLen),
              peak: peak,
            })
          }

          // Linear-interpolation resample to 16 kHz.
          const ratio = ctx.sampleRate / TARGET_RATE
          const outLen = Math.ceil(frameLen / ratio)
          const out = new Int16Array(outLen)
          for (let i = 0; i < outLen; i++) {
            const srcPos = i * ratio + resamplePos
            const idx = Math.floor(srcPos)
            const frac = srcPos - idx
            const a = mono[Math.min(idx, frameLen - 1)]
            const b = mono[Math.min(idx + 1, frameLen - 1)]
            out[i] = Math.max(-32768, Math.min(32767, Math.trunc((a + (b - a) * frac) * 32767)))
          }
          resamplePos = (resamplePos + outLen * ratio - frameLen) % 1

          invoke("__capture_pcm", { samples: out })
        }

        src.connect(processor)
        processor.connect(ctx.destination)
        resamplePos = 0
        invoke("__capture_status", { event: "recovered" })
      }
    </script>
  </body>
</html>
`
