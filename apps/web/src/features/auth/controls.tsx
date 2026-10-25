import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Input, type InputProps } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

// Form pieces shared by the auth pages (inside AuthLayout's card). Inputs sit on the page tone so they read as inset
// wells on the card; `!` because cn() does not resolve conflicts with Input's own bg/padding classes.

const well = 'bg-cream! pl-12!';

function LeadIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft [&>svg]:size-[1.1rem]">
      {children}
    </span>
  );
}

/** Input with a leading icon. Use inside <Field> like a plain Input. */
export function IconInput({ icon, className, ...rest }: InputProps & { icon: ReactNode }) {
  return (
    <div className="relative">
      <LeadIcon>{icon}</LeadIcon>
      <Input className={cn(well, className)} {...rest} />
    </div>
  );
}

/** Password input with a lock icon and a show/hide toggle (a pressed-state button, so its name never changes). */
export function PasswordInput({ className, ...rest }: Omit<InputProps, 'type'>) {
  const t = useT('auth');
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <LeadIcon>
        <Lock />
      </LeadIcon>
      <Input type={shown ? 'text' : 'password'} className={cn(well, 'pr-14!', className)} {...rest} />
      <button
        type="button"
        aria-pressed={shown}
        aria-label={t('fields.showPassword')}
        title={shown ? t('fields.hidePassword') : t('fields.showPassword')}
        onClick={() => setShown((s) => !s)}
        className="absolute right-1 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mint/70 hover:text-heritage"
      >
        {shown ? <EyeOff aria-hidden="true" className="size-[1.15rem]" /> : <Eye aria-hidden="true" className="size-[1.15rem]" />}
      </button>
    </div>
  );
}

/** Confirmation that replaces a form once an email is on its way (announced as a status). */
export function AuthNotice({ icon, title, children, action }: { icon: ReactNode; title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-start">
      <span aria-hidden="true" className="inline-flex size-14 items-center justify-center rounded-2xl bg-mint text-heritage ring-1 ring-heritage/15 [&>svg]:size-7">
        {icon}
      </span>
      <h2 className="mt-5 font-serif text-[1.45rem] font-semibold leading-snug text-heritage-deep">{title}</h2>
      <p className="mt-2 leading-relaxed text-ink-soft [overflow-wrap:anywhere]">{children}</p>
      {action}
    </div>
  );
}

/** Inline text link in the auth footers. */
export const authLink = 'font-semibold text-heritage underline decoration-heritage/30 decoration-1 underline-offset-[5px] transition-colors hover:decoration-heritage';
