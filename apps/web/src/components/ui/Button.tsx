import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/lib/cn';
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
  'group/btn relative inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold leading-tight tracking-[-0.005em] transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 disabled:saturate-[0.6] aria-disabled:pointer-events-none aria-disabled:opacity-60 aria-disabled:saturate-[0.6] focus-visible:rounded-full! focus-visible:outline-offset-4! [&>svg]:shrink-0 [&_.animate-spin]:size-5';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-heritage text-cream hover:bg-heritage-deep shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]',
  secondary: 'bg-paper text-ink ring-1 ring-line hover:ring-heritage/60 hover:text-heritage',
  ghost: 'bg-transparent text-heritage hover:bg-mint/70',
  terracotta: 'bg-terracotta text-cream hover:bg-[#8f3c29]',
  'dark-cream': 'bg-night-ink text-night hover:bg-white',
};

// Icons are sized per button size (size-5 for md/lg, size-6 for xl) so leftIcon/rightIcon stay consistent app-wide.
// Inside .narrator-mode, md grows to the elder touch target (≥ 56px).
const sizes: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 text-[0.9rem] [&>svg]:size-5 in-[.narrator-mode]:min-h-[3.25rem] in-[.narrator-mode]:text-[1rem]',
  lg: 'min-h-14 gap-2.5 px-7 text-[0.95rem] [&>svg]:size-5',
  xl: 'min-h-16 gap-3 px-9 text-[1.05rem] [&>svg]:size-6',
};

const iconSizes: Record<ButtonSize, string> = {
  md: 'size-12 min-h-12 [&>svg]:size-5 in-[.narrator-mode]:size-[3.25rem]',
  lg: 'size-14 min-h-14 [&>svg]:size-5',
  xl: 'size-16 min-h-16 [&>svg]:size-6',
};

/** Class string for anything that should look like a button (links, labels…). */
export function buttonClasses({ variant = 'primary', size = 'md', fullWidth, iconOnly, className }: ButtonStyleOptions = {}): string {
  return cn(base, variants[variant], iconOnly ? iconSizes[size] : sizes[size], fullWidth && 'w-full', className);
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
