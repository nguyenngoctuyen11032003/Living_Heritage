import { useMemo, useState } from 'react';
import { formFromStory, formsEqual, type DraftForm, type StorySource } from './fields';

/**
 * The editable draft form for a story. The form is reset from the server only when a different story or a new
 * version arrives: a refresh that returns the same version (share dialog change, job poll, reload) must not
 * wipe unsaved edits.
 */
export function useDraftForm(story: StorySource & { id: string; current_version: number }) {
  const versionKey = `${story.id}:${story.current_version}`;
  // The baseline follows the same key, so "dirty" compares against the version the form was loaded from.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on id + version on purpose
  const baseline = useMemo(() => formFromStory(story), [versionKey]);
  const [state, setState] = useState<{ key: string; form: DraftForm }>({ key: versionKey, form: baseline });
  // Reset during render when the version changes (no effect → no stale frame).
  let form = state.form;
  if (state.key !== versionKey) {
    form = baseline;
    setState({ key: versionKey, form: baseline });
  }
  const setForm = (next: DraftForm) => setState({ key: versionKey, form: next });
  return { form, setForm, baseline, dirty: !formsEqual(form, baseline) };
}
