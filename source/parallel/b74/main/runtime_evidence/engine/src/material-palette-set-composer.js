import { createHash } from 'node:crypto';
import { resolveMaterialCandidates, materialRoleRequirements } from './material-candidate-resolver.js';
import { materialStyles } from './palette-composer.js';

const freeze = o => { Object.values(o).forEach(v => { if (v && typeof v === 'object') freeze(v); }); return Object.freeze(o); };
export const PALETTE_SET_POLICY = freeze({
  revision: 'phase6c-palette-set-v1', shortlist: 24, diverseSlots: 18, variantSlots: 6, beamWidth: 32, variationPool: 8,
  maxCoreMaterials: 4, maxCoreFamilies: 3,
  roleOrder: ['primaryWall', 'secondaryWall', 'accent', 'trim', 'structure', 'frame', 'floor', 'roof', 'detail', 'glazing', 'lighting'],
  groups: { core: ['primaryWall', 'secondaryWall', 'structure', 'floor', 'roof'], supporting: ['trim', 'frame', 'detail', 'glazing', 'lighting'], accents: ['accent'] },
  couplings: [['primaryWall','secondaryWall'], ['primaryWall','trim'], ['primaryWall','structure'], ['primaryWall','roof'], ['primaryWall','floor'], ['primaryWall','accent'], ['glazing','frame'], ['secondaryWall','detail']],
  neutralColors: ['white', 'light_gray', 'gray', 'black', 'neutral'],
  // Lexicographic priority: no hidden weighted aggregate; seed only breaks exact quality ties.
  priorities: ['anchorStyleFit', 'hierarchyContrast', 'colorHarmony', 'familyCoherence', 'compactness', 'textureContrast', 'individualRoleFit']
});
const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
const serialize = value => JSON.stringify(stable(value));
const hash = value => createHash('sha256').update(serialize(value)).digest('hex');
const keys = new WeakMap(); // Internal resolver snapshots only; never external mutable inputs.
const key = c => { if (!keys.has(c)) keys.set(c,serialize([c.blockId,c.states])); return keys.get(c); };
const signature = roles => serialize(Object.fromEntries(Object.keys(roles).sort().map(r => [r,key(roles[r])])));
const known = v => !!v && v !== 'unknown';
const neutral = c => PALETTE_SET_POLICY.neutralColors.includes(c.semantics.colorFamily);
const contrast = (a,b) => a.family !== b.family || known(a.semantics.colorFamily) && known(b.semantics.colorFamily) && a.semantics.colorFamily !== b.semantics.colorFamily || known(a.semantics.textureCharacter) && known(b.semantics.textureCharacter) && a.semantics.textureCharacter !== b.semantics.textureCharacter;
const ordinary = roles => Object.entries(roles).filter(([r]) => !['glazing','lighting'].includes(r)).map(([,c])=>c);

/** Pure, offline set selection. roleConstraints are strict resolver intersections;
 * familyForms are strict anchor-family requirements. Aesthetics alone may relax.
 * candidateUnits is an optional exact scope, never a source of trusted metadata.
 */
