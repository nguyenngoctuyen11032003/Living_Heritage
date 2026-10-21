// B17 usage events from the storytelling screen: one event per action, never on re-render or pause/resume.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NarratorHelpSlotContext } from '@/components/layout/narratorHelpContext';
import { LocaleProvider } from '@/i18n';
import type { NarratorInfo, Question, SessionRow } from './data';
import { CONSENT_KEY, HOWTO_KEY } from './prefs';
import { SessionFlow } from './SessionFlow';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/events', () => ({ track }));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({}), requireSupabase: () => ({}) }));
vi.mock('./data', async (orig) => ({ ...(await orig<typeof import('./data')>()), endSession: vi.fn(async () => {}), fetchJobStatus: vi.fn(async () => null) }));
vi.mock('./upload', async (orig) => ({ ...(await orig<typeof import('./upload')>()), uploadPending: vi.fn(async () => 'rec-1') }));
vi.mock('@/features/ai/client', async (orig) => ({
  ...(await orig<typeof import('@/features/ai/client')>()),
  transcribeAndDraft: vi.fn(() => new Promise(() => {})),
  suggestQuestions: vi.fn(async () => []),
}));
// A fresh device store per test (the mocked upload never clears it).
const stores = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('./pendingStore', async (orig) => {
  const mod = await orig<typeof import('./pendingStore')>();
  return { ...mod, getPendingStore: () => (stores.current ??= mod.createMemoryPendingStore()) };
});

class FakeMediaRecorder extends EventTarget {
  static isTypeSupported = () => true;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  start() {
    this.state = 'recording';
  }
  pause() {
    this.state = 'paused';
  }
  resume() {
    this.state = 'recording';
  }
  requestData() {
    queueMicrotask(() => this.ondataavailable?.({ data: new Blob(['ab']) }));
  }
  stop() {
    this.ondataavailable?.({ data: new Blob(['xyz']) });
    this.state = 'inactive';
    this.dispatchEvent(new Event('stop'));
  }
}

const session: SessionRow = { id: 's1', family_id: 'f1', narrator_id: 'n1', topic_id: null, ended_at: null };
const narrator: NarratorInfo = { id: 'n1', family_id: 'f1', display_name: 'Lan', pen_name: null, user_id: 'u1', family_name: 'Nguyễn', lang: 'vi' };
const questions: Question[] = [{ id: 'q1', topic_id: 't1', prompt_vi: 'Câu hỏi một?', prompt_en: 'Question one?', kind_hint: 'story', sort: 1 }];

function renderFlow() {
  const slot = document.createElement('div');
  document.body.appendChild(slot);
  const router = createMemoryRouter(
    [
      { path: '/p', element: <SessionFlow session={session} narrator={narrator} assisted={false} topic={null} questions={questions} answered={[]} /> },
      { path: '/ke-chuyen', element: <p>home</p> },
    ],
    { initialEntries: ['/p'] },
  );
  return render(
    <LocaleProvider initial="vi">
      <NarratorHelpSlotContext.Provider value={slot}>
        <RouterProvider router={router} />
      </NarratorHelpSlotContext.Provider>
    </LocaleProvider>,
  );
}

let micTrack: EventTarget = new EventTarget();
const calls = () => track.mock.calls.map((c) => c[0] as string);

describe('SessionFlow usage events', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(HOWTO_KEY, '1');
    localStorage.setItem(CONSENT_KEY, '1');
    track.mockClear();
    stores.current = null;
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          micTrack = Object.assign(new EventTarget(), { stop: vi.fn() });
          return { getTracks: () => [micTrack] };
        }),
      },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('"Trợ giúp" in the header opens the guide and counts help_opened once', async () => {
    renderFlow();
    await userEvent.click(screen.getByRole('button', { name: 'Trợ giúp' }));
    expect(screen.getByRole('dialog', { name: 'Cách kể chuyện' })).toBeInTheDocument();
    expect(calls()).toEqual(['help_opened']);
  });

  it('record_start / record_stop per segment (pause does not count), upload_ok after the upload', async () => {
    renderFlow();
    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu ghi/ }));
    await screen.findByRole('button', { name: 'Tạm dừng' });
    await userEvent.click(screen.getByRole('button', { name: 'Tạm dừng' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục ghi' }));
    await userEvent.click(screen.getByRole('button', { name: 'Dừng ghi và nghe lại' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Kể tiếp vào bản ghi này' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Dừng ghi và nghe lại' }));
    expect(calls()).toEqual(['record_start', 'record_stop', 'record_start', 'record_stop']);
    await userEvent.click(await screen.findByRole('button', { name: 'Giữ bản ghi' }));
    await waitFor(() => expect(calls()).toContain('upload_ok'));
    expect(calls().filter((c) => c === 'upload_ok')).toHaveLength(1);
  });

  it('a microphone that drops while listening back is not a second record_stop', async () => {
    renderFlow();
    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu ghi/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Dừng ghi và nghe lại' }));
    await screen.findByRole('button', { name: 'Kể tiếp vào bản ghi này' });
    micTrack.dispatchEvent(new Event('ended'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Kể tiếp vào bản ghi này' })).not.toBeInTheDocument());
    expect(calls()).toEqual(['record_start', 'record_stop']);
  });

  it('"Kết thúc buổi kể" counts session_end once and leaves without a second prompt', async () => {
    renderFlow();
    await userEvent.click(screen.getByRole('button', { name: 'Kết thúc buổi kể' }));
    const confirm = screen.getAllByRole('button', { name: 'Kết thúc buổi kể' }).at(-1)!;
    await userEvent.dblClick(confirm);
    expect(await screen.findByText('home')).toBeInTheDocument();
    expect(calls()).toEqual(['session_end']);
  });
});
