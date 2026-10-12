import { catalogSource, educationProfile, lookupBlock, FORMS, colorMatches } from './block-catalog.js';
import { canonicalStateKey, compatibleVerifiedRecord, getMaterialVerificationEligibility, semanticMetadata, tierAVerificationCandidates, MATERIAL_VERIFICATION_POLICY_VERSION } from './material-intelligence.js';
import { evaluateTargetRuntimeCompatibility, TARGET_RUNTIME_PROFILES, TARGET_RUNTIME_COMPATIBILITY_POLICY_VERSION } from './target-runtime-compatibility.js';
import { evaluateCommandPlacementCompatibility, COMMAND_PLACEMENT_RULE_VERSION } from './command-placement-compatibility.js';
import { materialStyles, normalizeMaterialRequirements } from './palette-composer.js';

export const MATERIAL_CANDIDATE_POLICY_VERSION = 'phase6c-candidates-v2-roof-slab';
const full = role => ({ forms: ['full_block'], semanticRoles: [role], context: 'interior_or_exterior' });
// Existing palette roles only. Shape consumers use catalog detail semantics;
// glazing uses the existing glass family (there is no transparency metadata).
export const materialRoleRequirements = deepFreeze({
  primaryWall: full('primaryWall'), secondaryWall: full('secondaryWall'),
  structure: { ...full('structure'), forms: ['full_block', 'pillar/log'], shapeSemanticRoles: ['structure', 'detail'] },
  frame: full('frame'), accent: full('accent'), floor: full('floor'),
  // A canopy is a thin roof covering. Existing shape metadata uses detail;
  // this grants only slab, with all exact-unit safety/evidence gates intact.
  roof: { ...full('roof'), forms: ['full_block', 'slab'], shapeSemanticRoles: ['detail'] },
  trim: { ...full('trim'), forms: ['full_block', 'slab', 'stairs'], shapeSemanticRoles: ['trim', 'detail'] },
  glazing: { forms: ['pane', 'full_block'], families: ['glass'], semanticRoles: ['glazing', 'detail', 'primaryWall'], context: 'interior_or_exterior' },
  detail: { forms: ['full_block', 'slab', 'stairs', 'wall', 'fence', 'pane', 'trapdoor', 'pillar/log', 'light'], semanticRoles: ['detail'], context: 'interior_or_exterior' },
  lighting: { forms: ['light', 'full_block'], semanticRoles: ['lighting'], context: 'interior_or_exterior' }
});
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const canonicalStates = states => JSON.parse(canonicalStateKey(states));
const identity = unit => JSON.stringify([unit.blockId, canonicalStateKey(unit.states)]);

/** Pure production resolver. candidateUnits optionally scopes exact state requests;
 * it cannot override catalog metadata, role contracts, or compatibility gates.
 * constraints narrow forms/semantic roles/families/support/texture; no fallback.
 * Seed is retained as intent for Step 2 selection, not used to randomize ranking.
 */
export function resolveMaterialCandidates(input = {}) {
  if (!Object.hasOwn(materialRoleRequirements, input.role)) throw new Error('Unknown material palette role');
  return resolve(input, materialRoleRequirements[input.role]);
}

/** Read-only base audit, before role/form/style filtering. Same hard gates. */
export function auditCompatibleMaterialCandidates({ profile = educationProfile, runtimeVersion = profile.educationVersion, explain = false } = {}) {
  return resolve({ profile, runtimeVersion, explain }, null);
}

