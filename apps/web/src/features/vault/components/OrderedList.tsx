import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface OrderedListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  getTitle: (item: T) => string;
  render: (item: T, index: number) => ReactNode;
  /** Omit to render read-only. */
  onMove?: (from: number, to: number) => void;
  onRemove?: (item: T) => void;
  disabled?: boolean;
  labels: { moveUp: (title: string) => string; moveDown: (title: string) => string; remove: (title: string) => string };
}

/** Ordered rows with ↑/↓/remove buttons (keyboard) and optional native drag-and-drop (pointer). */
export function OrderedList<T>({ items, getKey, getTitle, render, onMove, onRemove, disabled, labels }: OrderedListProps<T>) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const editable = Boolean(onMove);

  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, i) => {
        const title = getTitle(item);
        return (
          <li
            key={getKey(item)}
            draggable={editable && !disabled}
            onDragStart={(e) => {
              setDragFrom(i);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              setDragOver(i);
            }}
            onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom !== null && dragFrom !== i) onMove?.(dragFrom, i);
              setDragFrom(null);
              setDragOver(null);
            }}
            onDragEnd={() => {
              setDragFrom(null);
              setDragOver(null);
            }}
            className={cn(
              'flex items-center gap-2 rounded-2xl bg-paper p-3 ring-1 ring-line transition-shadow sm:gap-3 sm:p-4',
              dragOver === i && 'ring-2 ring-heritage',
              dragFrom === i && 'opacity-60',
            )}
          >
            {editable && <GripVertical className="hidden size-5 shrink-0 cursor-grab text-ink-soft/60 sm:block" aria-hidden="true" />}
            <div className="min-w-0 flex-1">{render(item, i)}</div>
            {editable && (
              <div className="flex shrink-0 flex-col gap-1 min-[420px]:flex-row">
                <Button variant="ghost" iconOnly aria-label={labels.moveUp(title)} disabled={disabled || i === 0} onClick={() => onMove?.(i, i - 1)}>
                  <ArrowUp className="size-5" aria-hidden="true" />
                </Button>
                <Button variant="ghost" iconOnly aria-label={labels.moveDown(title)} disabled={disabled || i === items.length - 1} onClick={() => onMove?.(i, i + 1)}>
                  <ArrowDown className="size-5" aria-hidden="true" />
                </Button>
                {onRemove && (
                  <Button variant="ghost" iconOnly aria-label={labels.remove(title)} disabled={disabled} onClick={() => onRemove(item)}>
                    <Trash2 className="size-5 text-terracotta" aria-hidden="true" />
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
