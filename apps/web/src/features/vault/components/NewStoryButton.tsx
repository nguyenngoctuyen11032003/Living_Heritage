import { Mic, Plus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Button, ButtonLink, Dialog, buttonClasses, type ButtonSize } from '@/components/ui';
import { useT } from '@/i18n';
import { Link } from 'react-router';
import type { NarratorLite } from '../types';

/**
 * "Kể câu chuyện mới": no narrators → go add one; one or more → pick who tells (→ /ke-chuyen?narrator=id).
 */
export function NewStoryButton({ narrators, label, size = 'lg', className }: { narrators: NarratorLite[]; label?: string; size?: ButtonSize; className?: string }) {
  const t = useT('vault');
  const [open, setOpen] = useState(false);
  const text = label ?? t('header.newStory');

  if (narrators.length === 0) {
    return (
      <ButtonLink to="/gia-dinh/nguoi-ke" size={size} className={className} leftIcon={<UserPlus className="size-5" />}>
        {text}
      </ButtonLink>
    );
  }
  return (
    <>
      <Button size={size} className={className} leftIcon={<Plus className="size-5" />} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {text}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('header.pickNarrator')} size="sm">
        <ul className="flex flex-col gap-2">
          {narrators.map((n) => (
            <li key={n.id}>
              <Link
                to={`/ke-chuyen?narrator=${encodeURIComponent(n.id)}`}
                className={buttonClasses({ variant: 'secondary', fullWidth: true })}
              >
                <Mic className="size-5 text-heritage" aria-hidden="true" />
                <span className="truncate">{n.display_name}</span>
              </Link>
            </li>
          ))}
          <li className="pt-2">
            <Link to="/gia-dinh/nguoi-ke" className={buttonClasses({ variant: 'ghost', fullWidth: true })}>
              <UserPlus className="size-5" aria-hidden="true" />
              {t('header.addNarrator')}
            </Link>
          </li>
        </ul>
      </Dialog>
    </>
  );
}
