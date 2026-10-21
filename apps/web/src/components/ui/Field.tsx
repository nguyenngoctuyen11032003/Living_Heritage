import { createContext, useContext, useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps {
  label: ReactNode;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Error message; marks the control aria-invalid and is announced. */
  error?: ReactNode;
  required?: boolean;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  /** Override the generated id (the control receives it). */
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Label + hint + error wrapper. The nested Input/Textarea/Select picks up id, aria-describedby and aria-invalid automatically.
 * `<Field label="Email" error={err}><Input type="email" /></Field>`
 */
export function Field({ label, hint, error, required = false, hideLabel, id, className, children }: FieldProps) {
  const auto = useId();
  const fieldId = id ?? `f${auto}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-err` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <FieldContext.Provider value={{ id: fieldId, describedBy, invalid: Boolean(error), required }}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label htmlFor={fieldId} className={cn('text-[0.9rem] font-semibold text-ink', hideLabel && 'sr-only')}>
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-terracotta">
              *
            </span>
          )}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-[0.8rem] leading-snug text-ink-soft">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-[0.82rem] font-medium leading-snug text-terracotta">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldProps<T extends { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: unknown; required?: boolean }>(props: T) {
  const ctx = useContext(FieldContext);
  return {
    id: props.id ?? ctx?.id,
    'aria-describedby': cn(props['aria-describedby'], ctx?.describedBy) || undefined,
    'aria-invalid': (props['aria-invalid'] as boolean | undefined) ?? (ctx?.invalid || undefined),
    required: props.required ?? (ctx?.required || undefined),
  };
}

const control =
  'w-full rounded-2xl bg-paper px-4 text-[1rem] text-ink ring-1 ring-line placeholder:text-ink-soft/70 transition-shadow duration-150 hover:ring-heritage/40 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-heritage aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-terracotta disabled:cursor-not-allowed disabled:bg-cream disabled:opacity-70';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

/** Text input, 48px tall. */
export function Input({ className, ref, ...rest }: InputProps) {
  const a11y = useFieldProps(rest);
  return <input ref={ref} className={cn(control, 'min-h-12 py-2.5', className)} {...rest} {...a11y} />;
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
}

/** Multi-line input (defaults to 4 rows, vertical resize). */
export function Textarea({ className, rows = 4, ref, ...rest }: TextareaProps) {
  const a11y = useFieldProps(rest);
  return <textarea ref={ref} rows={rows} className={cn(control, 'resize-y py-3 leading-relaxed', className)} {...rest} {...a11y} />;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  ref?: Ref<HTMLSelectElement>;
}

/** Native select with brand styling (keeps native a11y and mobile pickers). */
export function Select({ className, children, ref, ...rest }: SelectProps) {
  const a11y = useFieldProps(rest);
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, 'min-h-12 appearance-none py-2.5 pr-11', className)} {...rest} {...a11y}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
    </div>
  );
}
