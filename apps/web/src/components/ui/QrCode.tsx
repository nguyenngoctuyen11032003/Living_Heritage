import { useMemo } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/cn';

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

/** Real, scannable QR code rendered synchronously as inline SVG (no canvas, prints crisply). */
export function QrCode({ value, label, size = 160, fg = 'var(--heritage-deep)', bg = 'transparent', margin = 2, className }: QrCodeProps) {
  const { path, dim } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.modules.get(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
      }
    }
    return { path: d, dim: n + margin * 2 };
  }, [value, margin]);
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${dim} ${dim}`} width={size} height={size} shapeRendering="crispEdges" className={cn('block', className)}>
      <rect width={dim} height={dim} fill={bg} />
      <path d={path} fill={fg} />
    </svg>
  );
}