export function composeMaterialPaletteSet(input = {}) {
  const { style = 'modern', program = 'office', seed = 0, profile, runtimeVersion,
    roles = ['primaryWall','secondaryWall','accent','trim','floor','structure','frame','glazing','roof'],
    roleConstraints = {}, familyForms = [], aesthetics = {}, candidateUnits, explain = false } = input;
  if (!Object.hasOwn(materialStyles,style)) throw new Error('Unsupported material style');
  if (!Array.isArray(roles) || !roles.length || new Set(roles).size !== roles.length || roles.some(r => !Object.hasOwn(materialRoleRequirements,r))) throw new Error('Invalid palette roles');
  if (!roleConstraints || typeof roleConstraints !== 'object' || Array.isArray(roleConstraints) || Object.keys(roleConstraints).some(r => !roles.includes(r))) throw new Error('Invalid roleConstraints');
  for (const c of Object.values(roleConstraints)) if (!c || typeof c !== 'object' || Array.isArray(c) || Object.keys(c).some(k => !['forms','constraints','materialRequirements'].includes(k))) throw new Error('Invalid role constraint');
  if (!Array.isArray(familyForms) || new Set(familyForms).size !== familyForms.length || familyForms.some(f => !materialRoleRequirements.detail.forms.includes(f))) throw new Error('Invalid familyForms');
  if (!aesthetics || typeof aesthetics !== 'object' || Array.isArray(aesthetics) || Object.keys(aesthetics).some(k => !['maxCoreMaterials','maxCoreFamilies','preferredFamilies','allowIdenticalAccent'].includes(k))) throw new Error('Invalid aesthetics');
  for (const k of ['maxCoreMaterials','maxCoreFamilies']) if (aesthetics[k] !== undefined && (!Number.isInteger(aesthetics[k]) || aesthetics[k] < 1)) throw new Error('Invalid compactness limit');
  if (aesthetics.preferredFamilies !== undefined && (!Array.isArray(aesthetics.preferredFamilies) || !aesthetics.preferredFamilies.length || aesthetics.preferredFamilies.some(f => typeof f !== 'string'))) throw new Error('Invalid preferredFamilies');
  if (aesthetics.allowIdenticalAccent !== undefined && typeof aesthetics.allowIdenticalAccent !== 'boolean') throw new Error('Invalid accent permission');
  const order = PALETTE_SET_POLICY.roleOrder.filter(r => roles.includes(r)), anchor = order[0];
  const base = { ...(profile ? {profile} : {}), ...(runtimeVersion ? {runtimeVersion} : {}), program, seed, ...(candidateUnits ? {candidateUnits} : {}) };
  const diagnostics = { resolverCalls: 0, evaluations: 0, maxBeam: 0, maxShortlist: 0, attempts: [], shortlistCounts: {} };
  const call = request => { diagnostics.resolverCalls++; return resolveMaterialCandidates({...base,...request}); };
  // Form evidence comes exclusively from the resolver, including exact verified states.
  const coverage = familyForms.length ? call({role:'detail', forms:familyForms}).candidates : [];
  const covers = c => familyForms.every(f => coverage.some(x => x.family === c.family && x.form === f));
  const preferred = aesthetics.preferredFamilies ?? materialStyles[style].families;
  let final = [], chosenStage = null, identityResults = [], lastMissing = [];
  const stages = ['preferredStyle', 'relaxedStyle', 'relaxedAesthetics', 'verifiedNeutral'];
  for (const stage of stages) {
    const results = order.map(role => call({role, ...(stage === 'preferredStyle' ? {style} : {}), ...roleConstraints[role]}));
    identityResults = results;
    const pools = Object.fromEntries(results.map(r => [r.role, r.candidates.filter(c => r.role !== anchor || covers(c))]));
    if (stage === 'preferredStyle' && aesthetics.preferredFamilies) pools[anchor] = pools[anchor].filter(c => preferred.includes(c.family));
    if (stage === 'verifiedNeutral') pools[anchor] = pools[anchor].filter(neutral);
    lastMissing = order.filter(r => !pools[r].length);
    const relaxed = ['relaxedAesthetics','verifiedNeutral'].includes(stage);
    const limits = { materials: relaxed ? PALETTE_SET_POLICY.maxCoreMaterials : aesthetics.maxCoreMaterials ?? PALETTE_SET_POLICY.maxCoreMaterials,
      families: relaxed ? PALETTE_SET_POLICY.maxCoreFamilies : aesthetics.maxCoreFamilies ?? PALETTE_SET_POLICY.maxCoreFamilies };
    let beam = [{roles:{}}];
    for (const role of order) {
      const next = [];
      for (const state of beam) {
        const pool = shortlist(pools[role],state.roles,role,anchor,preferred);
        diagnostics.maxShortlist = Math.max(diagnostics.maxShortlist,pool.length);
        diagnostics.shortlistCounts[role] = Math.max(diagnostics.shortlistCounts[role] ?? 0,pool.length);
        for (const c of pool) {
          diagnostics.evaluations++;
          const selected = {...state.roles,[role]:c};
          if (selected.primaryWall && selected.secondaryWall && key(selected.primaryWall) === key(selected.secondaryWall)) continue;
          if (selected.primaryWall && selected.accent && !aesthetics.allowIdenticalAccent && (!contrast(selected.primaryWall,selected.accent) || key(selected.primaryWall) === key(selected.accent))) continue;
          const core = ordinary(selected);
          if (new Set(core.map(key)).size > limits.materials || new Set(core.map(x=>x.family)).size > limits.families) continue;
          next.push({roles:selected,components:score(selected,anchor,preferred),signature:signature(selected)});
        }
      }
      next.sort(rank);
      beam = next.slice(0,PALETTE_SET_POLICY.beamWidth);
      diagnostics.maxBeam = Math.max(diagnostics.maxBeam,beam.length);
      if (!beam.length) break;
    }
    final = beam.filter(b => Object.keys(b.roles).length === order.length);
    diagnostics.attempts.push({stage,missingRoles:lastMissing,completeSets:final.length});
    if (final.length) { chosenStage = stage; break; }
  }
  const inputIdentity = hash({style,program,seed,roles:[...roles].sort(),roleConstraints,familyForms:[...familyForms].sort(),aesthetics,
    policy:PALETTE_SET_POLICY, styleIntent:materialStyles[style], preferred, resolver:identityResults.map(r=>({role:r.role,policy:r.policy,profile:r.profile,candidates:r.candidates})),coverage});
  const identity = {seed,input:inputIdentity,policy:PALETTE_SET_POLICY.revision,profile:identityResults[0].profile,resolverPolicy:identityResults[0].policy};
  const fallback = {used:chosenStage !== 'preferredStyle',stage:chosenStage, reasons:diagnostics.attempts.filter(a=>!a.completeSets).map(a=>({code:a.missingRoles.length?'noEligibleRoleCandidates':'noCoherentSetWithinBounds',stage:a.stage,roles:a.missingRoles}))};
  if (!final.length) return {status:'unsatisfied',roles:{},identity,fallback,reason:'No safe palette satisfies strict role/form/hierarchy requirements within bounded search',...(explain?{debug:diagnostics}:{})};
  final.sort(rank);
  const tied = final.filter(b => sameQuality(b,final[0])).slice(0,PALETTE_SET_POLICY.variationPool).sort((a,b)=>compare(a.signature,b.signature));
  const selected = tied[seed % tied.length];
  const relations = relationships(selected.roles);
  const selectedRoles = Object.fromEntries(order.map(role=>[role,{...selected.roles[role],selectionReasons:[...selected.roles[role].reasons,
    ...relations.filter(r=>r.roles.includes(role)).flatMap(r=>r.reasons),...(role === anchor && familyForms.length ? ['requiredFamilyFormsCovered'] : [])]}]));
  const forms = Object.fromEntries(familyForms.map(f=>[f,coverage.filter(c=>c.family === selected.roles[anchor].family && c.form === f).sort((a,b)=>compare(key(a),key(b))).map(c=>({blockId:c.blockId,states:c.states,form:c.form,family:c.family}))]));
  return structuredClone({status:'selected',roles:selectedRoles,groups:Object.fromEntries(Object.entries(PALETTE_SET_POLICY.groups).map(([g,rs])=>[g,rs.filter(r=>roles.includes(r))])),
    identity,fallback,components:selected.components,relationships:relations,familyFormEvidence:forms,
    alternatives:Object.fromEntries(order.map(role=>[role,final.filter(b=>key(b.roles[role])!==key(selected.roles[role])).map(b=>b.roles[role]).filter((c,i,all)=>all.findIndex(x=>key(x)===key(c))===i).slice(0,3)])),
    reasons:['resolverEligibleExactStatesOnly','boundedJointSelection','compactMaterialSet',`variationAmongEqualQualitySets:${tied.length}`],
    ...(explain?{debug:{...diagnostics,variationPool:tied.length,runnerUps:final.filter(b=>b.signature!==selected.signature).slice(0,3).map(b=>({roles:Object.fromEntries(order.map(r=>[r,{blockId:b.roles[r].blockId,states:b.roles[r].states,family:b.roles[r].family}])),components:b.components})),rejectedAnchorFamilies:[...new Set(identityResults[0].candidates.filter(c=>!covers(c)).map(c=>c.family))].sort()}}:{})});
}