function resolve({ role = null, profile = educationProfile, runtimeVersion = profile.educationVersion, forms, style, program, seed = 0, materialRequirements = {}, constraints = {}, candidateUnits, explain = false } = {}, requirement) {
  if (!profile || !Array.isArray(profile.records) || typeof runtimeVersion !== 'string' || !runtimeVersion) throw new Error('Invalid target profile/version');
  if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) throw new Error('Invalid variation seed');
  if (forms && (!Array.isArray(forms) || !forms.length || forms.some(f => !FORMS.includes(f)))) throw new Error('Invalid form requirements');
  if (style && !Object.hasOwn(materialStyles, style)) throw new Error('Unsupported material style');
  if (program && !['office', 'apartment', 'hotel'].includes(program)) throw new Error('Unsupported material program');
  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints) || Object.keys(constraints).some(k => !['forms', 'semanticRoles', 'families', 'supportRequirement', 'textureCharacter'].includes(k))) throw new Error('Invalid material constraints');
  for (const key of ['forms', 'semanticRoles', 'families']) {
    if (constraints[key] && (!Array.isArray(constraints[key]) || !constraints[key].length || constraints[key].some(v => typeof v !== 'string'))) throw new Error(`Invalid constraint ${key}`);
  }
  if (constraints.forms?.some(f => !FORMS.includes(f))) throw new Error('Invalid constrained forms');
  for (const key of ['supportRequirement', 'textureCharacter']) if (constraints[key] !== undefined && typeof constraints[key] !== 'string') throw new Error(`Invalid constraint ${key}`);
  const intent = normalizeMaterialRequirements(materialRequirements);
  // Canonicalize state key order at the adapter boundary, without changing evidence.
  const scopedProfile = { ...profile, educationVersion: runtimeVersion, records: profile.records.map(r => ({ ...r, ...(r.states ? { states: canonicalStates(r.states) } : {}) })) };
  const target = TARGET_RUNTIME_PROFILES[`${profile.environment}:${runtimeVersion}`] ?? null;
  const source = candidateUnits ?? tierAVerificationCandidates(scopedProfile, runtimeVersion, { includeTerminal: true });
  if (!Array.isArray(source)) throw new Error('Invalid candidateUnits');
  const unique = new Map();
  for (const u of source) {
    if (!u || typeof u.blockId !== 'string' || !u.states || typeof u.states !== 'object' || Array.isArray(u.states)) throw new Error('Invalid exact candidate unit');
    const unit = { blockId: u.blockId, states: canonicalStates(u.states) };
    unique.set(identity(unit), unit);
  }
  const candidates = [], exclusions = [], exclusionCounts = {};
  for (const unit of [...unique.values()].sort((a, b) => compare(identity(a), identity(b)))) {
    const block = lookupBlock(unit.blockId), codes = [];
    if (!block || block.id !== unit.blockId) codes.push('unknown_catalog_identity');
    const eligibility = getMaterialVerificationEligibility(unit.blockId, unit.states);
    if (!eligibility.eligible) codes.push('verification_ineligible');
    if (codes.length) {
      exclude(unit, codes); continue;
    }
    const meta = semanticMetadata(block);
    if (requirement) {
      const labels = meta.form === 'full_block' ? requirement.semanticRoles : requirement.shapeSemanticRoles ?? requirement.semanticRoles;
      if (!labels.some(r => meta.architecturalRoles.includes(r)) || requirement.families && !requirement.families.includes(meta.family)) codes.push('role_mismatch');
      if (!requirement.forms.includes(meta.form)) codes.push('form_mismatch');
    }
    if (forms && !forms.includes(meta.form) || constraints.forms && !constraints.forms.includes(meta.form)) codes.push('form_mismatch');
    if (constraints.semanticRoles && !constraints.semanticRoles.every(r => meta.architecturalRoles.includes(r))) codes.push('role_mismatch');
    if (style && !meta.applicableStyles.includes(style)) codes.push('style_mismatch');
    if (program && !meta.applicablePrograms.includes(program)) codes.push('program_mismatch');
    if (intent.color && !colorMatches(meta.colorFamily, intent.color)) codes.push('color_mismatch');
    if (intent.materialFamilies && !intent.materialFamilies.some(f => meta.family === f || meta.materialCategory === f)) codes.push('family_mismatch');
    if (constraints.families && !constraints.families.includes(meta.family)) codes.push('family_mismatch');
    for (const key of ['supportRequirement', 'textureCharacter']) if (constraints[key] !== undefined && meta[key] !== constraints[key]) codes.push('constraint_mismatch');
    if (codes.length && !explain) continue;
    const runtime = evaluateTargetRuntimeCompatibility(unit, scopedProfile, runtimeVersion);
    const command = evaluateCommandPlacementCompatibility(unit, target, scopedProfile);
    const record = profile.environment === 'minecraft-education' && scopedProfile.records.find(r => r.evidence && compatibleVerifiedRecord(r, unit, runtimeVersion));
    if (runtime.targetRuntimeAvailability !== 'available') codes.push(runtime.targetRuntimeAvailability === 'target_version_unavailable' ? 'target_version_unavailable' : 'target_runtime_unknown');
    if (command.commandPlacementAvailability !== 'available') codes.push(command.commandPlacementAvailability === 'unavailable' ? 'command_placement_unavailable' : 'command_placement_unknown');
    if (!record) codes.push('exact_state_unverified');
    if (codes.length) { exclude(unit, codes); continue; }
    const preferred = style ? materialStyles[style].families : [];
    const familyIndex = preferred.findIndex(f => f === meta.family || f === meta.materialCategory);
    const components = {
      roleFit: requirement ? 1 : 0, formFit: requirement?.forms[0] === meta.form ? 1 : 0,
      semanticFit: requirement?.semanticRoles.some(r => meta.architecturalRoles.includes(r)) ? 1 : 0,
      styleFit: style ? 1 : 0, programFit: program ? 1 : 0,
      familySuitability: familyIndex < 0 ? 0 : preferred.length - familyIndex,
      colorFit: intent.color && meta.colorFamily !== 'unknown' && colorMatches(meta.colorFamily, intent.color) ? 1 : 0,
      textureFit: constraints.textureCharacter && meta.textureCharacter !== 'unknown' ? 1 : 0
    };
    const score = Object.values(components).reduce((sum, n) => sum + n, 0);
    const reasons = ['runtimeCompatible', 'commandPlaceable', 'exactStateVerified', `form:${meta.form}`];
    if (role) reasons.push(`role:${role}`);
    if (style) reasons.push(`styleMatch:${style}`);
    if (program) reasons.push(`programMatch:${program}`);
    if (components.familySuitability) reasons.push(`preferredFamily:${meta.family}`);
    if (components.colorFit) reasons.push(`colorMatch:${intent.color}`);
    if (components.textureFit) reasons.push(`textureMatch:${meta.textureCharacter}`);
    candidates.push({ ...unit, form: meta.form, family: meta.family, semanticRoles: [...meta.architecturalRoles],
      semantics: { colorFamily: meta.colorFamily, textureCharacter: meta.textureCharacter, source: meta.semanticSource },
      compatibility: { runtime, command },
      verification: { status: 'verified', identity: { id: record.id, states: unit.states, environment: record.environment, educationVersion: record.educationVersion, fixtureType: record.fixtureType, fixtureEnvironment: record.fixtureEnvironment, protocolVersion: record.protocolVersion }, evidence: { source: 'profile.records', timestamp: record.evidence.timestamp ?? null, status: record.evidence.status ?? record.status, identityStateMatched: record.evidence.identityStateVerificationResult?.matches ?? null } },
      ranking: { score, components }, reasons });
  }
  candidates.sort((a, b) => b.ranking.score - a.ranking.score || compare(a.blockId, b.blockId) || compare(canonicalStateKey(a.states), canonicalStateKey(b.states)));
  return structuredClone({ role, seed, policy: { resolver: MATERIAL_CANDIDATE_POLICY_VERSION, catalog: catalogSource.revision, verification: MATERIAL_VERIFICATION_POLICY_VERSION, targetRuntime: TARGET_RUNTIME_COMPATIBILITY_POLICY_VERSION, commandPlacement: COMMAND_PLACEMENT_RULE_VERSION }, profile: { environment: profile.environment, runtimeVersion, requiresRevalidation: !target }, requirement, candidates, ...(explain ? { diagnostics: { sourceUnits: unique.size, excludedUnits: exclusions.length, exclusionCounts, exclusions } } : {}) });

  function exclude(unit, codes) {
    if (!explain) return;
    const reasons = [...new Set(codes)], primaryReason = reasons[0];
    exclusionCounts[primaryReason] = (exclusionCounts[primaryReason] ?? 0) + 1;
    exclusions.push({ ...unit, primaryReason, reasons });
  }
}
