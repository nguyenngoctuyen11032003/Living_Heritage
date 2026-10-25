import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { getSampleItem } from '../sample-items';
import { STATIC_TOPICS } from '../topics';
import { fromPublicRow, sampleToItem } from '../types';
import { KnowledgeCard } from './KnowledgeCard';

function renderCard(ui: React.ReactElement, locale: 'vi' | 'en' = 'vi') {
  return render(
    <LocaleProvider initial={locale}>
      <MemoryRouter>{ui}</MemoryRouter>
    </LocaleProvider>,
  );
}

describe('KnowledgeCard', () => {
  it('shows topic, type, quote title linking to the detail page, narrator, region and audio duration', () => {
    const item = sampleToItem(getSampleItem('mau-tuot-la-mai')!, 'vi');
    renderCard(<KnowledgeCard item={item} topics={STATIC_TOPICS} />);
    expect(screen.getByText('Làm vườn')).toBeInTheDocument();
    expect(screen.getByText('Thẻ kinh nghiệm')).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/tri-thuc/mau-tuot-la-mai');
    expect(link.textContent).toContain('Tuốt lá mai');
    expect(screen.getByText('Ông Tư Vườn (bút danh)')).toBeInTheDocument();
    expect(screen.getByText('Miền Nam')).toBeInTheDocument();
    expect(screen.getByText('Có giọng kể')).toBeInTheDocument();
    expect(screen.getByText('3:34 nghe')).toBeInTheDocument();
  });

  it('shows the summary on regular cards and labels samples as illustrative', () => {
    const s = getSampleItem('mau-tuot-la-mai')!;
    renderCard(<KnowledgeCard item={sampleToItem(s, 'vi')} topics={STATIC_TOPICS} />);
    expect(screen.getByText(s.summary.vi)).toBeInTheDocument();
  });

  it('labels text-only items and strips typed quotes from the title', () => {
    const item = fromPublicRow({ id: 'x1', kind: 'story', title: '“Mẹ dặn”', narrator_label: 'Người kể ẩn danh', audio_allowed: false, fields: {} });
    renderCard(<KnowledgeCard item={item} topics={STATIC_TOPICS} />, 'en');
    expect(screen.getByText('Text only')).toBeInTheDocument();
    expect(screen.getByRole('link').textContent).toBe('Mẹ dặn');
  });

  it('shows the skill name and summary on every card (B10)', () => {
    const item = sampleToItem(getSampleItem('mau-tuot-la-mai')!, 'vi');
    renderCard(<KnowledgeCard item={item} topics={STATIC_TOPICS} />);
    expect(screen.getByText('Tuốt lá mai vàng để hoa nở đúng Tết')).toBeInTheDocument();
    expect(screen.getByText(/Cách canh ngày tuốt lá/)).toBeInTheDocument();
  });

  it('translates the server anonymous narrator label', () => {
    const item = fromPublicRow({ id: 'x2', kind: 'story', title: 'Chuyện', narrator_label: 'Người kể ẩn danh', audio_allowed: false, fields: {} });
    renderCard(<KnowledgeCard item={item} topics={STATIC_TOPICS} />, 'en');
    expect(screen.getByText('Anonymous narrator')).toBeInTheDocument();
    expect(screen.queryByText('Người kể ẩn danh')).toBeNull();
  });

  it('reports when its link is opened', () => {
    const onOpen = vi.fn();
    const item = sampleToItem(getSampleItem('mau-ca-kho-to')!, 'vi');
    renderCard(<KnowledgeCard item={item} topics={STATIC_TOPICS} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('link'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
