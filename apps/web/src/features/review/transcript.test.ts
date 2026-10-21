import { describe, expect, it } from 'vitest';
import { countUncertain, parseTranscript } from './transcript';

describe('parseTranscript', () => {
  it('returns one text segment when there are no markers', () => {
    expect(parseTranscript('Hồi đó tui trồng rau.')).toEqual([{ kind: 'text', text: 'Hồi đó tui trồng rau.' }]);
  });

  it('marks the guessed word before [?] and drops the marker', () => {
    const s = parseTranscript('trồng rau muống ở ao sau nhà [?]. Phải tưới sáng sớm.');
    expect(s).toEqual([
      { kind: 'text', text: 'trồng rau muống ở ao sau ' },
      { kind: 'uncertain', text: 'nhà' },
      { kind: 'text', text: '. Phải tưới sáng sớm.' },
    ]);
    expect(countUncertain(s)).toBe(1);
  });

  it('handles a marker glued to the word and several markers', () => {
    const s = parseTranscript('Ông tôi tên là Tư[?] ở làng Đông-Ngạc [?].');
    expect(s.filter((x) => x.kind === 'uncertain').map((x) => x.text)).toEqual(['Tư', 'Đông-Ngạc']);
    expect(s.map((x) => x.text).join('')).toBe('Ông tôi tên là Tư ở làng Đông-Ngạc.');
  });

  it('treats a lone marker (start or after punctuation) as an unclear passage', () => {
    expect(parseTranscript('[?] rồi về nhà')).toEqual([
      { kind: 'uncertain', text: '' },
      { kind: 'text', text: ' rồi về nhà' },
    ]);
    const s = parseTranscript('Bà nói, [?] rồi đi.');
    expect(s[1]).toEqual({ kind: 'uncertain', text: '' });
    expect(s[0]).toEqual({ kind: 'text', text: 'Bà nói, ' });
  });

  it('keeps line breaks and empty input', () => {
    expect(parseTranscript('')).toEqual([]);
    expect(parseTranscript('a\nb [?]')).toEqual([
      { kind: 'text', text: 'a\n' },
      { kind: 'uncertain', text: 'b' },
    ]);
  });
});
