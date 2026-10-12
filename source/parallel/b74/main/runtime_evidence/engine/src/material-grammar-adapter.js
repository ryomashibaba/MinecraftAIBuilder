import { createHash } from 'node:crypto';
import { educationProfile } from './block-catalog.js';
import { canonicalStateKey } from './material-intelligence.js';
import { resolveMaterialCandidates, materialRoleRequirements } from './material-candidate-resolver.js';

export const MATERIAL_GRAMMAR_ADAPTER_POLICY = Object.freeze({revision:'phase6c-grammar-adapter-v1', beamWidth:32, shortlist:16});
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])) : value;
const serialize = value => JSON.stringify(stable(value));
const hash = value => createHash('sha256').update(serialize(value)).digest('hex');
const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;
const state = states => JSON.parse(canonicalStateKey(states));
const unitKey = c => serialize([c.blockId,state(c.states)]);
const profileKey = (profile, runtimeVersion) => hash({...profile,educationVersion:runtimeVersion,
  records:profile.records.map(r=>({...r,states:state(r.states ?? {})})).sort((a,b)=>compare(serialize(a),serialize(b)))});
const canonicalConstraints = constraints => Object.fromEntries(Object.entries(constraints ?? {}).map(([k,v])=>[k,Array.isArray(v)?[...new Set(v)].sort():v]));

function normalize(requirement) {
  if (!requirement || typeof requirement.id !== 'string' || !requirement.id ||
      !Object.hasOwn(materialRoleRequirements,requirement.role) || typeof requirement.form !== 'string' ||
      !requirement.exactStates || typeof requirement.exactStates !== 'object' || Array.isArray(requirement.exactStates)) throw new Error('Invalid exact material requirement');
  const moduleConstraintIdentity=structuredClone(requirement.moduleConstraintIdentity ?? null);
  if (Array.isArray(moduleConstraintIdentity?.constraints)) moduleConstraintIdentity.constraints=[...new Set(moduleConstraintIdentity.constraints)].sort();
  return {...structuredClone(requirement),moduleConstraintIdentity,exactStates:state(requirement.exactStates),
    constraints:canonicalConstraints(requirement.constraints), materialRequirements:canonicalConstraints(requirement.materialRequirements)};
}
function requirementDescriptor(r, target) {
  return {role:r.role,form:r.form,exactStates:r.exactStates,constraints:r.constraints,materialRequirements:r.materialRequirements,
    moduleConstraintIdentity:r.moduleConstraintIdentity ?? null,target};
}
export function materialGrammarRequirementIdentity(requirement, {profile=educationProfile,runtimeVersion=profile.educationVersion}={}) {
  return hash(requirementDescriptor(normalize(requirement),profileKey(profile,runtimeVersion)));
}

/** Pure offline consumer. Palette metadata/evidence is never an authorization.
 * Current profile exact units and palette hints are untrusted resolver inputs.
 * No composer, catalog search, compatibility evaluator or global cache is used.
 */
