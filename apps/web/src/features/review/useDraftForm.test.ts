import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDraftForm } from './useDraftForm';

const story = (over: Partial<{ id: string; current_version: number; title: string; visibility: string }> = {}) => ({
  id: 's1',
  current_version: 2,
  kind: 'story' as const,
  title: 'Mùa gặt',
  summary: null,
  body: 'Thân bài',
  fields: {},
  topic_id: null,
  visibility: 'private',
  ...over,
});

describe('useDraftForm', () => {
  it('keeps unsaved edits when a refresh returns the same version (share dialog, job poll)', () => {
    const { result, rerender } = renderHook(({ s }) => useDraftForm(s), { initialProps: { s: story() } });
    act(() => result.current.setForm({ ...result.current.form, title: 'Sửa dở' }));
    expect(result.current.dirty).toBe(true);
    rerender({ s: story({ visibility: 'family' }) }); // new row object, same id + version
    expect(result.current.form.title).toBe('Sửa dở');
    expect(result.current.dirty).toBe(true);
  });

  it('loads the new version after a save or when another story opens', () => {
    const { result, rerender } = renderHook(({ s }) => useDraftForm(s), { initialProps: { s: story() } });
    act(() => result.current.setForm({ ...result.current.form, title: 'Sửa dở' }));
    rerender({ s: story({ current_version: 3, title: 'Bản 3' }) });
    expect(result.current.form.title).toBe('Bản 3');
    expect(result.current.dirty).toBe(false);
    rerender({ s: story({ id: 's2', current_version: 3, title: 'Khác' }) });
    expect(result.current.form.title).toBe('Khác');
  });
});
