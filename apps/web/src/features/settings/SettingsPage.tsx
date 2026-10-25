// /cai-dat: profile, display, family and account settings, plus the way into the family data center.
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { ButtonLink, Card, Tab, TabList, TabPanel, Tabs } from '@/components/ui';
import { NotConfiguredNotice, PageHeader } from '@/features/families/states';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { AccountSection } from './AccountSection';
import { DisplaySection } from './DisplaySection';
import { FamilySection } from './FamilySection';
import { DATA_CENTER_PATH } from './paths';
import { ProfileSection } from './ProfileSection';

const TABS = ['profile', 'display', 'family', 'account'] as const;
type TabKey = (typeof TABS)[number];

export default function SettingsPage() {
  const t = useT('settings');
  const [params, setParams] = useSearchParams();
  const raw = params.get('muc');
  const tab: TabKey = (TABS as readonly string[]).includes(raw ?? '') ? (raw as TabKey) : 'profile';

  const tabsRef = useRef<HTMLDivElement>(null);
  // On phones the tab strip scrolls sideways: keep the selected tab in view (e.g. ?muc=account).
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [tab]);

  function onTab(next: string) {
    const p = new URLSearchParams(params);
    if (next === 'profile') p.delete('muc');
    else p.set('muc', next);
    setParams(p, { replace: true });
  }

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow={t('page.eyebrow')} title={t('page.title')} description={t('page.subtitle')} />
      {getSupabase() === null ? (
        <NotConfiguredNotice />
      ) : (
        <>
          <Tabs value={tab} defaultValue="profile" onValueChange={onTab}>
            <div ref={tabsRef} className="mb-6 max-w-full">
              <TabList label={t('page.tabsLabel')} className="w-full snap-x snap-mandatory scroll-px-1 sm:w-auto">
                {TABS.map((k) => (
                  <Tab key={k} value={k} className="snap-start justify-center px-2.5 sm:px-5">
                    {t(`tabs.${k}`)}
                  </Tab>
                ))}
              </TabList>
            </div>
            <TabPanel value="profile">
              <ProfileSection />
            </TabPanel>
            <TabPanel value="display">
              <DisplaySection />
            </TabPanel>
            <TabPanel value="family">
              <FamilySection />
            </TabPanel>
            <TabPanel value="account">
              <AccountSection />
            </TabPanel>
          </Tabs>
          <PrivacyCard />
        </>
      )}
    </div>
  );
}

function PrivacyCard() {
  const t = useT('settings');
  return (
    <Card tone="mint" padding="md" className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:gap-6 md:p-8">
      <ShieldCheck aria-hidden="true" className="size-10 shrink-0 text-heritage" />
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-[1.35rem] font-semibold text-heritage-deep">{t('privacy.title')}</h2>
        <p className="mt-1 leading-relaxed text-ink-soft">{t('privacy.body')}</p>
      </div>
      <ButtonLink to={DATA_CENTER_PATH} className="w-full justify-center whitespace-nowrap px-4 max-sm:text-[0.95rem] md:w-auto md:shrink-0 md:px-6" rightIcon={<ArrowRight className="size-4" aria-hidden="true" />}>
        {t('privacy.action')}
      </ButtonLink>
    </Card>
  );
}
