import { useEffect } from 'react';
import { useBlocker } from 'react-router';
import { Button, Dialog } from '@/components/ui';
import { useT } from '@/i18n';

/** B16: warn before leaving while recording or with an unsaved take (browser close + in-app navigation). */
export function LeaveGuard({ when }: { when: boolean }) {
  const t = useT('narrator');
  const blocker = useBlocker(({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);

  const open = blocker.state === 'blocked';
  return (
    <Dialog
      open={open}
      onClose={() => blocker.reset?.()}
      title={t('leave.title')}
      description={t('leave.desc')}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" onClick={() => blocker.proceed?.()}>
            {t('leave.leave')}
          </Button>
          <Button size="lg" onClick={() => blocker.reset?.()}>
            {t('leave.stay')}
          </Button>
        </div>
      }
    />
  );
}
