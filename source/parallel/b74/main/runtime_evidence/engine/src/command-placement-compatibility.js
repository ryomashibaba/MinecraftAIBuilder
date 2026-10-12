import { compatibleVerifiedRecord } from './material-intelligence.js';

export const COMMAND_PLACEMENT_RULE_VERSION = 'education-hard-glass-command-v1';
// A finite evidence set: no prefix/pattern matching and no aliases.
const colors = Object.freeze(['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']);
export const HARD_GLASS_CANONICAL_IDS = Object.freeze([
  'minecraft:hard_glass', ...colors.map(color => `minecraft:hard_${color}_stained_glass`),
  'minecraft:hard_glass_pane', ...colors.map(color => `minecraft:hard_${color}_stained_glass_pane`)
]);
export const HARD_GLASS_COMMAND_EVIDENCE = Object.freeze({
  ruleVersion: COMMAND_PLACEMENT_RULE_VERSION,
  environment: 'minecraft-education', runtimeVersion: 'v26.3', educationReleaseLine: 'v26.32',
  source: 'User-confirmed Education runtime evidence supplied for Phase 6B.4 Step 5D (2026-10-02)',
  scriptModuleVersion: '2.8.0',
  directIdentity: Object.freeze({ blockId: 'minecraft:hard_glass', states: Object.freeze({}) }),
  registry: Object.freeze({ apiAvailable: true, getAllAvailable: true, totalBlockTypes: 1356, exactFound: 34, exactMissing: 0, returnedIdMatchesCanonical: true, getAllMembership: true }),
  commandEvidence: Object.freeze(['Phase 6B.3 setblock: block-ID syntax rejection', 'Step 2 testforblock: namespaced and short canonical IDs rejected; Education controls accepted']),
  canonicalIds: HARD_GLASS_CANONICAL_IDS
});
const exactIds = new Set(HARD_GLASS_CANONICAL_IDS);

/** Availability evidence is independent of historical unsupported status. */
export function evaluateCommandPlacementCompatibility(unit, target, profile) {
  const exactTarget = target?.environment === HARD_GLASS_COMMAND_EVIDENCE.environment &&
    target?.runtimeVersion === HARD_GLASS_COMMAND_EVIDENCE.runtimeVersion &&
    target?.educationReleaseLine === HARD_GLASS_COMMAND_EVIDENCE.educationReleaseLine;
  if (exactIds.has(unit.blockId)) {
    if (exactTarget) return {
      runtimeAvailability: 'available', runtimeConfidence: 'confirmed',
      commandPlacementAvailability: 'unavailable', commandPlacementConfidence: 'confirmed',
      reason: 'runtime_present_command_placement_unavailable', evidence: HARD_GLASS_COMMAND_EVIDENCE
    };
    return { runtimeAvailability: 'unknown', commandPlacementAvailability: 'unknown', requiresRevalidation: true };
  }
  const verified = target && (profile.records ?? []).some(record => compatibleVerifiedRecord(record, unit, target.runtimeVersion));
  return verified
    ? { runtimeAvailability: 'available', runtimeConfidence: 'confirmed', commandPlacementAvailability: 'available', commandPlacementConfidence: 'confirmed', evidence: 'exact verified command identity/state evidence' }
    : { runtimeAvailability: 'unknown', commandPlacementAvailability: 'unknown' };
}
