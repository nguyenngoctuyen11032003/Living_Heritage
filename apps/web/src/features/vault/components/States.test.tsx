import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { Unavailable } from './States';

describe('Unavailable (B16: no access / revoked link)', () => {
  it('is the page h1, reveals nothing about the content and leads back to a safe page', () => {
    render(
      <LocaleProvider initial="vi">
        <MemoryRouter>
          <Unavailable backTo="/gia-dinh" />
        </MemoryRouter>
      </LocaleProvider>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Không thể mở nội dung này' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về kho gia đình' })).toHaveAttribute('href', '/gia-dinh');
  });
});
