// PCM → WAV (RIFF) wrapping and base64 decoding. Pure: unit-tested in wav_test.ts.
// Gemini TTS returns raw signed 16-bit little-endian mono PCM at 24 kHz ("audio/L16;codec=pcm;rate=24000").

export const WAV_HEADER_BYTES = 44;
export const DEFAULT_SAMPLE_RATE = 24_000;

export interface PcmFormat {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

export const GEMINI_PCM: PcmFormat = { sampleRate: DEFAULT_SAMPLE_RATE, channels: 1, bitsPerSample: 16 };

/** The canonical 44-byte RIFF/WAVE header for `dataBytes` of PCM in `fmt`. */
export function wavHeader(dataBytes: number, fmt: PcmFormat = GEMINI_PCM): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(WAV_HEADER_BYTES);
  const v = new DataView(header.buffer);
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) header[offset + i] = s.charCodeAt(i);
  };
  const blockAlign = fmt.channels * (fmt.bitsPerSample / 8);
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true); // file size minus the 8 bytes of "RIFF" + this field
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true); // fmt chunk size (PCM)
  v.setUint16(20, 1, true); // audio format 1 = PCM
  v.setUint16(22, fmt.channels, true);
  v.setUint32(24, fmt.sampleRate, true);
  v.setUint32(28, fmt.sampleRate * blockAlign, true); // byte rate
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, fmt.bitsPerSample, true);
  ascii(36, 'data');
  v.setUint32(40, dataBytes, true);
  return header;
}

/** Header + PCM bytes in one buffer. A trailing odd byte (half a sample) is dropped. */
export function pcmToWav(pcm: Uint8Array, fmt: PcmFormat = GEMINI_PCM): Uint8Array<ArrayBuffer> {
  const blockAlign = fmt.channels * (fmt.bitsPerSample / 8);
  const usable = pcm.byteLength - (pcm.byteLength % blockAlign);
  const out = new Uint8Array(WAV_HEADER_BYTES + usable);
  out.set(wavHeader(usable, fmt), 0);
  out.set(pcm.subarray(0, usable), WAV_HEADER_BYTES);
  return out;
}

/** Sample rate from a mime like `audio/L16;codec=pcm;rate=24000` (fallback 24 kHz). */
export function sampleRateOf(mime: string | null | undefined): number {
  const m = /(?:^|;)\s*rate=(\d{4,6})\s*(?:;|$)/i.exec(mime ?? '');
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n >= 8_000 && n <= 192_000 ? n : DEFAULT_SAMPLE_RATE;
}

/** True when the bytes already start with a RIFF/WAVE header. */
export function isWav(bytes: Uint8Array): boolean {
  if (bytes.byteLength < WAV_HEADER_BYTES) return false;
  const tag = (o: number) => String.fromCharCode(bytes[o]!, bytes[o + 1]!, bytes[o + 2]!, bytes[o + 3]!);
  return tag(0) === 'RIFF' && tag(8) === 'WAVE';
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
