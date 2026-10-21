// First-time "Cách kể chuyện" guide: three steps, dismissible, remembered on this device.
import { Archive, Mic, Volume2 } from 'lucide-react';
import { Button, Dialog } from '@/components/ui';
import { useT } from '@/i18n';

const STEPS = [
  { icon: Volume2, title: 'howto.step1Title', desc: 'howto.step1Desc' },
  { icon: Mic, title: 'howto.step2Title', desc: 'howto.step2Desc' },
  { icon: Archive, title: 'howto.step3Title', desc: 'howto.step3Desc' },
] as const;

export function HowToGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT('narrator');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={<span className="font-serif text-[1.6rem]">{t('howto.title')}</span>}
      description={<span className="text-[1.17rem]">{t('howto.intro')}</span>}
      size="md"
      footer={
        <Button size="xl" fullWidth onClick={onClose} className="text-[1.2rem]!">
          {t('howto.dismiss')}
        </Button>
      }
    >
      <ol className="flex flex-col gap-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex items-start gap-4 rounded-2xl bg-mint/50 p-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-heritage text-cream" aria-hidden="true">
              <step.icon className="size-7" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[1.17rem] font-medium text-heritage">{t('howto.step', { n: i + 1 })}</span>
              <span className="font-serif text-[1.4rem] font-semibold leading-snug text-ink">{t(step.title)}</span>
              <span className="text-[1.17rem] leading-relaxed text-ink-soft">{t(step.desc)}</span>
            </span>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
