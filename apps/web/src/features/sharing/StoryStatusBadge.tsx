import type { EditStatus, Visibility } from '@lh/shared';
import { CheckCircle2, Clock3, Globe2, PencilLine } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

export interface StoryStatusBadgeProps {
  editStatus: EditStatus;
  visibility: Visibility;
  /** Also show the private / family scope (the public badge is always shown). */
  showScope?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const editTone: Record<EditStatus, BadgeTone> = { draft: 'neutral', pending_review: 'warning', approved: 'mint' };
const editIcon = { draft: <PencilLine />, pending_review: <Clock3 />, approved: <CheckCircle2 /> } as const;

/** Text + icon status pills: Nháp / Chờ duyệt / Đã duyệt, plus Công khai when public (never colour alone). */
export function StoryStatusBadge({ editStatus, visibility, showScope, size = 'md', className }: StoryStatusBadgeProps) {
  const t = useT('review');
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      <Badge tone={editTone[editStatus]} size={size} icon={editIcon[editStatus]}>
        {t(`status.${editStatus}`)}
      </Badge>
      {visibility === 'public' ? (
        <Badge tone="heritage" size={size} icon={<Globe2 />}>
          {t('status.public')}
        </Badge>
      ) : (
        showScope && (
          <Badge tone="outline" size={size}>
            {t(`status.${visibility}`)}
          </Badge>
        )
      )}
    </span>
  );
}
