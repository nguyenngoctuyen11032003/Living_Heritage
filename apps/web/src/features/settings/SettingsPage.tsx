// /cai-dat: profile, display, family and account settings, plus the way into the family data center.
import { ArrowRight, ShieldCheck } from 'lucide-react';
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

  function onTab(next: string) {
    const p = new URLSearchParams(params);
    if (next === 'profile') p.delete('muc');
    else p.set('muc', next);
    setParams(p, { replace: true });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t('page.eyebrow')} title={t('page.title')} description={t('page.subtitle')} />
      {getSupabase() === null ? (
        <NotConfiguredNotice />
      ) : (
        <>
          <Tabs value={tab} defaultValue="profile" onValueChange={onTab}>
            <TabList label={t('page.tabsLabel')} className="mb-6">
              {TABS.map((k) => (
                <Tab key={k} value={k}>
                  {t(`tabs.${k}`)}
                </Tab>
              ))}
            </TabList>
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
    <Card tone="mint" padding="md" className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:p-8">
      <ShieldCheck aria-hidden="true" className="size-9 shrink-0 text-heritage" />
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-[1.35rem] font-semibold text-heritage-deep">{t('privacy.title')}</h2>
        <p className="mt-1 leading-relaxed text-ink-soft">{t('privacy.body')}</p>
      </div>
      <ButtonLink to={DATA_CENTER_PATH} rightIcon={<ArrowRight className="size-4" aria-hidden="true" />}>
        {t('privacy.action')}
      </ButtonLink>
    </Card>
  );
}
