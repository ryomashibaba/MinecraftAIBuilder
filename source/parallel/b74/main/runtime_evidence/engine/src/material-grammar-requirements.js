import { lookupBlock, validateBlockStates } from './block-catalog.js';
import { canonicalStateKey } from './material-intelligence.js';
import { architecturalModules } from '../../modules/architectural-library.js';
import { normalizeMaterialConsumerRequirement } from './material-consumer-contract.js';

// Read the existing planner's emitted contract, after shape generation/rotation
// and optional screen pruning. Never generate a second geometry/state ontology.
export function collectMaterialGrammarRequirements(plan) {
  if (!Array.isArray(plan?.operations)) throw new Error('Expected offline planner operations');
  return plan.operations.flatMap((operation, index) => {
    if (['air', 'minecraft:air'].includes(operation.block)) return [];
    const block = lookupBlock(operation.block);
    if (!block) throw new Error(`Unknown emitted material: ${operation.block}`);
    const states = validateBlockStates(block.id, operation.blockStates ?? {});
    const module = operation.moduleId ? architecturalModules.get(operation.moduleId) : null;
    if (operation.moduleId && !module) throw new Error('Unknown emitted module');
    const role = operation.role;
    return [normalizeMaterialConsumerRequirement({id:`operation:${index}`, moduleId:operation.moduleId ?? null,
      moduleInstance:operation.moduleInstance ?? null, operationIndex:index,
      role, form:block.form, exactStates:JSON.parse(canonicalStateKey(states)),
      moduleConstraintIdentity:module ? {id:module.id, constraints:[...module.constraints].sort()} : {phase:operation.phase},
      source:{kind:'existing_planner_emission', phase:operation.phase, blockId:block.id,
        requiredPaletteRoles:module ? [...module.requiredPaletteRoles] : [operation.role]}})];
  });
}
