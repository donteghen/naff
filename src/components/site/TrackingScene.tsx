// Night road with lanterns and a courier on a scooter (from the tracking design).
// `progress` (0 to 1) moves the scooter along the road and lights the lanterns it has passed.

const ROAD: [number, number][] = [
  [110, 260], [100.2, 250.2], [99.6, 243.9], [103.2, 237.9], [110.3, 231.9], [120.5, 226], [133.1, 220.2], [147.5, 214.3],
  [163.3, 208.3], [179.8, 202.2], [196.4, 196], [212.7, 189.5], [228, 182.7], [241.8, 175.6], [253.5, 168.1], [262.5, 160.2],
  [268.3, 151.8], [270.3, 142.9], [267.9, 133.4], [260.7, 123.3], [255, 118],
];

const LANTERNS: [number, number, number][] = [
  [66.8, 249.5, 1.33], [135.2, 234.9, 1.22], [107.2, 220.7, 1.11], [188.3, 206.5, 1], [192.1, 191.4, 0.9], [254.6, 174.9, 0.79], [258.6, 156.1, 0.68], [271.3, 134.4, 0.57],
];

const FLAG_COLORS = ["#12A150", "#D9532B", "#FFB81C"];

function pointOnRoad(progress: number): [number, number] {
  const position = Math.min(Math.max(progress, 0), 1) * (ROAD.length - 1);
  const index = Math.floor(position);
  const next = ROAD[Math.min(index + 1, ROAD.length - 1)];
  const current = ROAD[index];
  const fraction = position - index;
  return [current[0] + (next[0] - current[0]) * fraction, current[1] + (next[1] - current[1]) * fraction];
}

