import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/i18n';
import type { VaultStory } from '../types';
import { StoryCard } from './StoryCard';

const story: VaultStory = {
  id: '11111111-1111-1111-1111-111111111111',
  family_id: 'f',
  narrator_id: 'n',
  recording_id: 'r',
  kind: 'story',
  title: 'Gói bánh chưng',
  summary: null,
  body: 'Ngày ấy cả nhà ngồi quanh nồi bánh.',
  fields: {},
  topic_id: 't',
  edit_status: 'approved',
  visibility: 'family',
  created_at: '2026-02-01T08:00:00Z',
  approved_at: null,
  approved_by: null,
  current_version: 1,
};

const renderUi = (ui: ReactElement, locale: 'vi' | 'en' = 'vi') =>
  render(
    <LocaleProvider initial={locale}>
      <MemoryRouter>{ui}</MemoryRouter>
    </LocaleProvider>,
  );

describe('StoryCard', () => {
  it('shows topic, title link, quote excerpt, narrator, duration, status and visibility', () => {
    renderUi(
      <StoryCard
        story={story}
        narrator={{ id: 'n', display_name: 'Bà Lan', pen_name: null }}
        topic={{ id: 't', slug: 'mon-an', title_vi: 'Món ăn', title_en: 'Food' }}
        durationS={75}
      />,
    );
    expect(screen.getByText('Món ăn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gói bánh chưng' })).toHaveAttribute('href', `/cau-chuyen/${story.id}`);
    expect(screen.getByText('“Ngày ấy cả nhà ngồi quanh nồi bánh.”')).toBeInTheDocument();
    expect(screen.getByText('Bà Lan')).toBeInTheDocument();
    expect(screen.getByText('Thời lượng 1:15')).toBeInTheDocument();
    expect(screen.getByText('Cả gia đình')).toBeInTheDocument();
  });

  it('shows the recorded date of the source and the family name of the narrator (not the pen name)', () => {
    renderUi(
      <StoryCard
        story={story}
        narrator={{ id: 'n', display_name: 'Nguyễn Thị Lan', pen_name: 'Bà Tư' }}
        durationS={75}
        recordedAt="2025-12-24T08:00:00Z"
      />,
    );
    expect(screen.getByText('Nguyễn Thị Lan')).toBeInTheDocument();
    expect(screen.queryByText('Bà Tư')).not.toBeInTheDocument();
    expect(screen.getByText('Ngày ghi')).toBeInTheDocument();
    expect(document.querySelector('time')).toHaveAttribute('dateTime', '2025-12-24T08:00:00Z');
  });

  it('falls back gracefully for untitled stories without text or narrator (English)', () => {
    renderUi(<StoryCard story={{ ...story, title: ' ', body: '', topic_id: null }} />, 'en');
    expect(screen.getByRole('link', { name: 'Untitled story' })).toBeInTheDocument();
    expect(screen.getByText('No text yet.')).toBeInTheDocument();
    expect(screen.getByText('Unknown storyteller')).toBeInTheDocument();
  });
});
