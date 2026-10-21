import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Supabase } from '@/lib/supabase';
import { MAX_PHOTO_BYTES, PhotoError, buildPhotoPath, deleteStoryPhoto, extensionFor, fitWithin, movePhoto, nextPosition, photoErrorCode, resizeImage, uploadStoryPhoto, validatePhotoFile } from './photos';

const FAM = '7c1e0a9e-1111-4222-8333-444455556666';
const UUID = '0b5a8d3c-aaaa-4bbb-8ccc-dddddddddddd';

describe('validatePhotoFile', () => {
  it('accepts jpeg, png and webp up to 8 MB', () => {
    expect(validatePhotoFile({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validatePhotoFile({ type: 'image/png', size: MAX_PHOTO_BYTES })).toBeNull();
    expect(validatePhotoFile({ type: 'image/webp', size: 5 })).toBeNull();
  });
  it('rejects other types, empty and oversized files', () => {
    expect(validatePhotoFile({ type: 'image/heic', size: 1000 })).toBe('type');
    expect(validatePhotoFile({ type: 'image/gif', size: 1000 })).toBe('type');
    expect(validatePhotoFile({ type: 'application/pdf', size: 1000 })).toBe('type');
    expect(validatePhotoFile({ type: '', size: 1000 })).toBe('type');
    expect(validatePhotoFile({ type: 'image/jpeg', size: 0 })).toBe('empty');
    expect(validatePhotoFile({ type: 'image/jpeg', size: MAX_PHOTO_BYTES + 1 })).toBe('size');
  });
});

describe('fitWithin', () => {
  it('never upscales small images', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600, scaled: false });
    expect(fitWithin(2000, 1000)).toEqual({ width: 2000, height: 1000, scaled: false });
  });
  it('scales the longest edge to 2000 and keeps the aspect ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500, scaled: true });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1500, height: 2000, scaled: true });
    expect(fitWithin(6000, 6000)).toEqual({ width: 2000, height: 2000, scaled: true });
  });
  it('rounds, keeps at least 1 px and handles a custom max', () => {
    expect(fitWithin(10000, 3, 2000)).toEqual({ width: 2000, height: 1, scaled: true });
    expect(fitWithin(1001, 333, 500)).toEqual({ width: 500, height: 166, scaled: true });
    expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0, scaled: false });
  });
});

describe('buildPhotoPath', () => {
  it('builds {family}/{uuid}.{ext}', () => {
    expect(buildPhotoPath(FAM, UUID)).toBe(`${FAM}/${UUID}.jpg`);
    expect(buildPhotoPath(FAM, UUID, extensionFor('image/webp'))).toBe(`${FAM}/${UUID}.webp`);
    expect(buildPhotoPath(FAM, UUID, extensionFor('image/png'))).toBe(`${FAM}/${UUID}.png`);
  });
  it('matches the story_photos check constraint and strips unsafe characters', () => {
    const path = buildPhotoPath(FAM, '../x/y', 'J P G');
    expect(path).toBe(`${FAM}/xy.jpg`);
    expect(new RegExp(`^${FAM}/[A-Za-z0-9._-]{1,120}$`).test(buildPhotoPath(FAM, UUID))).toBe(true);
    expect(path.split('/')).toHaveLength(2);
  });
  it('refuses bad family ids', () => {
    expect(() => buildPhotoPath('nope', UUID)).toThrow();
    expect(() => buildPhotoPath(FAM, '///')).toThrow();
  });
});

