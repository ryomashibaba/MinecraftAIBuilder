import { materialRoleRequirements } from './material-candidate-resolver.js';
import { canonicalStateKey } from './material-intelligence.js';

// Consumer vocabulary is scoped to the actual planner phase and registered
// module. No alias, form inference or fallback is installed in Step 1.
export const MATERIAL_CONSUMER_CONTRACT = Object.freeze([
  Object.freeze({ modules:Object.freeze(['window_punched_single','window_punched_wide','window_vertical_strip','curtain_wall_bay']), phase:'secondary_frame', role:'frame', forms:Object.freeze(['stairs']), canonicalRole:'trim' }),
  Object.freeze({ modules:Object.freeze(['balcony_standard','balcony_recessed','balcony_corner']), phase:'balcony_rail', role:'accent', forms:Object.freeze(['fence','wall']), canonicalRole:'detail' }),
  Object.freeze({ modules:Object.freeze([null]), phase:'parapet', role:'accent', forms:Object.freeze(['slab','wall']), canonicalRole:'detail' })
]);
const aliases=Object.freeze({glass:'glazing',light:'lighting',wall:'primaryWall'});

export function normalizeMaterialConsumerRequirement(requirement) {
  const r=structuredClone(requirement);
  if (!r || typeof r.id !== 'string' || !r.exactStates || typeof r.exactStates !== 'object' || Array.isArray(r.exactStates)) throw new Error('Invalid consumer requirement');
  const requestedRole=r.role;
  r.role=Object.hasOwn(aliases,r.role) ? aliases[r.role] : r.role;
  if (!Object.hasOwn(materialRoleRequirements,r.role)) throw new Error('Invalid consumer role alias');
  const rule=MATERIAL_CONSUMER_CONTRACT.find(x=>x.modules.includes(r.moduleId ?? null) && x.phase===r.source?.phase && x.role===r.role && x.forms.includes(r.form));
  if(rule) r.role=rule.canonicalRole;
  r.exactStates=JSON.parse(canonicalStateKey(r.exactStates));
  r.consumerContract={revision:'phase6c-consumer-v1',requestedRole,canonicalRole:r.role,
    normalization:rule ? 'scoped_shape_role' : requestedRole!==r.role ? 'vocabulary_alias' : 'identity'};
  // Unsupported forms remain explicit demands. The resolver must reject them;
  // do not discard the operation or repair its requested exact state.
  return r;
}
