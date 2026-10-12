import { createHash } from 'node:crypto';
import { educationProfile, lookupBlock } from './block-catalog.js';
import { auditCompatibleMaterialCandidates, resolveMaterialCandidates, materialRoleRequirements } from './material-candidate-resolver.js';
import { composeMaterialPaletteSet } from './material-palette-set-composer.js';
import { adaptPaletteToMaterialGrammar } from './material-grammar-adapter.js';
import { collectMaterialGrammarRequirements } from './material-grammar-requirements.js';
import { validateBuildPlan } from './safety.js';

export const MATERIAL_SHADOW_POLICY = Object.freeze({ revision: 'phase6c-shadow-v1', maxElapsedMs: 30000,
  requirementBoundary: 'validated_post_rotation_post_pruning_legacy_emissions', mandatory: 'all_non_air_emissions' });
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const json = v => JSON.stringify(canonical(v));
const hash = v => createHash('sha256').update(json(v)).digest('hex');
const exact = c => json([c.blockId, c.states ?? {}]);
const families = values => [...new Set(values.map(c => c.family).filter(Boolean))].sort();
const counts = values => Object.fromEntries([...new Set(values)].sort().map(v => [v, values.filter(x => x === v).length]));
const compactCandidate = c => ({ blockId:c.blockId, states:c.states, form:c.form, family:c.family,
  semantics:c.semantics, compatibility:c.compatibility, verification:c.verification });

// Classifications reflect demonstrated causes. Hint-only exclusions cannot
// establish a catalog-wide absence or a coherence restriction.
export function classifyUnresolvedMaterialRequirement(requirement, assignment) {
  if (!requirement || !materialRoleRequirements[requirement.role]) return 'unsupported_production_requirement';
  if (!requirement.form || !requirement.exactStates || requirement.source?.requiredPaletteRoles?.length === 0)
    return 'current_module_requirement_schema_issue';
  if (!materialRoleRequirements[requirement.role].forms.includes(requirement.form)) return 'material_grammar_contract_mismatch';
  if (assignment?.reason === 'palette_coherence_restriction') return 'palette_coherence_restriction';
  return 'no_verified_exact_state_candidate';
}

export function materialShadowReadiness({ safety, completeness, determinism, performance, coherence, compatibility, invariant }) {
  const gates = { safety, completeness, determinism, performance, coherence, compatibility, invariant };
  const blockers = Object.entries(gates).filter(([k,v]) => ['safety','completeness','determinism','compatibility','invariant'].includes(k) && v === 'FAIL').map(([k]) => k);
  const reviews = Object.entries(gates).filter(([,v]) => v !== 'PASS' && v !== 'FAIL').map(([k]) => k);
  for (const k of ['performance','coherence']) if (gates[k] === 'FAIL') reviews.push(k);
  return { status:blockers.length ? 'BLOCKED' : reviews.length ? 'NEEDS_REVIEW' : 'READY', gates, blockers, reviews,
    productionCutoverAuthorized:false, scope:'observed_emission_snapshot; future_consumer_geometry_not_certified' };
}

/** One explicit evaluation, one composer and at most one adapter. No IO/world,
 * caching, injected pipeline, requirement override or alternate interpretation.
 * Timings are external observations excluded from semantic replay identity.
 */
