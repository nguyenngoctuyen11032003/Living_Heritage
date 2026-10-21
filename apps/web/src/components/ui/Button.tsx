import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/lib/cn';
import { baseDisplay } from './display';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'terracotta' | 'dark-cream';
/** md = 48px, lg = 56px, xl = 64px minimum height (touch targets ≥ 48px everywhere). */
export type ButtonSize = 'md' | 'lg' | 'xl';

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container width. */
  fullWidth?: boolean;
  /** Square, icon-only button (remember an aria-label). */
  iconOnly?: boolean;
  className?: string;
}

const base =
  'group/btn relative select-none items-center justify-center gap-2 rounded-full font-semibold leading-tight tracking-[-0.005em] transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55 focus-visible:outline-offset-4';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-heritage text-cream hover:bg-heritage-deep shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]',
  secondary: 'bg-paper text-ink ring-1 ring-line hover:ring-heritage/60 hover:text-heritage',
  ghost: 'bg-transparent text-heritage hover:bg-mint/70',
  terracotta: 'bg-terracotta text-cream hover:bg-[#8f3c29]',
  'dark-cream': 'bg-night-ink text-night hover:bg-white',
};

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 text-[0.9rem]',
  lg: 'min-h-14 px-7 text-[0.95rem]',
  xl: 'min-h-16 px-9 text-[1.05rem]',
};

const iconSizes: Record<ButtonSize, string> = {
  md: 'size-12 min-h-12',
  lg: 'size-14 min-h-14',
  xl: 'size-16 min-h-16',
};

/**
 * Class string for anything that should look like a button (links, labels…).
 * A display utility in `className` (e.g. `hidden sm:inline-flex`) replaces the base `inline-flex` — see ./display.ts.
 */
export function buttonClasses({ variant = 'primary', size = 'md', fullWidth, iconOnly, className }: ButtonStyleOptions = {}): string {
  return cn(base, baseDisplay('inline-flex', className), variants[variant], iconOnly ? iconSizes[size] : sizes[size], fullWidth && 'w-full', className);
}

interface ButtonContentProps {
  /** Icon before the label. */
  leftIcon?: ReactNode;
  /** Icon after the label. */
  rightIcon?: ReactNode;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, Omit<ButtonStyleOptions, 'className'>, ButtonContentProps {
  /** Shows a spinner, sets aria-busy and blocks clicks (prevents double submits). */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Brand button. `<Button variant="secondary" size="lg" leftIcon={<Mic />}>Kể chuyện</Button>`
 * Defaults to type="button".
 */
export function Button({ variant, size, fullWidth, iconOnly, loading, leftIcon, rightIcon, className, children, disabled, type = 'button', ref, ...rest }: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, iconOnly, className })}
      {...rest}
    >
      {loading ? <Spinner size="sm" decorative /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

export interface ButtonLinkProps extends LinkProps, Omit<ButtonStyleOptions, 'className'>, ButtonContentProps {
  ref?: Ref<HTMLAnchorElement>;
}

/** react-router <Link> styled as a button. */
export function ButtonLink({ variant, size, fullWidth, iconOnly, leftIcon, rightIcon, className, children, ref, ...rest }: ButtonLinkProps) {
  return (
    <Link ref={ref} className={buttonClasses({ variant, size, fullWidth, iconOnly, className: typeof className === 'string' ? className : undefined })} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
