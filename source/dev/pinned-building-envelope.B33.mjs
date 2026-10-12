// Deterministic union and run extraction reused by all programs and massings.
// Masks are local geometry calculations; output remains high-level fill runs.
export function footprint(masses, floor, width, depth) {
  const mask = Array.from({ length: depth }, () => Array(width).fill(false));
  for (const m of masses.filter((r) => r.start <= floor && floor < r.end)) {
    for (let z = m.z; z < m.z + m.depth; z++) for (let x = m.x; x < m.x + m.width; x++) mask[z][x] = true;
  }
  return mask;
}
export const inside = (mask, x, z) => Boolean(mask[z]?.[x]);

export function rectangles(mask) {
  const result = [], active = new Map();
  for (let z = 0; z <= mask.length; z++) {
    const next = new Map(), row = mask[z] ?? [];
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const start = x;
      while (row[x + 1]) x++;
      const key = `${start}:${x}`, prior = active.get(key);
      const r = prior ?? { x: start, z, width: x - start + 1, depth: 0 };
      r.depth++; next.set(key, r);
    }
    for (const [key, r] of active) if (!next.has(key)) result.push(r);
    active.clear(); for (const [key, r] of next) active.set(key, r);
  }
  return result;
}

export function edges(mask) {
  const result = [];
  const w = mask[0].length, d = mask.length;
  for (const [axis, sign] of [["x", -1], ["x", 1], ["z", -1], ["z", 1]]) {
    const fixedMax = axis === "x" ? d : w, runMax = axis === "x" ? w : d;
    for (let fixed = 0; fixed < fixedMax; fixed++) {
      const exposed = (t) => {
        const x = axis === "x" ? t : fixed, z = axis === "x" ? fixed : t;
        return inside(mask, x, z) && !inside(mask, x + (axis === "z" ? sign : 0), z + (axis === "x" ? sign : 0));
      };
      for (let t = 0; t < runMax; t++) {
        if (!exposed(t)) continue;
        const start = t;
        while (t + 1 < runMax && exposed(t + 1)) t++;
        result.push({ axis, sign, fixed, start, end: t });
      }
    }
  }
  return result;
}
