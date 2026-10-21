import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { TEXT_SCALE_KEY, getTextScale, setTextScale, stepTextScale } from '@/lib/textScale';
import { TextScaleSwitch } from './TextScaleSwitch';

function renderBoth(locale: 'vi' | 'en' = 'vi') {
  return render(
    <LocaleProvider initial={locale}>
      <TextScaleSwitch />
      <TextScaleSwitch variant="stepper" />
    </LocaleProvider>,
  );
}

afterEach(() => {
  setTextScale('100');
  localStorage.clear();
});

describe('TextScaleSwitch', () => {
  it('names each option by its size, not by the letter A', () => {
    renderBoth('en');
    expect(screen.getByRole('group', { name: 'Text size' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Extra large' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Smaller text' })).toBeDisabled();
  });

  it('increases and decreases, applies to <html>, persists and keeps every copy in sync', () => {
    renderBoth('vi');
    fireEvent.click(screen.getByRole('button', { name: 'Tăng cỡ chữ' }));
    expect(document.documentElement.dataset.textScale).toBe('115');
    expect(localStorage.getItem(TEXT_SCALE_KEY)).toBe('115');
    expect(screen.getByRole('button', { name: 'Lớn' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Rất lớn' }));
    expect(screen.getByRole('button', { name: 'Tăng cỡ chữ' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Giảm cỡ chữ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Giảm cỡ chữ' }));
    expect(document.documentElement.dataset.textScale).toBeUndefined();
    expect(getTextScale()).toBe('100');
  });

  it('restores a stored choice, ignores junk and clamps steps', () => {
    localStorage.setItem(TEXT_SCALE_KEY, '130');
    expect(getTextScale()).toBe('130');
    setTextScale('999');
    expect(getTextScale()).toBe('100');
    expect(stepTextScale('100', -1)).toBe('100');
    expect(stepTextScale('130', 1)).toBe('130');
  });
});
