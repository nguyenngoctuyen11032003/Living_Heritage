import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetInViewForTests } from './inView';
import { Reveal } from './Reveal';
import { WordsPullUp } from './WordsPullUp';
import { DrawArrow } from './DrawArrow';
import { applyMotionPref } from '@/design/motionPref';

let instances: MockIO[] = [];
class MockIO {
  targets = new Set<Element>();
  constructor(public cb: IntersectionObserverCallback) {
    instances.push(this);
  }
  observe(el: Element) { this.targets.add(el); }
  unobserve(el: Element) { this.targets.delete(el); }
  disconnect() {}
  takeRecords() { return []; }
  fire(el: Element) {
    this.cb([{ target: el, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

const orig = window.IntersectionObserver;
beforeEach(() => {
  instances = [];
  __resetInViewForTests();
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIO;
});
afterEach(() => {
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = orig;
  __resetInViewForTests();
  applyMotionPref('auto');
});

describe('Reveal', () => {
  it('keeps content in DOM, starts hidden via data attr, reveals once and unobserves', () => {
    render(<><Reveal as="li" delay={0.1} y={12} scale={0.95}><button>Bấm</button></Reveal><Reveal><p>b</p></Reveal></>);
    const el = screen.getByRole('button').parentElement!;
    expect(el.tagName).toBe('LI');
    expect(el).toHaveAttribute('data-reveal');
    expect(el).not.toHaveAttribute('data-reveal-in');
    expect(el.style.getPropertyValue('--rv-y')).toBe('12px');
    expect(el.style.getPropertyValue('--rv-s')).toBe('0.95');
    expect(el.style.getPropertyValue('--rv-delay')).toBe('0.1s');
    expect(instances).toHaveLength(1); // one shared observer
    act(() => instances[0]!.fire(el));
    expect(el).toHaveAttribute('data-reveal-in');
    expect(instances[0]!.targets.has(el)).toBe(false);
  });

  it('renders static when motion is reduced', () => {
    applyMotionPref('reduce');
    render(<Reveal><p>x</p></Reveal>);
    expect(screen.getByText('x').parentElement).not.toHaveAttribute('data-reveal');
  });

  it('shows at once without IntersectionObserver', () => {
    delete (window as unknown as Record<string, unknown>).IntersectionObserver;
    render(<Reveal><p>x</p></Reveal>);
    expect(screen.getByText('x').parentElement).toHaveAttribute('data-reveal-in');
  });
});

describe('WordsPullUp', () => {
  it('keeps a11y structure and staggers delays', () => {
    const { container } = render(<WordsPullUp text="Di Sản Sống" delay={0.2} stagger={0.1} suffix={<sup>*</sup>} />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('Di Sản Sống');
    const words = container.querySelectorAll<HTMLElement>('.lh-pull-w');
    expect(words).toHaveLength(3);
    expect(words[2]!.style.getPropertyValue('--pu-d')).toBe('0.4s');
    expect(words[2]).toHaveTextContent('Sống*');
    const root = container.firstElementChild!;
    expect(root).not.toHaveAttribute('data-pull-in');
    act(() => instances[0]!.fire(root));
    expect(root).toHaveAttribute('data-pull-in');
  });

  it('immediate activates on mount without observing', () => {
    const { container } = render(<WordsPullUp text="Xin chào" immediate />);
    expect(container.firstElementChild).toHaveAttribute('data-pull-in');
  });
});

describe('DrawArrow', () => {
  it('draws when in view and is static when reduced', () => {
    const { container, unmount } = render(<DrawArrow d="M0 0L10 10" head="M5 5L10 10" viewBox="0 0 10 10" />);
    const svg = container.querySelector('svg')!;
    expect(svg).not.toHaveAttribute('data-draw-in');
    act(() => instances[0]!.fire(svg));
    expect(svg).toHaveAttribute('data-draw-in');
    unmount();
    applyMotionPref('reduce');
    const r = render(<DrawArrow d="M0 0L10 10" viewBox="0 0 10 10" />);
    expect(r.container.querySelector('.lh-draw')).toBeNull();
  });
});
void vi;
