// /gia-dinh/du-lieu: the family's privacy & data center — export, active storytelling links, access log, deletion.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCurrentFamily } from '@/features/families/current';
import { FamilyGate } from '@/features/families/FamilyGate';
import { ForbiddenNotice, PageHeader } from '@/features/families/states';
import { useNarrators } from '@/features/narrators/hooks';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { AuditSection } from './AuditSection';
import { DeletionSection, type StoryOption } from './DeletionSection';
import { ExportSection } from './ExportSection';
import { LinksSection } from './LinksSection';
import { dataCenterAccess } from './permissions';

export default function DataCenterPage() {
  return (
    <FamilyGate>
      <DataCenter />
    </FamilyGate>
  );
}

function useFamilyStories(familyId: string) {
  const [stories, setStories] = useState<StoryOption[]>([]);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data, error: err } = await sb.from('stories').select('id, title').eq('family_id', familyId).order('created_at', { ascending: false }).limit(500);
    setError(Boolean(err));
    setStories(data ?? []);
  }, [familyId]);
  useEffect(() => {
    void load();
  }, [load]);
  return { stories, error };
}

function DataCenter() {
  const t = useT('settings');
  const fam = useCurrentFamily();
  const family = fam.current!;
  const access = dataCenterAccess(family.role);
  const { stories, error: storiesError } = useFamilyStories(family.id);
  const narrators = useNarrators(family.id);
  const storyTitles = useMemo(() => new Map(stories.map((s) => [s.id, s.title || t('deletion.storyUntitled')])), [stories, t]);
  const narratorNames = useMemo(() => new Map(narrators.narrators.map((n) => [n.id, n.display_name])), [narrators.narrators]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow={t('data.eyebrow')} title={t('data.title')} description={t('data.subtitle', { family: family.name })} />
      <div className="flex flex-col gap-6">
        {!access.export && <ForbiddenNotice>{t('data.managersOnly')}</ForbiddenNotice>}
        {access.export && <ExportSection key={`e-${family.id}`} family={family} />}
        {access.links && (
          <LinksSection
            key={`l-${family.id}`}
            family={family}
            narrators={narrators.narrators}
            narratorsLoading={narrators.loading}
            narratorsError={Boolean(narrators.error)}
            onNarratorsRetry={() => void narrators.reload()}
          />
        )}
        {access.audit && <AuditSection key={`a-${family.id}`} family={family} storyTitles={storyTitles} narratorNames={narratorNames} />}
        {access.deletion && <DeletionSection key={`d-${family.id}`} family={family} stories={stories} storiesError={storiesError} />}
      </div>
    </div>
  );
}
