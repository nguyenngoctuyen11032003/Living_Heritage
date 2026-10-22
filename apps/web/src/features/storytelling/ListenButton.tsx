import { Square, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Spinner } from '@/components/ui';
import { useT } from '@/i18n';
import { env } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
import {
  createAudioCache,
  decideVoice,
  errorCode,
  fallbackAfterFailure,
  fetchQuestionAudio,
  serverAccepts,
  voiceKey,
  type AudioCache,
  type TtsTransport,
  type VoiceLang,
} from './tts';

const SERVER_TIMEOUT_MS = 20_000;

const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';

/** question-tts over fetch (supabase.functions.invoke would read audio/wav as text). Null when not configured. */
function supabaseTransport(): TtsTransport | null {
  const sb = getSupabase();
  if (!sb || typeof fetch !== 'function') return null;
  return {
    url: env.supabaseUrl,
    apiKey: env.supabaseKey,
    getToken: async () => (await sb.auth.getSession()).data.session?.access_token ?? null,
    fetch: (input, init) => fetch(input, init),
  };
}

function withTimeout(run: (signal: AbortSignal) => Promise<Blob>): Promise<Blob> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), SERVER_TIMEOUT_MS);
  return run(ctrl.signal).finally(() => window.clearTimeout(timer));
}

type Playing = 'idle' | 'loading' | 'playing' | 'speaking';
type Notice = null | 'fallback' | 'noVoice' | 'failed';

export interface ListenButtonProps {
  text: string;
  /** The narrator's language (narrators.lang), not the UI locale. */
  lang: VoiceLang;
  /** Session-wide cache (object URLs revoked by the owner on unmount). A private one is used when omitted. */
  cache?: AudioCache;
  /** "Tự đọc câu hỏi": read each new question as soon as it appears. */
  autoPlay?: boolean;
}

/**
 * "Nghe câu hỏi": a warm server voice (Gemini TTS) when available, the browser's speechSynthesis otherwise.
 * While the server voice loads it says "Đang chuẩn bị giọng đọc…"; any failure falls back to the browser voice.
 */
export function ListenButton({ text, lang, cache: sharedCache, autoPlay = false }: ListenButtonProps) {
  const t = useT('narrator');
  const [ownCache] = useState(() => (sharedCache ? null : createAudioCache()));
  const cache = sharedCache ?? ownCache!;
  const [transport] = useState(supabaseTransport);
  const speech = speechSupported();
  const [state, setState] = useState<Playing>('idle');
  const [notice, setNotice] = useState<Notice>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const runRef = useRef(0);
  const speechLang = lang === 'vi' ? 'vi-VN' : 'en-US';
  const serverPossible = !!transport && serverAccepts(text);
  const available = serverPossible || speech;

  useEffect(() => () => ownCache?.clear(), [ownCache]);

  const stopAll = useCallback(() => {
    runRef.current++;
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.pause();
      audioRef.current = null;
    }
    if (speechSupported()) window.speechSynthesis.cancel();
    setState('idle');
  }, []);

  const speakBrowser = useCallback(
    (run: number) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = speechLang;
      u.rate = 0.9;
      const voices = synth.getVoices();
      const prefix = speechLang.slice(0, 2);
      const voice = voices.find((v) => v.lang === speechLang) ?? voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (voice) u.voice = voice;
      if (voices.length > 0 && !voice) setNotice((n) => n ?? 'noVoice');
      const end = () => runRef.current === run && setState('idle');
      u.onend = end;
      u.onerror = end;
      setState('speaking');
      synth.speak(u);
    },
    [text, speechLang],
  );

  const play = useCallback(async (auto = false) => {
    stopAll();
    const run = ++runRef.current;
    setNotice(null);
    const source = decideVoice({ serverPossible, serverDisabled: cache.serverDisabled, speechSupported: speech });
    if (source === 'browser') return speakBrowser(run);
    if (source === 'none' || !transport) return;

    setState('loading');
    const fallback = () => {
      if (runRef.current !== run) return;
      if (fallbackAfterFailure(speech) === 'browser') {
        setNotice('fallback');
        speakBrowser(run);
      } else {
        setNotice('failed');
        setState('idle');
      }
    };
    let url: string;
    try {
      url = await cache.load(voiceKey(lang, text), () => withTimeout((signal) => fetchQuestionAudio(text, lang, transport, signal)));
    } catch (e) {
      if (runRef.current !== run) return; // stopped / unmounted: not a server failure
      cache.recordFailure(errorCode(e));
      return fallback();
    }
    if (runRef.current !== run) return;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => runRef.current === run && setState('idle');
    audio.onerror = () => {
      audioRef.current = null;
      fallback();
    };
    try {
      await audio.play();
      if (runRef.current === run) setState('playing');
    } catch {
      // Autoplay blocked (no tap yet) or the file could not play: stay quiet on auto-read, fall back on a tap
      // (iOS Safari rejects play() after the fetch has outlived the tap).
      if (runRef.current !== run) return;
      audioRef.current = null;
      if (auto) setState('idle');
      else fallback();
    }
  }, [cache, lang, serverPossible, speakBrowser, speech, stopAll, text, transport]);

  // Stop reading when the question changes or the page goes away; read the new one when auto-read is on.
  useEffect(() => {
    if (autoPlay && available) void play(true);
    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, lang, autoPlay]);

  if (!available) {
    return (
      <div className="flex flex-col gap-2">
        <Button size="lg" variant="secondary" disabled aria-describedby="listen-unsupported" leftIcon={<Volume2 className="size-6" aria-hidden="true" />} className="text-[1.25rem]!">
          {t('session.listen')}
        </Button>
        <p id="listen-unsupported" className="text-[1.25rem] text-ink-soft">
          {t('session.listenUnsupported')}
        </p>
      </div>
    );
  }

  const active = state === 'playing' || state === 'speaking';
  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        variant="secondary"
        onClick={() => (state === 'idle' ? void play(false) : stopAll())}
        aria-pressed={active}
        aria-busy={state === 'loading'}
        className="text-[1.25rem]!"
        leftIcon={
          state === 'loading' ? <Spinner size="sm" decorative /> : active ? <Square className="size-6" aria-hidden="true" /> : <Volume2 className="size-6" aria-hidden="true" />
        }
      >
        {state === 'loading' ? t('session.listenPreparing') : active ? t('session.stopListening') : t('session.listen')}
      </Button>
      <p role="status" aria-live="polite" className="text-[1.25rem] text-ink-soft empty:hidden">
        {notice === 'fallback' ? t('session.listenFallback') : notice === 'noVoice' ? t('session.noVoice') : notice === 'failed' ? t('session.listenFailed') : ''}
      </p>
    </div>
  );
}
