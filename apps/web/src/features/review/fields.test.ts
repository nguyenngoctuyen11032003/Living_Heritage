import { describe, expect, it } from 'vitest';
import { formFromStory, formsEqual, normalizeExperienceFields, parseDecade, toSaveArgs } from './fields';

describe('normalizeExperienceFields', () => {
  it('fills defaults for missing or wrong-typed fields', () => {
    expect(normalizeExperienceFields(null)).toEqual({ skill: '', context: '', conditions: [], steps: [], cautions: [], limits: '', people: [], places: [], decade: '' });
    expect(normalizeExperienceFields({ skill: 3, context: null, steps: [1, 'Tưới', null], cautions: 'a\n\n b ', decade: 1970 })).toEqual({
      skill: '3',
      context: '',
      conditions: [],
      steps: ['Tưới'],
      cautions: ['a', 'b'],
      limits: '',
      people: [],
      places: [],
      decade: '1970',
    });
  });

  it('reads an AI experience draft as is', () => {
    const f = { skill: 'Ủ phân', context: 'Vườn nhà', conditions: ['Trời khô'], steps: ['Trộn', 'Ủ'], cautions: [], limits: null };
    expect(normalizeExperienceFields(f)).toMatchObject({ skill: 'Ủ phân', context: 'Vườn nhà', steps: ['Trộn', 'Ủ'], limits: '' });
  });
});

describe('parseDecade', () => {
  it('accepts empty and 4-digit years within range', () => {
    expect(parseDecade('')).toEqual({ ok: true, value: null });
    expect(parseDecade(' 1975 ')).toEqual({ ok: true, value: 1975 });
    expect(parseDecade('1899').ok).toBe(false);
    expect(parseDecade('70').ok).toBe(false);
    expect(parseDecade('abcd').ok).toBe(false);
  });
});

describe('toSaveArgs', () => {
  const story = { kind: 'experience' as const, title: 'T', summary: 'S', body: 'S', fields: { topics: ['lam-vuon'], skill: 'x', steps: ['a'] } };

  it('trims, drops blank list lines, nulls empty text and keeps unknown keys', () => {
    const form = { ...formFromStory(story), skill: ' Ủ phân ', context: '  ', steps: ['a', ' ', ' b '], decade: '1980' };
    const args = toSaveArgs('experience', form, story.fields);
    expect(args.p_body).toBe('S');
    expect(args.p_fields).toEqual({ topics: ['lam-vuon'], skill: 'Ủ phân', context: null, conditions: [], steps: ['a', 'b'], cautions: [], limits: null, decade: 1980 });
  });

  it('removes decade when cleared and leaves story fields alone', () => {
    const s = { kind: 'story' as const, title: 'A', summary: null, body: 'Body', fields: { topics: ['x'], decade: 1960 } };
    const args = toSaveArgs('story', { ...formFromStory(s), decade: '' }, s.fields);
    expect(args).toEqual({ p_title: 'A', p_summary: '', p_body: 'Body', p_fields: { topics: ['x'] }, p_topic_id: null });
  });

  it('saves people and places for both kinds and drops empty lists', () => {
    const s = { kind: 'story' as const, title: 'A', summary: null, body: 'B', fields: { topics: ['x'], people: ['Bà Tư'] } };
    const form = formFromStory(s);
    expect(form.people).toEqual(['Bà Tư']);
    const args = toSaveArgs('story', { ...form, people: [' Bà Tư ', ''], places: ['Chợ Lớn'] }, s.fields);
    expect(args.p_fields).toEqual({ topics: ['x'], people: ['Bà Tư'], places: ['Chợ Lớn'] });
    expect(toSaveArgs('story', { ...form, people: [' '] }, s.fields).p_fields).toEqual({ topics: ['x'] });
  });

  it('story opening and lesson: saved when written, key removed when empty (never an empty string)', () => {
    const s = { kind: 'story' as const, title: 'A', summary: null, body: 'B', fields: { opening: 'Hồi đó', lesson: 'Chăm chỉ' } };
    const form = formFromStory(s);
    expect([form.opening, form.lesson]).toEqual(['Hồi đó', 'Chăm chỉ']);
    expect(toSaveArgs('story', { ...form, lesson: '  ' }, s.fields).p_fields).toEqual({ opening: 'Hồi đó' });
  });

  it('sends a topic only when it changed', () => {
    const s = { kind: 'story' as const, title: 'A', summary: null, body: 'B', fields: {}, topic_id: 't1' };
    expect(toSaveArgs('story', formFromStory(s), {}, 't1').p_topic_id).toBeNull();
    expect(toSaveArgs('story', { ...formFromStory(s), topicId: 't2' }, {}, 't1').p_topic_id).toBe('t2');
  });

  it('rejects an invalid decade', () => {
    expect(() => toSaveArgs('story', { ...formFromStory(story), decade: '12' }, {})).toThrow('invalid_decade');
  });

  it('detects dirty forms', () => {
    const a = formFromStory(story);
    expect(formsEqual(a, formFromStory(story))).toBe(true);
    expect(formsEqual(a, { ...a, steps: ['a', ''] })).toBe(false);
  });
});
