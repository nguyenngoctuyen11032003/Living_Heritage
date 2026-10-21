import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { ExperienceSections } from './components/ExperienceSections';
import { buildExperienceSections, paragraphs, readExperienceFields } from './experience';

const PH = 'Chưa có thông tin';

describe('experience section builder', () => {
  it('orders the five sections and keeps narrator content', () => {
    const sections = buildExperienceSections(
      { skill: 'Kho cá', context: 'Khi nhà đông người', steps: ['Thắng đường', 'Ướp cá'], conditions: ['Cá tươi'], cautions: ['Đừng đảo'], limits: 'Khẩu vị miền Nam' },
      PH,
    );
    expect(sections.map((s) => s.key)).toEqual(['problem', 'steps', 'conditions', 'cautions', 'limits']);
    expect(sections.every((s) => !s.missing)).toBe(true);
    expect(sections[1]).toMatchObject({ variant: 'steps', display: ['Thắng đường', 'Ướp cá'] });
  });

  it('shows the placeholder for every missing field and never invents content', () => {
    const sections = buildExperienceSections({ skill: 'Đan rổ', steps: [], conditions: ['  ', 42], limits: '   ' }, PH);
    for (const s of sections) {
      expect(s.missing).toBe(true);
      expect(s.items).toEqual([]);
      expect(s.display).toEqual([PH]);
    }
  });

  it('tolerates junk jsonb', () => {
    expect(buildExperienceSections(null, PH).every((s) => s.missing)).toBe(true);
    expect(buildExperienceSections([1, 2], PH).every((s) => s.missing)).toBe(true);
    expect(readExperienceFields({ steps: 'Một bước duy nhất' }).steps).toEqual(['Một bước duy nhất']);
  });

  it('splits a body into paragraphs', () => {
    expect(paragraphs('Một.\n\n Hai. \nBa.')).toEqual(['Một.', 'Hai.', 'Ba.']);
    expect(paragraphs(null)).toEqual([]);
  });

  it('renders numbered steps and the placeholder', () => {
    render(
      <LocaleProvider initial="vi">
        <ExperienceSections fields={{ skill: 'Tuốt lá mai', steps: ['Ngưng tưới', 'Tuốt lá'], conditions: [], cautions: [], limits: null, context: null }} />
      </LocaleProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Kinh nghiệm' })).toBeInTheDocument();
    expect(screen.getByText('Tuốt lá')).toBeInTheDocument();
    expect(screen.getByText('Bước 2:')).toBeInTheDocument();
    expect(screen.getAllByText(PH)).toHaveLength(4);
  });
});
