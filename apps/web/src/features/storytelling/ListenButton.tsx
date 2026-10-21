import { Square, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { useLocale, useT } from '@/i18n';

const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';

/** "Nghe câu hỏi": reads the question aloud with a vi-VN / en voice. Disabled with an explanation when unsupported. */
export function ListenButton({ text }: { text: string }) {
  const t = useT('narrator');
  const { locale } = useLocale();
  const supported = speechSupported();
  const [speaking, setSpeaking] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const lang = locale === 'vi' ? 'vi-VN' : 'en-US';

  // Stop reading when the question changes or the page goes away.
  useEffect(() => {
    return () => {
      if (speechSupported()) window.speechSynthesis.cancel();
      setSpeaking(false);
    };
  }, [text]);

  function speak() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.9;
    const voices = synth.getVoices();
    const prefix = lang.slice(0, 2);
    const voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (voice) u.voice = voice;
    setNoVoice(voices.length > 0 && !voice);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

  if (!supported) {
    return (
      <div className="flex flex-col gap-2">
        <Button size="lg" variant="secondary" disabled aria-describedby="listen-unsupported" leftIcon={<Volume2 className="size-6" aria-hidden="true" />}>
          {t('session.listen')}
        </Button>
        <p id="listen-unsupported" className="text-[1rem] text-ink-soft">
          {t('session.listenUnsupported')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        variant="secondary"
        onClick={speak}
        aria-pressed={speaking}
        className="text-[1.1rem]"
        leftIcon={speaking ? <Square className="size-6" aria-hidden="true" /> : <Volume2 className="size-6" aria-hidden="true" />}
      >
        {speaking ? t('session.stopListening') : t('session.listen')}
      </Button>
      {noVoice && <p className="text-[1rem] text-ink-soft">{t('session.noVoice')}</p>}
    </div>
  );
}
