import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { ACCOUNT_MARKER } from './deletion';
import { DeletionRequestList } from './DeletionRequestList';
import type { DeletionRequestRow } from './useDeletionRequests';

const row = (o: Partial<DeletionRequestRow>): DeletionRequestRow => ({
  id: o.id ?? 'r1',
  family_id: 'f1',
  story_id: null,
  requested_by: 'u1',
  reason: 'lý do',
  status: 'open',
  admin_note: null,
  created_at: '2026-10-20T00:00:00Z',
  resolved_at: null,
  resolved_by: null,
  scope: null,
  erased_objects: null,
  ...o,
});

function renderList(props: Partial<Parameters<typeof DeletionRequestList>[0]>) {
  return render(
    <LocaleProvider initial="vi">
      <DeletionRequestList rows={[]} loading={false} error={false} onRetry={() => {}} {...props} />
    </LocaleProvider>,
  );
}

describe('<DeletionRequestList>', () => {
  it('shows the empty state', () => {
    renderList({});
    expect(screen.getByText('Chưa có yêu cầu xoá nào')).toBeTruthy();
  });

  it('shows an error with retry', () => {
    renderList({ error: true });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy();
  });

  it('lists status, scope, story title and the team note; filters by scope', () => {
    renderList({
      rows: [
        row({ id: 'a', story_id: 's1', status: 'done', admin_note: 'Đã xoá' }),
        row({ id: 'b', reason: `${ACCOUNT_MARKER} tài khoản` }),
      ],
      storyTitles: new Map([['s1', 'Mùa gặt']]),
      only: ['story', 'family'],
    });
    expect(screen.getByText('Hoàn tất')).toBeTruthy();
    expect(screen.getByText('Một câu chuyện: Mùa gặt')).toBeTruthy();
    expect(screen.getByText('Ghi chú của nhóm: Đã xoá')).toBeTruthy();
    expect(screen.queryByText('tài khoản')).toBeNull();
  });

  it('shows the in-progress status between received and completed', () => {
    renderList({ rows: [row({ id: 'p', status: 'processing' }), row({ id: 'o', status: 'open' })] });
    expect(screen.getByText('Đang xử lý')).toBeTruthy();
    expect(screen.getByText('Đã tiếp nhận')).toBeTruthy();
  });

  it('a done story request keeps its story scope after the story was erased (story_id is null)', () => {
    renderList({ rows: [row({ id: 'e', story_id: null, scope: 'story', status: 'done' })], only: ['story', 'family'] });
    expect(screen.getByText('Một câu chuyện')).toBeTruthy();
    expect(screen.queryByText('Cả kho gia đình')).toBeNull();
  });
});