export function adaptPaletteToMaterialGrammar({paletteSet,requirements,profile=educationProfile,
  runtimeVersion=profile.educationVersion,compositionContext={},seed=0}={}) {
  if (paletteSet?.status !== 'selected' || !paletteSet.roles || !Array.isArray(requirements)) throw new Error('Expected selected PaletteSet and requirements');
  if (!Number.isInteger(seed) || seed<0 || seed>2147483647) throw new Error('Invalid variation seed');
  if (!Array.isArray(profile?.records) || typeof runtimeVersion !== 'string' || !runtimeVersion) throw new Error('Invalid target profile/version');
  // Requirements carry their own hard constraints. Context intent is applied to
  // every resolver group; aesthetics/style fallback does not widen these gates.
  const target = profileKey(profile,runtimeVersion), raw = requirements.map(normalize);
  if (new Set(raw.map(r=>r.id)).size !== raw.length) throw new Error('Duplicate requirement instance id');
  const unique = new Map(), occurrences = raw.map(r=>{
    const key=hash(requirementDescriptor(r,target)); if(!unique.has(key))unique.set(key,r);return {r,key};
  });
  const entries=[...unique.entries()].sort(([a],[b])=>compare(a,b)), groups=new Map();
  for(const [key,r] of entries) {
    const groupKey=serialize({role:r.role,form:r.form,constraints:r.constraints,materialRequirements:r.materialRequirements});
    if(!groups.has(groupKey))groups.set(groupKey,[]);groups.get(groupKey).push({key,r});
  }
  const paletteMaterials=Object.entries(paletteSet.roles), paletteFamilies=new Set(paletteMaterials.map(([,c])=>c.family));
  const hints=[...paletteMaterials.map(([,c])=>c),...Object.values(paletteSet.alternatives ?? {}).flat(),...Object.values(paletteSet.familyFormEvidence ?? {}).flat()];
  const resolutions=new Map(), unresolved=new Map();let resolverCalls=0,resolverUnits=0,evaluations=0,maxBeam=0,maxShortlist=0;
  for(const [,group] of [...groups.entries()].sort(([a],[b])=>compare(a,b))) {
    const r=group[0].r, needed=new Set(group.map(x=>canonicalStateKey(x.r.exactStates)));
    // Any eligible exact state must have a matching profile record. Restricting
    // untrusted evidence units to requested states avoids catalog-wide work.
    const units=new Map();
    for(const rec of profile.records) if(typeof rec.id==='string' && needed.has(canonicalStateKey(rec.states ?? {}))) {
      const u={blockId:rec.id,states:state(rec.states ?? {})};units.set(unitKey(u),u);
    }
    for(const h of hints) for(const {r:request} of group) {
      const u={blockId:h.blockId,states:request.exactStates};units.set(unitKey(u),u);
    }
    for(const k of Object.keys(r.materialRequirements)) if(compositionContext.materialRequirements?.[k] !== undefined &&
      serialize(canonicalConstraints({[k]:compositionContext.materialRequirements[k]})) !== serialize(canonicalConstraints({[k]:r.materialRequirements[k]}))) throw new Error('Conflicting context and requirement material constraints');
    const resolverInput={role:r.role,forms:[r.form],profile,runtimeVersion,seed,
      program:compositionContext.program,materialRequirements:{...(compositionContext.materialRequirements ?? {}),...r.materialRequirements},constraints:r.constraints};
    const hintIds=new Set(hints.map(h=>h.blockId));
    const hintUnits=[...units.values()].filter(u=>hintIds.has(u.blockId));
    let result=resolveMaterialCandidates({...resolverInput,candidateUnits:hintUnits});
    resolverCalls++;resolverUnits+=hintUnits.length;
    // A reverified direct/same-family hint already meets the first two policy
    // tiers. Only unresolved higher-priority demands need the broader current
    // evidence pool. Neither hints nor records carry trusted eligibility.
    const needsBroad=group.some(({r:request})=>!result.candidates.some(c=>c.form===request.form &&
      canonicalStateKey(c.states)===canonicalStateKey(request.exactStates) && c.family===paletteSet.roles[request.role]?.family));
    if(needsBroad && result.requirement.forms.includes(r.form)) {
      result=resolveMaterialCandidates({...resolverInput,candidateUnits:[...units.values()]});
      resolverCalls++;resolverUnits+=units.size;
    }
    const missingStates=new Set(group.filter(({r:request})=>!result.candidates.some(c=>canonicalStateKey(c.states)===canonicalStateKey(request.exactStates))).map(({r:request})=>canonicalStateKey(request.exactStates)));
    let diagnostics=null;
    if(missingStates.size) {
      // Explain failed palette hints only. Broad candidate filtering uses the
      // same Step 1 gates without its expensive per-unit debug ledger.
      const diagnosticUnits=[...units.values()].filter(u=>hintIds.has(u.blockId)&&missingStates.has(canonicalStateKey(u.states)));
      diagnostics=resolveMaterialCandidates({...resolverInput,candidateUnits:diagnosticUnits,explain:true}).diagnostics;
      resolverCalls++;resolverUnits+=diagnosticUnits.length;
    }
    for(const {key,r:request} of group) {
      const selected=paletteSet.roles[request.role], alternatives=paletteSet.alternatives?.[request.role] ?? [];
      const options=result.candidates.filter(c=>canonicalStateKey(c.states)===canonicalStateKey(request.exactStates)).map(c=>{
        const direct=selected && unitKey(c)===unitKey(selected), sameFamily=selected && c.family===selected.family;
        const alternative=alternatives.some(a=>unitKey(a)===unitKey(c));
        const tier=direct?0:sameFamily?1:alternative?2:3;
        const color=selected?.semantics?.colorFamily, colorDeviation=color && color!=='unknown' && c.semantics.colorFamily===color?0:1;
        return {candidate:c,tier,colorDeviation,kind:['direct_palette_match','same_family_adaptation','approved_alternative','resolver_fallback'][tier]};
      });
      if(!options.length) {
        unresolved.set(key,{status:'unresolved_requirement',reason:'no_safe_palette_preserving_fallback',
          paletteRoleMissing:!selected, resolverExclusions:diagnostics.exclusions.filter(c=>canonicalStateKey(c.states)===canonicalStateKey(request.exactStates)),
          diagnosticScope:'palette_hints_only; matching evidence pool or immutable role/form contract failed Step 1',
          roleContract:result.requirement});continue;
      }
      const tier=Math.min(...options.map(o=>o.tier));
      // One best exact variant per family keeps bounded expansion globally
      // useful; there is no score benefit from arbitrary extra ID variants.
      const ranked=options.filter(o=>o.tier===tier).sort((a,b)=>a.colorDeviation-b.colorDeviation || b.candidate.ranking.score-a.candidate.ranking.score || compare(unitKey(a.candidate),unitKey(b.candidate)));
      const families=new Set(), shortlist=[];
      for(const o of ranked)if(!families.has(o.candidate.family)){families.add(o.candidate.family);shortlist.push(o);}
      // Reusing a family already in the palette gets reserved slots.
      shortlist.sort((a,b)=>Number(!paletteFamilies.has(a.candidate.family))-Number(!paletteFamilies.has(b.candidate.family)) || a.colorDeviation-b.colorDeviation || compare(unitKey(a.candidate),unitKey(b.candidate)));
      resolutions.set(key,shortlist.slice(0,MATERIAL_GRAMMAR_ADAPTER_POLICY.shortlist));
      maxShortlist=Math.max(maxShortlist,resolutions.get(key).length);
    }
  }
  let beam=[{choices:{},families:[],colorDeviation:0,score:0,signature:''}];
  const rank=(a,b)=>a.families.length-b.families.length || a.colorDeviation-b.colorDeviation || b.score-a.score || compare(a.signature,b.signature);
  for(const [key] of entries) {
    if(!resolutions.has(key))continue;
    const next=[];
    for(const b of beam)for(const o of resolutions.get(key)) {
      evaluations++;const choices={...b.choices,[key]:o}, family=o.candidate.family;
      const families=[...new Set([...b.families,...(!paletteFamilies.has(family)?[family]:[])])].sort();
      next.push({choices,families,colorDeviation:b.colorDeviation+o.colorDeviation,score:b.score+o.candidate.ranking.score,
        signature:serialize(Object.entries(choices).map(([k,v])=>[k,unitKey(v.candidate)]))});
    }
    next.sort(rank);beam=next.slice(0,MATERIAL_GRAMMAR_ADAPTER_POLICY.beamWidth);maxBeam=Math.max(maxBeam,beam.length);
  }
  const winner=beam[0], assignments=occurrences.sort((a,b)=>compare(a.r.id,b.r.id)).map(({r,key})=>{
    const base={requirementId:r.id,requirementKey:key,moduleId:r.moduleId ?? null,moduleInstance:r.moduleInstance ?? null,
      role:r.role,form:r.form,requiredExactStates:r.exactStates,moduleConstraintIdentity:r.moduleConstraintIdentity ?? null};
    if(unresolved.has(key))return {...base,...unresolved.get(key),kind:'unresolved'};
    const o=winner.choices[key], c=o.candidate, origin=paletteSet.roles[r.role];
    return {...base,status:'assigned',kind:o.kind,blockId:c.blockId,states:c.states,family:c.family,
      originatingPalette:{role:r.role,material:origin ?? null},compatibility:c.compatibility,verification:c.verification,
      reasons:[o.kind,...c.reasons,...(!paletteFamilies.has(c.family)?['palette_family_expansion:no_eligible_higher_priority_variant']:[])],
      familyExpansion:!paletteFamilies.has(c.family)};
  });
  return structuredClone({status:unresolved.size?'unresolved_requirements':'resolved',assignments,
    identity:{policy:MATERIAL_GRAMMAR_ADAPTER_POLICY.revision,profile:target,seed,
      input:hash({paletteSet,requirements:entries.map(([k,r])=>[k,requirementDescriptor(r,target)]),compositionContext,seed,policy:MATERIAL_GRAMMAR_ADAPTER_POLICY}),
      resolution:hash(assignments)},
    families:{palette:[...paletteFamilies].sort(),used:[...new Set(assignments.filter(a=>a.status==='assigned').map(a=>a.family))].sort(),expanded:winner.families},
    metrics:{rawRequirementCount:raw.length,uniqueRequirementCount:unique.size,resolverGroups:groups.size,resolverCalls,resolverUnits,composerCalls:0,evaluations,maxBeam,maxShortlist},
    search:{policy:MATERIAL_GRAMMAR_ADAPTER_POLICY,scope:'bounded_family_expansion_minimization',globalOptimalityGuaranteed:false}});
}
