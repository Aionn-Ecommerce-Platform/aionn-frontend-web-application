export function compactCurrency(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

export function smoothPath(points: { x: number; y: number }[]) {
  const first = points[0];
  if (!first || points.length < 2) return "";
  const d = [`M ${first.x} ${first.y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    if (!p0 || !p1 || !p2) continue;
    const p3 = points[i + 2] ?? p2;
    d.push(
      `C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${
        p2.x - (p3.x - p1.x) / 6
      } ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`,
    );
  }
  return d.join(" ");
}
