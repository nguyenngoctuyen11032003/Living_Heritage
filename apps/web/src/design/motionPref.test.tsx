import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useReducedMotionSafe } from './motion';
import { applyMotionPref, readMotionPref, setMotionPref } from './motionPref';

function Probe() {
  return <span data-testid="p">{String(useReducedMotionSafe())}</span>;
}

afterEach(() => {
  localStorage.clear();
  applyMotionPref('auto');
});

describe('motion preference', () => {
  it('defaults to auto with no attribute', () => {
    expect(readMotionPref()).toBe('auto');
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it('persists explicit choices and clears on auto', () => {
    setMotionPref('reduce');
    expect(localStorage.getItem('lh.motion')).toBe('reduce');
    expect(document.documentElement.dataset.motion).toBe('reduce');
    expect(readMotionPref()).toBe('reduce');
    setMotionPref('auto');
    expect(localStorage.getItem('lh.motion')).toBeNull();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it('ignores junk in storage', () => {
    localStorage.setItem('lh.motion', 'banana');
    expect(readMotionPref()).toBe('auto');
  });

  it('hook follows the device in auto and the override otherwise', async () => {
    render(<Probe />);
    expect(screen.getByTestId('p').textContent).toBe('false');
    await act(async () => {
      setMotionPref('reduce');
      await Promise.resolve();
    });
    expect(screen.getByTestId('p').textContent).toBe('true');
    await act(async () => {
      setMotionPref('full');
      await Promise.resolve();
    });
    expect(screen.getByTestId('p').textContent).toBe('false');
  });
});
