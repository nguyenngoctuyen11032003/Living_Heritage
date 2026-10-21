import { Info } from 'lucide-react';
import { useT } from '@/i18n';
import { Badge } from './Badge';

/** The mandatory "Dữ liệu minh hoạ / Illustrative data" label for sample content (plan ground rule 6). */
export function IllustrativeBadge({ tone = 'warning', className }: { tone?: 'warning' | 'night' | 'outline'; className?: string }) {
  const t = useT('common');
  return (
    <Badge tone={tone} size="sm" icon={<Info />} className={className}>
      {t('states.illustrative')}
    </Badge>
  );
}
