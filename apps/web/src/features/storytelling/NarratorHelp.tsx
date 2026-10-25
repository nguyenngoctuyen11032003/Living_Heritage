// "Trợ giúp" in the NarratorShell header (B3: narrator chrome = back, topic, help). Opens the how-to guide.
import { CircleHelp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { NarratorHelpSlot } from '@/components/layout/NarratorHelpSlot';
import { useT } from '@/i18n';
import { track } from '@/lib/events';
import { HowToGuide } from './HowToGuide';

/** The header button only; the page owns the guide. Counts one `help_opened` per tap. */
export function NarratorHelpButton({ onOpen }: { onOpen: () => void }) {
  const t = useT('narrator');
  return (
    <NarratorHelpSlot>
      <Button
        size="lg"
        variant="secondary"
        onClick={() => {
          track('help_opened');
          onOpen();
        }}
        leftIcon={<CircleHelp className="size-5 shrink-0" aria-hidden="true" />}
        className="text-[1.25rem]!"
      >
        {t('help')}
      </Button>
    </NarratorHelpSlot>
  );
}

/** Header button plus the guide, for pages that do not otherwise show it (topic list, my stories). */
export function NarratorHelp() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <NarratorHelpButton onOpen={() => setOpen(true)} />
      <HowToGuide open={open} onClose={() => setOpen(false)} />
    </>
  );
}
