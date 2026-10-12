import { validateBlockStates } from './block-catalog.js';
﻿export const LIMITS = Object.freeze({
  maxAxis: 64,
  maxVolume: 32768,
  maxRelativeOffset: 128,
  maxOperations: 3000,
  maxEstimatedBlockWrites: 500000
});

export function validateBuildPlan(plan) {
  if (!plan || !Array.isArray(plan.operations)) throw new Error("Invalid build plan");
  if (plan.operations.length === 0 || plan.operations.length > LIMITS.maxOperations) {
    throw new Error(`Operation count must be between 1 and ${LIMITS.maxOperations}`);
  }
  let writes = 0;
  for (const operation of plan.operations) {
    if (operation.type !== "fill" || typeof operation.role !== "string" || typeof operation.description !== "string") {
      throw new Error("Invalid build operation");
    }
    assertBlockId(operation.block);
    if(operation.blockStates) validateBlockStates(operation.block,operation.blockStates);
    writes += assertFillBounds(operation.from, operation.to);
    if (writes > LIMITS.maxEstimatedBlockWrites) throw new Error("Estimated block writes exceed safety limit");
  }
  plan.estimatedCommands = plan.operations.length;
  plan.estimatedBlockWrites = writes;
  return plan;
}

export function assertInteger(value, name) {
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  return value;
}

export function assertPositiveInteger(value, name, max = LIMITS.maxAxis) {
  assertInteger(value, name);

  if (value < 1 || value > max) {
    throw new Error(`${name} must be between 1 and ${max}`);
  }

  return value;
}

export function assertBlockId(block) {
  if (
    typeof block !== "string" ||
    !/^[a-z0-9_:]+$/i.test(block)
  ) {
    throw new Error(`Unsafe or invalid block id: ${block}`);
  }

  return block;
}

export function assertPoint(point, name = "point") {
  for (const axis of ["x", "y", "z"]) {
    assertInteger(point[axis], `${name}.${axis}`);

    if (Math.abs(point[axis]) > LIMITS.maxRelativeOffset) {
      throw new Error(`${name}.${axis} exceeds safety limit`);
    }
  }

  return point;
}

export function assertFillBounds(from, to) {
  assertPoint(from, "from");
  assertPoint(to, "to");

  const sx = Math.abs(to.x - from.x) + 1;
  const sy = Math.abs(to.y - from.y) + 1;
  const sz = Math.abs(to.z - from.z) + 1;

  if (
    sx > LIMITS.maxAxis ||
    sy > LIMITS.maxAxis ||
    sz > LIMITS.maxAxis
  ) {
    throw new Error("Fill exceeds primitive axis safety limit");
  }

  const volume = sx * sy * sz;

  if (volume > LIMITS.maxVolume) {
    throw new Error(
      `Fill volume ${volume} exceeds safety limit ${LIMITS.maxVolume}`
    );
  }

  return volume;
}
