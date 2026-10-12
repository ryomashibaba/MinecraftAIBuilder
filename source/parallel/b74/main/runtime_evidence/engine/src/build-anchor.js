import { createHash } from "node:crypto";

export const FACINGS = Object.freeze(["north", "east", "south", "west"]);
export function deterministicId(value) {
  const canonical = (v) => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object"
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v;
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
export function facingFromYaw(yaw) {
  if (!Number.isFinite(yaw)) throw new Error("Missing player yRot");
  return ["south", "west", "north", "east"][((Math.floor((yaw + 45) / 90) % 4) + 4) % 4];
}
// Plan north is the historical +X/+Z coordinate convention. World north
// points toward -Z; local +X is right and local +Z is forward.
export function rotateLocal({ x, y, z }, facing) {
  switch (facing) {
    case "north": return { x, y, z: -z };
    case "east": return { x: z, y, z: x };
    case "south": return { x: -x, y, z };
    case "west": return { x: -z, y, z: -x };
    default: throw new Error("Invalid facing");
  }
}
// Compatibility transform for existing oriented grammar plans.
export function rotatePlanPoint({ x, y, z }, facing, width, depth) {
  switch (facing) {
    case "east": return { x: depth - 1 - z, y, z: x };
    case "south": return { x: width - 1 - x, y, z: depth - 1 - z };
    case "west": return { x: z, y, z: width - 1 - x };
    case "north": return { x, y, z };
    default: throw new Error("Invalid orientation");
  }
}
export function createBuildAnchor({ position, facing, forward = 7, dimension = 0 }, createdAt = new Date().toISOString()) {
  if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) throw new Error("Invalid player position");
  if (!FACINGS.includes(facing)) throw new Error("Invalid facing");
  if (!Number.isInteger(forward) || forward < 3 || forward > 32) throw new Error("forward must be between 3 and 32");
  // Only overworld is enabled until dimension-specific Education QA exists.
  if (dimension !== 0) throw new Error("Phase 5A supports overworld anchors only");
  const offset = rotateLocal({ x: 0, y: 0, z: forward }, facing);
  const anchor = { x: Math.floor(position.x) + offset.x, y: Math.floor(position.y), z: Math.floor(position.z) + offset.z,
    facing, forward, createdAt, dimension, playerPosition: Object.freeze({ ...position }) };
  return Object.freeze({ ...anchor, anchorId: deterministicId(anchor) });
}
export function worldPoint(point, anchor) {
  const p = rotateLocal(point, anchor.facing);
  return { x: anchor.x + p.x, y: anchor.y + p.y, z: anchor.z + p.z };
}
export function orderedBounds(a, b) {
  const min = {}, max = {};
  for (const axis of ["x", "y", "z"]) { min[axis] = Math.min(a[axis], b[axis]); max[axis] = Math.max(a[axis], b[axis]); }
  return { min, max, width: max.x - min.x + 1, height: max.y - min.y + 1, depth: max.z - min.z + 1 };
}
export function buildBounds(plan, anchor) {
  const min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
  if (!plan.operations?.length) throw new Error("Empty build plan");
  for (const op of plan.operations) for (const p of [op.from, op.to]) for (const axis of ["x", "y", "z"]) {
    min[axis] = Math.min(min[axis], p[axis]); max[axis] = Math.max(max[axis], p[axis]);
  }
  return { localBounds: orderedBounds(min, max), worldBounds: anchor ? orderedBounds(worldPoint(min, anchor), worldPoint(max, anchor)) : null };
}
export function identifyPlan(plan, anchor) {
  return deterministicId({ parameters: plan.parameters, composition: plan.composition, operations: plan.operations, anchor: anchor ?? null });
}
