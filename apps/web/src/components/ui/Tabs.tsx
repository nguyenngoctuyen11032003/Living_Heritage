import { createContext, useCallback, useContext, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TabsContextValue {
  value: string;
  select: (v: string) => void;
  baseId: string;
  tone: 'light' | 'dark';
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab components must be used inside <Tabs>');
  return ctx;
}

const slug = (v: string) => v.replace(/[^\w-]/g, '_');

export interface TabsProps {
  /** Controlled value. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue: string;
  onValueChange?: (value: string) => void;
  tone?: 'light' | 'dark';
  className?: string;
  children: ReactNode;
}

/**
 * WAI-ARIA tabs with automatic activation.
 * Keyboard: ←/→ (and ↑/↓) move + select with wrap-around, Home/End jump; only the selected tab is in the Tab order (roving tabindex).
 * ```tsx
 * <Tabs defaultValue="a"><TabList label="Đầu ra"><Tab value="a">A</Tab><Tab value="b">B</Tab></TabList>
 *   <TabPanel value="a">…</TabPanel><TabPanel value="b">…</TabPanel></Tabs>
 * ```
 */
export function Tabs({ value, defaultValue, onValueChange, tone = 'light', className, children }: TabsProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const baseId = useId();
  const select = useCallback(
    (v: string) => {
      if (value === undefined) setInner(v);
      onValueChange?.(v);
    },
    [value, onValueChange],
  );
  return (
    <TabsContext.Provider value={{ value: current, select, baseId, tone }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  /** Accessible name of the tab list. */
  label: string;
  className?: string;
  children: ReactNode;
}

export function TabList({ label, className, children }: TabListProps) {
  const { tone } = useTabs();
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'));
    const index = tabs.findIndex((t) => t === document.activeElement);
    if (index < 0 || tabs.length === 0) return;
    e.preventDefault();
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    const el = tabs[next]!;
    el.focus();
    el.click();
  }
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none]',
        tone === 'light' ? 'bg-paper ring-1 ring-line' : 'bg-white/6 ring-1 ring-white/12',
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  disabled?: boolean;
  /** Optional leading icon. */
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Tab({ value, disabled, icon, className, children }: TabProps) {
  const { value: current, select, baseId, tone } = useTabs();
  const selected = current === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${slug(value)}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${slug(value)}`}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => select(value)}
      className={cn(
        'inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 text-[0.92rem] font-semibold transition-colors duration-200',
        tone === 'light'
          ? selected
            ? 'bg-heritage text-cream shadow-sm'
            : 'text-ink-soft hover:bg-mint/60 hover:text-heritage'
          : selected
            ? 'bg-night-ink text-night'
            : 'text-night-ink/75 hover:bg-white/8 hover:text-night-ink',
        className,
      )}
    >
      {icon && <span aria-hidden="true" className="inline-flex [&>svg]:size-4">{icon}</span>}
      {children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  className?: string;
  children: ReactNode;
}

/** Only the selected panel is rendered. */
export function TabPanel({ value, className, children }: TabPanelProps) {
  const { value: current, baseId } = useTabs();
  if (current !== value) return null;
  return (
    <div role="tabpanel" id={`${baseId}-panel-${slug(value)}`} aria-labelledby={`${baseId}-tab-${slug(value)}`} tabIndex={0} className={cn('focus-visible:outline-offset-4', className)}>
      {children}
    </div>
  );
}
