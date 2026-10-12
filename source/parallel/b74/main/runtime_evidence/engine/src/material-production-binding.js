import { evaluateMaterialShadow } from './material-shadow.js';
import { deterministicId } from './build-anchor.js';
import { validateBuildPlan } from './safety.js';
import { measureMaterials } from './material-metrics.js';

// The flag is caller configuration, never part of Composition v1 or a profile.
export function materialPipelineMode(options = {}) {
  const mode = options.materialPipeline === undefined ? 'legacy' : options.materialPipeline;
  if (!['legacy', 'phase6c'].includes(mode)) throw new Error('Unknown materialPipeline; expected legacy or phase6c');
  if (options.onMaterialResult !== undefined && typeof options.onMaterialResult !== 'function') throw new Error('Invalid onMaterialResult callback');
  return mode;
}

export class MaterialCutoverError extends Error {
  constructor(reason, diagnostics) {
    super(`Phase 6C cutover BLOCKED: ${reason}`);
    this.name = 'MaterialCutoverError';
    this.diagnostics = structuredClone(diagnostics);
  }
}

// Identity includes every operation field except the permitted material payload.
export const operationGeometry = operation => {
  const { block, blockStates, ...geometry } = operation;
  return geometry;
};
export const planGeometryIdentity = plan => deterministicId({
  composition:plan.composition, parameters:plan.parameters, masses:plan.masses,
  bounds:plan.bounds, dimensions:plan.dimensions, anchor:plan.anchor ?? null,
  operations:plan.operations.map(operationGeometry)
});

/** Bind only validated exact assignments to the existing fill interface.
 * No caller can inject a PaletteSet, assignment, resolver or cached result.
 * The full Step 1/2/3 evaluation and independent Step 1 safety check are reused.
 */
export function bindPhase6cProductionMaterials(legacyPlan, options = {}, buildPlanGenerationMs = 0) {
  const started = performance.now();
  let evaluated;
  try { evaluated = evaluateMaterialShadow(legacyPlan, options); }
  catch (error) { throw new MaterialCutoverError(error.message, {stage:'evaluation',reason:error.message}); }
  const requirements = evaluated.step3.requirements;
  const assignments = new Map(evaluated.step3.assignments.map(a => [a.requirementId,a]));
  const fail = (reason, requirement) => {
    throw new MaterialCutoverError(reason, {stage:'production_binding',
      requirement:requirement?.id ?? null,role:requirement?.role ?? null,form:requirement?.form ?? null,
      state:requirement?.exactStates ?? null,module:requirement?.moduleId ?? null,
      reason,unresolved:evaluated.step3.unresolved,failure:evaluated.failure});
  };
  if (evaluated.failure || evaluated.comparison.unresolvedCount || evaluated.comparison.unsafeAssignments.length ||
      evaluated.comparison.compatibilityViolations || evaluated.step2?.status !== 'selected') {
    const unresolved = evaluated.step3.unresolved[0];
    fail(unresolved?.reason ?? evaluated.failure?.reason ?? 'unsafe_exact_assignment',
      requirements.find(r => r.id === unresolved?.requirementId));
  }
  const bindStarted = performance.now(), plan = structuredClone(legacyPlan), bindings = [];
  for (const requirement of requirements) {
    const a = assignments.get(requirement.id), operation = plan.operations[requirement.operationIndex];
    if (!a || a.status !== 'assigned' || !operation) fail('missing_binding',requirement);
    if (a.role !== requirement.role || a.form !== requirement.form ||
        deterministicId(a.states) !== deterministicId(requirement.exactStates) ||
        a.verification?.status !== 'verified' ||
        a.verification.identity?.id !== a.blockId ||
        deterministicId(a.verification.identity?.states) !== deterministicId(a.states) ||
        a.verification.identity?.environment !== evaluated.identity.target.environment ||
        a.verification.identity?.educationVersion !== evaluated.identity.target.runtimeVersion ||
        a.compatibility?.runtime?.targetRuntimeAvailability !== 'available' ||
        a.compatibility?.command?.commandPlacementAvailability !== 'available') fail('invalid_exact_binding',requirement);
    operation.block = a.blockId;
    // Empty maps are canonical too; no defaults or shapeStates are regenerated.
    operation.blockStates = structuredClone(a.states);
    bindings.push({requirementId:a.requirementId,operationIndex:requirement.operationIndex,
      moduleId:a.moduleId,role:a.role,form:a.form,blockId:a.blockId,states:structuredClone(a.states),
      family:a.family,verification:structuredClone(a.verification),target:evaluated.identity.target,
      compatibility:structuredClone(a.compatibility),eligibility:'Step1_independently_rechecked'});
  }
  validateBuildPlan(plan);
  if (planGeometryIdentity(plan) !== planGeometryIdentity(legacyPlan)) fail('geometry_invariant');
  Object.assign(plan,measureMaterials(plan));
  // The persisted palette still describes the geometry source; final operations
  // and refreshed material metrics describe the actual bound production plan.
  plan.paletteSummary = `Phase 6C: ${evaluated.step3.coreFamilies.join(', ')}`;
  const productionBindingMs = performance.now()-bindStarted;
  const sidecar = {schema:'phase6c-production-binding-v1',identity:evaluated.identity,
    paletteSet:evaluated.step2,adaptedAssignments:evaluated.step3.assignments,bindings,
    coverage:evaluated.comparison,unresolved:evaluated.step3.unresolved,
    families:evaluated.step3.coreFamilies,geometryIdentity:planGeometryIdentity(plan),
    metrics:{...evaluated.metrics,elapsedMs:{...evaluated.metrics.elapsedMs,
      resolver:evaluated.metrics.elapsedMs.base+evaluated.metrics.elapsedMs.safety+evaluated.metrics.elapsedMs.legacy,
      productionBinding:productionBindingMs,buildPlanGeneration:buildPlanGenerationMs,
      total:performance.now()-started+buildPlanGenerationMs}},
    readiness:{status:'PENDING_AB_VALIDATION',safety:'PASS',completeness:'PASS',geometry:'PASS',
      determinism:'NOT_CHECKED',performance:evaluated.readiness.gates.performance,
      coherence:evaluated.readiness.gates.coherence,liveBuildAuthorized:false}};
  if (options.onMaterialResult) options.onMaterialResult(structuredClone(sidecar));
  return plan;
}
