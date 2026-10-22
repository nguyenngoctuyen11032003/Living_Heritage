import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { Plans } from './Plans';

beforeAll(() => {
  for (const proto of [Element.prototype, HTMLElement.prototype]) {
    if (Object.prototype.hasOwnProperty.call(proto, 'animate')) delete (proto as unknown as Record<string, unknown>).animate;
  }
});

describe('Plans interest button', () => {
  it('links the chosen plan to /ket-noi, not to sign-up, and keeps the planned-price label', async () => {
    render(
      <LocaleProvider initial="vi">
        <MemoryRouter>
          <Plans />
        </MemoryRouter>
      </LocaleProvider>,
    );
    expect(screen.getByText('Giá dự kiến, chưa thu phí', { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Đăng ký quan tâm' })[1]!);
    expect(screen.getByRole('link', { name: 'Gửi quan tâm' })).toHaveAttribute('href', '/ket-noi?plan=year');
  });
});
