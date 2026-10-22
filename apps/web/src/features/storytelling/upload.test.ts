import { describe, expect, it, vi } from 'vitest';
import { createMemoryPendingStore, pendingKey, type PendingUpload } from './pendingStore';
import { buildRecordingPath, clampDuration, uploadPending, UploadError, type UploadBackend } from './upload';

const FAMILY = '11111111-1111-4111-8111-111111111111';
const NARRATOR = '22222222-2222-4222-8222-222222222222';
const ATTEMPT = '33333333-3333-4333-8333-333333333333';

function pending(over: Partial<PendingUpload> = {}): PendingUpload {
  return {
    key: pendingKey('sess', 'q1'),
    attemptId: ATTEMPT,
    blob: new Blob(['abc'], { type: 'audio/webm' }),
    mime: 'audio/webm;codecs=opus',
    duration: 12.345,
    familyId: FAMILY,
    narratorId: NARRATOR,
    sessionId: 'sess',
    questionId: 'q1',
    createdAt: 0,
    uploaded: false,
    recordingId: null,
    ...over,
  };
}

/** Fake backend that remembers objects and rows like Storage + a unique storage_path column would. */
function fakeBackend() {
  const objects = new Set<string>();
  const rows = new Map<string, string>(); // path -> id
  let failUploadOnce = false;
  let failInsertOnce = false;
  const backend: UploadBackend = {
    uploadObject: vi.fn(async (path: string) => {
      if (failUploadOnce) {
        failUploadOnce = false;
        throw new TypeError('Failed to fetch');
      }
      if (objects.has(path)) return { error: { message: 'The resource already exists', statusCode: '409' } };
      objects.add(path);
      return { error: null };
    }),
    insertRecording: vi.fn(async (row) => {
      if (failInsertOnce) {
        failInsertOnce = false;
        rows.set(row.storage_path, 'rec-1'); // the row landed but the response was lost
        return { id: null, error: { message: 'TypeError: Failed to fetch' } };
      }
      if (rows.has(row.storage_path)) return { id: null, error: { code: '23505', message: 'duplicate key' } };
      rows.set(row.storage_path, 'rec-1');
      return { id: 'rec-1', error: null };
    }),
    findRecordingId: vi.fn(async (path: string) => rows.get(path) ?? null),
  };
  return {
    backend,
    objects,
    rows,
    failUpload: () => (failUploadOnce = true),
    failInsert: () => (failInsertOnce = true),
  };
}

describe('buildRecordingPath', () => {
  it('is exactly family/narrator/uuid.webm', () => {
    expect(buildRecordingPath(FAMILY, NARRATOR, ATTEMPT)).toBe(`${FAMILY}/${NARRATOR}/${ATTEMPT}.webm`);
    expect(buildRecordingPath('f', 'n', 'u').split('/')).toHaveLength(3);
  });
});

describe('clampDuration', () => {
  it('keeps two decimals and the DB range', () => {
    expect(clampDuration(12.345)).toBe(12.35);
    expect(clampDuration(9999)).toBe(610);
    expect(clampDuration(-1)).toBe(0);
    expect(clampDuration(Number.NaN)).toBe(0);
  });
});

describe('uploadPending', () => {
  it('uploads, inserts and clears the pending take', async () => {
    const { backend, objects } = fakeBackend();
    const store = createMemoryPendingStore();
    const p = pending();
    await store.put(p);
    await expect(uploadPending(p, backend, store)).resolves.toBe('rec-1');
    expect([...objects]).toEqual([`${FAMILY}/${NARRATOR}/${ATTEMPT}.webm`]);
    expect(backend.insertRecording).toHaveBeenCalledWith(expect.objectContaining({ storage_path: `${FAMILY}/${NARRATOR}/${ATTEMPT}.webm`, duration_s: 12.35, size_bytes: 3, question_id: 'q1' }));
    expect(await store.get(p.key)).toBeNull();
  });

  it('keeps the take on a network failure and retries without duplicates', async () => {
    const fake = fakeBackend();
    const store = createMemoryPendingStore();
    const p = pending();
    await store.put(p);
    fake.failUpload();
    await expect(uploadPending(p, fake.backend, store)).rejects.toMatchObject({ code: 'network' });
    expect(await store.get(p.key)).not.toBeNull();
    await expect(uploadPending(p, fake.backend, store)).resolves.toBe('rec-1');
    expect(fake.objects.size).toBe(1);
    expect(fake.rows.size).toBe(1);
  });

  it('treats an existing object and an existing row as success (lost responses)', async () => {
    const fake = fakeBackend();
    const store = createMemoryPendingStore();
    const p = pending();
    await store.put(p);
    fake.failInsert();
    const err = await uploadPending(p, fake.backend, store).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UploadError);
    expect((err as UploadError).uploaded).toBe(true);
    const saved = await store.get(p.key);
    expect(saved?.uploaded).toBe(true);
    // Retry from the original (not-yet-marked) take: the object already exists, the row already exists.
    await expect(uploadPending(p, fake.backend, store)).resolves.toBe('rec-1');
    expect(fake.objects.size).toBe(1);
    expect(fake.rows.size).toBe(1);
    expect(fake.backend.findRecordingId).toHaveBeenCalled();
  });

  it('refuses files over the size limit before uploading', async () => {
    const fake = fakeBackend();
    const big = { size: 21 * 1024 * 1024 } as Blob;
    await expect(uploadPending(pending({ blob: big }), fake.backend, createMemoryPendingStore())).rejects.toMatchObject({ code: 'too_large' });
    expect(fake.backend.uploadObject).not.toHaveBeenCalled();
  });

  it('maps a row-level-security refusal to forbidden', async () => {
    const backend: UploadBackend = {
      uploadObject: async () => ({ error: { message: 'new row violates row-level security policy', statusCode: '403' } }),
      insertRecording: async () => ({ id: null, error: null }),
      findRecordingId: async () => null,
    };
    await expect(uploadPending(pending(), backend, createMemoryPendingStore())).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('mime handling (Safari/iOS records mp4)', () => {
  it('uses an .m4a object path for audio/mp4 and the bare type as content type', async () => {
    const { backend, objects } = fakeBackend();
    const store = createMemoryPendingStore();
    const p = { ...pending(), mime: 'audio/mp4;codecs=mp4a.40.2' };
    await uploadPending(p, backend, store);
    expect([...objects]).toEqual([`${FAMILY}/${NARRATOR}/${ATTEMPT}.m4a`]);
    expect(backend.uploadObject).toHaveBeenCalledWith(`${FAMILY}/${NARRATOR}/${ATTEMPT}.m4a`, expect.anything(), 'audio/mp4');
    expect(buildRecordingPath('f', 'n', 'u', 'audio/webm;codecs=opus')).toBe('f/n/u.webm');
  });

  it('refuses an empty take', async () => {
    const { backend } = fakeBackend();
    const p = { ...pending(), blob: new Blob([], { type: 'audio/webm' }) };
    await expect(uploadPending(p, backend, createMemoryPendingStore())).rejects.toMatchObject({ code: 'failed' });
  });
});