export function evaluateMaterialShadow(plan, { profile = educationProfile, runtimeVersion = profile.educationVersion } = {}) {
  const started = performance.now(), c = plan?.composition;
  if (c?.version !== 1) throw new Error('Expected production Composition v1 plan');
  validateBuildPlan(structuredClone(plan)); // Enforce existing operation/size bounds without mutating input.
  const snapshot = hash(plan), context = { program:c.program, style:c.style, materialRequirements:structuredClone(c.materialRequirements ?? {}) };
  const requirements = collectMaterialGrammarRequirements(plan);
  const metrics = { baseResolverCalls:0, composerCalls:0, adapterCalls:0, composerResolverCalls:0, adapterResolverCalls:0,
    safetyResolverCalls:0, legacyResolverCalls:0, rawRequirements:requirements.length, uniqueRequirements:0, elapsedMs:{} };
  const timed = (name, fn) => { const t=performance.now(); try { return fn(); } finally { metrics.elapsedMs[name]=performance.now()-t; } };
  const base = timed('base', () => { metrics.baseResolverCalls++; return auditCompatibleMaterialCandidates({profile,runtimeVersion,explain:true}); });
  // Step 2 has no global materialRequirements option. Forward canonical hard
  // intent to EACH role using its existing roleConstraints contract.
  const roles = ['primaryWall','secondaryWall','accent','trim','floor','structure','frame','glazing','roof'];
  const roleConstraints = Object.fromEntries(roles.map(role => [role,{materialRequirements:context.materialRequirements}]));
  // Palette roof anchors remain full blocks; exact canopy slabs belong to Step 3.
  roleConstraints.roof.forms = ['full_block'];
  const composerInput = { ...context, seed:c.variationSeed, profile,runtimeVersion, roles,roleConstraints, familyForms:['slab','stairs'],explain:true };
  let paletteSet, adapted, failure = null;
  try {
    paletteSet = timed('composer', () => { metrics.composerCalls++; return composeMaterialPaletteSet(composerInput); });
    metrics.composerResolverCalls = paletteSet.debug.resolverCalls;
    if (paletteSet.status === 'selected') {
      adapted = timed('adapter', () => { metrics.adapterCalls++; return adaptPaletteToMaterialGrammar({paletteSet,requirements,profile,runtimeVersion,compositionContext:context,seed:c.variationSeed}); });
      metrics.adapterResolverCalls = adapted.metrics.resolverCalls;
      metrics.uniqueRequirements = adapted.metrics.uniqueRequirementCount;
    } else failure = { stage:'composer', reason:paletteSet.reason };
  } catch (error) { failure = { stage:paletteSet ? 'adapter' : 'composer', reason:error.message }; }
  // Independently recheck the emitted shadow exact units through Step 1. Legacy
  // checks use the same contracts but never repair or replace their materials.
  const check = (items, kind) => timed(kind, () => {
    const groups=new Map(), results=new Map();
    for (const item of items) {
      const key=json([item.role,item.form]);
      if (!groups.has(key)) groups.set(key,[]); groups.get(key).push(item);
    }
    for (const group of groups.values()) {
      if (!materialRoleRequirements[group[0].role]) {
        for (const x of group) results.set(x.id,{eligible:false,reasons:['unsupported_production_requirement']});
        continue;
      }
      const units=[...new Map(group.map(x => [exact(x),{blockId:x.blockId,states:x.states}])).values()];
      metrics[`${kind}ResolverCalls`]++;
      const resolved=resolveMaterialCandidates({profile,runtimeVersion,role:group[0].role,forms:[group[0].form],candidateUnits:units,
        program:c.program,materialRequirements:context.materialRequirements,seed:c.variationSeed,explain:true});
      const eligible=new Set(resolved.candidates.map(exact));
      for (const x of group) results.set(x.id, { eligible:eligible.has(exact(x)),
        reasons:resolved.diagnostics.exclusions.find(e => exact(e) === exact(x))?.reasons ?? [] });
    }
    return results;
  });
  const assignments=(adapted?.assignments ?? []).map(a => ({ ...a, originatingPalette:undefined, resolverExclusions:undefined,
    exclusionReasonCounts:a.resolverExclusions ? counts(a.resolverExclusions.flatMap(e => e.reasons)) : undefined }));
  const assigned=assignments.filter(a => a.status === 'assigned');
  const safe = check(assigned.map(a => ({...a,id:a.requirementId})), 'safety');
  const legacyMaterials=requirements.map(r => ({ id:r.id,operationIndex:r.operationIndex,moduleId:r.moduleId,moduleInstance:r.moduleInstance,
    role:r.role,form:r.form,blockId:r.source.blockId,states:r.exactStates,family:lookupBlock(r.source.blockId).family }));
  const legacyChecks=check(legacyMaterials,'legacy');
  const unresolved=requirements.filter(r => !assigned.some(a => a.requirementId === r.id)).map(r => {
    const a=assignments.find(x => x.requirementId === r.id);
    return { requirementId:r.id, role:r.role,form:r.form,exactStates:r.exactStates,moduleId:r.moduleId,
      mandatory:true,category:classifyUnresolvedMaterialRequirement(r,a),reason:a?.reason ?? failure?.reason ?? 'pipeline_incomplete',
      exclusionReasonCounts:a?.exclusionReasonCounts ?? {} };
  });
  const differences=legacyMaterials.map(l => {
    const a=assigned.find(x => x.requirementId === l.id);
    return { requirementId:l.id,role:l.role,form:l.form,legacy:{blockId:l.blockId,states:l.states,family:l.family},
      shadow:a ? {blockId:a.blockId,states:a.states,family:a.family} : null,
      blockChanged:a ? l.blockId !== a.blockId : null, familyChanged:a ? l.family !== a.family : null,
      exactStatesPreserved:a ? json(l.states) === json(a.states) : null };
  });
  const unsafe=assigned.filter(a => !safe.get(a.requirementId)?.eligible || json(a.states) !== json(a.requiredExactStates));
  const legacyViolations=legacyMaterials.filter(l => !legacyChecks.get(l.id).eligible).map(l => ({...l,...legacyChecks.get(l.id)}));
  const core = items => families(items.filter(a => !['glazing','lighting'].includes(a.role)));
  const expansions=assigned.filter(a => a.familyExpansion).map(a => ({requirementId:a.requirementId,role:a.role,form:a.form,
    moduleId:a.moduleId,blockId:a.blockId,states:a.states,family:a.family,reasons:a.reasons}));
  metrics.resolverCalls=metrics.baseResolverCalls+metrics.composerResolverCalls+metrics.adapterResolverCalls+metrics.safetyResolverCalls+metrics.legacyResolverCalls;
  metrics.adapterGroups=adapted?.metrics.resolverGroups ?? 0;
  metrics.elapsedMs.total=performance.now()-started;
  const bounded=metrics.composerCalls === 1 && metrics.adapterCalls <= 1 && metrics.adapterResolverCalls <= 3*metrics.adapterGroups;
  const coverage = key => Object.fromEntries([...new Set(requirements.map(r => r[key]))].sort().map(v => [v, {
    required:requirements.filter(r => r[key] === v).length,assigned:assigned.filter(a => a[key] === v).length }]));
  const result = {
    schema:'phase6c-shadow-result-v1',policy:MATERIAL_SHADOW_POLICY,
    identity:{composition:hash(c),plan:snapshot,style:c.style,program:c.program,seed:c.variationSeed,
      target:{environment:profile.environment,runtimeVersion,evidence:hash({...profile,records:[...profile.records].sort((a,b)=>json(a).localeCompare(json(b)))})}},
    inputParity:{compositionContext:context,seed:c.variationSeed,requirementsSource:MATERIAL_SHADOW_POLICY.requirementBoundary,
      materialDependentLegacyShapes:true,geometryReinterpreted:false},
    step1:{eligibleUnits:base.candidates.length,sourceUnits:base.diagnostics.sourceUnits,exclusionCounts:base.diagnostics.exclusionCounts,policy:base.policy},
    step2:paletteSet ? {status:paletteSet.status,roles:Object.fromEntries(Object.entries(paletteSet.roles).map(([r,a])=>[r,compactCandidate(a)])),
      identity:paletteSet.identity,coreFamilies:core(Object.entries(paletteSet.roles).map(([role,a])=>({...a,role}))),
      fallback:paletteSet.fallback,components:paletteSet.components,
      alternatives:Object.fromEntries(Object.entries(paletteSet.alternatives ?? {}).map(([r,list])=>[r,list.map(compactCandidate)])),
      familyFormEvidence:paletteSet.familyFormEvidence,work:{resolverCalls:paletteSet.debug.resolverCalls,maxBeam:paletteSet.debug.maxBeam,maxShortlist:paletteSet.debug.maxShortlist}} : null,
    step3:{status:adapted?.status ?? 'not_run',requirements,assignments,unresolved,expansions,
      counts:counts(assignments.map(a=>a.kind)),families:adapted?.families ?? null,coreFamilies:core(assigned),
      identity:adapted?.identity ?? null,work:adapted?.metrics ?? null},
    legacy:{selectedPalette:structuredClone(c.materialPalette ?? {preset:c.palette}),materials:legacyMaterials,violations:legacyViolations},
    comparison:{roleCoverage:coverage('role'),formCoverage:coverage('form'),exactStateCoverage:{required:requirements.length,assigned:assigned.length,
      complete:assigned.length === requirements.length && !unsafe.length},familyCount:{legacy:core(legacyMaterials).length,shadow:core(assigned).length},
      differences,unresolvedCount:unresolved.length,unsafeAssignments:unsafe.map(a=>a.requirementId),compatibilityViolations:unsafe.length,
      legacyViolationCount:legacyViolations.length,aestheticReviewRequired:expansions.some(a=>!['glazing','lighting'].includes(a.role))},
    failure,metrics,
    readiness:materialShadowReadiness({safety:!unsafe.length && !failure && paletteSet?.status === 'selected' ? 'PASS':'FAIL',
      completeness:!unresolved.length && !failure ? 'PASS':'FAIL',determinism:'NOT_CHECKED',
      performance:bounded && metrics.elapsedMs.total <= MATERIAL_SHADOW_POLICY.maxElapsedMs ? 'PASS':'FAIL',
      coherence:expansions.some(a=>!['glazing','lighting'].includes(a.role)) ? 'REVIEW':'PASS',
      compatibility:!unsafe.length && !failure && paletteSet?.status === 'selected' ? 'PASS':'FAIL',invariant:hash(plan) === snapshot ? 'PASS':'FAIL'})
  };
  // Semantic identity excludes timings and gate/replay observations.
  result.identity.semantic=hash(materialShadowSemanticSnapshot(result));
  return JSON.parse(JSON.stringify(result));
}

export function materialShadowSemanticSnapshot(result) {
  const copy=structuredClone(result);
  delete copy.metrics; delete copy.readiness; delete copy.replay;
  delete copy.identity.semantic;
  return copy;
}

// Explicit second evaluation supplied by offline caller, never hidden reruns.
export function validateMaterialShadowReplay(first, second) {
  const result=structuredClone(first);
  const sameInput=json(first.identity) === json(second.identity) && json(first.inputParity) === json(second.inputParity);
  const sameResult=json(materialShadowSemanticSnapshot(first)) === json(materialShadowSemanticSnapshot(second));
  result.replay={sameInput,sameResult,secondElapsedMs:second.metrics.elapsedMs.total,secondCalls:{composer:second.metrics.composerCalls,adapter:second.metrics.adapterCalls}};
  result.readiness=materialShadowReadiness({...first.readiness.gates,determinism:sameInput && sameResult ? 'PASS':'FAIL'});
  return result;
}
