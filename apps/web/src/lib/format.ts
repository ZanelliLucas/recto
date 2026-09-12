const pad = (value: number) => String(value).padStart(2, '0');

/** Durée au centième de seconde (EF-1.1) : « 1:05,23 ». */
export function formatDuration(ms: number): string {
  const centiseconds = Math.max(0, Math.floor(ms / 10));
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  return `${minutes}:${pad(seconds)},${pad(centiseconds % 100)}`;
}

/** Écart signé au dixième de seconde (EF-5.1) : « −4,2 s », « +1,3 s ». */
export function formatDelta(ms: number): string {
  const tenths = Math.round(Math.abs(ms) / 100);
  const sign = ms < 0 && tenths > 0 ? '−' : '+';
  return `${sign}${(tenths / 10).toFixed(1).replace('.', ',')} s`;
}

const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });

export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}