function relationships(roles) {
  return PALETTE_SET_POLICY.couplings.filter(([a,b])=>roles[a] && roles[b]).map(([a,b])=>{
    const x=roles[a],y=roles[b],colorKnown=known(x.semantics.colorFamily)&&known(y.semantics.colorFamily), textureKnown=known(x.semantics.textureCharacter)&&known(y.semantics.textureCharacter);
    const sharedFamily=x.family===y.family, sameColor=colorKnown&&x.semantics.colorFamily===y.semantics.colorFamily;
    const neutralAccent=colorKnown&&(neutral(x)||neutral(y))&&!sameColor;
    return {roles:[a,b],sharedFamily,sameExactState:key(x)===key(y),colorKnown,textureKnown,
      colorRelationship:!colorKnown?'unknown':sameColor?'similarity':neutralAccent?'neutralContrast':'categoricalContrast',
      textureContrast:textureKnown&&x.semantics.textureCharacter!==y.semantics.textureCharacter,
      reasons:[...(sharedFamily?['sharedFamily:'+x.family]:[]),...(sameColor?['colorSimilarity']:[]),...(neutralAccent?['neutralColorContrast']:[]),...(textureKnown&&x.semantics.textureCharacter!==y.semantics.textureCharacter?['textureContrast']:[])]};
  });
}
function score(roles,anchor,preferred) {
  const c=roles[anchor],index=preferred.indexOf(c.family),relations=relationships(roles),core=ordinary(roles);
  return {anchorStyleFit:index<0?0:preferred.length-index,
    hierarchyContrast:(roles.primaryWall&&roles.accent&&contrast(roles.primaryWall,roles.accent)?1:0)+(roles.primaryWall&&roles.secondaryWall&&contrast(roles.primaryWall,roles.secondaryWall)?1:0),
    colorHarmony:relations.reduce((n,r)=>n+(r.colorRelationship==='similarity'||r.colorRelationship==='neutralContrast'?1:0),0),
    familyCoherence:relations.filter(r=>r.sharedFamily).length,
    compactness:-new Set(core.map(key)).size-new Set(core.map(c=>c.family)).size,
    textureContrast:relations.filter(r=>r.textureContrast).length,
    individualRoleFit:Object.values(roles).reduce((n,c)=>n+c.ranking.score,0)};
}
function rank(a,b) { for (const component of PALETTE_SET_POLICY.priorities) {const d=b.components[component]-a.components[component]; if(d)return d;} return compare(a.signature,b.signature); }
function sameQuality(a,b) {return PALETTE_SET_POLICY.priorities.every(k=>a.components[k]===b.components[k]);}
function shortlist(candidates,roles,role,anchor,preferred) {
  // One best representative per family/color/form/texture keeps lower-ranked
  // contrast candidates available even when hundreds of trim states tie.
  const ordered=candidates.map(c=>({c,components:score({...roles,[role]:c},anchor,preferred),signature:key(c)})).sort(rank).map(x=>x.c);
  const buckets=new Set(), diverse=[];
  for(const c of ordered){const bucket=serialize([c.family,c.form,c.semantics.colorFamily,c.semantics.textureCharacter]);if(!buckets.has(bucket)){buckets.add(bucket);diverse.push(c);}}
  // Preserve exact variants of already-used materials, and reserve a quarter
  // for tied variants so variation survives the diversity grouping.
  const reused=ordered.filter(c=>Object.values(roles).some(x=>key(x)===key(c)));
  const list=[...reused,...diverse.slice(0,PALETTE_SET_POLICY.diverseSlots),...ordered.slice(0,PALETTE_SET_POLICY.variantSlots)];
  return list.filter((c,i,all)=>all.findIndex(x=>key(x)===key(c))===i).slice(0,PALETTE_SET_POLICY.shortlist);
}
