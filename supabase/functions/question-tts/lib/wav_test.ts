import assert from 'node:assert/strict';
import { createLru } from './lru.ts';
import { audioOf, ttsBody } from './tts.ts';
import { fromBase64, isWav, pcmToWav, sampleRateOf, WAV_HEADER_BYTES, wavHeader } from './wav.ts';

const ascii = (b: Uint8Array, from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len));

Deno.test('wavHeader writes the canonical 44-byte RIFF header for 24 kHz mono 16-bit PCM', () => {
  const h = wavHeader(48_000);
  assert.equal(h.byteLength, 44);
  const v = new DataView(h.buffer);
  assert.equal(ascii(h, 0, 4), 'RIFF');
  assert.equal(v.getUint32(4, true), 36 + 48_000);
  assert.equal(ascii(h, 8, 4), 'WAVE');
  assert.equal(ascii(h, 12, 4), 'fmt ');
  assert.equal(v.getUint32(16, true), 16);
  assert.equal(v.getUint16(20, true), 1); // PCM
  assert.equal(v.getUint16(22, true), 1); // mono
  assert.equal(v.getUint32(24, true), 24_000);
  assert.equal(v.getUint32(28, true), 48_000); // byte rate = 24000 * 1 * 2
  assert.equal(v.getUint16(32, true), 2); // block align
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(ascii(h, 36, 4), 'data');
  assert.equal(v.getUint32(40, true), 48_000);
});

Deno.test('wavHeader exact bytes for a tiny file', () => {
  assert.deepEqual(
    [...wavHeader(4)],
    [
      0x52,
      0x49,
      0x46,
      0x46,
      40,
      0,
      0,
      0,
      0x57,
      0x41,
      0x56,
      0x45,
      0x66,
      0x6d,
      0x74,
      0x20,
      16,
      0,
      0,
      0,
      1,
      0,
      1,
      0,
      0xc0,
      0x5d,
      0,
      0,
      0x80,
      0xbb,
      0,
      0,
      2,
      0,
      16,
      0,
      0x64,
      0x61,
      0x74,
      0x61,
      4,
      0,
      0,
      0,
    ],
  );
});

Deno.test('pcmToWav prepends the header, keeps samples and drops a dangling half sample', () => {
  const wav = pcmToWav(new Uint8Array([1, 2, 3, 4, 5]));
  assert.equal(wav.byteLength, WAV_HEADER_BYTES + 4);
  assert.deepEqual([...wav.subarray(44)], [1, 2, 3, 4]);
  assert.equal(new DataView(wav.buffer).getUint32(40, true), 4);
  assert.ok(isWav(wav));
  assert.ok(!isWav(new Uint8Array(60)));
});

Deno.test('sampleRateOf reads the rate from the Gemini mime type', () => {
  assert.equal(sampleRateOf('audio/L16;codec=pcm;rate=24000'), 24_000);
  assert.equal(sampleRateOf('audio/L16; rate=16000'), 16_000);
  assert.equal(sampleRateOf('audio/L16'), 24_000);
  assert.equal(sampleRateOf(null), 24_000);
  assert.equal(sampleRateOf('audio/L16;rate=5'), 24_000);
});

Deno.test('fromBase64 decodes', () => {
  assert.deepEqual([...fromBase64('AQID')], [1, 2, 3]);
});

Deno.test('audioOf finds inline audio; null when absent', () => {
  const res = {
    candidates: [{ content: { parts: [{ text: 'x' }, { inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: 'AQID' } }] } }],
  };
  const a = audioOf(res);
  assert.ok(a);
  assert.deepEqual([...a.bytes], [1, 2, 3]);
  assert.equal(a.sampleRate, 24_000);
  assert.equal(a.wav, false);
  assert.equal(audioOf({ candidates: [{ content: { parts: [{ text: 'no audio' }] } }] }), null);
  assert.equal(audioOf({ promptFeedback: { blockReason: 'SAFETY' } }), null);
  assert.equal(audioOf(null), null);
});

Deno.test('ttsBody asks for AUDIO with the prebuilt voice', () => {
  const b = ttsBody('Bà nhớ gì về Tết?', 'vi', 'Sulafat') as {
    contents: { parts: { text: string }[] }[];
    generationConfig: { responseModalities: string[]; speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: string } } } };
  };
  assert.deepEqual(b.generationConfig.responseModalities, ['AUDIO']);
  assert.equal(b.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Sulafat');
  assert.ok(b.contents[0]!.parts[0]!.text.endsWith('Bà nhớ gì về Tết?'));
});

Deno.test('lru evicts the least recently used entry and respects a byte budget', () => {
  const lru = createLru<Uint8Array>({ maxEntries: 2, maxBytes: 10, sizeOf: (v) => v.byteLength });
  lru.set('a', new Uint8Array(3));
  lru.set('b', new Uint8Array(3));
  assert.ok(lru.get('a')); // a is now most recent
  lru.set('c', new Uint8Array(3));
  assert.equal(lru.get('b'), undefined);
  assert.ok(lru.get('a'));
  assert.ok(lru.get('c'));
  lru.set('d', new Uint8Array(8)); // 3 + 8 > 10 → evict until it fits
  assert.equal(lru.size, 1);
  lru.set('huge', new Uint8Array(11)); // never cached
  assert.equal(lru.get('huge'), undefined);
});
