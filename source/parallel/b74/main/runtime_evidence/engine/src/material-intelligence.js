import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockCatalog, lookupBlock, compatibility, educationProfile, validateBlockStates } from './block-catalog.js';
import { transformBlockStates, serializeStates, shapeStates } from './block-states.js';
import { rotateLocal } from './build-anchor.js';
import { composePalette } from './palette-composer.js';
import { randomUUID, createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../catalog');
const colors = ['white','orange','magenta','light_blue','yellow','lime','pink','light_gray','gray','cyan','purple','blue','brown','green','red','black'];
const unsafe = /(?:^|_)(?:tnt|command|structure|water|lava|fire|soul_fire|redstone|piston|observer|repeater|comparator|sand|gravel|powder|portal|barrier|allow|deny|border_block|chest|barrel|shulker_box|dispenser|dropper|hopper|furnace|brewing_stand|beacon|spawner)(?:_|$)/;
const familyRules = [
  [/quartz/, 'quartz'], [/concrete/, 'concrete'], [/terracotta|bricks/, 'ceramic'], [/brick/, 'brick'],
  [/copper/, 'copper'], [/wood|planks|log|stem|hyphae|wood$/, 'wood'], [/stone|andesite|diorite|granite|deepslate|blackstone|basalt|tuff/, 'stone'],
  [/glass/, 'glass'], [/iron|gold|copper|metal/, 'metal'], [/sandstone/, 'sandstone']
];
const colorOf = s => colors.find(c => s.startsWith(`${c}_`) || s.includes(`_${c}_`) || s.endsWith(`_${c}`)) ?? (s.includes('quartz')||s.includes('snow')?'white':s.includes('stone')||s.includes('andesite')?'gray':s.includes('wood')||s.includes('log')||s.includes('planks')?'brown':'unknown');
function infer(id) {
  const s=id.slice('minecraft:'.length);
  const form = /_stairs$/.test(s)?'stairs':/_slab$/.test(s)?'slab':/_wall$/.test(s)?'wall':/_fence$/.test(s)&&!s.endsWith('_fence_gate')?'fence':/_glass_pane$|_pane$/.test(s)?'pane':/(_log|_stem|_hyphae|_pillar)$/.test(s)?'pillar/log':/_trapdoor$/.test(s)?'trapdoor':/(_door|_gate)$/.test(s)?'door':/(sea_lantern|lantern|torch|glowstone|shroomlight|light_block)$/.test(s)?'light':'full_block';
  const family=familyRules.find(([re])=>re.test(s))?.[1]??'unknown';
  const roles=form==='full_block'?['primaryWall','secondaryWall','structure','frame','accent','floor','roof','trim','detail']:form==='light'?['lighting','detail']:['detail'];
  const redstone=/rail|redstone|_wire$|lever|button|pressure_plate|tripwire|target|daylight_detector|lightning_rod|sculk_sensor/.test(s);
  const plant=/flower|dandelion|tulip|orchid|allium|poppy|sapling|crop|wheat|carrot|potato|beetroot|berry|bamboo|cactus|sugar_cane|vine|grass|fern|mushroom|azalea|leaves|lily_pad|kelp|seagrass|coral/.test(s);
  const liquid=/water|lava/.test(s);
  const technical=/command|structure|barrier|allow|deny|portal|spawner|bedrock/.test(s);
  const supportRequirement=redstone?'rail_or_redstone_support':plant?'special_plant_support':/chain|iron_bars/.test(s)?'wall_or_ceiling_support':(['slab','stairs','wall','fence','pane','trapdoor','pillar/log','light'].includes(form)?'placement_support':'none');
  const environmentRequirement=liquid?'liquid':plant?'light_or_biome':redstone?'redstone_or_rail_context':'none';
  const verificationFixtureType=redstone||plant||liquid||technical?'unsupported_by_current_harness':supportRequirement==='none'?'free_space':'solid_support_below';
  return {family,materialCategory:family,colorFamily:colorOf(s),textureCharacter:['wall','stairs','slab'].includes(form)?'masonry':family==='wood'?'grain':'unknown',form,architecturalRoles:roles,applicablePrograms:['office','apartment','hotel'],applicableStyles:['modern','urban_japanese','industrial','minimal','premium','traditional'],supportRequirements:[],orientationRequirements:[],supportRequirement,environmentRequirement,verificationFixtureType,semanticSource:'inferred',safetyClassification:(unsafe.test(s)||redstone||plant||liquid||technical)?'excluded':(family!=='unknown'?'building':'unknown')};
}
const overrides = JSON.parse(await fs.readFile(path.join(ROOT,'semantic-overrides.json'),'utf8').catch(()=>'{"blocks":{}}')).blocks;
export function semanticMetadata(b) { const override=overrides[b.id]??overrides[b.id.slice(10)]??{};return {...infer(b.id),...(b.semanticSource==='manual'?b:{}),...Object.fromEntries(['survivalRequirement','commandPlacementClass','architecturalEligibility','verificationFixtureType'].filter(k=>b[k]!==undefined).map(k=>[k,b[k]])),...override,semanticSource:Object.keys(override).length?'manual':b.semanticSource??'inferred'}; }
export function applySemanticOverrides(entry, table=overrides) { return {...infer(entry.id),...(table[entry.id]??table[entry.id.slice(10)]??{}),semanticSource:table[entry.id]||table[entry.id.slice(10)]?'manual':'inferred'}; }

const tierAForm = new Set(['full_block','slab','stairs','wall','fence','pane','pillar/log','trapdoor','light']);
export function testTier(b) { if (!b || b.safetyClassification!=='building' || unsafe.test(b.id.slice(10))) return 'C'; if (['door'].includes(b.form)) return 'B'; if(b.architecturalEligibility==='excluded'||(b.verificationFixtureType && b.verificationFixtureType!=='free_space')) return 'C'; return tierAForm.has(b.form)?'A':'C'; }
// The sole gate for verification eligibility across candidates and runtime.
export function getMaterialVerificationEligibility(blockOrId,state={},context={}) {
 const block=typeof blockOrId==='string'?lookupBlock(blockOrId):blockOrId;
 if(!block) return {eligible:false,tier:'C',safetyClass:'unknown',reason:'Block is absent from the catalog',semanticSource:'unknown'};
 const semantic=semanticMetadata(block),tier=testTier({...block,...semantic}),safetyClass=semantic.safetyClassification??'unknown';
 let reason=tier==='A'?'eligible':tier==='B'?'Tier B materials are not part of Tier A verification':safetyClass!=='building'?`Safety classification is ${safetyClass}`:`Form ${semantic.form} is not Tier A`;
 if(tier==='A') try { validateBlockStates(block.id,state??{}); } catch(error) { return {eligible:false,tier,safetyClass,reason:error.message,semanticSource:semantic.semanticSource}; }
 return {eligible:tier==='A',tier,safetyClass,reason,semanticSource:semantic.semanticSource};
}
export function materialCoverage(profile=educationProfile) {
 const rows=blockCatalog.map(b=>({b,sem:semanticMetadata(b),status:compatibility(b.id,{},profile)}));
 const classified=rows.filter(x=>x.sem.family!=='unknown'&&x.sem.form!=='other');
 const count=s=>rows.filter(x=>x.status===s).length;
 const isRedstoneTechnical=x=>x.sem.safetyClassification==='excluded'&&(/rail|redstone|command|structure|barrier|allow|deny|portal|piston|observer|repeater|comparator|hopper|dispenser|dropper|spawner/.test(x.b.id));
 const deferred=rows.filter(x=>x.sem.verificationFixtureType!=='free_space'&&!isRedstoneTechnical(x)),excluded=rows.filter(isRedstoneTechnical);
 const unitCount=items=>items.reduce((n,{b})=>n+expandedStates(b).length,0);
 return {totalIds:rows.length,semanticClassified:classified.length,inferredClassified:classified.filter(x=>x.sem.semanticSource==='inferred').length,manuallyClassified:classified.filter(x=>x.sem.semanticSource==='manual').length,tierACandidates:rows.filter(x=>testTier({...x.b,...x.sem})==='A').length,tierAIds:rows.filter(x=>testTier({...x.b,...x.sem})==='A').length,verificationUnits:rows.filter(x=>testTier({...x.b,...x.sem})==='A').reduce((n,{b})=>n+expandedStates(b).length,0),architecturalTierAIds:rows.filter(x=>testTier({...x.b,...x.sem})==='A').map(x=>x.b.id),deferredSupportDependentIds:deferred.map(x=>x.b.id),deferredSupportDependentUnits:unitCount(deferred),excludedRedstoneTechnicalIds:excluded.map(x=>x.b.id),excludedRedstoneTechnicalUnits:unitCount(excluded),verifiedIds:count('verified'),verifiedStates:(profile.records??[]).filter(r=>r.status==='verified').reduce((n,r)=>n+(r.states?.length??1),0),unsupportedIds:count('unsupported'),unknownIds:count('unknown'),documentedIds:count('documented'),productionPaletteMaterials:rows.filter(x=>x.status==='verified'&&x.sem.family!=='unknown').length};
}

function expandedStates(b) {
 if(b.form==='stairs')return ['south','west','north','east'].map((_,i)=>({weirdo_direction:i,upside_down_bit:false})).filter(s=>{try{validateBlockStates(b.id,s);return true}catch{return false}});
 if(b.form==='slab')return [{'minecraft:vertical_half':'bottom'}].filter(s=>{try{validateBlockStates(b.id,s);return true}catch{return false}});
 if(b.form==='pillar/log'&&b.states.pillar_axis?.values?.length)return ['x','y','z'].map(pillar_axis=>({pillar_axis})).filter(s=>{try{validateBlockStates(b.id,s);return true}catch{return false}});
 if(b.form==='trapdoor')return ['south','west','north','east'].flatMap((_,i)=>[false,true].map(upside_down_bit=>({direction:i,open_bit:false,upside_down_bit}))).filter(s=>{try{validateBlockStates(b.id,s);return true}catch{return false}});
 return [{}];
}

// One verification unit is exactly the canonical state the production planner emits.
export function tierAVerificationCandidates(profile=educationProfile, version=profile.educationVersion, {includeTerminal=false}={}) {
 const familyOrder=['stone','concrete','ceramic','brick','quartz','wood','copper','sandstone','glass'];
 const formOrder=['full_block','slab','stairs','pane','wall','fence','pillar/log','trapdoor','light'];
 return blockCatalog.filter(b=>getMaterialVerificationEligibility(b).eligible).flatMap(b=>expandedStates(b).map(states=>({blockId:b.id,states})))
  .filter(u=>includeTerminal||
  (compatibility(u.blockId,u.states,{...profile,educationVersion:version})!=='verified'&&compatibility(u.blockId,u.states,{...profile,educationVersion:version})!=='unsupported'))
  .sort((a,b)=>{const x=semanticMetadata(lookupBlock(a.blockId)),y=semanticMetadata(lookupBlock(b.blockId));return formOrder.indexOf(x.form)-formOrder.indexOf(y.form)||familyOrder.indexOf(x.family)-familyOrder.indexOf(y.family)||a.blockId.localeCompare(b.blockId)||JSON.stringify(a.states).localeCompare(JSON.stringify(b.states));});
}
export function detailedMaterialCoverage(profile=educationProfile, version=profile.educationVersion) {
 const all=blockCatalog.filter(b=>testTier({...b,...semanticMetadata(b)})==='A');
 const unitRows=all.flatMap(b=>{const m=semanticMetadata(b);let ss=b.form==='stairs'?['south','west','north','east'].map((_,i)=>({weirdo_direction:i,upside_down_bit:false})):b.form==='slab'?[{'minecraft:vertical_half':'bottom'}]:b.form==='pillar/log'&&b.states.pillar_axis?.values?.length?['x','y','z'].map(pillar_axis=>({pillar_axis})):b.form==='trapdoor'?['south','west','north','east'].flatMap((_,i)=>[false,true].map(upside_down_bit=>({direction:i,open_bit:false,upside_down_bit}))):[{}];return ss.filter(s=>{try{validateBlockStates(b.id,s);return true}catch{return false}}).map(states=>({id:b.id,states,form:m.form,family:m.family,status:compatibility(b.id,states,{...profile,educationVersion:version})}));});
 const counts=(form,family)=>{const xs=unitRows.filter(u=>(!form||u.form===form)&&(!family||u.family===family));return {total:xs.length,verified:xs.filter(u=>u.status==='verified').length,unsupported:xs.filter(u=>u.status==='unsupported').length,unknown:xs.filter(u=>u.status==='unknown').length};};
 const candidates=tierAVerificationCandidates(profile,version);
 const catalogForms=[...new Set(blockCatalog.map(b=>semanticMetadata(b).form))];
 const formCoverage=Object.fromEntries(catalogForms.map(form=>{const ids=blockCatalog.filter(b=>semanticMetadata(b).form===form),tierIds=ids.filter(b=>testTier({...b,...semanticMetadata(b)})==='A'),deferredIds=ids.filter(b=>testTier({...b,...semanticMetadata(b)})!=='A'&&semanticMetadata(b).safetyClassification!=='excluded'),excludedIds=ids.filter(b=>semanticMetadata(b).safetyClassification==='excluded'),unitTotal=xs=>xs.reduce((n,b)=>n+expandedStates(b).length,0);return [form,{tierAIds:tierIds.length,tierAUnits:unitTotal(tierIds),deferredIds:deferredIds.length,deferredUnits:unitTotal(deferredIds),excludedIds:excludedIds.length,excludedUnits:unitTotal(excludedIds),representativeId:tierIds[0]?.id??deferredIds[0]?.id??excludedIds[0]?.id??null,...counts(form,null)}];}));
 const deferred=blockCatalog.filter(b=>testTier({...b,...semanticMetadata(b)})!=='A'&&semanticMetadata(b).safetyClassification!=='excluded'),excluded=blockCatalog.filter(b=>semanticMetadata(b).safetyClassification==='excluded');
 return {...materialCoverage(profile),tierAIds:all.length,verificationUnits:unitRows.length,deferredIds:deferred.length,deferredUnits:deferred.reduce((n,b)=>n+expandedStates(b).length,0),excludedIds:excluded.length,excludedUnits:excluded.reduce((n,b)=>n+expandedStates(b).length,0),verifiedIds:new Set(unitRows.filter(u=>u.status==='verified').map(u=>u.id)).size,verifiedStates:unitRows.filter(u=>u.status==='verified').length,unsupported:unitRows.filter(u=>u.status==='unsupported').length,unknown:unitRows.filter(u=>u.status==='unknown').length,semanticAndVerified:unitRows.filter(u=>u.status==='verified'&&semanticMetadata(lookupBlock(u.id)).family!=='unknown').length,usableByPaletteComposer:unitRows.filter(u=>u.status==='verified').length,familyCoverage:Object.fromEntries([...new Set(unitRows.map(u=>u.family))].map(f=>[f,counts(null,f)])),formCoverage,unverifiedCandidates:candidates.length};
}

export function auditMaterialVerificationCandidates(profile=educationProfile,version=profile.educationVersion) {
 const candidates=tierAVerificationCandidates(profile,version,{includeTerminal:true});
 const rejected=candidates.map(unit=>({blockId:unit.blockId,states:unit.states,eligibility:getMaterialVerificationEligibility(unit.blockId,unit.states,{profile,version})})).filter(x=>!x.eligibility.eligible);
 return {totalIds:new Set(candidates.map(x=>x.blockId)).size,totalUnits:candidates.length,runtimeRejectedCandidates:rejected.length,rejected};
}
export const MATERIAL_VERIFICATION_POLICY_VERSION='canonical-command-placement-semantics-v3';
export const MATERIAL_VERIFICATION_PROTOCOL_VERSION='tier-a-setblock-exact-state-cleanup-v1';
export function assertMaterialVerificationStartMode(mode){if(mode!=='canary'&&mode!=='full')throw Error('Explicit mode="canary" or mode="full" is required');return mode;}
export function canonicalStateKey(states={}){return JSON.stringify(Object.fromEntries(Object.entries(states).sort(([a],[b])=>a.localeCompare(b))));}
export const MATERIAL_VERIFICATION_FIXTURE_ENVIRONMENT='minecraft-education:test-area-air';
export function compatibleVerifiedRecord(record,unit,version){const block=lookupBlock(unit.blockId);if(!block)return false;const fixture=semanticMetadata(block).verificationFixtureType;return record?.status==='verified'&&record.environment==='minecraft-education'&&record.educationVersion===version&&record.id===unit.blockId&&record.states&&canonicalStateKey(record.states)===canonicalStateKey(unit.states)&&typeof fixture==='string'&&record.fixtureType===fixture&&record.fixtureEnvironment===MATERIAL_VERIFICATION_FIXTURE_ENVIRONMENT&&record.protocolVersion===MATERIAL_VERIFICATION_PROTOCOL_VERSION;}
export function materialCandidateSetHash(candidates) { return createHash('sha256').update(JSON.stringify({eligibilityPolicy:MATERIAL_VERIFICATION_POLICY_VERSION,candidates})).digest('hex'); }

export function classifyMaterialVerificationCandidates(candidates,isVerified) {
 const perId=new Map();let verifiedUnits=0;
 for(const unit of candidates){const row=perId.get(unit.blockId)??{total:0,verified:0};row.total++;if(isVerified(unit)){row.verified++;verifiedUnits++;}perId.set(unit.blockId,row);}
 const fullyVerifiedIds=[],partiallyVerifiedIds=[],completelyPendingIds=[];
 for(const [id,row] of perId){if(row.verified===row.total)fullyVerifiedIds.push(id);else if(row.verified>0)partiallyVerifiedIds.push(id);else completelyPendingIds.push(id);}
 const totalUnits=candidates.length,pendingUnits=totalUnits-verifiedUnits;
 if(verifiedUnits+pendingUnits!==totalUnits)throw new Error('Material verification unit count conservation failed');
 return {totalIds:perId.size,totalUnits,verifiedUnits,pendingUnits,fullyVerifiedIds,partiallyVerifiedIds,completelyPendingIds};
}
export function buildFullMaterialVerificationSnapshot(profile=educationProfile,version=profile.educationVersion) {
 const candidates=tierAVerificationCandidates(profile,version,{includeTerminal:true});
 const eligibilityAudit={totalIds:new Set(candidates.map(x=>x.blockId)).size,totalUnits:candidates.length,rejected:candidates.map(unit=>({blockId:unit.blockId,states:unit.states,eligibility:getMaterialVerificationEligibility(unit.blockId,unit.states,{profile,version})})).filter(x=>!x.eligibility.eligible)};
 // Reuse and preview classification use precisely the same strict predicate as the job runtime.
 const isReusable=unit=>(profile.records??[]).some(record=>compatibleVerifiedRecord(record,unit,version));
 const summary=classifyMaterialVerificationCandidates(candidates,isReusable);
 const verified=candidates.filter(isReusable),pending=candidates.filter(unit=>!isReusable(unit));
 const formStats={};for(const unit of candidates){const form=semanticMetadata(lookupBlock(unit.blockId)).form;(formStats[form]??={total:0,verified:0,pending:0});formStats[form].total++;formStats[form][isReusable(unit)?'verified':'pending']++;}
 const candidateSetHash=materialCandidateSetHash(candidates);
 return {candidates,verifiedUnitsList:verified,pendingUnitsList:pending,preview:{candidateSetHash,policyVersion:MATERIAL_VERIFICATION_POLICY_VERSION,...summary,formStats,runtimeRejectedCandidates:eligibilityAudit.rejected.length,eligibilityAudit:{pass:eligibilityAudit.rejected.length===0,total:eligibilityAudit.totalUnits,rejected:eligibilityAudit.rejected},estimatedRuntimeMs:pending.length*806.93,estimatedRuntimeReferenceMsPerUnit:806.93}};
}
export function previewMaterialVerificationFull(profile=educationProfile,version=profile.educationVersion) { return buildFullMaterialVerificationSnapshot(profile,version).preview; }

const CANARY_FORM_COUNTS = Object.freeze({'full_block':4,slab:3,stairs:6,wall:2,fence:2,pane:2,'pillar/log':3,trapdoor:6,light:2});
export function selectMaterialCanary(candidates, profile=educationProfile, version=profile.educationVersion) {
 const all=tierAVerificationCandidates(profile,version,{includeTerminal:true});
 const pending=new Set(tierAVerificationCandidates(profile,version).map(u=>JSON.stringify([u.blockId,u.states])));
 const canonical=new Set(all.map(u=>JSON.stringify([u.blockId,u.states])));
 const allowedForms=new Set(Object.keys(CANARY_FORM_COUNTS));
 const eligible=candidates.filter(u=>canonical.has(JSON.stringify([u.blockId,u.states]))&&allowedForms.has(semanticMetadata(lookupBlock(u.blockId)).form));
 const chosen=[];
 const take=(form,n,predicate=()=>true,allowVerified=false)=>{for(const u of eligible){if(chosen.includes(u))continue;if(!allowVerified&&!pending.has(JSON.stringify([u.blockId,u.states])))continue;if(semanticMetadata(lookupBlock(u.blockId)).form!==form||!predicate(u))continue;if(chosen.filter(x=>semanticMetadata(lookupBlock(x.blockId)).form===form).length<n)chosen.push(u);}};
 // Deterministic, catalog-order selection with the requested state coverage.
 take('full_block',4);
 take('slab',3);
 take('stairs',6,u=>u.states.weirdo_direction!==undefined);
 take('wall',2);take('fence',2);take('pane',2);
 take('pillar/log',3,u=>['x','y','z'].includes(u.states.pillar_axis));
 take('trapdoor',6,u=>u.states.direction!==undefined&&u.states.upside_down_bit!==undefined);
 take('light',2,()=>true,true);
 const byForm=Object.fromEntries(Object.keys(CANARY_FORM_COUNTS).map(form=>[form,chosen.filter(u=>semanticMetadata(lookupBlock(u.blockId)).form===form).length]));
 return {candidates:chosen,expectedCounts:CANARY_FORM_COUNTS,selectedCounts:byForm,complete:chosen.length===30&&Object.entries(CANARY_FORM_COUNTS).every(([f,n])=>byForm[f]===n)};
}

export function evaluateMaterialVerificationCompletion(job) {
 const reasons = [];
 const results = job?.results ?? {};
 const values = Object.values(results);
 const reused = values.filter(value => value === 'reused_verified').length;
 const executionPendingUnits = job?.executionPendingUnitsAtStart ?? Math.max(0, (job?.totalCandidates ?? 0) - (job?.reusedVerifiedUnits ?? reused));
 const executionTerminalUnits = values.filter(value => ['verified','unsupported','unknown','failed'].includes(value)).length;
 const cleanupFinalAirEvidenceCount = (job?.cleanupFinalAirChecksPassed ?? 0) + (job?.cleanupFinalAirChecksFailed ?? 0);
 const countersConsistent = (job?.processed ?? 0) === values.length &&
  (job?.verified ?? 0) + (job?.unsupported ?? 0) + (job?.unknown ?? 0) + (job?.failed ?? 0) === (job?.processed ?? 0) &&
  reused === (job?.reusedVerifiedUnits ?? reused);
 const checkpointConsistency = job?.checkpointConsistency?.consistent ?? countersConsistent;
 if (executionTerminalUnits !== executionPendingUnits || (job?.remaining ?? executionPendingUnits) !== 0) reasons.push('pending_units_remaining');
 if (cleanupFinalAirEvidenceCount !== executionPendingUnits) reasons.push('cleanup_final_air_evidence_incomplete');
 if ((job?.failedUnits ?? job?.failed ?? 0) > 0 || (job?.failed ?? 0) > 0) reasons.push('failed_units_present');
 if ((job?.unknownUnits ?? job?.unknown ?? 0) > 0 || (job?.unknown ?? 0) > 0) reasons.push('unknown_units_present');
 if ((job?.cleanupFinalAirChecksFailed ?? 0) > 0) reasons.push('cleanup_final_air_failure');
 if (job?.currentCleanupFault === true) reasons.push('current_cleanup_fault');
 if (job?.testAreaDirty === true) reasons.push('test_area_dirty');
 if (checkpointConsistency !== true) reasons.push('checkpoint_inconsistent');
 return {eligible: reasons.length === 0, reasons, executionPendingUnits, executionTerminalUnits, cleanupFinalAirEvidenceCount, checkpointConsistency};
}

const MATERIAL_FULL_CHECKPOINT_SCHEMA = 'phase6b3_full_v1';
// Persisted result keys already use this exact representation; fixture type is
// catalog-derived from blockId, while fixture environment/protocol are job-global.
const materialUnitIdentity = unit => JSON.stringify([unit.blockId, unit.states ?? {}]);
function readFullCleanupEvidence(record) {
 const sources=[record,record?.cleanupResult&&typeof record.cleanupResult==='object'?record.cleanupResult:null].filter(Boolean);
 const booleans=[],statuses=[];let malformed=false,hasEvidence=false,cleanupAckFailed=false;
 for(const source of sources){
  if(Object.hasOwn(source,'cleanupAirVerified')){hasEvidence=true;if(typeof source.cleanupAirVerified==='boolean')booleans.push(source.cleanupAirVerified);else malformed=true;}
  if(Object.hasOwn(source,'cleanupAirStatus')){hasEvidence=true;if(['air','non_air','unknown'].includes(source.cleanupAirStatus))statuses.push(source.cleanupAirStatus);else malformed=true;}
  cleanupAckFailed ||= source.cleanupAckFailed===true||source.ackFailed===true;
 }
 const conflict=booleans.some(value=>value!==booleans[0])||statuses.some(value=>value!==statuses[0])||
  (booleans.includes(true)&&statuses.some(value=>value!=='air'))||
  (statuses.includes('air')&&booleans.includes(false));
 const finalAir=hasEvidence&&!malformed&&!conflict&&booleans.every(Boolean)&&statuses.every(value=>value==='air');
 return {hasEvidence,finalAir,cleanupAckFailed};
}
function fullCheckpointFor(job, timestamp) {
 if(job.mode!=='full'||job.completionPolicy!==MATERIAL_FULL_CHECKPOINT_SCHEMA)return null;
 const originalPendingUnits=job.originalPendingUnits;
 const reusedUnits=job.reusedUnits;
 const buckets={newlyVerifiedUnits:[],unsupportedUnits:[],unknownUnits:[],failedUnits:[]};
 for(const [identity,result] of Object.entries(job.results??{})) {
  if(result==='reused_verified')continue;
  const bucket={verified:'newlyVerifiedUnits',unsupported:'unsupportedUnits',unknown:'unknownUnits',failed:'failedUnits'}[result];
  if(bucket)buckets[bucket].push(identity);
 }
 const all=[...Object.values(buckets).flat(),...reusedUnits.map(materialUnitIdentity)];
 if(new Set(all).size!==all.length)throw Error('Full checkpoint unit identity appears in multiple result buckets');
 if(new Set(originalPendingUnits.map(materialUnitIdentity)).size!==originalPendingUnits.length)throw Error('Full checkpoint original pending set contains duplicate unit identities');
 if(originalPendingUnits.some(u=>reusedUnits.some(r=>materialUnitIdentity(r)===materialUnitIdentity(u))))throw Error('Full checkpoint reused unit is also pending');
 const processedUnits=Object.values(buckets).flat();
 if(processedUnits.some(id=>!originalPendingUnits.some(u=>materialUnitIdentity(u)===id)))throw Error('Full checkpoint result is outside original pending set');
 const expectedProcessed=processedUnits.length+reusedUnits.length;
 if(job.processed!==expectedProcessed||job.newlyVerifiedUnits!==buckets.newlyVerifiedUnits.length||job.unsupportedUnits!==buckets.unsupportedUnits.length||job.unknownUnits!==buckets.unknownUnits.length||job.failedUnits!==buckets.failedUnits.length)throw Error('Full checkpoint counters do not match canonical unit results');
 return {schemaVersion:MATERIAL_FULL_CHECKPOINT_SCHEMA,jobId:job.jobId,mode:job.mode,runtimePolicyVersion:job.completionPolicy,completionPolicy:job.completionPolicy,verificationPolicyVersion:MATERIAL_VERIFICATION_POLICY_VERSION,verificationProtocolVersion:MATERIAL_VERIFICATION_PROTOCOL_VERSION,candidateSetHash:job.candidateSetHash,originalPendingUnits,reusedUnits,processedUnits,...buckets,cleanupFinalAirChecksPassed:job.cleanupFinalAirChecksPassed??0,cleanupFinalAirChecksFailed:job.cleanupFinalAirChecksFailed??0,cleanupAckFailureCount:job.cleanupAckFailureCount??0,currentCleanupFault:Boolean(job.currentCleanupFault),currentCleanupFaultPositions:job.currentCleanupFaultPositions??[],testAreaDirty:Boolean(job.testAreaDirty),lastCompletedIndex:job.lastCompletedIndex??-1,lastCompletedUnitIdentity:job.lastCompletedUnitIdentity??null,lastCheckpointAt:timestamp};
}

export class MaterialVerificationJobRuntime {
 constructor({file,executeBatch,areaIsDirty=()=>false,saveRecord=async()=>{},now=()=>new Date().toISOString(),clock=()=>Date.now(),enqueue=fn=>setImmediate(fn)}) {Object.assign(this,{file,executeBatch,areaIsDirty,saveRecord,now,clock,enqueue});this.jobs=new Map();this.keys=new Map();this.ready=this.restore();}
 key(x){return JSON.stringify([x.educationVersion,x.testAreaId,x.mode??'full',x.candidateSetHash]);}
 completionPredicate(j){return j.completionPolicy==='phase6b3_full_v1'?evaluateMaterialVerificationCompletion(j).eligible:j.state==='completed';}
 activeFullJob(){return [...this.jobs.values()].find(j=>j.mode==='full'&&j.completionPolicy===MATERIAL_FULL_CHECKPOINT_SCHEMA&&['queued','running','paused'].includes(j.state))??null;}
 fullStartRejection(){const existing=this.activeFullJob();return existing?{ok:false,reason:'active_full_job_exists',existingActiveJobId:existing.jobId,existingState:existing.state,jobId:existing.jobId,state:existing.state}:null;}
 async persist(j,{preserveCheckpointTimestamp=false}={}){const timestamp=this.now();const checkpoint=fullCheckpointFor(j,preserveCheckpointTimestamp?(j.checkpoint?.lastCheckpointAt??timestamp):timestamp);if(checkpoint)j.checkpoint=checkpoint;await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.appendFile(this.file,JSON.stringify(j)+'\n','utf8');}
 async restore(){try{const text=await fs.readFile(this.file,'utf8');let rows;try{const parsed=JSON.parse(text);rows=Array.isArray(parsed)?parsed:[parsed];}catch{rows=text.split(/\r?\n/).filter(Boolean).map(line=>{try{return JSON.parse(line)}catch{return null}}).filter(Boolean);}for(const j of new Map(rows.filter(x=>x?.jobId).map(x=>[x.jobId,x])).values()){if(j.state==='running'||j.state==='queued'){const isPhase6B3Full=j.mode==='full'&&j.checkpoint?.schemaVersion===MATERIAL_FULL_CHECKPOINT_SCHEMA&&j.checkpoint?.completionPolicy===MATERIAL_FULL_CHECKPOINT_SCHEMA;if(j.state==='running'&&isPhase6B3Full){j.state='paused';j.pauseReason='restart_recovery_requires_explicit_resume';j.recoveryReason='restart_recovery_requires_explicit_resume';j.pausedAt=this.now();j.error=null;await this.persist(j,{preserveCheckpointTimestamp:true});}else{j.state='paused';j.error='Bridge restarted; resume after checking the dedicated test area';j.currentBlockId=null;j.currentState=null;}}j.startedAtMs=this.clock()-(j.elapsedMs??0);this.jobs.set(j.jobId,j);this.keys.set(this.key(j),j.jobId);}}catch(e){if(e.code!=='ENOENT')console.error('[MATERIAL JOB RESTORE]',e);}}
 snapshot(j){const elapsedMs=j.completedAt?j.elapsedMs:Math.max(0,this.clock()-j.startedAtMs),totalIds=new Set((j.candidates??[]).map(x=>x.blockId)).size,processedIds=new Set(Object.entries(j.results??{}).filter(([,s])=>['verified','unsupported','unknown'].includes(s)).map(([k])=>JSON.parse(k)[0])).size;return {...j,mode:j.mode??'full',selectedUnits:j.mode==='canary'?j.candidates:undefined,selectedCounts:j.selectedCounts??undefined,parentCandidateSetHash:j.parentCandidateSetHash??undefined,canarySetHash:j.mode==='canary'?j.candidateSetHash:undefined,testAreaDirty:Boolean(this.areaIsDirty()),dirtyPositions:j.dirtyPositions??[],cleanupAckFailed:Boolean(j.cleanupAckFailed),cleanupAirVerified:Boolean(j.cleanupAirVerified),cleanupFinalAirChecksPassed:j.cleanupFinalAirChecksPassed??0,cleanupFinalAirChecksFailed:j.cleanupFinalAirChecksFailed??0,cleanupAckFailureCount:j.cleanupAckFailureCount??0,currentCleanupFault:Boolean(j.currentCleanupFault??j.testAreaDirty),currentCleanupFaultPositions:j.currentCleanupFaultPositions??j.dirtyPositions??[],totalIds,totalUnits:j.totalCandidates,processedIds,processedUnits:j.processed,remainingIds:Math.max(0,totalIds-processedIds),remainingUnits:j.remaining,progressRatio:j.totalCandidates?j.processed/j.totalCandidates:1,elapsedMs,averageMsPerUnit:j.processed?elapsedMs/j.processed:null,estimatedRemainingMs:j.processed&&j.remaining?elapsedMs/j.processed*j.remaining:null};}
 async start(options={},resumeId,retryUnknown=false){const modeExplicit=Object.hasOwn(options,'mode');const {educationVersion,testAreaId,bounds,candidates,candidateSetHash,mode:requestedMode,parentCandidateSetHash=null,selectedCounts=null,reuseRecords=[]}=options;const mode=requestedMode??'canary';await this.ready;if(!resumeId&&!['canary','full'].includes(mode))throw Error('Explicit mode is required');if(!resumeId&&mode==='full'){const rejection=this.fullStartRejection();if(rejection)throw Object.assign(new Error('Active full verification job already exists'),{details:rejection});}if(resumeId){const old=this.jobs.get(resumeId);if(!old)throw Error('Unknown verification jobId');if(this.areaIsDirty())throw Error('Test area is dirty; resume is blocked');if(old.state==='completed'&&retryUnknown&&old.unknown>0){old.state='paused';old.completedAt=null;}if(old.state!=='paused')return this.snapshot(old);old.state='queued';old.error=null;old.startedAtMs=this.clock()-old.elapsedMs;old.lastUpdatedAt=this.now();await this.persist(old);this.enqueue(()=>this.run(old));return this.snapshot(old);}
 const identity={educationVersion,testAreaId,bounds,candidateSetHash,mode,parentCandidateSetHash,selectedCounts},prior=this.jobs.get(this.keys.get(this.key(identity)));if(prior&&['queued','running','completed'].includes(prior.state))return {...this.snapshot(prior),reused:true};
 const invalid=(candidates??[]).map(u=>({unit:u,eligibility:getMaterialVerificationEligibility(u.blockId,u.states)})).filter(x=>!x.eligibility.eligible);if(invalid.length)throw Object.assign(new Error('Material verification candidate eligibility preflight failed'),{details:{invalidCandidateCount:invalid.length,invalidCandidates:invalid.map(x=>({blockId:x.unit.blockId,states:x.unit.states,reason:x.eligibility.reason}))}});const startedAt=this.now(),job={jobId:randomUUID(),...identity,candidates,completionPolicy:modeExplicit&&mode==='full'?'phase6b3_full_v1':null,exactPendingUnitSet:candidates.map(u=>({blockId:u.blockId,states:u.states})),originalPendingUnits:null,reusedUnits:[],state:'queued',totalCandidates:candidates.length,processed:0,verified:0,newlyVerifiedUnits:0,reusedVerifiedUnits:0,unsupported:0,unsupportedUnits:0,unknown:0,unknownUnits:0,failed:0,failedUnits:0,remaining:candidates.length,executionPendingUnitsAtStart:candidates.length,currentBlockId:null,currentState:null,startedAt,lastUpdatedAt:startedAt,completedAt:null,error:null,results:{},testAreaDirty:false,dirtyPositions:[],cleanupAckFailed:false,cleanupAirVerified:false,cleanupFinalAirChecksPassed:0,cleanupFinalAirChecksFailed:0,cleanupAckFailureCount:0,currentCleanupFault:false,currentCleanupFaultPositions:[],lastCompletedIndex:-1,lastCheckpointAt:startedAt,elapsedMs:0,startedAtMs:this.clock()};for(const u of candidates){const rec=reuseRecords.find(r=>compatibleVerifiedRecord(r,u,educationVersion));if(!rec)continue;const k=materialUnitIdentity(u);job.results[k]='reused_verified';job.processed++;job.remaining--;job.verified++;job.reusedVerifiedUnits++;job.reusedUnits.push({blockId:u.blockId,states:u.states??{}});}job.executionPendingUnitsAtStart=candidates.length-job.reusedVerifiedUnits;job.originalPendingUnits=candidates.filter(u=>!job.reusedUnits.some(r=>materialUnitIdentity(r)===materialUnitIdentity(u))).map(u=>({blockId:u.blockId,states:u.states??{}}));this.jobs.set(job.jobId,job);this.keys.set(this.key(job),job.jobId);await this.persist(job);this.enqueue(()=>this.run(job));return this.snapshot(job);}
 recordCleanupTelemetry(j, record, unit = null, normalizedEvidence = null) {
  const hasFinalAir = normalizedEvidence?.hasEvidence ?? (typeof record.cleanupAirVerified === 'boolean' || ['air','non_air','unknown'].includes(record.cleanupAirStatus));
  if (!hasFinalAir) return; // Legacy records without cleanup evidence remain compatible.
  const unitKey = JSON.stringify([unit?.blockId ?? record.blockId, unit?.states ?? record.states ?? {}, record.position ?? null]);
  j.cleanupTelemetryUnits ??= [];
  if (j.cleanupTelemetryUnits.includes(unitKey)) return;
  j.cleanupTelemetryUnits.push(unitKey);
  const air = normalizedEvidence ? normalizedEvidence.finalAir : (typeof record.cleanupAirVerified === 'boolean' ? record.cleanupAirVerified : record.cleanupAirStatus === 'air');
  if (normalizedEvidence ? normalizedEvidence.cleanupAckFailed : record.cleanupAckFailed === true) {
   j.cleanupAckFailed = true;
   j.cleanupAckFailureCount = (j.cleanupAckFailureCount ?? 0) + 1;
  }
  j.cleanupAirVerified ||= air;
  if (air) j.cleanupFinalAirChecksPassed = (j.cleanupFinalAirChecksPassed ?? 0) + 1;
  else j.cleanupFinalAirChecksFailed = (j.cleanupFinalAirChecksFailed ?? 0) + 1;
  const pos = record.position;
  const keyOfPosition = p => `${p.x},${p.y},${p.z}`;
  const positions = new Map((j.currentCleanupFaultPositions ?? []).filter(p => p && [p.x,p.y,p.z].every(Number.isInteger)).map(p => [keyOfPosition(p),p]));
  if (!air && pos && [pos.x,pos.y,pos.z].every(Number.isInteger)) positions.set(keyOfPosition(pos), {x:pos.x,y:pos.y,z:pos.z});
  if (air && pos && [pos.x,pos.y,pos.z].every(Number.isInteger)) positions.delete(keyOfPosition(pos));
  j.currentCleanupFaultPositions = [...positions.values()];
  if (!air && !pos) j.cleanupFaultWithoutPosition = true;
  if (air && !pos) j.cleanupFaultWithoutPosition = false;
  j.currentCleanupFault = j.cleanupFaultWithoutPosition === true || j.currentCleanupFaultPositions.length > 0;
  // The shared dirty-state callback is canonical; historical incidents do not set this flag.
  j.testAreaDirty = Boolean(this.areaIsDirty());
 }
 async run(j,fullResumeUnits=null,alreadyRunning=false){
  if(!alreadyRunning)j.state='running';j.lastUpdatedAt=this.now();await this.persist(j);
  try {
   if(this.areaIsDirty())throw Error('Test area is dirty; job stopped');
   const areaVolume=(j.bounds.max.x-j.bounds.min.x+1)*(j.bounds.max.y-j.bounds.min.y+1)*(j.bounds.max.z-j.bounds.min.z+1);
   if(areaVolume<1)throw Error('Invalid test area bounds');
   const fullResumeIdentities=fullResumeUnits?new Set(fullResumeUnits.map(materialUnitIdentity)):null;
   const pending=fullResumeUnits?fullResumeUnits.map((u,index)=>({u,index})):j.candidates.map((u,index)=>({u,index})).filter(({u})=>!['verified','unsupported','reused_verified'].includes(j.results[JSON.stringify([u.blockId,u.states])]));
   for(let n=0;n<pending.length;n+=16){
    if(this.areaIsDirty())throw Error('Test area is dirty; job stopped');
    const group=pending.slice(n,n+16),batch=group.map(x=>x.u),recorded=new Set();
    j.currentBlockId=batch[0]?.blockId??null;j.currentState=batch[0]?.states??null;j.lastUpdatedAt=this.now();await this.persist(j);
    const onUnit=async({unit,record})=>{
     const key=JSON.stringify([unit.blockId,unit.states]);
     if(fullResumeIdentities&&!fullResumeIdentities.has(key))return;
     if(!record){j.currentBlockId=unit.blockId;j.currentState=unit.states;j.lastUpdatedAt=this.now();await this.persist(j);return;}
     const prior=j.results[key];
     if(fullResumeIdentities&&['verified','unsupported','unknown','failed','reused_verified'].includes(prior))return;
     if(prior==='verified'||prior==='unsupported'||prior==='reused_verified')return;
     const isPhase6B3Full=j.completionPolicy===MATERIAL_FULL_CHECKPOINT_SCHEMA;
     const cleanupEvidence=isPhase6B3Full?readFullCleanupEvidence(record):null;
     this.recordCleanupTelemetry(j,record,unit,cleanupEvidence);
     if(!['verified','unsupported','unknown','failed'].includes(record.status))throw Error(`Invalid verification status: ${record.status}`);
     const hasCleanupEvidence=cleanupEvidence?.hasEvidence??(typeof record.cleanupAirVerified==='boolean'||['air','non_air','unknown'].includes(record.cleanupAirStatus));
     const finalAirVerified=cleanupEvidence?.finalAir??(record.cleanupAirVerified===true||record.cleanupAirStatus==='air');
     if(isPhase6B3Full&&(!hasCleanupEvidence||!finalAirVerified))return;
     if(prior)j[prior]=Math.max(0,j[prior]-1);else{j.processed++;j.remaining--;}
     j.results[key]=record.status;j[record.status]++;
     if(record.status==='verified')j.newlyVerifiedUnits++;
     if(record.status==='unsupported')j.unsupportedUnits++;
     if(record.status==='unknown')j.unknownUnits++;
     if(record.status==='failed')j.failedUnits++;
     // Cleanup telemetry is canonical only when the executor supplied final-air evidence.
     if(typeof record.cleanupAirVerified==='boolean'||['air','non_air','unknown'].includes(record.cleanupAirStatus))if(record.cleanupAirVerified!==true&&record.cleanupAirStatus!=='air')j.failedUnits++;
     j.lastCompletedIndex=Math.max(j.lastCompletedIndex,j.candidates.findIndex(v=>materialUnitIdentity(v)===key));j.lastCompletedUnitIdentity=key;j.lastCheckpointAt=this.now();
     if(j.mode==='canary'&&(record.status==='unknown'||j.testAreaDirty||record.cleanupAirVerified===false||record.cleanupAirStatus==='unknown'))throw new Error(record.status==='unknown'?'Unknown verification result; canary stopped':j.testAreaDirty?'Test area dirty; canary stopped':'Cleanup air not verified; canary stopped');
     recorded.add(key);await this.saveRecord(unit,record,j);j.lastUpdatedAt=this.now();await this.persist(j);
    };
    let records;
    try { records=await this.executeBatch(j,batch,group[0]?.index??0,onUnit); }
    catch(error){
     if(error.cleanupRecord){const failed=error.cleanupRecord;this.recordCleanupTelemetry(j,failed,{blockId:j.currentBlockId,states:j.currentState});j.testAreaDirty=Boolean(this.areaIsDirty());}
     throw error;
    }
    for(let k=0;k<batch.length;k++){const u=batch[k],r=records[k];if(recorded.has(JSON.stringify([u.blockId,u.states])))continue;await onUnit({unit:u,record:r});}
   }
   if(j.completionPolicy==='phase6b3_full_v1'){
    j.testAreaDirty=Boolean(this.areaIsDirty());
    this.applyFullCompletion(j);
   }else{j.state='completed';j.completedAt=this.now();j.error=null;}
  }catch(e){j.error=e.message;j.state=this.areaIsDirty()?'failed':/disconnect|session|bound|unknown at|precondition|occupied|timeout|timed out|connection|closed/i.test(e.message)?'paused':'failed';}
  j.currentBlockId=null;j.currentState=null;j.elapsedMs=Math.max(0,this.clock()-j.startedAtMs);j.lastUpdatedAt=this.now();await this.persist(j);
 }
 status(id){const j=this.jobs.get(id);return j?this.snapshot(j):null;}
 async validateExplicitResume(jobId,{educationVersion,testAreaId,preflight,currentDirty,currentCleanupFault,verificationReady,candidateSetHash}={}){
  await this.ready;
  const j=this.jobs.get(jobId),reasons=[];
  if(!j)return {eligible:false,reasons:[{code:'unknown_job',message:'Unknown material verification jobId'}],job:null};
  if(j.mode!=='full'||j.completionPolicy!==MATERIAL_FULL_CHECKPOINT_SCHEMA||j.checkpoint?.schemaVersion!==MATERIAL_FULL_CHECKPOINT_SCHEMA)reasons.push({code:'not_phase6b3_full',message:'Only phase6b3_full_v1 full jobs can be explicitly resumed'});
  if(j.state!=='paused')reasons.push({code:'job_not_paused',message:`Job state ${j.state} is not paused`});
  if(educationVersion!=='v26.3'||j.educationVersion!==educationVersion)reasons.push({code:'education_version_mismatch',message:'Education version must match v26.3 and the saved job'});
  if(j.testAreaId!==testAreaId)reasons.push({code:'test_area_mismatch',message:'Dedicated test area changed'});
  if(preflight?.totalPositions!==32||preflight?.airCount!==32||preflight?.nonAirCount!==0)reasons.push({code:'test_area_not_32_air',message:'Test area must contain exactly 32 air cells'});
  if(preflight?.unknownCount!==0)reasons.push({code:'test_area_unknown',message:'Test area contains unknown cells'});
  if(currentDirty!==false)reasons.push({code:'current_dirty',message:'Current dirty flag must be false'});
  if(currentCleanupFault!==false)reasons.push({code:'current_cleanup_fault',message:'Current cleanup fault must be false'});
  if(verificationReady!==true)reasons.push({code:'verification_not_ready',message:'Material verification is not ready'});
  if(!candidateSetHash||candidateSetHash!==j.candidateSetHash||candidateSetHash!==j.checkpoint?.candidateSetHash)reasons.push({code:'candidate_set_hash_mismatch',message:'Current canonical candidateSetHash does not match the saved job and checkpoint'});
  const validatedAt=this.now();
  const resumeValidation={eligible:reasons.length===0,jobId:j.jobId,candidateSetHash:j.candidateSetHash,validatedCandidateSetHash:candidateSetHash??null,educationVersion:educationVersion??null,testAreaId:testAreaId??null,safetyState:{preflight:preflight?{totalPositions:preflight.totalPositions,airCount:preflight.airCount,nonAirCount:preflight.nonAirCount,unknownCount:preflight.unknownCount}:null,currentDirty:currentDirty??null,currentCleanupFault:currentCleanupFault??null,verificationReady:verificationReady??null},validatedAt,reasons};
  if(resumeValidation.eligible){resumeValidation.validationId=randomUUID();j.resumeValidation=resumeValidation;await this.persist(j,{preserveCheckpointTimestamp:true});}
  return {...this.snapshot(j),eligible:resumeValidation.eligible,resumeValidation};
 }
 async resumeExplicitFull(jobId,{candidateSetHash,validationId}={}){
  await this.ready;
  const j=this.jobs.get(jobId),reasons=[];
  if(!j)return {eligible:false,reasons:[{code:'unknown_job',message:'Unknown material verification jobId'}],job:null};
  const validation=j.resumeValidation;
  if(j.mode!=='full'||j.completionPolicy!==MATERIAL_FULL_CHECKPOINT_SCHEMA||j.checkpoint?.schemaVersion!==MATERIAL_FULL_CHECKPOINT_SCHEMA||j.checkpoint?.completionPolicy!==MATERIAL_FULL_CHECKPOINT_SCHEMA)reasons.push({code:'not_phase6b3_full',message:'Only phase6b3_full_v1 full jobs can resume'});
  if(j.state!=='paused')reasons.push({code:'job_not_paused',message:'Job must still be paused'});
  if(!validation?.eligible)reasons.push({code:'resume_validation_missing',message:'A successful explicit resume validation is required'});
  if(validation?.consumedAt)reasons.push({code:'resume_validation_expired',message:'Resume validation was already consumed; validate the paused job again before resuming'});
  if(validation?.jobId!==j.jobId||validation?.validationId!==validationId)reasons.push({code:'resume_validation_identity_mismatch',message:'Resume validation identity does not match this operation and job'});
  if(validation?.candidateSetHash!==j.candidateSetHash||validation?.validatedCandidateSetHash!==j.candidateSetHash||candidateSetHash!==j.candidateSetHash||j.checkpoint?.candidateSetHash!==j.candidateSetHash)reasons.push({code:'candidate_set_hash_mismatch',message:'Resume validation and current candidateSetHash must match the saved checkpoint'});
  if(reasons.length){j.resumeExecutionRejection={at:this.now(),reasons};await this.persist(j,{preserveCheckpointTimestamp:true});return {...this.snapshot(j),eligible:false,reasons};}
  try{
   const checkpoint=j.checkpoint,original=checkpoint.originalPendingUnits??[],processed=checkpoint.processedUnits??[],processedSet=new Set(processed);
   if(processedSet.size!==processed.length)throw Error('Checkpoint contains duplicate processed unit identities');
   const buckets=[['newlyVerifiedUnits','verified'],['unsupportedUnits','unsupported'],['unknownUnits','unknown'],['failedUnits','failed']],bucketResults=new Map();
   for(const [field,status] of buckets)for(const identity of checkpoint[field]??[]){if(bucketResults.has(identity))throw Error('Checkpoint terminal unit appears in duplicate result buckets');bucketResults.set(identity,status);}
   if(bucketResults.size!==processedSet.size||[...processedSet].some(identity=>!bucketResults.has(identity)))throw Error('Checkpoint processed units do not match terminal result buckets');
   const pending=[];for(const unit of original){const identity=materialUnitIdentity(unit);if(!processedSet.has(identity))pending.push(unit);}
   if(pending.length!==original.length-processedSet.size)throw Error('Checkpoint remaining unit set is inconsistent');
   const originalSet=new Set(original.map(materialUnitIdentity));
   if(originalSet.size!==original.length||[...processedSet].some(identity=>!originalSet.has(identity)))throw Error('Checkpoint processed unit is outside the original pending set');
   const reused=checkpoint.reusedUnits??[];
   if(reused.some(unit=>originalSet.has(materialUnitIdentity(unit))))throw Error('Checkpoint reused unit overlaps original pending units');
   const results={};for(const unit of reused)results[materialUnitIdentity(unit)]='reused_verified';for(const [identity,status] of bucketResults)results[identity]=status;
   j.results=results;j.reusedUnits=reused.map(unit=>({blockId:unit.blockId,states:unit.states??{}}));j.processed=Object.keys(results).length;j.remaining=pending.length;j.reusedVerifiedUnits=reused.length;j.executionPendingUnitsAtStart=original.length;
   j.newlyVerifiedUnits=(checkpoint.newlyVerifiedUnits??[]).length;j.unsupportedUnits=(checkpoint.unsupportedUnits??[]).length;j.unknownUnits=(checkpoint.unknownUnits??[]).length;j.failedUnits=(checkpoint.failedUnits??[]).length;
   j.verified=j.reusedVerifiedUnits+j.newlyVerifiedUnits;j.unsupported=j.unsupportedUnits;j.unknown=j.unknownUnits;j.failed=j.failedUnits;
   j.cleanupFinalAirChecksPassed=checkpoint.cleanupFinalAirChecksPassed??0;j.cleanupFinalAirChecksFailed=checkpoint.cleanupFinalAirChecksFailed??0;j.cleanupAckFailureCount=checkpoint.cleanupAckFailureCount??0;j.currentCleanupFault=Boolean(checkpoint.currentCleanupFault);j.currentCleanupFaultPositions=checkpoint.currentCleanupFaultPositions??[];j.testAreaDirty=Boolean(checkpoint.testAreaDirty);
   j.lastCompletedIndex=checkpoint.lastCompletedIndex??j.lastCompletedIndex;j.lastCompletedUnitIdentity=checkpoint.lastCompletedUnitIdentity??j.lastCompletedUnitIdentity;j.lastCheckpointAt=checkpoint.lastCheckpointAt??j.lastCheckpointAt;
   j.resumeValidation.consumedAt=this.now();j.resumeValidation.consumedBy=validationId;j.resumeExecutionRejection=null;j.elapsedMs??=0;j.startedAtMs=this.clock()-j.elapsedMs;j.error=null;j.lastUpdatedAt=this.now();
   if(pending.length===0){j.testAreaDirty=Boolean(this.areaIsDirty());this.applyFullCompletion(j);j.elapsedMs=Math.max(0,this.clock()-j.startedAtMs);j.lastUpdatedAt=this.now();await this.persist(j);return {...this.snapshot(j),eligible:true,executorStarted:false,resumeValidation:j.resumeValidation};}
   j.state='running';await this.persist(j);this.enqueue(()=>this.run(j,pending,true));
   return {...this.snapshot(j),eligible:true,executorStarted:true,remainingExecutionUnits:pending.length,resumeValidation:j.resumeValidation};
  }catch(error){j.state='paused';j.resumeExecutionRejection={at:this.now(),reasons:[{code:'checkpoint_invalid',message:error.message}]};await this.persist(j,{preserveCheckpointTimestamp:true});return {...this.snapshot(j),eligible:false,reasons:j.resumeExecutionRejection.reasons};}
 }
 applyFullCompletion(j){
  const completion=evaluateMaterialVerificationCompletion(j);j.completionDiagnostics=completion;
  if(completion.eligible){j.state='completed';j.completedAt=this.now();j.error=null;}
  else if(completion.reasons.every(reason=>['pending_units_remaining','cleanup_final_air_evidence_incomplete'].includes(reason))){j.state='running';j.error=`Completion deferred: ${completion.reasons.join(', ')}`;}
  else{j.state='failed';j.error=`Completion invariant failed: ${completion.reasons.join(', ')}`;}
  return completion;
 }
 async findExisting(identity){await this.ready;const id=this.keys.get(this.key(identity)),job=id&&this.jobs.get(id);return job&&['queued','running','completed'].includes(job.state)?{...this.snapshot(job),reused:true}:null;}
 async reconcile(jobId,records=[]){await this.ready;const j=this.jobs.get(jobId);if(!j)return null;for(const u of j.candidates){const rec=records.find(r=>r.id===u.blockId&&r.educationVersion===j.educationVersion&&r.environment==='minecraft-education'&&['verified','unsupported'].includes(r.status)&&JSON.stringify(Object.entries(r.states??{}).sort())===JSON.stringify(Object.entries(u.states??{}).sort()));if(!rec)continue;const key=JSON.stringify([u.blockId,u.states]),prior=j.results[key];if(prior===rec.status)continue;if(prior)j[prior]=Math.max(0,j[prior]-1);else{j.processed++;j.remaining=Math.max(0,j.remaining-1);}j.results[key]=rec.status;j[rec.status]++;}await this.persist(j);return this.snapshot(j);}
}
export function previewMaterialPalette({color,materialFamilies=[],form='full_block',limit=20,program='office',style='modern',massing='slab',quality='standard',seed=0,materialRequirements}={},profile=educationProfile) {
 const matches=blockCatalog.filter(b=>{const s=semanticMetadata(b);return s.safetyClassification==='building'&&testTier({...b,...s})==='A'&&(!color||s.colorFamily===color||color==='warm'&&['brown','red','orange','yellow'].includes(s.colorFamily))&&(!materialFamilies.length||materialFamilies.includes(s.family))&&(!form||s.form===form);}).slice(0,limit);
 const palette=composePalette({program,style,massing,quality,seed,materialRequirements:materialRequirements??{color,materialFamilies}});
 const ids=[...new Set([...Object.values(palette.roles),...Object.values(palette.shapes)])];
 return {...palette,materials:ids.map(id=>({id,status:compatibility(id,{},profile),label:compatibility(id,{},profile)==='verified'?'verified':'未検証'})),candidates:matches.map(b=>({id:b.id,...semanticMetadata(b),status:compatibility(b.id,{},profile),label:compatibility(b.id,{},profile)==='verified'?'verified':'未検証'})),coverage:materialCoverage(profile)};
}
export async function verifyMaterialBatch({world,sessionGuard,items,testArea,educationVersion,dirty=false,markDirty=()=>{},log=async()=>{},profile=educationProfile,now=()=>new Date().toISOString(),onUnit=async()=>{}}) {
 if(!world?.runCommand)throw new Error('Minecraft is not bound');
 if(!educationVersion)throw new Error('Minecraft Education version must be configured before probing');
 if(dirty)throw new Error('Material test area is dirty; verification is blocked until manually inspected and cleared');
 if(!testArea||!Array.isArray(items)||!items.length||items.length>16)throw new Error('A configured dedicated test area and 1–16 material states are required');
 const pos=items.map(x=>x.position);
 const within=p=>p&&[p.x,p.y,p.z].every(Number.isInteger)&&p.x>=testArea.min.x&&p.x<=testArea.max.x&&p.y>=testArea.min.y&&p.y<=testArea.max.y&&p.z>=testArea.min.z&&p.z<=testArea.max.z;
 if(pos.some(p=>!within(p))||new Set(pos.map(p=>`${p.x},${p.y},${p.z}`)).size!==pos.length)throw new Error('Every probe coordinate must be unique and inside the configured compatibility test area');
 const normalized=items.map(x=>{const b=lookupBlock(x.blockId),eligibility=getMaterialVerificationEligibility(b,x.states??{});if(!eligibility.eligible)throw new Error(`Unsafe or non-Tier-A material: ${x.blockId} (${eligibility.reason})`);return {...x,blockId:b.id,states:x.states??{}};});
 const initial=[];
 for(const x of normalized){let r;try{r=await world.runCommand(`testforblock ${x.position.x} ${x.position.y} ${x.position.z} air`);sessionGuard?.();}catch(error){throw new Error(`Test area air status unknown at ${x.position.x},${x.position.y},${x.position.z}: ${error.message}`)}if(r?.matches!==true&&r?.success!==true&&r?.statusCode!==0)throw new Error(r?.matches===false||r?.statusCode===1?`Test area is occupied at ${x.position.x},${x.position.y},${x.position.z}`:`Test area air status unknown at ${x.position.x},${x.position.y},${x.position.z}`);initial.push(true);}
 const records=[];
 for(let i=0;i<normalized.length;i++){
  const x=normalized[i],p=x.position,cmd=`setblock ${p.x} ${p.y} ${p.z} ${x.blockId}${serializeStates(x.blockId,x.states)}`;
  await onUnit({unit:x,phase:'probing'});
  let immediate;try{immediate=await world.runCommand(`testforblock ${p.x} ${p.y} ${p.z} air`);sessionGuard?.();}catch(error){throw new Error(`Test area air status unknown immediately before placement at ${p.x},${p.y},${p.z}: ${error.message}`)}
  if(!(immediate?.matches===true||immediate?.success===true||immediate?.statusCode===0))throw new Error(immediate?.matches===false||immediate?.statusCode===1?`Test area is occupied immediately before placement at ${p.x},${p.y},${p.z}`:`Test area air status unknown immediately before placement at ${p.x},${p.y},${p.z}`);
  let placementResult=null,testforblockResult=null,cleanupResult=null,status='unknown';
  try {
   placementResult=await world.runCommand(cmd);sessionGuard?.();
   const hasPlacementResponse=placementResult&&typeof placementResult==='object'&&('success'in placementResult||'statusCode'in placementResult||'ok'in placementResult);
   const placed=placementResult?.success===true||placementResult?.statusCode===0||placementResult?.ok===true;
   if(placed){testforblockResult=await world.runCommand(`testforblock ${p.x} ${p.y} ${p.z} ${x.blockId}${serializeStates(x.blockId,x.states)}`);sessionGuard?.();if(testforblockResult?.matches===true||(testforblockResult?.matches===undefined&&(testforblockResult?.success===true||testforblockResult?.statusCode===0)))status='verified';else if(testforblockResult&&('matches'in testforblockResult||'success'in testforblockResult||'statusCode'in testforblockResult))status='unsupported';else status='unknown';} else if(hasPlacementResponse)status='unsupported';else status='unknown';
  } catch(error){placementResult??={error:error.message};status='unknown';}
  let cleanupAirVerified=false,cleanupAckFailed=false;
  try {let ackError=null;try{cleanupResult=await world.runCommand(`setblock ${p.x} ${p.y} ${p.z} air`);sessionGuard?.();if(!(cleanupResult?.success===true||cleanupResult?.statusCode===0||cleanupResult?.ok===true))ackError='air placement was not acknowledged';}catch(error){ackError=error.message;}
   cleanupAckFailed=Boolean(ackError);let check;try{check=await world.runCommand(`testforblock ${p.x} ${p.y} ${p.z} air`);sessionGuard?.();}catch(error){throw Object.assign(new Error(`cleanup air status unknown: ${error.message}`),{cleanupAckFailed,cleanupAirVerified:false});}
   cleanupAirVerified=check?.matches===true||(check?.matches===undefined&&(check?.success===true||check?.statusCode===0));
   const cleanupAirStatus=cleanupAirVerified?'air':check?.matches===false||check?.statusCode===1?'non_air':'unknown';
   cleanupResult={placement:cleanupResult,ackFailed:cleanupAckFailed,ackDiagnostic:ackError,confirmation:check,cleanupAirVerified,cleanupAirStatus};
   if(!cleanupAirVerified)throw Object.assign(new Error(cleanupAirStatus==='non_air'?'cleanup testforblock confirmed non-air':'cleanup air status unknown'),{cleanupAckFailed,cleanupAirVerified:false,cleanupAirStatus});
  } catch(error){const cleanupAirStatus=error.cleanupAirStatus??(cleanupAirVerified?'air':'unknown');const record={blockId:x.blockId,states:x.states,educationVersion,position:p,placementResult,testforblockResult,cleanupResult:{...(cleanupResult??{}),error:error.message,cleanupAckFailed:error.cleanupAckFailed??cleanupAckFailed,cleanupAirVerified:error.cleanupAirVerified??cleanupAirVerified,cleanupAirStatus},cleanupAckFailed:error.cleanupAckFailed??cleanupAckFailed,cleanupAirVerified:error.cleanupAirVerified??cleanupAirVerified,cleanupAirStatus,timestamp:now(),status:'unknown'};records.push(record);if(cleanupAirStatus==='non_air')await markDirty(record);await log(record);const thrown=new Error(`Cleanup failed at ${p.x},${p.y},${p.z} for ${x.blockId}${serializeStates(x.blockId,x.states)}; batch stopped: ${error.message}`);thrown.cleanupRecord=record;throw thrown;}
  const record={blockId:x.blockId,states:x.states,educationVersion,position:p,placementResult,identityStateVerificationResult:testforblockResult,cleanupResult,timestamp:now(),status};records.push(record);profile.records??=[];profile.records=profile.records.filter(r=>!(r.id===x.blockId&&r.educationVersion===educationVersion&&canonicalStateKey(r.states)===canonicalStateKey(x.states)));profile.records.push({id:x.blockId,states:x.states,status,environment:'minecraft-education',educationVersion,fixtureType:semanticMetadata(lookupBlock(x.blockId)).verificationFixtureType,fixtureEnvironment:MATERIAL_VERIFICATION_FIXTURE_ENVIRONMENT,protocolVersion:MATERIAL_VERIFICATION_PROTOCOL_VERSION,evidence:{...record}});await log(record);await onUnit({unit:x,record,phase:'complete'});
 }
 return {records,verified:records.filter(r=>r.status==='verified').length,testAreaOnly:true};
}

export function canonicalStatesForDirections(id) { const b=lookupBlock(id);if(!b||b.form!=='stairs')throw new Error('Representative orientation material must be stairs');return ['north','east','south','west'].map(direction=>{const rotate=p=>rotateLocal(p,direction);return {direction,states:transformBlockStates(id,shapeStates(id,'north'),rotate)};}); }
