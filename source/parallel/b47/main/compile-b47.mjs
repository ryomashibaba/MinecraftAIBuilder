/**
 * B47: non-executing, source-pinned planner-envelope compatibility auditor.
 * Copies the pure massing formulas from the archived Windows grammar as reviewed
 * examples, using the original pinned envelope functions. It never instantiates
 * GeneralBuildingPlanner, calls validateBuildPlan, or prepares build operations.
 * A massing match is NOT production planner equivalence or construction approval.
 */
import {createHash} from 'node:crypto';
import {footprint, inside, rectangles, edges} from '../../../dev/pinned-building-envelope.B33.mjs';
import {rasterizeRectangles} from '../../b44/sub-b/structure-b44.mjs';
import {verifyB46} from '../../b46/main/compile-b46.mjs';

const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=key=>{throw Error('B47_'+key)};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const count=m=>m.reduce((n,r)=>n+r.filter(Boolean).length,0);
const rect=(x,z,width,depth,start,end)=>({x,z,width,depth,start,end});
const PROGRAM_MASSINGS={
 office:['slab','tower_on_podium','asymmetric_block','stepped'],
 apartment:['L_shape','slab','twin_bar','courtyard'],
 hotel:['stepped','U_shape','tower_on_podium','asymmetric_block']
};
export const MASSING_NAMES=['slab','L_shape','tower_on_podium','stepped','asymmetric_block','U_shape','courtyard','twin_bar'];
export const PINNED_REFERENCE={
 plannerSha256:'23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8',
 envelopeSha256:'c63037c51937b0e5ec03b17274452bf1771fe47f8fe01dcececda6a8508766a0',
 grammarSha256:'71c0e2bda3e7a044285d681b38d9d4373e3c0aa417808a2f54c652d05ff47d1a'
};
/** Reviewed literal translation of the source massings.register bodies, not dynamic code. */
export function ruleMasses(rule,w,d,n,variation){
 if(!MASSING_NAMES.includes(rule)||![w,d,n,variation?.wing,variation?.setback,variation?.heightDrop].every(Number.isSafeInteger)||
 w<15||w>48||d<12||d>40||n<2||n>10||variation.wing<3||variation.setback<1||variation.setback>2||variation.heightDrop<1||variation.heightDrop>=n)fail('RULE_INPUT');
 const t=variation.wing,s=variation.setback,h=variation.heightDrop;
 let m;
 switch(rule){
  case 'slab':m=[rect(0,0,w,d,0,n)];break;
  case 'L_shape':m=[rect(0,0,w,t,0,n),rect(0,t,t,d-t,0,n)];break;
  case 'tower_on_podium':{
   const podium=Math.max(1,Math.floor(n/3));m=[rect(0,0,w,d,0,podium),rect(s,s+1,w-2*s,d-2*s-1,podium,n)];break;}
  case 'stepped':{
   const levels=Math.min(3,n);m=Array.from({length:levels},(_,i)=>rect(i*s,i*s,w-i*s*2,d-i*s*2,Math.floor(i*n/levels),Math.floor((i+1)*n/levels)));break;}
  case 'asymmetric_block':{
   const split=Math.floor(w*.55);m=[rect(0,0,split,d-t,0,n),rect(split-2,t,w-split+2,d-t,0,Math.max(1,n-h))];break;}
  case 'U_shape':m=[rect(0,d-t,w,t,0,n),rect(0,0,t,d-t,0,n),rect(w-t,0,t,d-t,0,n)];break;
  case 'courtyard':m=[rect(0,d-t,w,t,0,n),rect(0,0,t,d-t,0,n),rect(w-t,0,t,d-t,0,n),rect(t,0,w-2*t,t,0,n)];break;
  case 'twin_bar':m=[rect(0,0,w,t,0,n),rect(0,d-t,w,t,0,n),rect(Math.floor(w/2)-1,t,3,d-2*t,0,Math.max(1,n-1))];break;
 }
 // Same constraints applied to the return of massings.get by GeneralBuildingPlanner.
 if(m.some(q=>[q.x,q.z,q.width,q.depth,q.start,q.end].some(v=>!Number.isSafeInteger(v))||
 q.x<0||q.z<0||q.width<3||q.depth<3||q.x+q.width>w||q.z+q.depth>d||q.start<0||q.end>n||q.start>=q.end))return null;
 return m;
}
function normalizedMask(rects,w,d,expected){
 if(!Array.isArray(rects)||rects.length>2048||!Number.isSafeInteger(w)||!Number.isSafeInteger(d)||w<1||d<1||w>128||d>128)fail('GEOMETRY_DIM');
 const out=rasterizeRectangles(rects,w,d);
 if(out.overlaps!==0||count(out.mask)!==expected)fail('RECTANGLE_COVERAGE');
 return out.mask;
}
function diffMasks(want,got){
 let missing=0,extra=0;const samples=[];
 for(let z=0;z<want.length;z++)for(let x=0;x<want[0].length;x++){
  if(want[z][x]===got[z][x])continue;
  if(want[z][x])missing++;else extra++;
  if(samples.length<8)samples.push({x,z,expected:!!want[z][x],actual:!!got[z][x]});
 }
 return {missing,extra,samples};
}
function facadeUnitsFromReference(mask){
 const lines=edges(mask),units=[];
 for(const e of lines){
  const face=e.axis==='x'?(e.sign===-1?'N':'S'):(e.sign===-1?'W':'E');
  const fixed=e.fixed+(e.sign===1?1:0);
  for(let i=e.start;i<=e.end;i++)units.push(`${face}:${fixed}:${i}`);
 }
 return {lines,units:units.sort()};
}
function facadeUnitsFromB46(runs){
 const units=[];
 for(const r of runs){
  if(!['N','S','E','W'].includes(r.face)||!Number.isSafeInteger(r.fixed)||!Number.isSafeInteger(r.start)||!Number.isSafeInteger(r.end)||r.end<=r.start)fail('WALL_RUN');
  for(let i=r.start;i<r.end;i++)units.push(`${r.face}:${r.fixed}:${i}`);
 }
 return units.sort();
}
function occupancyOfB46(b46,b){
 const out=[];
 for(const l of b.levels){
  const base=`${b.id}/L${l.level}`;
  const get=kind=>{
   const p=b46.packets.find(p=>p.id===`${base}:${kind}`);
   if(!p||p.status!=='DESIGN_REVIEW_ONLY'||p.approved!==false||p.emitAllowed!==false||p.worldAnchor!==null||p.blockState!==null)fail('UNSAFE_PACKET');
   return p.localGeometry;
  };
  const f=get('FLOOR_MASS'),wall=get('FACADE_SHELL'),roof=get('ROOF_PROJECTION');
  const w=b.width??l.width, d=b.depth??l.depth; // B46 has level dimensions indirectly; original B45 used below.
  out.push({level:l.level,f,wall,roof});
 }
 return out;
}
/** Pure comparison that permits future externally reviewed real masses, WITHOUT execution. */
export function compareMassingToSurfaces(masses,levels,w,d){
 if(!Array.isArray(masses)||masses.length<1||masses.length>128||!Array.isArray(levels)||levels.length<2||levels.length>10||
 !Number.isSafeInteger(w)||!Number.isSafeInteger(d)||w<15||d<12||w>48||d>40)fail('COMPARE_INPUT');
 for(const q of masses){
  if(!q||[q.x,q.z,q.width,q.depth,q.start,q.end].some(n=>!Number.isSafeInteger(n))||
   q.x<0||q.z<0||q.width<3||q.depth<3||q.x+q.width>w||q.z+q.depth>d||q.start<0||q.end>levels.length||q.start>=q.end)fail('INVALID_MASS');
 }
 const diffs=[];
 for(let i=0;i<levels.length;i++){
  const level=levels[i],actual=footprint(masses,i,w,d),wanted=normalizedMask(level.f.rectangles,w,d,level.f.cells);
  diffs.push({level:i+1,...diffMasks(wanted,actual)});
 }
 return {exact:diffs.every(x=>x.missing===0&&x.extra===0),missing:diffs.reduce((s,x)=>s+x.missing,0),
  extra:diffs.reduce((s,x)=>s+x.extra,0),perFloor:diffs};
}
function variationForSeed(w,d,n,seed){
 const dim=Math.min(w,d);
 return {wing:Math.min(Math.floor((dim-3)/2),Math.max(3,Math.floor(dim/4))+seed%2),
  setback:1+seed%2,heightDrop:1+seed%Math.max(1,n-1)};
}
function findGrammarMatches(program,w,d,levels){
 const hits=[];
 // Seed 0..119 covers all periodic combinations (mod 2,5 and program candidate index).
 for(const rule of MASSING_NAMES){
  let bestDefault=null,bestExplicit=null;
  for(let seed=0;seed<120;seed++){
   const variation=variationForSeed(w,d,levels.length,seed),masses=ruleMasses(rule,w,d,levels.length,variation);
   if(!masses)continue;
   if(!compareMassingToSurfaces(masses,levels,w,d).exact)continue;
   const preferred=w>=d*2?'slab':PROGRAM_MASSINGS[program][seed%PROGRAM_MASSINGS[program].length];
   const profile={rule,seed,variation,masses,requiresExplicitMassing:preferred!==rule};
   if(!bestExplicit)bestExplicit=profile;
   if(preferred===rule && !bestDefault)bestDefault=profile;
   if(bestDefault&&bestExplicit)break;
  }
  if(bestExplicit)hits.push({rule,defaultCandidate:bestDefault,explicitCandidate:bestExplicit});
 }
 return hits;
}
function projectedPhases(occ,masses,w,d,levelHeight){
 const entries=[],decompositionDifferences=[];
 const masks=occ.map((o,i)=>footprint(masses,i,w,d));
 // Mirrors the reference GeneralBuildingPlanner: foundation, then floor/facade/roof each level.
 entries.push({phase:'FOUNDATION_GEOMETRY_ONLY',level:1,y:-1,rectangles:rectangles(masks[0]),blocks:null,approved:false});
 for(let f=0;f<masks.length;f++){
  const mask=masks[f],o=occ[f],base=f*levelHeight;
  const refFloorRects=rectangles(mask);
  const refRoofMask=mask.map((row,z)=>row.map((cell,x)=>cell&&!inside(masks[f+1]??[],x,z)));
  const refRoofRects=rectangles(refRoofMask);
  const wantRoof=normalizedMask(o.roof.rectangles,w,d,o.roof.cells);
  const roofDiff=diffMasks(wantRoof,refRoofMask);
  const wantFloor=normalizedMask(o.f.rectangles,w,d,o.f.cells);
  const floorDiff=diffMasks(wantFloor,mask);
  const refFacade=facadeUnitsFromReference(mask);
  const sourceFacade=facadeUnitsFromB46(o.wall.runs);
  const facadeMatch=equal(refFacade.units,sourceFacade);
  if(o.f.y!==base||o.roof.atY!==base+levelHeight||o.wall.fromY!==base||o.wall.toY!==base+levelHeight)fail('VERTICAL_FRAME_MISMATCH');
  if(!equal(refFloorRects,o.f.rectangles))decompositionDifferences.push({level:f+1,kind:'FLOOR',referenceRects:refFloorRects,b46Rects:o.f.rectangles,coverageExact:true,issue:'RECTANGLE_GROUPING_ONLY'});
  if(!equal(refRoofRects,o.roof.rectangles))decompositionDifferences.push({level:f+1,kind:'ROOF',referenceRects:refRoofRects,b46Rects:o.roof.rectangles,coverageExact:true,issue:'RECTANGLE_GROUPING_ONLY'});
  if(floorDiff.missing||floorDiff.extra||roofDiff.missing||roofDiff.extra||!facadeMatch)fail('REFERENCE_ENVELOPE_MISMATCH');
  entries.push({phase:'FLOOR_SURFACE_ONLY',level:f+1,y:base,rectangles:refFloorRects,blocks:null,approved:false});
  entries.push({phase:'FACADE_EDGE_INTENT_ONLY',level:f+1,fromY:base,toY:base+levelHeight-1,
   edgeRuns:refFacade.lines.length,edgeUnits:refFacade.units.length,blocks:null,approved:false});
  entries.push({phase:'ROOF_SURFACE_ONLY',level:f+1,y:base+levelHeight,rectangles:refRoofRects,blocks:null,approved:false});
 }
 return {entries,decompositionDifferences};
}
export function compileB47(b46,b45,b,main){
 verifyB46(b46,b45,b,main);
 if(b46.blockers?.M4Gates?.length!==9||b46.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
 b46.worldCoordinates!==null||b46.materialIds.length||b46.engineCalls!==0||b46.buildOperations!==0||
 b46.BuildPlan?.operations?.length||b46.executionAllowed!==false)fail('SAFETY_UPSTREAM');
 const buildings=[],phaseIndex=[];let exact=0,matchedDefault=0,matchedExplicit=0,decompositionDifferences=0;
 for(const building of b45.buildings){
  const target=b46.buildings.find(x=>x.id===building.id);if(!target||building.levels.length!==6||target.levels.length!==6)fail('BUILDING_INPUT');
  const levels=occupancyOfB46(b46,target),w=building.levels[0].width,d=building.levels[0].depth;
  if(building.levels.some(l=>l.width!==w||l.depth!==d)||levels.length!==6)fail('SITE_DIMENSIONS');
  const program=building.id.split('/')[0],fh=building.levels[0].y1-building.levels[0].y0;
  if(!PROGRAM_MASSINGS[program]||!Number.isSafeInteger(fh)||fh<4||fh>5)fail('PROGRAM_FLOOR_HEIGHT');
  const candidates=findGrammarMatches(program,w,d,levels);
  const selected=candidates.find(x=>x.defaultCandidate)||candidates[0];
  if(!selected)fail('NO_MATCHING_GRAMMAR_MASSING');
  const chosen=selected.defaultCandidate??selected.explicitCandidate;
  const replay=compareMassingToSurfaces(chosen.masses,levels,w,d);
  if(!replay.exact)fail('FLOOR_REPLAY_MISMATCH');
  const {entries:phases,decompositionDifferences:diffs}=projectedPhases(levels,chosen.masses,w,d,fh);
  decompositionDifferences+=diffs.length;
  exact+=levels.length;matchedDefault+=!!selected.defaultCandidate;matchedExplicit+=!selected.defaultCandidate;
  buildings.push({id:building.id,program,site:{width:w,depth:d,floors:levels.length,floorHeight:fh},
   referenceMassing:{name:chosen.rule,seed:chosen.seed,variation:chosen.variation,
    usesDefaultSelection:!chosen.requiresExplicitMassing,requiresExplicitMassing:chosen.requiresExplicitMassing,
    compatibleUnderSourcedGrammar:true,masses:chosen.masses,
    provenance:'REFERENCE_RULE_PORT_NOT_EXECUTED_GENERAL_BUILDING_PLANNER',
    otherCompatibleRules:candidates.map(c=>({name:c.rule,hasDefaultSeed:!!c.defaultCandidate}))},
   footprintReplay:{exact:true,missing:0,extra:0,levels:levels.length},
   facadeEdgeIntentExact:true,roofProjectionExact:true,plateRectangleCoverageExact:true,
   plateRectangleDecompositionExact:diffs.length===0,plateRectangleDecompositionDifferences:diffs,
   certifiedMaterialStates:false,plannerInvocationPerformed:false,stairDoorAndSupportValidated:false,
   conditionalPhasePreview:phases});
  phaseIndex.push({buildingId:building.id,phaseCount:phases.length,sourceEnvelopeMatched:true});
 }
 const body={schema:'minecraftaibuilder-b47-pinned-planner-envelope-compatibility-v1',
  kind:'OFFLINE_REFERENCE_RULE_COMPARISON_NOT_EXECUTION',
  provenance:{b46ReportSha256:b46.reportSha256,b45ReportSha256:b45.reportSha256,
   pinnedReference:PINNED_REFERENCE},
  buildings,phaseIndex,
  totals:{buildings:5,floors:30,referenceEnvelopeExactLevels:exact,matchingDefaultSelection:matchedDefault,
   requiringExplicitMassingSelection:matchedExplicit,conditionalPhases:phaseIndex.reduce((n,x)=>n+x.phaseCount,0),
   equivalentCoverageDifferentRectangleDecompositions:decompositionDifferences,
   worldOperations:0,engineCalls:0},
  comparisonScope:{verified:'SOURCED_MASSING_FORMULAS_AND_FOOTPRINT_EDGES_RECTANGLE_ROOF_GEOMETRY',
   excluded:['GENERAL_BUILDING_PLANNER_RUNTIME','MATERIAL_PALETTE','FACADE_MODULE_EMISSION',
    'ROTATED_WORLD_FRAME','ENTRANCE_PLACEMENT','STAIR_AND_DOOR_BLOCK_STATES',
    'STRENGTH_AND_HEADROOM','PRODUCTION_PLAN_VALIDATION'],
   productionMassingMapping:'NOT_PROVEN_PROFILES_ARE_CANDIDATES_ONLY'},
  blockers:b46.blockers,
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  worldCoordinates:null,materialIds:[],engineCalls:0,buildOperations:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:digest(body)};
}
export function verifyB47(report,b46,b45,b,main){
 if(!report||report.schema!=='minecraftaibuilder-b47-pinned-planner-envelope-compatibility-v1'||
 report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||
 report.constructionApproved!==false||report.executionAllowed!==false||report.engineCalls!==0||report.buildOperations!==0||
 report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan.operations.length||report.BuildPlan.commandCount!==0||
 report.worldCoordinates!==null||report.materialIds.length!==0||report.blockers.M4Gates.some(g=>g.status!=='BLOCKED'))fail('UNSAFE_OUTPUT');
 const {reportSha256,...body}=report;
 if(digest(body)!==reportSha256)fail('HASH_CHANGED');
 if(!equal(report,compileB47(b46,b45,b,main)))fail('REPLAY_MISMATCH');
 return true;
}