describe('ordering helpers', () => {
  const rows = [
    { id: 'a', position: 0 },
    { id: 'b', position: 1 },
    { id: 'c', position: 5 },
  ];
  it('nextPosition goes after the last one', () => {
    expect(nextPosition([])).toBe(0);
    expect(nextPosition(rows)).toBe(6);
  });
  it('movePhoto swaps neighbours and renumbers', () => {
    expect(movePhoto(rows, 'c', -1).map((r) => `${r.id}${r.position}`)).toEqual(['a0', 'c1', 'b2']);
    expect(movePhoto(rows, 'a', 1).map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(movePhoto(rows, 'a', -1).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('photoErrorCode', () => {
  it('maps RLS and network errors', () => {
    expect(photoErrorCode({ message: 'new row violates row-level security policy' })).toBe('forbidden');
    expect(photoErrorCode(new TypeError('Failed to fetch'))).toBe('network');
    expect(photoErrorCode({ message: 'weird' }, 'upload')).toBe('upload');
  });
});

function fakeSb(opts: { uploadError?: unknown; insertError?: unknown } = {}) {
  const calls: Record<string, unknown[]> = { upload: [], insert: [], remove: [], delete: [] };
  const bucket = {
    upload: vi.fn(async (path: string, body: Blob, o: unknown) => {
      calls.upload!.push({ path, body, o });
      return { data: opts.uploadError ? null : { path }, error: opts.uploadError ?? null };
    }),
    remove: vi.fn(async (paths: string[]) => {
      calls.remove!.push(paths);
      return { data: [], error: null };
    }),
  };
  const sb = {
    storage: { from: (b: string) => (b === 'media' ? bucket : null) },
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        calls.insert!.push({ table, row });
        return { select: () => ({ single: async () => (opts.insertError ? { data: null, error: opts.insertError } : { data: { id: 'p1', ...row }, error: null }) }) };
      },
      delete: () => ({
        eq: async (_c: string, id: string) => {
          calls.delete!.push(id);
          return { error: null };
        },
      }),
    }),
  };
  return { sb: sb as unknown as Supabase, calls };
}

const file = (type = 'image/jpeg', size = 1234) => new File([new Uint8Array(size)], 'anh.jpg', { type });

describe('uploadStoryPhoto', () => {
  const resize = async (f: File) => ({ blob: f as Blob, mime: 'image/jpeg' });

  it('uploads to media/{family}/{uuid}.jpg then inserts the row', async () => {
    const { sb, calls } = fakeSb();
    const stages: string[] = [];
    const row = await uploadStoryPhoto(file(), { familyId: FAM, storyId: 's1', caption: '  Tết 1975  ', position: 3 }, { sb, resize, uuid: () => UUID, onStage: (s) => stages.push(s) });
    expect((calls.upload![0] as { path: string }).path).toBe(`${FAM}/${UUID}.jpg`);
    expect(calls.insert![0]).toEqual({ table: 'story_photos', row: { story_id: 's1', family_id: FAM, storage_path: `${FAM}/${UUID}.jpg`, caption: 'Tết 1975', position: 3 } });
    expect(row.id).toBe('p1');
    expect(stages).toEqual(['resizing', 'uploading', 'saving']);
  });

  it('rejects invalid files before any request', async () => {
    const { sb, calls } = fakeSb();
    await expect(uploadStoryPhoto(file('image/gif'), { familyId: FAM, storyId: 's1' }, { sb, resize })).rejects.toMatchObject({ code: 'type' });
    expect(calls.upload).toHaveLength(0);
  });

  it('maps storage errors and cleans up the object when the insert fails', async () => {
    const up = fakeSb({ uploadError: { message: 'new row violates row-level security policy' } });
    await expect(uploadStoryPhoto(file(), { familyId: FAM, storyId: 's1' }, { sb: up.sb, resize, uuid: () => UUID })).rejects.toBeInstanceOf(PhotoError);
    const ins = fakeSb({ insertError: { message: 'boom' } });
    await expect(uploadStoryPhoto(file(), { familyId: FAM, storyId: 's1' }, { sb: ins.sb, resize, uuid: () => UUID })).rejects.toMatchObject({ code: 'save' });
    expect(ins.calls.remove).toEqual([[`${FAM}/${UUID}.jpg`]]);
  });

  it('delete removes the row, then the object', async () => {
    const { sb, calls } = fakeSb();
    await deleteStoryPhoto(sb, { id: 'p1', storage_path: `${FAM}/${UUID}.jpg` });
    expect(calls.delete).toEqual(['p1']);
    expect(calls.remove).toEqual([[`${FAM}/${UUID}.jpg`]]);
  });
});

describe('resizeImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('refuses a file no decoder can read instead of uploading it as is', async () => {
    const decode = vi.fn(async () => {
      throw new DOMException('The source image could not be decoded.', 'InvalidStateError');
    });
    vi.stubGlobal('createImageBitmap', decode);
    await expect(resizeImage(file())).rejects.toMatchObject({ code: 'decode' });
    expect(decode).toHaveBeenCalledTimes(2);
  });

  /** A canvas that records what was drawn and encodes to a fixed blob. */
  function fakeCanvas() {
    const out = new Blob(['jpeg'], { type: 'image/jpeg' });
    const ctx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
    const canvas = { width: 0, height: 0, getContext: () => ctx, toBlob: (cb: (b: Blob | null) => void) => cb(out) };
    const real = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => (tag === 'canvas' ? canvas : real(tag))) as typeof document.createElement);
    return { canvas, ctx, out };
  }

  it('retries without options when only the options bag is rejected', async () => {
    const bitmap = { width: 800, height: 600, close: vi.fn() };
    const decode = vi.fn(async (_f: Blob, o?: unknown) => {
      if (o) throw new TypeError('options not supported');
      return bitmap;
    });
    vi.stubGlobal('createImageBitmap', decode);
    const { out } = fakeCanvas();
    await expect(resizeImage(file('image/jpeg', 2000))).resolves.toEqual({ blob: out, mime: 'image/jpeg' });
    expect(decode).toHaveBeenCalledTimes(2);
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('re-encodes even a small JPEG so EXIF/GPS metadata never reaches storage', async () => {
    vi.stubGlobal('createImageBitmap', async () => ({ width: 640, height: 480, close: vi.fn() }));
    const { canvas, ctx, out } = fakeCanvas();
    const small = file('image/jpeg', 50 * 1024);
    const res = await resizeImage(small);
    expect(res.blob).toBe(out);
    expect(res.blob).not.toBe(small);
    expect(ctx.drawImage).toHaveBeenCalled();
    expect([canvas.width, canvas.height]).toEqual([640, 480]);
  });

  it('downscales a large photo to 2000 px on the longest edge', async () => {
    vi.stubGlobal('createImageBitmap', async () => ({ width: 4000, height: 3000, close: vi.fn() }));
    const { canvas } = fakeCanvas();
    await resizeImage(file('image/png', 3 * 1024 * 1024));
    expect([canvas.width, canvas.height]).toEqual([2000, 1500]);
  });

  it('a decode failure surfaces as a per-file upload error, before any request', async () => {
    vi.stubGlobal('createImageBitmap', async () => {
      throw new Error('bad');
    });
    const { sb, calls } = fakeSb();
    await expect(uploadStoryPhoto(file(), { familyId: FAM, storyId: 's1' }, { sb, uuid: () => UUID })).rejects.toMatchObject({ code: 'decode' });
    expect(calls.upload).toHaveLength(0);
  });
});
