import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { DisplayMenu } from './DisplayMenu';

function renderMenu(locale: 'vi' | 'en' = 'vi') {
  return render(
    <LocaleProvider initial={locale}>
      <DisplayMenu />
      <p>outside</p>
    </LocaleProvider>,
  );
}

describe('DisplayMenu', () => {
  it('opens a labelled panel with language and theme, and closes with Escape returning focus', () => {
    renderMenu('vi');
    const button = screen.getByRole('button', { name: 'Hiển thị' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByRole('group', { name: 'Hiển thị' });
    expect(panel).toHaveAttribute('id', button.getAttribute('aria-controls'));
    expect(screen.getByRole('group', { name: 'Ngôn ngữ' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Hiển thị' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('closes on a click outside', () => {
    renderMenu('en');
    fireEvent.click(screen.getByRole('button', { name: 'Display' }));
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(screen.queryByRole('group', { name: 'Display' })).not.toBeInTheDocument();
  });
});
