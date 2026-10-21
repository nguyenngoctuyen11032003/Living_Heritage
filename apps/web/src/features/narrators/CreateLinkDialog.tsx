import { Share2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Button, Dialog, Field, QrCode, Select } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { rpcErrorCode, type FamilyErrorCode } from '@/features/families/rpcError';
import { shareLink } from '@/features/families/share';
import { CopyField, ErrorNotice } from '@/features/families/states';
import type { Narrator } from './hooks';
import { narratorLinkUrl } from './urls';

const TTL_OPTIONS = [7, 30, 90] as const;

export function CreateLinkDialog({ narrator, onClose, onCreated }: { narrator: Narrator | null; onClose: () => void; onCreated: () => void }) {
  return narrator ? <Body key={narrator.id} narrator={narrator} onClose={onClose} onCreated={onCreated} /> : null;
}

function Body({ narrator, onClose, onCreated }: { narrator: Narrator; onClose: () => void; onCreated: () => void }) {
  const t = useT('family');
  const tc = useT('common');
  const { locale } = useLocale();
  const [ttl, setTtl] = useState<number>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FamilyErrorCode | null>(null);
  const [result, setResult] = useState<{ url: string; expiresAt: Date } | null>(null);
  const [shareNote, setShareNote] = useState('');
  const name = narrator.pen_name || narrator.display_name;

  async function create() {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb.rpc('create_narrator_link', { p_narrator: narrator.id, p_ttl_days: ttl });
    setBusy(false);
    if (err || !data) {
      setError(rpcErrorCode(err));
      return;
    }
    setResult({ url: narratorLinkUrl(data), expiresAt: new Date(Date.now() + ttl * 86_400_000) });
    onCreated();
  }

  async function share() {
    if (!result) return;
    const outcome = await shareLink({ url: result.url, title: t('links.shareTitle'), text: t('links.shareText', { name }) });
    setShareNote(outcome === 'copied' ? t('links.shareCopied') : outcome === 'failed' ? t('share.copyFailed') : '');
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size={result ? 'lg' : 'md'}
      title={result ? t('links.readyTitle', { name }) : t('links.createTitle', { name })}
      description={result ? undefined : t('links.createBody')}
      footer={
        result ? (
          <Button onClick={onClose}>{t('links.done')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              {tc('actions.cancel')}
            </Button>
            <Button onClick={create} loading={busy}>
              {t('links.create')}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="flex flex-col gap-5 pb-2">
          <div role="alert" className="flex items-start gap-3 rounded-2xl bg-[#fbecc8] p-4 text-[#6b4a0c]">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <p className="leading-relaxed">{t('links.onceWarning')}</p>
          </div>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="shrink-0 rounded-3xl bg-cream p-4 ring-1 ring-line">
              <QrCode value={result.url} label={t('links.qrLabel', { name })} size={240} className="size-[min(240px,70vw)]" />
            </div>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
              <p className="leading-relaxed text-ink">{t('links.howTo')}</p>
              <p className="text-[0.95rem] text-ink-soft">{t('links.expiresOn', { date: formatDate(result.expiresAt, locale) })}</p>
              <Button variant="primary" size="lg" className="text-balance text-center" onClick={share} leftIcon={<Share2 className="size-5" aria-hidden="true" />}>
                {t('links.shareZalo')}
              </Button>
              <p aria-live="polite" className="min-h-5 text-[0.88rem] text-ink-soft">
                {shareNote}
              </p>
            </div>
          </div>
          <CopyField value={result.url} label={t('links.urlLabel')} />
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-2">
          <Field label={t('links.ttl')} hint={t('links.ttlHint')}>
            <Select value={ttl} onChange={(e) => setTtl(Number(e.target.value))}>
              {TTL_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {t('links.ttlDays', { n: d })}
                </option>
              ))}
            </Select>
          </Field>
          {narrator.user_id && <p className="rounded-2xl bg-cream p-4 text-[0.95rem] leading-relaxed text-ink">{t('links.rebindNote')}</p>}
          <div aria-live="assertive">{error && <ErrorNotice message={t(`errors.${error}`)} />}</div>
        </div>
      )}
    </Dialog>
  );
}
