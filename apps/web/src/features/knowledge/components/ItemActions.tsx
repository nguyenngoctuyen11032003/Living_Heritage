import { Bookmark, BookmarkCheck, Flag, MessageCircle, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { siteHref } from '@/lib/env';
import { useIsSaved } from '../saved';
import type { KnowledgeItem } from '../types';
import { ConnectDialog } from './ConnectDialog';
import { ReportDialog } from './ReportDialog';

/** Save / Share / Report / Connect for one public item. */
export function ItemActions({ item }: { item: KnowledgeItem }) {
  const t = useT('knowledge');
  const { toast } = useToast();
  const [saved, toggle] = useIsSaved(item.id);
  const [dialog, setDialog] = useState<'report' | 'connect' | null>(null);

  function onSave() {
    const now = toggle(item);
    toast({ title: now ? t('actions.savedToast') : t('actions.removedToast'), tone: 'success' });
  }

  async function onShare() {
    const url = siteHref(`/tri-thuc/${item.id}`);
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: item.title, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t('actions.copied'), tone: 'success' });
    } catch {
      toast({ title: t('actions.copyFailed', { url }), tone: 'info', duration: null });
    }
  }

  return (
    <>
      <div role="group" aria-label={t('detail.actionsLabel')} className="flex flex-wrap gap-2.5">
        <Button
          variant={saved ? 'primary' : 'secondary'}
          aria-pressed={saved}
          onClick={onSave}
          leftIcon={saved ? <BookmarkCheck aria-hidden="true" className="size-4" /> : <Bookmark aria-hidden="true" className="size-4" />}
        >
          {saved ? t('actions.saved') : t('actions.save')}
        </Button>
        <Button variant="secondary" onClick={() => void onShare()} leftIcon={<Share2 aria-hidden="true" className="size-4" />}>
          {t('actions.share')}
        </Button>
        <Button variant="secondary" onClick={() => setDialog('connect')} leftIcon={<MessageCircle aria-hidden="true" className="size-4" />}>
          {t('actions.connect')}
        </Button>
        <Button variant="ghost" onClick={() => setDialog('report')} leftIcon={<Flag aria-hidden="true" className="size-4" />}>
          {t('actions.report')}
        </Button>
      </div>
      <ReportDialog item={item} open={dialog === 'report'} onClose={() => setDialog(null)} />
      <ConnectDialog item={item} open={dialog === 'connect'} onClose={() => setDialog(null)} />
    </>
  );
}
