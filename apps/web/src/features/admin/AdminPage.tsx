import { Bot, CircleAlert, Flag, Globe2, Handshake, PlugZap, RotateCcw, ShieldAlert, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Button, ButtonLink, EmptyState, Skeleton, Tab, TabList, TabPanel, Tabs } from '@/components/ui';
import { PageHeader } from '@/features/families/states';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { parseAdminTab, resolveAdminAccess, visibleAdminTabs, type AdminCheck, type AdminTab } from './access';
import { AiJobsTab } from './tabs/AiJobsTab';
import { ConnectTab } from './tabs/ConnectTab';
import { DeletionTab } from './tabs/DeletionTab';
import { PublishTab } from './tabs/PublishTab';
import { ReportsTab } from './tabs/ReportsTab';

const ICONS: Record<AdminTab, ReactNode> = {
  publish: <Globe2 />,
  reports: <Flag />,
  connect: <Handshake />,
  deletion: <Trash2 />,
  aiJobs: <Bot />,
};

const PANELS: Record<AdminTab, () => ReactNode> = {
  publish: () => <PublishTab />,
  reports: () => <ReportsTab />,
  connect: () => <ConnectTab />,
  deletion: () => <DeletionTab />,
  aiJobs: () => <AiJobsTab />,
};

/** /quan-tri — moderation console. Data is only queried after rpc('is_admin') returns true (RLS enforces it too). */
export default function AdminPage() {
  const t = useT('admin');
  const tc = useT('common');
  const { user, loading, isAnonymous } = useSession();
  const sb = getSupabase();
  const [check, setCheck] = useState<{ uid: string; value: AdminCheck }>({ uid: '', value: 'pending' });
  const [nonce, setNonce] = useState(0);
  const [params, setParams] = useSearchParams();
  const tab = parseAdminTab(params.get('tab'));

  useEffect(() => {
    document.title = `${t('title')} — ${tc('brand.name')}`;
  }, [t, tc]);

  useEffect(() => {
    if (!sb || !user || isAnonymous) return;
    let alive = true;
    setCheck({ uid: user.id, value: 'pending' });
    void sb
      .rpc('is_admin')
      .then(({ data, error }) => {
        if (!alive) return;
        setCheck({ uid: user.id, value: error ? 'error' : data === true ? 'yes' : 'no' });
      })
      .then(undefined, () => alive && setCheck({ uid: user.id, value: 'error' }));
    return () => {
      alive = false;
    };
  }, [sb, user, isAnonymous, nonce]);

  const access = resolveAdminAccess({
    configured: Boolean(sb),
    sessionLoading: loading,
    signedIn: Boolean(user),
    isAnonymous,
    adminCheck: user && check.uid === user.id ? check.value : 'pending',
  });
  const tabs = visibleAdminTabs(access);

  let content: ReactNode;
  if (access === 'not-configured') {
    content = <EmptyState icon={<PlugZap />} title={t('states.notConfigured')} />;
  } else if (access === 'loading') {
    content = (
      <div aria-busy="true">
        <p role="status" className="sr-only">
          {t('states.checking')}
        </p>
        <Skeleton className="h-12 w-full max-w-2xl rounded-full" />
        <Skeleton className="mt-6 h-40 w-full rounded-[1.5rem]" />
      </div>
    );
  } else if (access === 'error') {
    content = (
      <div role="alert">
        <EmptyState
          icon={<CircleAlert />}
          title={t('states.error')}
          action={
            <Button onClick={() => setNonce((n) => n + 1)} leftIcon={<RotateCcw aria-hidden="true" className="size-5" />}>
              {t('states.retry')}
            </Button>
          }
        />
      </div>
    );
  } else if (access === 'signed-out') {
    content = <EmptyState icon={<ShieldAlert />} title={t('states.signedOut')} action={<ButtonLink to="/dang-nhap?next=%2Fquan-tri">{t('states.login')}</ButtonLink>} />;
  } else if (access === 'forbidden') {
    content = (
      <EmptyState icon={<ShieldAlert />} title={t('states.forbiddenTitle')} description={t('states.forbiddenBody')} action={<ButtonLink to="/gia-dinh">{t('states.backHome')}</ButtonLink>} />
    );
  } else {
    content = (
      <Tabs
        value={tab}
        defaultValue="publish"
        onValueChange={(v) =>
          setParams(
            (prev) => {
              const p = new URLSearchParams(prev);
              p.set('tab', v);
              return p;
            },
            { replace: true },
          )
        }
      >
        <TabList label={t('tabs.label')} className="max-w-full">
          {tabs.map((id) => (
            <Tab key={id} value={id} icon={ICONS[id]}>
              {t(`tabs.${id}`)}
            </Tab>
          ))}
        </TabList>
        {tabs.map((id) => (
          <TabPanel key={id} value={id} className="mt-8">
            {PANELS[id]()}
          </TabPanel>
        ))}
      </Tabs>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('lede')} />
      {content}
    </div>
  );
}
