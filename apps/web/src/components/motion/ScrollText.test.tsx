import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollText } from './ScrollText';

const SENTENCE = 'AI chỉ chép lời và soạn nháp; sẽ trở thành thẻ tri thức, để người trẻ tìm, nghe và học.';

describe('ScrollText', () => {
  it('keeps every glyph (including "s" and stacked Vietnamese diacritics) in order, one word per box', () => {
    const { container } = render(<ScrollText text={SENTENCE} />);
    const aria = container.querySelector('[aria-hidden="true"]')!;
    const glyphs = Array.from(aria.querySelectorAll('.scroll-text__ch')).map((g) => g.textContent).join('');
    expect(glyphs).toBe(SENTENCE.normalize('NFC').replace(/\s+/g, ''));
    // The visible copy reads as the original sentence (words separated by single spaces).
    expect(aria.textContent).toBe(SENTENCE.normalize('NFC'));
    expect(container.querySelector('.sr-only')!.textContent).toBe(SENTENCE);
  });

  it('does not split words at the letter s', () => {
    const { container } = render(<ScrollText text="soạn sẽ" />);
    const boxes = Array.from(container.querySelectorAll('[aria-hidden="true"] > span')).map((w) => w.textContent);
    expect(boxes).toEqual(['soạn', 'sẽ']);
  });
});
