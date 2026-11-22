export function compactCurrency(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

export function smoothPath(points: { x: number; y: number }[]) {
  const count = points.length;
  const first = points[0];
  if (!first || count < 2) return "";

  // Monotone cubic interpolation (Fritsch-Carlson). A plain Catmull-Rom spline
  // can overshoot below zero when revenue collapses to a flat zero line.
  const dx: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    const current = points[i]!;
    const next = points[i + 1]!;
    const width = next.x - current.x;
    dx.push(width);
    slopes.push(width === 0 ? 0 : (next.y - current.y) / width);
  }

  const tangents = new Array<number>(count);
  tangents[0] = slopes[0]!;
  tangents[count - 1] = slopes[count - 2]!;
  for (let i = 1; i < count - 1; i++) {
    tangents[i] = (slopes[i - 1]! + slopes[i]!) / 2;
  }

  for (let i = 0; i < count - 1; i++) {
    const slope = slopes[i]!;
    if (slope === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const left = tangents[i]! / slope;
    const right = tangents[i + 1]! / slope;
    if (left < 0) tangents[i] = 0;
    if (right < 0) tangents[i + 1] = 0;
    const magnitude = left * left + right * right;
    if (magnitude > 9) {
      const scale = 3 / Math.sqrt(magnitude);
      tangents[i] = scale * left * slope;
      tangents[i + 1] = scale * right * slope;
    }
  }

  const d = [`M ${first.x} ${first.y}`];
  for (let i = 0; i < count - 1; i++) {
    const current = points[i]!;
    const next = points[i + 1]!;
    const width = dx[i]!;
    d.push(
      `C ${current.x + width / 3} ${current.y + (tangents[i]! * width) / 3}, ${
        next.x - width / 3
      } ${next.y - (tangents[i + 1]! * width) / 3}, ${next.x} ${next.y}`,
    );
  }
  return d.join(" ");
}
