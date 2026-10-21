import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Topic scenes drawn in the heritage palette (inline SVG, no remote assets). */
export type SceneKind = 'kitchen' | 'field' | 'pottery' | 'garden' | 'tet' | 'market' | 'boat' | 'tailor' | 'tea' | 'lantern' | 'porch';

const C = {
  cream: '#FAF7F0',
  paper: '#FFFFFF',
  heritage: '#214E43',
  deep: '#163A31',
  terracotta: '#A84832',
  clayDark: '#7E3323',
  mint: '#DCE8D5',
  leaf: '#3E7A5E',
  leafMid: '#5B9473',
  leafLight: '#8DB596',
  ochre: '#E0A93B',
  ochreDeep: '#C27F1C',
  sand: '#E9D8BA',
  wood: '#8A5A3B',
  night: '#121B18',
  nightCard: '#1B2622',
  blush: '#F0B9AE',
} as const;

function starPoints(cx: number, cy: number, R: number, r: number, n = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function Steam({ x, y, opacity = 0.75, color = C.cream }: { x: number; y: number; opacity?: number; color?: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" opacity={opacity}>
      <path d={`M${x} ${y}c-9-12 9-20 0-34s9-22 0-34`} />
      <path d={`M${x + 20} ${y + 6}c-9-12 9-20 0-34s9-20 0-30`} opacity=".7" />
      <path d={`M${x - 20} ${y + 8}c-8-10 8-18 0-28`} opacity=".55" />
    </g>
  );
}

function Hat({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 L-30 22 Q0 28 30 22 Z" fill={C.cream} />
      <path d="M0 0 L-30 22 Q0 28 30 22 Z" fill="none" stroke={C.sand} strokeWidth="1.5" />
      <path d="M-14 11 Q0 15 14 11 M-22 17 Q0 22 22 17" stroke={C.sand} strokeWidth="1.2" fill="none" />
    </g>
  );
}

const scenes: Record<SceneKind, (id: string) => ReactNode> = {
  kitchen: () => (
    <>
      <rect width="240" height="320" fill="#EAD7B9" />
      <rect x="22" y="34" width="70" height="78" rx="6" fill={C.mint} />
      <path d="M57 34v78M22 73h70" stroke="#EAD7B9" strokeWidth="5" />
      <path d="M170 40v44" stroke={C.wood} strokeWidth="3" />
      <ellipse cx="170" cy="96" rx="13" ry="16" fill={C.wood} />
      <path d="M0 214h240" stroke="#D9C29E" strokeWidth="3" />
      <rect x="44" y="232" width="152" height="100" rx="10" fill={C.deep} />
      <rect x="62" y="252" width="116" height="48" rx="24" fill={C.night} />
      <path d="M86 300c0-22 14-24 12-40 12 10 14 20 12 28 6-8 10-14 8-22 14 12 16 24 10 34z" fill={C.terracotta} />
      <path d="M110 300c0-14 8-16 8-26 8 8 10 16 6 26z" fill={C.ochre} />
      <path d="M128 300c0-12 10-14 8-26 10 8 12 18 6 26z" fill={C.ochre} opacity=".85" />
      <path d="M62 152c0 52 26 78 58 78s58-26 58-78z" fill={C.clayDark} />
      <path d="M74 166c4 34 20 52 40 56" stroke={C.terracotta} strokeWidth="6" strokeLinecap="round" fill="none" opacity=".7" />
      <ellipse cx="120" cy="152" rx="62" ry="12" fill={C.terracotta} />
      <ellipse cx="120" cy="147" rx="50" ry="9" fill="#6A2A1C" />
      <rect x="112" y="132" width="16" height="10" rx="5" fill={C.terracotta} />
      <Steam x={118} y={122} />
    </>
  ),
  field: (id) => (
    <>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3E7CC" />
          <stop offset="1" stopColor={C.mint} />
        </linearGradient>
      </defs>
      <rect width="240" height="320" fill={`url(#${id}sky)`} />
      <circle cx="168" cy="78" r="28" fill={C.ochre} opacity=".9" />
      <path d="M0 150c40-30 70-34 110-14s80 6 130-22v50H0z" fill={C.leafLight} />
      <path d="M0 168c50-18 100-10 150 0s70 0 90-8v160H0z" fill={C.leafMid} />
      <path d="M0 214c60-14 120-12 240 6v100H0z" fill={C.leaf} />
      <path d="M0 262c80-10 160-8 240 6v52H0z" fill={C.heritage} />
      <g stroke={C.mint} strokeWidth="2" strokeLinecap="round" opacity=".55">
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M${10 + i * 17} 300l-3-14m3 14l4-12`} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <path key={`b${i}`} d={`M${18 + i * 19} 246l-2-10m2 10l3-9`} opacity=".7" />
        ))}
      </g>
      <path d="M96 212c-4-18 0-34 8-40h14c8 6 12 22 8 40z" fill={C.deep} />
      <path d="M104 186l-14 22M118 186l12 20" stroke={C.deep} strokeWidth="5" strokeLinecap="round" />
      <Hat x={111} y={158} s={1.05} />
      <path d="M92 214h40" stroke={C.mint} strokeWidth="2" opacity=".5" />
    </>
  ),
  pottery: () => (
    <>
      <rect width="240" height="320" fill="#E6C6A8" />
      <path d="M0 54h240" stroke="#D5AE8B" strokeWidth="4" />
      <path d="M30 54c0-16 4-22 12-22s12 6 12 22z" fill={C.terracotta} opacity=".8" />
      <path d="M64 54c0-10 6-14 13-14s13 4 13 14z" fill={C.clayDark} opacity=".75" />
      <path d="M186 54c-2-24 6-30 12-30s14 6 12 30z" fill={C.heritage} opacity=".75" />
      <path d="M0 240h240v80H0z" fill="#D7AF8A" />
      <ellipse cx="120" cy="250" rx="86" ry="16" fill={C.deep} />
      <ellipse cx="120" cy="244" rx="86" ry="16" fill={C.heritage} />
      <path d="M84 244c-10-26 4-46 10-64 4-14-4-26-2-40h56c2 14-6 26-2 40 6 18 20 38 10 64z" fill={C.terracotta} />
      <path d="M92 140h56" stroke={C.clayDark} strokeWidth="6" strokeLinecap="round" />
      <path d="M104 160c-6 20-6 50 2 76" stroke="#C86A50" strokeWidth="7" strokeLinecap="round" fill="none" opacity=".75" />
      <g fill="none" stroke={C.cream} strokeWidth="2.5" strokeLinecap="round" opacity=".7">
        <path d="M30 236a90 18 0 0 0 30 18" />
        <path d="M210 236a90 18 0 0 1-30 18" />
      </g>
      <path d="M52 200c14-6 26-4 34 6M188 200c-14-6-26-4-34 6" stroke={C.wood} strokeWidth="12" strokeLinecap="round" fill="none" />
    </>
  ),
  garden: () => {
    const blossoms: Array<[number, number]> = [
      [62, 86], [84, 70], [108, 92], [70, 120], [140, 66], [160, 88], [182, 72], [150, 116], [120, 54], [96, 128], [190, 112], [48, 110], [132, 140], [170, 140], [80, 150],
    ];
    return (
      <>
        <rect width="240" height="320" fill="#F5EDDA" />
        <circle cx="190" cy="44" r="18" fill={C.ochre} opacity=".35" />
        <path d="M0 268h240v52H0z" fill="#E4D3B1" />
        <path d="M120 236c-2-40 4-70-6-98" stroke={C.deep} strokeWidth="9" strokeLinecap="round" fill="none" />
        <g stroke={C.deep} strokeLinecap="round" fill="none">
          <path d="M116 170c-20-16-40-30-52-58" strokeWidth="6" />
          <path d="M114 140c4-28 20-50 44-62" strokeWidth="6" />
          <path d="M120 156c24-8 46-18 64-40" strokeWidth="5" />
          <path d="M90 140c-8-20-6-34 0-50" strokeWidth="4" />
          <path d="M146 92c10-10 22-14 36-16" strokeWidth="3.5" />
          <path d="M100 120c-14 10-26 18-46-6" strokeWidth="3.5" />
        </g>
        {blossoms.map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="7" fill={C.ochre} />
            <circle r="2.6" fill={C.ochreDeep} />
          </g>
        ))}
        <path d="M76 236h88l-12 54H88z" fill={C.terracotta} />
        <path d="M70 230h100v12H70z" fill={C.clayDark} />
        <g transform="translate(178 240)">
          <path d="M-20 0h34l-4 30h-26z" fill={C.heritage} />
          <path d="M14 6l24-14" stroke={C.heritage} strokeWidth="5" strokeLinecap="round" />
          <path d="M-20 4c-10 0-14 10-8 16" stroke={C.heritage} strokeWidth="4" fill="none" />
        </g>
        <g fill={C.leafLight}>
          <circle cx="216" cy="238" r="2.5" />
          <circle cx="222" cy="250" r="2" />
          <circle cx="212" cy="256" r="2.2" />
        </g>
      </>
    );
  },
  tet: () => (
    <>
      <rect width="240" height="320" fill={C.terracotta} />
      <circle cx="120" cy="150" r="96" fill="#B85A42" opacity=".6" />
      <g stroke={C.clayDark} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M0 40c30 4 54 18 70 40" />
        <path d="M30 46c4 14 2 24-6 34" />
      </g>
      {[
        [62, 70], [40, 56], [72, 92], [20, 70], [50, 84],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r="7" fill={C.blush} />
          <circle r="2.4" fill={C.terracotta} />
        </g>
      ))}
      <path d="M184 20v26" stroke={C.ochre} strokeWidth="2" />
      <rect x="168" y="46" width="32" height="42" rx="14" fill={C.ochre} />
      <path d="M168 60h32M168 74h32" stroke={C.ochreDeep} strokeWidth="2" />
      <path d="M184 88v18M178 92v12M190 92v12" stroke={C.ochre} strokeWidth="2" strokeLinecap="round" />
      <rect x="44" y="166" width="104" height="104" rx="8" fill={C.deep} transform="rotate(-6 96 218)" />
      <g transform="rotate(-6 96 218)">
        <rect x="44" y="166" width="104" height="104" rx="8" fill={C.leaf} />
        <rect x="56" y="178" width="80" height="80" rx="4" fill="none" stroke={C.leafLight} strokeWidth="2" opacity=".6" />
        <path d="M78 166v104M114 166v104M44 200h104M44 236h104" stroke={C.cream} strokeWidth="5" opacity=".9" />
      </g>
      <rect x="138" y="214" width="78" height="78" rx="6" fill={C.heritage} />
      <path d="M164 214v78M190 214v78M138 240h78M138 266h78" stroke={C.cream} strokeWidth="4" opacity=".85" />
      <g transform="translate(160 150) rotate(10)">
        <rect width="34" height="48" rx="4" fill="#C2402C" />
        <circle cx="17" cy="22" r="8" fill={C.ochre} />
      </g>
    </>
  ),
  market: () => (
    <>
      <rect width="240" height="320" fill="#F0DCAE" />
      <path d="M0 30h240v34H0z" fill={C.terracotta} />
      <g fill={C.cream}>
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${i * 40 + 20} 30h20v34h-20z`} />
        ))}
      </g>
      <path d={Array.from({ length: 12 }, (_, i) => `M${i * 20} 64a10 10 0 0 0 20 0`).join('')} fill={C.terracotta} />
      <path d="M14 64v150M226 64v150" stroke={C.wood} strokeWidth="6" />
      <path d="M128 168c-4-26 2-44 10-50h16c10 6 14 24 10 50z" fill={C.heritage} />
      <Hat x={146} y={92} s={0.95} />
      <rect x="0" y="196" width="240" height="124" fill={C.wood} />
      <rect x="0" y="196" width="240" height="10" fill="#A0704D" />
      <g>
        <ellipse cx="62" cy="214" rx="44" ry="14" fill="#C9934F" />
        <circle cx="44" cy="202" r="11" fill="#E08A3C" />
        <circle cx="64" cy="198" r="12" fill="#E8A04A" />
        <circle cx="84" cy="204" r="10" fill="#E08A3C" />
        <circle cx="56" cy="210" r="10" fill="#D97A30" />
      </g>
      <g>
        <ellipse cx="176" cy="216" rx="46" ry="14" fill="#C9934F" />
        <path d="M144 206c10-20 22-24 30-8 6-18 22-16 30 6z" fill={C.leaf} />
        <path d="M150 210c8-10 18-10 24 0M176 206c8-10 18-8 24 2" stroke={C.leafLight} strokeWidth="3" fill="none" />
      </g>
      <path d="M0 250h240" stroke="#7A4C30" strokeWidth="3" opacity=".6" />
      <path d="M30 280h50M110 290h60" stroke="#7A4C30" strokeWidth="2" opacity=".5" />
    </>
  ),
  boat: (id) => (
    <>
      <defs>
        <linearGradient id={`${id}sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.deep} />
          <stop offset="1" stopColor="#2E6555" />
        </linearGradient>
      </defs>
      <rect width="240" height="320" fill={`url(#${id}sea)`} />
      <circle cx="176" cy="72" r="22" fill={C.cream} />
      <circle cx="186" cy="66" r="20" fill={C.deep} opacity=".25" />
      {[
        [40, 40], [70, 90], [120, 34], [30, 120], [210, 130],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill={C.cream} opacity=".8" />
      ))}
      <path d="M118 96v104" stroke={C.sand} strokeWidth="3" />
      <path d="M120 100c26 20 40 50 44 92h-44z" fill={C.sand} />
      <path d="M116 112c-16 18-26 44-28 80h28z" fill={C.ochre} opacity=".9" />
      <path d="M58 200h128c-6 22-20 32-46 32H96c-22 0-34-12-38-32z" fill={C.terracotta} />
      <circle cx="80" cy="210" r="4" fill={C.cream} />
      <path d="M0 236c20-8 40-8 60 0s40 8 60 0 40-8 60 0 40 8 60 0v84H0z" fill={C.heritage} />
      <path d="M0 262c20-8 40-8 60 0s40 8 60 0 40-8 60 0 40 8 60 0v58H0z" fill="#1B4339" />
      <path d="M90 246h60M100 254h40" stroke={C.terracotta} strokeWidth="3" strokeLinecap="round" opacity=".4" />
      <path d="M150 230c8-2 14 0 20 4" stroke={C.cream} strokeWidth="2" opacity=".5" fill="none" />
    </>
  ),
  tailor: () => (
    <>
      <rect width="240" height="320" fill={C.mint} />
      <path d="M120 24v16" stroke={C.deep} strokeWidth="3" />
      <path d="M120 40c-6 0-8 6-4 8l-50 22h108l-50-22" stroke={C.deep} strokeWidth="3" fill="none" strokeLinejoin="round" />
      <path d="M96 74c4 10 14 16 24 16s20-6 24-16l22 12-10 30-12-6v150c-14 6-28 8-24 8h-16c-4 0-14-2-24-8V110l-12 6-10-30z" fill={C.terracotta} />
      <path d="M112 76c2 8 4 12 8 14 4-2 6-6 8-14" stroke={C.ochre} strokeWidth="3" fill="none" />
      <path d="M120 90v30" stroke={C.clayDark} strokeWidth="2" strokeDasharray="3 5" />
      <path d="M100 180c14 6 26 6 40 0" stroke={C.clayDark} strokeWidth="2" fill="none" opacity=".6" />
      <path d="M20 262c40 30 120 30 200-10" stroke={C.ochre} strokeWidth="10" fill="none" strokeLinecap="round" />
      <g stroke={C.ochreDeep} strokeWidth="1.6">
        {Array.from({ length: 16 }, (_, i) => {
          const tt = i / 15;
          const x = 20 + tt * 200;
          const y = 262 + Math.sin(tt * Math.PI) * 18 - tt * 10;
          return <path key={i} d={`M${x.toFixed(1)} ${(y - 4).toFixed(1)}v6`} />;
        })}
      </g>
      <g transform="translate(176 200) rotate(-30)" fill="none" stroke={C.deep} strokeWidth="4" strokeLinecap="round">
        <circle cx="-10" cy="22" r="7" />
        <circle cx="10" cy="22" r="7" />
        <path d="M-6 16 8-24M6 16-8-24" />
      </g>
      <g transform="translate(46 210)">
        <rect x="-12" y="-20" width="24" height="6" rx="2" fill={C.wood} />
        <rect x="-9" y="-14" width="18" height="24" fill={C.heritage} />
        <rect x="-12" y="10" width="24" height="6" rx="2" fill={C.wood} />
      </g>
    </>
  ),
  tea: () => (
    <>
      <rect width="240" height="320" fill="#F0E6D1" />
      <path d="M0 230h240v90H0z" fill="#E2CFAC" />
      <ellipse cx="120" cy="250" rx="100" ry="22" fill="#B9875E" />
      <ellipse cx="120" cy="244" rx="100" ry="22" fill="#CFA078" />
      <path d="M66 236c-18-52 14-90 54-90s72 38 54 90z" fill={C.heritage} />
      <path d="M78 214c-4-26 6-48 24-58" stroke={C.leafMid} strokeWidth="6" strokeLinecap="round" fill="none" opacity=".7" />
      <ellipse cx="120" cy="150" rx="34" ry="8" fill={C.deep} />
      <circle cx="120" cy="140" r="8" fill={C.deep} />
      <path d="M170 196c18-6 26-20 30-36" stroke={C.heritage} strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M70 176c-26-6-30 38-4 42" stroke={C.deep} strokeWidth="7" fill="none" strokeLinecap="round" />
      <g>
        <path d="M30 238c0 16 8 24 18 24s18-8 18-24z" fill={C.cream} />
        <ellipse cx="48" cy="238" rx="18" ry="4" fill={C.ochre} />
        <path d="M176 242c0 16 8 24 18 24s18-8 18-24z" fill={C.cream} />
        <ellipse cx="194" cy="242" rx="18" ry="4" fill={C.ochre} />
      </g>
      <Steam x={194} y={226} opacity={0.6} color="#B9875E" />
      <g fill={C.leaf}>
        <path d="M30 70c10-14 26-14 34-2-10 12-26 12-34 2z" />
        <path d="M172 52c12-10 26-6 30 6-12 8-26 6-30-6z" opacity=".8" />
        <path d="M120 86c4-12 16-16 26-8-6 12-18 14-26 8z" opacity=".6" />
      </g>
    </>
  ),
  lantern: (id) => (
    <>
      <defs>
        <radialGradient id={`${id}glow`} cx=".5" cy=".45" r=".5">
          <stop offset="0" stopColor={C.ochre} stopOpacity=".55" />
          <stop offset="1" stopColor={C.ochre} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="240" height="320" fill={C.nightCard} />
      <circle cx="120" cy="140" r="120" fill={`url(#${id}glow)`} />
      {(
        [
          [30, 40], [200, 30], [214, 110], [24, 160], [190, 220], [60, 260],
        ] as Array<[number, number]>
      ).map(([x, y], i) => (
        <polygon key={i} points={starPoints(x, y, 4, 1.6)} fill={C.cream} opacity=".7" />
      ))}
      <path d="M120 200l46 96" stroke={C.wood} strokeWidth="6" strokeLinecap="round" />
      <polygon points={starPoints(120, 138, 70, 30)} fill={C.ochre} />
      <polygon points={starPoints(120, 138, 70, 30)} fill="none" stroke={C.ochreDeep} strokeWidth="3" strokeLinejoin="round" />
      <polygon points={starPoints(120, 140, 36, 15)} fill={C.terracotta} />
      <circle cx="120" cy="140" r="7" fill={C.cream} opacity=".9" />
      <g stroke={C.terracotta} strokeWidth="3" strokeLinecap="round">
        <path d="M54 118v34M52 152l-4 14M56 152l4 14" />
        <path d="M186 118v34M184 152l-4 14M188 152l4 14" />
      </g>
    </>
  ),
  porch: (id) => (
    <>
      <defs>
        <linearGradient id={`${id}dusk`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2D8B2" />
          <stop offset="1" stopColor="#EBC79A" />
        </linearGradient>
      </defs>
      <rect width="240" height="320" fill={`url(#${id}dusk)`} />
      <circle cx="58" cy="96" r="26" fill={C.ochre} opacity=".55" />
      <path d="M0 150c30-14 60-16 90-6s60 10 90-4 40-10 60-4v40H0z" fill={C.leafLight} opacity=".8" />
      <path d="M150 20h90v200h-90z" fill={C.cream} />
      <path d="M150 20h90" stroke={C.terracotta} strokeWidth="10" />
      <rect x="170" y="56" width="50" height="64" rx="4" fill={C.heritage} opacity=".85" />
      <path d="M195 56v64M170 88h50" stroke={C.cream} strokeWidth="3" />
      <path d="M0 220h240v100H0z" fill="#C79A6B" />
      <path d="M0 220h240" stroke={C.wood} strokeWidth="4" />
      <g>
        <path d="M44 172h44v40H44z" fill={C.wood} />
        <path d="M40 212h52v8H40z" fill="#6E4630" />
        <path d="M46 220v40M86 220v40" stroke="#6E4630" strokeWidth="5" />
        <circle cx="66" cy="150" r="14" fill={C.deep} />
        <path d="M50 214c0-30 6-46 16-50 10 4 16 20 16 50z" fill={C.heritage} />
        <path d="M60 140c4-6 10-6 14 0" stroke={C.cream} strokeWidth="3" fill="none" />
      </g>
      <g>
        <circle cx="128" cy="186" r="11" fill={C.deep} />
        <path d="M114 236c0-22 4-34 14-38 10 4 14 16 14 38z" fill={C.terracotta} />
      </g>
      <g transform="translate(98 236)">
        <rect x="-20" y="-6" width="40" height="8" rx="2" fill={C.wood} />
        <path d="M-6-6c0 6 2 9 6 9s6-3 6-9z" fill={C.cream} />
      </g>
      <Steam x={98} y={222} opacity={0.5} color={C.cream} />
    </>
  ),
};

export interface StorySceneProps {
  kind: SceneKind;
  className?: string;
  /** Keep the whole drawing visible ('meet') or fill the box ('slice', default — for cards). */
  fit?: 'slice' | 'meet';
  /** Accessible description; omit for decorative use. */
  title?: string;
}

/** Topic illustration (240×320 design, scales to any box). */
export function StoryScene({ kind, className, fit = 'slice', title }: StorySceneProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 240 320"
      preserveAspectRatio={`xMidYMid ${fit}`}
      className={cn('block h-full w-full', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {scenes[kind](id)}
    </svg>
  );
}
