import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { ApprovalBar, type ApprovalBarProps } from './ApprovalBar';
import { ApprovalSection, type ApprovalSectionProps } from './ApprovalSection';

const bar = (p: Partial<ApprovalBarProps>) =>
  render(
    <LocaleProvider initial="vi">
      <ApprovalBar mode="narrator_confirm" canEdit dirty={false} waiting={false} busy={null} consent={false} onSave={vi.fn()} onApprove={vi.fn()} {...p} />
    </LocaleProvider>,
  );

const section = (p: Partial<ApprovalSectionProps>) =>
  render(
    <LocaleProvider initial="vi">
      <ApprovalSection
        mode="narrator_confirm"
        canEdit
        dirty={false}
        consent={false}
        onConsentChange={vi.fn()}
        justApproved={false}
        approvedAt={null}
        onShare={vi.fn()}
        onBackToSource={vi.fn()}
        describedById="hint"
        {...p}
      />
    </LocaleProvider>,
  );

describe('ApprovalBar (slim: save state + one primary action)', () => {
  it('narrator: one confirm button, no save button when nothing changed', () => {
    bar({});
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Xác nhận đúng ý tôi' })).toBeEnabled();
    expect(screen.getByText('Mọi thay đổi đã được lưu')).toBeInTheDocument();
  });

  it('unsaved changes turn the primary action into "Lưu bản nháp"', () => {
    bar({ dirty: true });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Lưu bản nháp' })).toBeInTheDocument();
  });

  it('assisted approval stays disabled until consent is ticked', () => {
    const { rerender } = bar({ mode: 'assisted' });
    expect(screen.getByRole('button', { name: 'Duyệt thay người kể' })).toBeDisabled();
    rerender(
      <LocaleProvider initial="vi">
        <ApprovalBar mode="assisted" canEdit dirty={false} waiting={false} busy={null} consent onSave={vi.fn()} onApprove={vi.fn()} />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Duyệt thay người kể' })).toBeEnabled();
  });

  it('approved: no share CTA in the bar (it lives in the approval section only)', () => {
    bar({ mode: 'approved' });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('viewers get no bar', () => {
    const { container } = bar({ mode: 'read_only', canEdit: false });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ApprovalSection (final step in the page flow)', () => {
  it('asks the narrator question before confirming', () => {
    section({});
    expect(screen.getByText('Nội dung này đã đúng điều bác muốn kể chưa?')).toHaveAttribute('id', 'hint');
  });

  it('holds the assisted-consent checkbox', () => {
    section({ mode: 'assisted' });
    expect(screen.getByRole('checkbox', { name: /Tôi đã đọc lại nội dung cho người kể/ })).not.toBeChecked();
  });

  it('shows exactly one "Chọn nơi lưu và chia sẻ" after approval', () => {
    section({ mode: 'approved', justApproved: true });
    expect(screen.getByRole('status')).toHaveTextContent('Đã xác nhận nội dung');
    expect(screen.getAllByRole('button', { name: 'Chọn nơi lưu và chia sẻ' })).toHaveLength(1);
  });
});
