// Single-series bar chart in plain SVG (no chart library).
// The last bar (current period) is amber, the others navy, as in the design.
// Hover shows the exact value (SVG <title>); the same numbers are always available in a table nearby.

type Bar = { label: string; value: number; display: string };

export function BarChart({ bars, title, height = 180 }: { bars: Bar[]; title: string; height?: number }) {
  const width = 560;
  const top = 22;
  const bottom = 26;
  const plotHeight = height - top - bottom;
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const slot = width / Math.max(1, bars.length);
  const barWidth = Math.min(56, slot - 8);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={title}>
      <line x1="0" x2={width} y1={top + plotHeight} y2={top + plotHeight} stroke="#D9DFEE" strokeWidth="1" />
      {bars.map((bar, index) => {
        const barHeight = Math.max(bar.value > 0 ? 3 : 0, (bar.value / max) * plotHeight);
        const x = index * slot + (slot - barWidth) / 2;
        const y = top + plotHeight - barHeight;
        const current = index === bars.length - 1;
        return (
          <g key={bar.label}>
            <title>{`${bar.label}: ${bar.display}`}</title>
            {/* Larger invisible hit area so the tooltip is easy to reach. */}
            <rect x={index * slot} y={top} width={slot} height={plotHeight} fill="transparent" />
            <path
              d={barHeight > 0 ? `M${x},${top + plotHeight} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + barWidth - 4} Q${x + barWidth},${y} ${x + barWidth},${y + 4} V${top + plotHeight} Z` : ""}
              fill={current ? "#FFB81C" : "#14307A"}
            />
            {current && (
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0B1B3F">{bar.display}</text>
            )}
            <text x={index * slot + slot / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#5B6584">{bar.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