export function TrackingScene({ progress, done = false, label }: { progress: number; done?: boolean; label: string }) {
  const [x, y] = pointOnRoad(progress);
  const scale = 0.95 - progress * 0.35;
  const litCount = Math.round(progress * LANTERNS.length);
  return (
    <svg viewBox="0 0 390 260" className="block h-auto w-full" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B1B3F" />
          <stop offset=".6" stopColor="#27408F" />
          <stop offset="1" stopColor="#F4A63A" />
        </linearGradient>
        <pattern id="ndop" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#14307A" />
          <path d="M7 0L14 7L7 14L0 7Z" fill="none" stroke="#FFB81C" strokeWidth="1.4" />
          <circle cx="7" cy="7" r="1.8" fill="#fff" />
        </pattern>
      </defs>
      <rect width="390" height="260" fill="url(#sky)" />
      <g transform="translate(255 128)">
        <circle r="58" fill="#FFB81C" opacity=".25" />
        <circle r="44" fill="#FFB81C" opacity=".45" />
        <circle r="30" fill="#FFD36B" />
      </g>
      <g className="scene-drift" fill="#fff" opacity=".22">
        <path d="M40 70h70a12 12 0 000-24H90a14 14 0 00-26 6 10 10 0 00-24 18z" />
      </g>
      <path d="M120 160 L215 62 L262 112 L305 80 L390 160Z" fill="#0F2459" />
      <path d="M120 160 L215 62 L262 112 L305 80 L390 160Z" fill="url(#ndop)" opacity=".28" />
      <path d="M0 164 Q100 128 210 158 T390 150 V260 H0Z" fill="#0A1838" />
      {[[22, 142, "#D9532B"], [58, 148, "#FFB81C"], [300, 150, "#12A150"]].map(([hx, hy, color]) => (
        <g key={`${hx}`}>
          <rect x={Number(hx)} y={Number(hy)} width="26" height="18" fill={String(color)} />
          <path d={`M${Number(hx) - 3} ${hy} L${Number(hx) + 13} ${Number(hy) - 9} L${Number(hx) + 29} ${hy}Z`} fill="#8FA0C8" />
          <rect x={Number(hx) + 10} y={Number(hy) + 8} width="7" height="10" fill="#0B1B3F" />
          <rect x={Number(hx) + 3} y={Number(hy) + 5} width="5" height="5" fill="#FFB81C" />
        </g>
      ))}
      <g stroke="#0A1838" strokeWidth="4"><path d="M350 168v-34M366 170v-26" /></g>
      <ellipse cx="350" cy="132" rx="19" ry="5" fill="#12A150" transform="rotate(-30 350 132)" />
      <ellipse cx="350" cy="132" rx="19" ry="5" fill="#12A150" transform="rotate(30 350 132)" />
      <ellipse cx="350" cy="128" rx="19" ry="5" fill="#12A150" transform="rotate(-75 350 128)" />
      <ellipse cx="366" cy="142" rx="19" ry="5" fill="#12A150" transform="rotate(-25 366 142)" />
      <ellipse cx="366" cy="142" rx="19" ry="5" fill="#12A150" transform="rotate(35 366 142)" />
      <g className="scene-float">
        <path d="M36 84h52l-6 16H42z" fill="#D9532B" />
        <path d="M36 84h52" stroke="#FFB81C" strokeWidth="3" />
        <path d="M62 84v-10" stroke="#FFB81C" strokeWidth="2" />
        <path d="M56 74 L62 64 L68 74Z" fill="#FFB81C" />
      </g>
      <path d="M0 218 Q120 184 230 212 T390 202 V260 H0Z" fill="#0B1B3F" />
      <path d="M0 238 H390 V260 H0Z" fill="url(#ndop)" opacity=".5" />
      <polyline points={ROAD.map((point) => point.join(",")).join(" ")} fill="none" stroke="#C0562B" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={ROAD.map((point) => point.join(",")).join(" ")} fill="none" stroke="#FFE2A8" strokeWidth="2" strokeDasharray="4 7" opacity=".8" />
      {LANTERNS.map(([lx, ly, ls], index) => {
        const lit = done || index < litCount;
        return (
          <g key={index} transform={`translate(${lx},${ly}) scale(${ls})`}>
            <rect x="-1.5" y="-24" width="3" height="24" fill="#0B1B3F" />
            <path d="M-8-26 L0-40 L8-26 L0-14Z" fill={lit ? "#FFB81C" : "#5B6BA0"} stroke="#0B1B3F" strokeWidth="2" />
            {lit && <circle cy="-27" r="17" fill="#FFB81C" opacity=".3" />}
          </g>
        );
      })}
      <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${scale.toFixed(2)})`}>
        <ellipse cy="2" rx="24" ry="4" fill="#000" opacity=".3" />
        <circle cx="-15" cy="-6" r="7.5" fill="#0B1B3F" stroke="#FFB81C" strokeWidth="3" />
        <circle cx="15" cy="-6" r="7.5" fill="#0B1B3F" stroke="#FFB81C" strokeWidth="3" />
        <path d="M-15-6 L-8-19 H8 L15-6 L4-9 H-8Z" fill="#FFB81C" />
        <rect x="-26" y="-30" width="15" height="13" rx="2" fill="#fff" stroke="#0B1B3F" strokeWidth="2" />
        <path d="M-26-24h15M-18.5-30v13" stroke="#0B1B3F" strokeWidth="2" />
        <circle cx="3" cy="-35" r="5.5" fill="#7A4326" />
        <path d="M-3-29 L9-29 L11-18 H-4Z" fill="url(#ndop)" stroke="#0B1B3F" strokeWidth="1.5" />
      </g>
      {done && (
        <g className="scene-float">
          {[[228, 64, "#FFB81C"], [298, 54, "#fff"], [268, 34, "#FFB81C"], [208, 94, "#fff"], [323, 89, "#FFB81C"], [283, 74, "#12A150"]].map(([sx, sy, color]) => (
            <path key={`${sx}-${sy}`} d={`M${sx} ${sy} l4 4 l-4 4 l-4-4z`} fill={String(color)} />
          ))}
        </g>
      )}
      <line x1="0" y1="0" x2="390" y2="0" stroke="#fff" strokeWidth="2" />
      {Array.from({ length: 14 }, (_, index) => (
        <path key={index} d={`M${20 + index * 28} 0 L${34 + index * 28} 0 L${27 + index * 28} 16Z`} fill={FLAG_COLORS[index % 3]} />
      ))}
    </svg>
  );
}
