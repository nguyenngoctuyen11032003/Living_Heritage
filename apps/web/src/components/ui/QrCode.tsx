import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { baseDisplay } from './display';

export interface QrCodeProps {
  /** Text/URL to encode — use siteHref('/nghe/…') for in-app links. */
  value: string;
  /** Accessible description, e.g. "Mã QR: nghe bản gốc". */
  label: string;
  /** Rendered size in px (the SVG scales; set className for responsive sizes). */
  size?: number;
  fg?: string;
  bg?: string;
  /** Quiet zone in modules (default 2). */
  margin?: number;
  className?: string;
}

interface Matrix {
  path: string;
  dim: number;
}

/** The encoder (~10 KB gz) is its own chunk, fetched the first time a QR code renders (off the entry bundle). */
let encoder: Promise<typeof import('qrcode')> | null = null;
const cache = new Map<string, Matrix>();

async function encode(value: string, margin: number): Promise<Matrix> {
  const key = `${margin}|${value}`;
  const hit = cache.get(key);
  if (hit) return hit;
  encoder ??= import('qrcode');
  // qrcode is CommonJS: the bundler exposes it as `default`, while @types/qrcode only types the named exports.
  const mod = (await encoder) as typeof import('qrcode') & { default?: typeof import('qrcode') };
  const QRCode = mod.default ?? mod;
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
    }
  }
  const m = { path: d, dim: n + margin * 2 };
  cache.set(key, m);
  return m;
}

/** Real, scannable QR code as inline SVG (no canvas, prints crisply). The box keeps its size while the encoder loads. */
export function QrCode({ value, label, size = 160, fg = 'var(--heritage-deep)', bg = 'transparent', margin = 2, className }: QrCodeProps) {
  const [matrix, setMatrix] = useState<{ key: string; m: Matrix } | null>(() => {
    const m = cache.get(`${margin}|${value}`);
    return m ? { key: `${margin}|${value}`, m } : null;
  });
  const key = `${margin}|${value}`;

  useEffect(() => {
    let alive = true;
    void encode(value, margin).then((m) => alive && setMatrix({ key, m }));
    return () => {
      alive = false;
    };
  }, [value, margin, key]);

  const m = matrix?.key === key ? matrix.m : null;
  const dim = m?.dim ?? 1;
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${dim} ${dim}`} width={size} height={size} shapeRendering="crispEdges" className={cn(baseDisplay('block', className), className)}>
      <rect width={dim} height={dim} fill={bg} />
      {m && <path d={m.path} fill={fg} />}
    </svg>
  );
}
