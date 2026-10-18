// Small map of the active towns, drawn in SVG from known coordinates (no map service).
// Towns not in the list below are still shown as chips next to the map.

const KNOWN_TOWNS: Record<string, [number, number]> = {
  douala: [4.05, 9.7], yaounde: [3.87, 11.52], buea: [4.16, 9.24], limbe: [4.02, 9.21], tiko: [4.07, 9.36], kumba: [4.64, 9.45],
  kribi: [2.94, 9.91], edea: [3.8, 10.13], nkongsamba: [4.95, 9.94], bafoussam: [5.48, 10.42], dschang: [5.45, 10.05],
  bamenda: [5.96, 10.15], foumban: [5.73, 10.9], mbalmayo: [3.52, 11.5], ebolowa: [2.91, 11.15], sangmelima: [2.93, 11.98],
  bertoua: [4.58, 13.68], ngaoundere: [7.32, 13.58], garoua: [9.3, 13.39], maroua: [10.59, 14.32],
};

function key(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function TownsMap({ towns, label }: { towns: string[]; label: string }) {
  const placed = towns.filter((town) => KNOWN_TOWNS[key(town)]).map((town) => ({ name: town, at: KNOWN_TOWNS[key(town)] }));
  const width = 560;
  const height = 330;
  const pad = 70;
  const lats = placed.map((town) => town.at[0]);
  const lngs = placed.map((town) => town.at[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 0.5);
  const spanLng = Math.max(maxLng - minLng, 0.5);
  const point = ([lat, lng]: [number, number]): [number, number] => [
    placed.length === 1 ? width / 2 : pad + ((lng - minLng) / spanLng) * (width - pad * 2.6),
    placed.length === 1 ? height / 2 : height - pad - ((lat - minLat) / spanLat) * (height - pad * 2),
  ];
  const hub = placed.find((town) => key(town.name) === "douala") ?? placed[0];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={label}>
      <defs>
        <pattern id="map-nd" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#14307A" />
          <path d="M7 0L14 7L7 14L0 7Z" fill="none" stroke="#1E3F95" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect width={width} height={height} rx="26" fill="url(#map-nd)" />
      {hub &&
        placed
          .filter((town) => town !== hub)
          .map((town) => {
            const [x1, y1] = point(hub.at);
            const [x2, y2] = point(town.at);
            return <line key={town.name} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFB81C" strokeWidth="2.5" strokeDasharray="4 6" />;
          })}
      {placed.map((town) => {
        const [x, y] = point(town.at);
        const big = town === hub;
        return (
          <g key={town.name}>
            <circle cx={x} cy={y} r={big ? 15 : 11} fill="#FFB81C" stroke="#0B1B3F" strokeWidth="3" />
            <text x={x + (big ? 22 : 18)} y={y + 6} fontSize={big ? 19 : 17} fontWeight="800" fill="#fff" fontFamily="inherit">{town.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
