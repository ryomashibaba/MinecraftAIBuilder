import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {SCHEMA,validateArchitecturePlan,compileArchitecturePlan,
 auditArchitecturePlanCirculation,assessR125ProgramGeometry,
 assessR125AuthoredRoomCapacity,packR125RaisedRoofStrips,
 estimateR125AuthoredElementReserve}
 from '../source/ai/r125-architecture-plan.mjs';
import {addAuthoredRoomFixtures,auditR125FixtureDaylightView}
 from '../source/ai/r125-room-fixtures.mjs';
import {addAuthoredRoomDaylight,auditR125PairedBayApproach}
 from '../source/ai/r125-room-daylight.mjs';
import {packR125AdjacentBoxes} from '../source/ai/r125-spatial-detail.mjs';
import {verifyCompiled,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';
import {auditR125SourceRoutes,auditR125VisitorRoutes} from '../source/ai/r125-source-routes.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {exportSavedPlan} from './r125-japanese-makecode.mjs';

const plan=(id,axes=['x'],spaces=['family room','kitchen'])=>({
 schema:SCHEMA,id,title:'An original small building',
 brief:'Independent spatial program, not a genre template',
 footprint:{width:18,depth:18},
 levels:axes.map((axis,n)=>({
  splitAxis:axis,splitPercent:50,
  spaces:[
   {id:'area-'+n+'a',purpose:spaces[0]},
   {id:'area-'+n+'b',purpose:spaces[1]}
  ]
 })),
 materials:{floor:'wood',wall:'concrete',roof:'stone'}
});
const voxels=scene=>new Set(scene.primitives.map(v=>v.slice(0,3).join(',')));
const includes=(cells,x,y,z)=>cells.has([x,y,z].join(','));
test('validates one level shop, genuine B143 voxels, shell and room voids',()=>{
 const original=plan('corner-shop',['x'],['customer area','stockroom']);
 const snapshot=structuredClone(original);
 const r=compileArchitecturePlan(original),v=voxels(r.compiled);
 assert.equal(validateArchitecturePlan(original),true);
 assert.deepEqual(original,snapshot);
 assert.equal(verifyCompiled(r.design,r.compiled),true);
 assert.equal(r.compiled.primitives.length>400,true);
 assert.equal(includes(v,5,1,5),true); // supported floor
 assert.equal(includes(v,5,2,5),false); // 2-block standing air
 assert.equal(includes(v,5,3,5),false);
 assert.equal(includes(v,1,2,5),true); // outer west wall
 assert.equal(includes(v,8,2,1),false); // cut front exterior doorway
 assert.equal(includes(v,3,3,1),true); // real glass fills window
 assert.equal(includes(v,5,6,5),true); // supported roof
 assert.equal(r.program.length,1);
 assert.equal(r.worldWrites,0);
 assert.equal(r.gates.every(x=>x==='BLOCKED'),true);
 const critique=critiqueArchitecture({design:r.design,compiled:r.compiled});
 assert.ok(critique.objectiveAudit.verifiedTwoWideStandingSquares>30);
 assert.equal(critique.worldWrites,0);
});
test('model-authored public circulation cannot be forced through staff-only entrance room',()=>{
 const authored=plan('public-weather-exhibit',['z'],
  ['staff observation control','visitor exhibit']);
 authored.levels[0].spaces[0].access='staff';
 authored.levels[0].spaces[1].access='public';
 const original=structuredClone(authored);
 assert.throws(()=>validateArchitecturePlan(authored),
  /R125_PLAN_VISITOR_ACCESS_THROUGH_STAFF/);
 assert.deepEqual(authored,original,
  'independent SOURCE validation must never repair the model author');
 authored.levels[0].spaces[0].access='shared';
 assert.equal(validateArchitecturePlan(authored),true,
  'an explicitly model-authored shared entry remains possible');
 authored.levels[0].spaces[0].access='staff';
 authored.levels[0].spaces[1].access='staff';
 assert.equal(validateArchitecturePlan(authored),true,
  'staff-only circulation should not be misclassified as public');
 authored.levels[0].spaces[1].access='unknown';
 assert.throws(()=>validateArchitecturePlan(authored),/R125_PLAN_SPACE_ACCESS/);
});

test('two story lab includes shaft, stair wedge, usable upper floors and real voids',()=>{
 const r=compileArchitecturePlan(plan('research-studio',['x','z'],
  ['experimentation','record keeping']));
 const v=voxels(r.compiled);
 assert.equal(r.program.length,2);
 assert.equal(r.design.elements.filter(e=>e.shape==='staircase').length,1);
 assert.equal(includes(v,3,6,3),false); // shaft must remain open
 assert.equal(includes(v,3,6,7),false); // cleared upper stairwell
 assert.equal(includes(v,3,5,7),true); // upper stair tread is one below slab
 assert.equal(includes(v,3,6,8),true); // floor landing next to tread
 assert.equal(includes(v,9,6,9),true); // second floor supported
 assert.equal(includes(v,10,7,10),false); // headroom away from partition
 assert.equal(includes(v,9,11,9),true); // roof
 assert.equal(r.compiled.readiness,'NOT_PREPARED');
 assert.deepEqual(r.compiled.BuildPlan.operations,[]);
 assert.equal(r.inGameWalking,'NOT_TESTED');
});
test('distinct semantic programs/orientations produce distinct real geometry and source hashes',()=>{
 const a=compileArchitecturePlan(plan('two-level-home',['x','x'],
  ['dining','bedroom']));
 const b=compileArchitecturePlan(plan('art-workshop',['z','z'],
  ['creation','display']));
 assert.notEqual(a.geometrySha256,b.geometrySha256);
 assert.notDeepEqual(a.program,b.program);
 assert.ok(a.compiled.primitives.length>300);
 assert.ok(b.compiled.primitives.length>300);
});
test('bounded IR rejects structural abuse, unknown keys and malicious input',()=>{
 for(const alter of [
  p=>p.levels[0].spaces[1].id=p.levels[0].spaces[0].id,
  p=>p.levels[0].spaces.push({id:'room-three',purpose:'extra'},
   {id:'room-four',purpose:'extra'}),
  p=>p.levels[0].splitAxis='north',
  p=>p.footprint.width=500,
  p=>p.materials.floor='command_block',
  p=>p.id='name_with_underscores',
  p=>p.script='require("fs")',
  p=>p.levels[0].spaces[0].purpose='<exec>'
 ]){
  const x=plan('safe-studio'),changed=structuredClone(x);
  alter(changed);
  assert.throws(()=>compileArchitecturePlan(changed),/R125_PLAN_/);
 }
});

test('generic source circulation detects intact zone openings, stairs and upper landing',()=>{
 const r=compileArchitecturePlan(plan('floor-test-home',['x','z'],
  ['kitchen','sleeping']));
 const audit=auditArchitecturePlanCirculation(r);
 assert.equal(audit.status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(audit.failures.length,0);
 assert.equal(audit.stairFlights[0].clearSupportedTreads,5);
 assert.equal(audit.stairFlights[0].sourceUpperLandingPass,true);
 assert.equal(audit.levels.every(l=>l.partitionSourcePass),true);
 assert.equal(audit.continuousRealPlayerPathCertified,false);
 assert.equal(audit.worldWrites,0);
});
test('source stair probes HOLD on a new obstruction even if roof/floor stats look good',()=>{
 const r=compileArchitecturePlan(plan('blocked-stair-home',['x','z']));
 const changed={...r,design:{...r.design,elements:[
  ...r.design.elements,
  {id:'unexpected-upper-stair-obstruction',shape:'box',mode:'add',
   material:'stone',origin:[3,7,7],size:[2,1,1]}
 ]}};
 // Recompile genuine source/geometry so the verifier cannot be bypassed.
 const rebuilt=compileDesign(changed.design);
 const probe=auditArchitecturePlanCirculation({...changed,compiled:rebuilt,
  sourceSha256:rebuilt.sourceSha256,geometrySha256:rebuilt.geometrySha256});
 assert.equal(probe.status,'HOLD_SOURCE_CIRCULATION');
 assert.ok(probe.failures.some(x=>x.code==='STAIR_TREAD_BLOCKED_OR_UNSUPPORTED'));
 assert.equal(probe.continuousRealPlayerPathCertified,false);
});


test('optional generative form actually changes silhouette, roof heights and facade',()=>{
 const base=plan('maker-studio',['x','z'],['assembling prototypes','resting']);
 base.footprint={width:24,depth:28};
 const legacy=compileArchitecturePlan(base);
 const form={...base,expression:{setbackSide:'east',setbackDepth:3,
  roofProfile:'ridge',roofAxis:'x',facadeLanguage:'fins'}};
 const built=compileArchitecturePlan(form);
 assert.equal(verifyCompiled(built.design,built.compiled),true);
 assert.notDeepEqual(built.compiled.primitives,legacy.compiled.primitives);
 assert.ok(built.compiled.bounds.maxY>legacy.compiled.bounds.maxY);
 assert.ok(built.design.elements.some(e=>e.id==='roof-profile-7'));
 assert.ok(built.design.elements.some(e=>e.id==='l0-fin-2'));
 const fullWidth=base.footprint.width-2;
 assert.ok(built.design.elements.some(e=>e.id==='l1-east'&&
  e.origin[0]===fullWidth-3));
 assert.ok(built.design.elements.find(e=>e.id==='roof-base').size[0]<fullWidth);
 assert.equal(built.worldWrites,0);
 assert.equal(built.gates.every(x=>x==='BLOCKED'),true);
 const a=auditArchitecturePlanCirculation(built);
 assert.equal(a.status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(a.worldWalking,'NOT_TESTED');
});
test('roof axis and setback direction are truly geometry-changing plan decisions',()=>{
 const base=plan('research-hall',['z','x'],['analysis','display']);
 base.footprint={width:24,depth:28};
 const a={...base,expression:{setbackSide:'rear',setbackDepth:2,
  roofProfile:'sawtooth',roofAxis:'x',facadeLanguage:'screen'}};
 const b={...base,expression:{...a.expression,roofAxis:'z',
  setbackSide:'east',facadeLanguage:'fins'}};
 const first=compileArchitecturePlan(a),second=compileArchitecturePlan(b);
 assert.notDeepEqual(first.compiled.primitives,second.compiled.primitives);
 assert.equal(verifyCompiled(first.design,first.compiled),true);
 assert.equal(auditArchitecturePlanCirculation(first).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditArchitecturePlanCirculation(second).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
});
test('unknown form field, unsafe single-story setback, invalid roof rejected',()=>{
 const original=plan('safe-workshop',['x'],['shop','storage']);
 const sample={setbackSide:'none',setbackDepth:0,
  roofProfile:'ridge',roofAxis:'x',facadeLanguage:'screen'};
 for(const f of [
  {...sample,executable:true},
  {...sample,setbackSide:'east',setbackDepth:4},
  {...sample,setbackDepth:4},
  {...sample,roofProfile:'javascript'}
 ]){
  assert.throws(()=>compileArchitecturePlan({...original,expression:f}),/R125_PLAN_/);
 }
});

test('the upper setback is accessible from within through a real 2-wide source opening',()=>{
 const base=plan('terrace-access-home',['x','z'],['living','sleeping']);
 base.footprint={width:24,depth:28};
 for(const side of ['east','rear']){
  const r=compileArchitecturePlan({...base,
   expression:{setbackSide:side,setbackDepth:3,
    roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'}});
  assert.ok(r.design.elements.find(e=>e.id==='upper-terrace-access'));
  const q=critiqueArchitecture({design:r.design,compiled:r.compiled});
  const report=assessR125ProgramGeometry(r,q);
  assert.equal(report.programFloorIssues.length,0,
   JSON.stringify(report.programFloorIssues));
  assert.equal(q.objectiveAudit.elevationConnectivity.find(x=>
   x.standingY===7).componentCount,1);
  assert.equal(auditArchitecturePlanCirculation(r).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
 }
});
test('program risk cannot be masked using an unrelated roof surface',()=>{
 const base=plan('separate-terrace-room',['x','z'],['living','sleeping']);
 base.footprint={width:24,depth:28};
 const r=compileArchitecturePlan({...base,expression:{
  setbackSide:'east',setbackDepth:3,roofProfile:'ridge',
  roofAxis:'x',facadeLanguage:'fins'}});
 const c=critiqueArchitecture({design:r.design,compiled:r.compiled});
 const report=assessR125ProgramGeometry(r,c);
 assert.equal(report.programFloorIssues.length,0,
  JSON.stringify(report.programFloorIssues));
 assert.equal(report.worldWalking,'NOT_TESTED');
 assert.equal(report.worldWrites,0);
 assert.throws(()=>assessR125ProgramGeometry(r,
  {...c,sourceSha256:'0'.repeat(64)}),/R125_PLAN_UNTRUSTED_CRITIQUE/);
});

test('opt-in practical source entrance is clear of x-partition while all historical B143 SHA inputs remain unchanged',()=>{
 const original=plan('practical-flower-shop',['x'],['sales','staff preparation']);
 original.footprint={width:18,depth:18};
 const snapshot=JSON.stringify(original);
 const legacy=compileArchitecturePlan(original);
 const practical=compileArchitecturePlan(original,{entrancePlacement:'source-accessible'});
 const legacyDoor=legacy.design.elements.find(x=>x.id==='exterior-entrance');
 const practicalDoor=practical.design.elements.find(x=>x.id==='exterior-entrance');
 const divider=practical.program[0].splitCoordinate;
 assert.equal(practicalDoor.origin[0],divider-2);
 assert.equal(legacyDoor.origin[0],Math.floor(original.footprint.width/2)-1);
 assert.equal(practical.planSha256,legacy.planSha256);
 assert.notEqual(practical.sourceSha256,legacy.sourceSha256);
 assert.equal(verifyCompiled(practical.design,practical.compiled),true);
 assert.equal(auditArchitecturePlanCirculation(practical).status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(JSON.stringify(original),snapshot);
 assert.equal(practical.worldWrites,0);
 assert.throws(()=>compileArchitecturePlan(original,{entrancePlacement:'unsafe'}),/R125_PLAN_ENTRANCE_PLACEMENT_MODE/);
});
test('four saved real Qwen plans retain frozen legacy geometry while opt-in entry placement is minimally safe',()=>{
 const cases=[
  ['../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',10,true],
  ['./fixtures/r125-qwen14b-residential-2024a.json',10,true],
  ['./fixtures/r125-qwen14b-shop-20261024.json',11,false],
  ['./fixtures/r125-qwen14b-research-20261024.json',10,true]
 ];
 for(const [path,expectedX,legacyCrossesDivider] of cases){
  const original=JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
  const snapshot=JSON.stringify(original);
  const frozen=compileArchitecturePlan(original);
  const candidate=compileArchitecturePlan(original,{entrancePlacement:'source-accessible'});
  const door=r=>r.design.elements.find(e=>e.id==='exterior-entrance').origin;
  const oldX=door(frozen)[0],split=frozen.program[0].splitCoordinate;
  assert.equal(oldX<=split&&oldX+1>=split,legacyCrossesDivider,original.id);
  assert.equal(door(candidate)[0],expectedX,original.id);
  assert.equal(candidate.planSha256,frozen.planSha256);
  assert.equal(candidate.compiled.primitives.length,frozen.compiled.primitives.length);
  assert.equal(verifyCompiled(candidate.design,candidate.compiled),true);
  const cells=voxels(candidate.compiled),[x,y,z]=door(candidate);
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   assert.equal(includes(cells,x+dx,y-1,z+1+dz),true,original.id+': floor');
   for(let dy=0;dy<3;dy++)
    assert.equal(includes(cells,x+dx,y+dy,z+1+dz),false,original.id+': headroom');
  }
  assert.equal(candidate.worldWrites,0);
  assert.deepEqual(candidate.gates,Array(9).fill('BLOCKED'));
  assert.equal(JSON.stringify(original),snapshot);
 }
});
test('a south entry for z partition needs no source-accessible coordinate change',()=>{
 const original=plan('practical-research-lab',['z'],['experiment','records']);
 const old=compileArchitecturePlan(original);
 const practical=compileArchitecturePlan(original,{entrancePlacement:'source-accessible'});
 assert.equal(practical.sourceSha256,old.sourceSha256);
 assert.equal(practical.geometrySha256,old.geometrySha256);
 assert.equal(practical.planSha256,old.planSha256);
});


test('opt-in model-authored corner recess removes real floor and roof, encloses both re-entrant faces, and preserves SOURCE paths',()=>{
 for(const axes of [['x'],['x','z']]){
  const base=plan('corner-recess-'+axes.length,axes,['flexible studio','support room']);
  base.footprint={width:24,depth:28};
  const original=structuredClone(base);
  const expression={setbackSide:'none',setbackDepth:0,
   roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain',
   rearCornerCut:{width:5,depth:4}};
  const built=compileArchitecturePlan({...base,expression},
   {entrancePlacement:'source-accessible'});
  const v=voxels(built.compiled);
  const xCut=18,zCut=23;
  assert.equal(verifyCompiled(built.design,built.compiled),true);
  assert.equal(includes(v,22,1,26),false); // full-height open-air recess
  assert.equal(includes(v,22,6,26),false); // removed roof or upper floor
  assert.equal(includes(v,xCut-1,2,zCut+3),true); // enclosing recessed wall
  assert.equal(includes(v,xCut+4,2,zCut-1),true);
  assert.equal(includes(v,xCut-1,3,zCut+1),true); // real recessed glazing
  assert.equal(includes(v,xCut+1,3,zCut-1),true);
  assert.equal(includes(v,6,1,6),true); // functional interior floor remains
  assert.deepEqual(built.program[0].openAirRecess,
   {x:[18,22],z:[23,26]});
  assert.equal(auditArchitecturePlanCirculation(built).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  const routes=auditR125SourceRoutes(built);
  assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES',
   JSON.stringify(routes.issues));
  assert.equal(built.worldWrites,0);
  assert(built.gates.every(x=>x==='BLOCKED'));
  assert.deepEqual(base,original); // authored input not mutated
 }
});
test('corner recess fails closed on malformed size and unsupported massing combinations',()=>{
 const base=plan('bounded-corner',['x']);
 const expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain',
  rearCornerCut:{width:4,depth:5}};
 for(const candidate of [
  {...expression,rearCornerCut:{width:2,depth:4}},
  {...expression,rearCornerCut:{width:9,depth:4}},
  {...expression,rearCornerCut:{width:4,depth:5,script:'bad'}},
  {...expression,roofProfile:'ridge'},
  {...expression,setbackSide:'rear',setbackDepth:3}
 ])assert.throws(()=>compileArchitecturePlan({...base,expression:candidate}),
  /R125_PLAN_EXPRESSION_(CORNER_CUT|CORNER_CONFLICT|SETBACK)/);
});


test('unaltered Nov-1 Qwen 14B 203-character brief compiles to real L-corner SOURCE and safe MakeCode',()=>{
 const fixture=new URL('../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url);
 const raw=fs.readFileSync(fixture,'utf8');
 assert.equal(createHash('sha256').update(raw).digest('hex'),
  '69067e84ced5633e2f7d3973b28a651e472aea1b3753934f456645ed6fc4c5e2');
 const original=JSON.parse(raw),snapshot=structuredClone(original);
 assert.equal(original.brief.length,203);
 assert.equal(validateArchitecturePlan(original),true);
 const compiled=compileArchitecturePlan(original,{entrancePlacement:'source-accessible'});
 assert.equal(verifyCompiled(compiled.design,compiled.compiled),true);
 assert.equal(compiled.planSha256,
  'e9a9a62c4bd55284d62d96b0352fd5bc6b5059e72921ce6a1954b86ef63e36d8');
 const cells=voxels(compiled.compiled);
 assert.equal(includes(cells,22,1,22),false); // L-shaped floor void
 assert.equal(includes(cells,22,6,22),false); // matching L-shaped roof void
 assert.equal(includes(cells,18,2,21),true); // actual re-entrant wall
 assert.equal(includes(cells,21,2,18),true);
 assert.equal(includes(cells,18,3,20),true); // re-entrant glass
 assert.equal(includes(cells,20,3,18),true);
 assert.equal(auditArchitecturePlanCirculation(compiled).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 const sourceRoutes=auditR125SourceRoutes(compiled);
 assert.equal(sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES',
  JSON.stringify(sourceRoutes.issues));
 assert.deepEqual(sourceRoutes.zones.map(z=>z.id).sort(),
  ['retail-area','staff-workroom'].sort());
 assert(sourceRoutes.zones.every(z=>z.reachedFromEntrance));
 assert.deepEqual(original,snapshot);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r125-real-corner-qwen-'));
 try{
  const palette=new URL('../configs/r125-education-verified-palette-v26.33.json',import.meta.url);
  const output=path.join(tmp,'makecode');
  const report=exportSavedPlan(fixture,output,'UNVERIFIED_DESIGN',palette);
  assert.equal(report.worldWrites,0);
  assert.equal(report.programExecuted,false);
  assert.equal(report.materialMode,'STRICT_USER_ATTESTED');
  assert.equal(report.sourceSha256,compiled.sourceSha256);
  assert.equal(report.geometrySha256,compiled.geometrySha256);
  assert(report.plannedVoxelCount>0);
  assert(report.plannedBlockCounts.oak_planks>0);
  assert(report.plannedBlockCounts.stone>0);
  assert(report.plannedBlockCounts.glass>0);
  const walk=JSON.parse(fs.readFileSync(path.join(output,'SOURCE_WALKABILITY_REVIEW.json'),'utf8'));
  assert.equal(walk.status,'SOURCE_ROUTE_CANDIDATE');
  assert.equal(walk.hostUpperDoorPlacement,'legacy');
  assert.equal(walk.originalModelPlanUnchanged,true);
  assert.equal(walk.actualInGameWalking,'NOT_TESTED');
  const code=fs.readFileSync(path.join(output,'MAKECODE_EDUCATION.ts'),'utf8');
  assert.match(code,/player\.onChat\("mabbuild"/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('R125 explanatory brief shares B143 500-char bound but title and space are still strict',()=>{
 const base=plan('brief-limit-check');
 assert.equal(validateArchitecturePlan({...base,brief:'a'.repeat(500)}),true);
 for(const candidate of [
  {...base,brief:'a'.repeat(501)},
  {...base,brief:'Two lines\nwhich are rejected'},
  {...base,title:'a'.repeat(181)},
  {...base,levels:[{...base.levels[0],spaces:[
   {...base.levels[0].spaces[0],purpose:'a'.repeat(181)},
   base.levels[0].spaces[1]]}]}
 ])assert.throws(()=>validateArchitecturePlan(candidate),/R125_PLAN_/);
});

// Optional model-authored LEFT rear recess changes the occupied floor plan,
// roof void, and both enclosing walls; old right-rear sources remain pinned.
test('west/rear massing choice mirrors TRUE L floor/roof while retaining real circulation',()=>{
 const base=plan('mirrored-rear-court',['x','z'],['daily gathering','private workshop']);
 base.footprint={width:24,depth:28};
 const initial=structuredClone(base);
 const expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain',
  rearCornerCut:{width:5,depth:4}};
 const east=compileArchitecturePlan({...base,expression},
  {entrancePlacement:'source-accessible'});
 const explicitlyEast=compileArchitecturePlan({...base,expression:{...expression,
  rearCornerCut:{width:5,depth:4,side:'east'}}},
  {entrancePlacement:'source-accessible'});
 const west=compileArchitecturePlan({...base,expression:{...expression,
  rearCornerCut:{width:5,depth:4,side:'west'}}},
  {entrancePlacement:'source-accessible'});
 const v=voxels(west.compiled);
 assert.equal(east.geometrySha256,explicitlyEast.geometrySha256);
 assert.notEqual(east.geometrySha256,west.geometrySha256);
 assert.equal(verifyCompiled(west.design,west.compiled),true);
 assert.deepEqual(west.program[0].openAirRecess,{x:[1,5],z:[23,26]});
 assert.equal(includes(v,2,1,25),false); // LEFT rear floor removed
 assert.equal(includes(v,2,11,25),false); // LEFT rear upper roof removed
 assert.equal(includes(v,6,2,25),true); // real re-entrant side wall
 assert.equal(includes(v,4,2,22),true); // real re-entrant back wall
 assert.equal(includes(v,6,3,24),true); // source glass, not just facade paint
 assert.equal(includes(v,2,3,22),true); // other glazed re-entrant face
 assert.equal(includes(v,6,1,6),true); // functional interior retained
 assert.equal(auditArchitecturePlanCirculation(west).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditR125SourceRoutes(west).status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(west.worldWrites,0);
 assert(west.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(base,initial);
});

test('invalid AI-selected rear-corner side fails closed',()=>{
 const p=plan('side-validation');
 p.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain',
  rearCornerCut:{width:4,depth:4,side:'up'}};
 assert.throws(()=>compileArchitecturePlan(p),/R125_PLAN_EXPRESSION_CORNER_CUT/);
});

test('practical MakeCode export closes known upper stair-landing divider with EXISTING HOST door rule',()=>{
 const original=plan('source-real-upper-landing',['x','z'],['public studio','study area']);
 original.footprint={width:24,depth:18};
 original.levels[1].splitPercent=60;
 original.expression={setbackSide:'rear',setbackDepth:3,
  roofProfile:'ridge',roofAxis:'x',facadeLanguage:'plain'};
 const originalText=JSON.stringify(original)+'\n';
 const old=compileArchitecturePlan(original,{entrancePlacement:'source-accessible'});
 assert.equal(old.program[1].splitCoordinate,8);
 assert.equal(auditR125SourceRoutes(old).status,'HOLD_SOURCE_ROUTES');
 const valid=compileArchitecturePlan(original,{entrancePlacement:'source-accessible',
  upperDoorPlacement:'stair-clear'});
 assert.equal(auditR125SourceRoutes(valid).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(valid).status,'SOURCE_CLEARANCE_PROBES_PASS');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r125-practical-stair-entry-'));
 try{
  const input=path.join(tmp,'unchanged-model-plan.json');
  const out=path.join(tmp,'education-source-only');
  const palette=new URL('../configs/r125-education-verified-palette-v26.33.json',import.meta.url);
  fs.writeFileSync(input,originalText);
  const report=exportSavedPlan(input,out,'UNVERIFIED_DESIGN',palette);
  assert.equal(report.sourceSha256,valid.sourceSha256);
  assert.equal(report.geometrySha256,valid.geometrySha256);
  assert.equal(report.worldWrites,0);
  assert.equal(report.programExecuted,false);
  assert.equal(fs.readFileSync(input,'utf8'),originalText);
  const status=JSON.parse(fs.readFileSync(path.join(out,'SOURCE_WALKABILITY_REVIEW.json'),'utf8'));
  assert.equal(status.status,'SOURCE_ROUTE_CANDIDATE');
  assert.equal(status.hostUpperDoorPlacement,'stair-clear');
  assert.equal(status.originalModelPlanUnchanged,true);
  assert.equal(status.circulation.status,'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(status.routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(status.routes.zones.every(z=>z.reachedFromEntrance));
  const geometry=JSON.parse(fs.readFileSync(path.join(out,'B143_SOURCE.json'),'utf8'));
  assert.deepEqual(geometry,valid.design);
  assert(geometry.elements.some(e=>e.id==='l1-stair-threshold-relief'));
  assert(fs.readFileSync(path.join(out,'MAKECODE_EDUCATION.ts'),'utf8')
    .includes('player.onChat("mabbuild"'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('opt-in rear setback stair threshold connects both upper zones without altering legacy SOURCE',()=>{
 for(const [depth,percent,split] of [[16,60,7],[18,60,8],[24,40,8]]){
  const original=plan('upper-stair-threshold',['x','z'],['community hall','workroom']);
  original.footprint={width:24,depth};
  original.levels[1].splitPercent=percent;
  original.expression={setbackSide:'rear',setbackDepth:3,
   roofProfile:'ridge',roofAxis:'x',facadeLanguage:'plain'};
  const snapshot=structuredClone(original);
  const legacy=compileArchitecturePlan(original,{entrancePlacement:'source-accessible'});
  const optIn=compileArchitecturePlan(original,{
   entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
  const oldRoutes=auditR125SourceRoutes(legacy),routes=auditR125SourceRoutes(optIn);
  assert.equal(oldRoutes.status,'HOLD_SOURCE_ROUTES');
  assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES',JSON.stringify(routes.issues));
  assert(routes.zones.every(z=>z.reachedFromEntrance));
  assert.equal(verifyCompiled(optIn.design,optIn.compiled),true);
  assert.equal(legacy.planSha256,optIn.planSha256);
  assert.deepEqual(original,snapshot);
  const relief=optIn.design.elements.find(e=>e.id==='l1-stair-threshold-relief');
  assert.deepEqual(relief.origin,[3,7,split]);
  assert.deepEqual(relief.size,[2,3,1]);
  const ordinary=optIn.design.elements.find(e=>e.id==='l1-internal-door');
  assert.deepEqual(ordinary.origin,[7,7,split]);
  const cells=voxels(optIn.compiled);
  // z=7 is the last stair tread with a deliberately absent upper slab.
  // z=8 is the supported landing; both must survive a relief at z=7 or 8.
  assert.equal(includes(cells,3,5,7),true,'last stair tread survives');
  assert.equal(includes(cells,3,6,7),false,'upper stair shaft stays open');
  assert.equal(includes(cells,3,6,8),true,'supported upper landing survives');
  const stairs=auditArchitecturePlanCirculation(optIn);
  assert.equal(stairs.status,'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(stairs.stairFlights[0].clearSupportedTreads,5);
  assert.equal(stairs.stairFlights[0].sourceUpperLandingPass,true);
  assert.equal(includes(cells,3,7,split),false,'threshold is clear');
  assert.equal(includes(cells,7,7,split),false,'room doorway remains clear');
  assert.equal(includes(cells,6,7,split),true,'separate passage preserves intervening wall');
  assert.equal(optIn.worldWrites,0);
  assert.deepEqual(optIn.gates,Array(9).fill('BLOCKED'));
 }
 const unaffected=plan('far-upper-divider',['x','z'],['family lounge','private room']);
 unaffected.footprint={width:24,depth:24};
 unaffected.levels[1].splitPercent=60;
 unaffected.expression={setbackSide:'rear',setbackDepth:3,
  roofProfile:'ridge',roofAxis:'x',facadeLanguage:'plain'};
 const other=compileArchitecturePlan(unaffected,{
  entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
 assert.equal(other.design.elements.some(e=>e.id==='l1-stair-threshold-relief'),false);
 assert.equal(auditR125SourceRoutes(other).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
});
test('model-selected ground entry zone changes real doorway while keeping routes',()=>{
 const base=plan('two-zone-entrance',['x'],['visitor hall','storage room']);
 const snapshot=structuredClone(base);
 const old=compileArchitecturePlan(base,{entrancePlacement:'source-accessible'});
 const first=compileArchitecturePlan({...base,entryZone:'first'},{entrancePlacement:'source-accessible'});
 const second=compileArchitecturePlan({...base,entryZone:'second'},{entrancePlacement:'source-accessible'});
 const door=r=>r.design.elements.find(e=>e.id==='exterior-entrance').origin[0];
 assert.equal(door(first),first.program[0].splitCoordinate-2);
 assert.equal(door(second),second.program[0].splitCoordinate+2);
 assert.equal(old.geometrySha256,first.geometrySha256);
 assert.notEqual(first.geometrySha256,second.geometrySha256);
 for(const p of [first,second]){
  assert.equal(verifyCompiled(p.design,p.compiled),true);
  assert.equal(auditArchitecturePlanCirculation(p).status,'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(auditR125SourceRoutes(p).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.deepEqual(p.gates,Array(9).fill('BLOCKED'));
  assert.equal(p.worldWrites,0);
 }
 assert.deepEqual(base,snapshot);
});

test('small expressive first-zone front entry is not re-filled with HOST glass',()=>{
 const p=plan('small-front-entry',['x'],['public hall','support room']);
 p.footprint={width:16,depth:18};p.levels[0].splitPercent=40;
 p.entryZone='first';
 p.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'};
 const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const e=r.design.elements.find(e=>e.id==='exterior-entrance');
 assert.equal(e.origin[0],r.program[0].splitCoordinate-2);
 assert(!r.design.elements.some(x=>x.id==='l0-window-front-glass'));
 const v=voxels(r.compiled);
 for(let x=e.origin[0];x<e.origin[0]+2;x++)
  for(let y=e.origin[1];y<e.origin[1]+3;y++)
   assert.equal(includes(v,x,y,1),false);
 assert.equal(auditR125SourceRoutes(r).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
});

test('rear z-zone cannot be misrepresented as a direct front entrance',()=>{
 for(const invalid of ['third',null,0])
  assert.throws(()=>compileArchitecturePlan({...plan('bad-entry'),entryZone:invalid}),
   /R125_PLAN_ENTRY_ZONE_FRONT_ACCESS/);
 assert.throws(()=>compileArchitecturePlan({...plan('back-zone',['z']),entryZone:'second'}),
  /R125_PLAN_ENTRY_ZONE_FRONT_ACCESS/);
 const p=compileArchitecturePlan({...plan('front-zone',['z']),entryZone:'first'},
  {entrancePlacement:'source-accessible'});
 assert.equal(auditR125SourceRoutes(p).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
});

test('model-opted ridge changes TRUE indoor volume, with both source-enclosed eaves',()=>{
 const base=plan('roof-volume-studio',['x'],['creation hall','work storage']);
 base.footprint={width:24,depth:28};
 const expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'ridge',roofAxis:'x',facadeLanguage:'plain'};
 const old=compileArchitecturePlan({...base,expression});
 const raised=compileArchitecturePlan({...base,expression:{...expression,roofVolume:'raised'}},
  {entrancePlacement:'source-accessible'});
 const vox=voxels(raised.compiled),legacy=voxels(old.compiled);
 const top=6,x=12,z=12; // 3-block ridge above the old flat ceiling
 assert.equal(includes(legacy,x,top,z),true);
 assert.equal(includes(vox,x,top,z),false);
 assert.equal(includes(vox,x,top+1,z),false);
 assert.equal(includes(vox,x,top+2,z),false);
 assert.equal(includes(vox,x,top+3,z),true);
 assert.equal(includes(vox,x,top,1),true);
 assert.equal(includes(vox,x,top+2,1),true);
 assert.equal(includes(vox,x,top,26),true);
 assert.equal(includes(vox,1,top,z),true);
 assert(!raised.design.elements.some(e=>e.id==='roof-base'));
 assert.equal(verifyCompiled(raised.design,raised.compiled),true);
 assert.notEqual(raised.geometrySha256,old.geometrySha256);
 assert.equal(auditArchitecturePlanCirculation(raised).status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditR125SourceRoutes(raised).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.deepEqual(raised.gates,Array(9).fill('BLOCKED'));
 assert.equal(raised.worldWrites,0);
 assert.equal(raised.inGameWalking,'NOT_TESTED');
});

test('roof volume supports z-axis two-level setback and rejects invalid forms',()=>{
 const base=plan('upper-loft-lab',['x','z'],['public work','private research']);
 base.footprint={width:24,depth:28};
 const expression={setbackSide:'east',setbackDepth:3,
  roofProfile:'ridge',roofAxis:'z',facadeLanguage:'plain',roofVolume:'raised'};
 const raised=compileArchitecturePlan({...base,expression},
  {entrancePlacement:'source-accessible'});
 const vox=voxels(raised.compiled),top=11;
 assert.equal(includes(vox,10,top,12),false);
 assert.equal(includes(vox,10,top+3,12),true);
 assert.equal(includes(vox,1,top+2,12),true);
 assert.equal(includes(vox,19,top+2,12),true);
 assert.equal(auditArchitecturePlanCirculation(raised).status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditR125SourceRoutes(raised).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 // Sawtooth is a new explicitly opt-in real roof-volume form; it must
 // compile to genuine B143 cells. Unsupported flat/imaginary still fail.
 const sawtooth=compileArchitecturePlan({...base,expression:{
  ...expression,roofProfile:'sawtooth'}},
  {entrancePlacement:'source-accessible'});
 assert.equal(verifyCompiled(sawtooth.design,sawtooth.compiled),true);
 assert(!sawtooth.design.elements.some(e=>e.id==='roof-base'));
 const clerestory=sawtooth.design.elements.find(e=>
  e.id==='roof-raised-step-closure-6');
 assert.ok(clerestory);
 assert.equal(clerestory.material,'glass');
 assert.ok(sawtooth.compiled.primitives.some(v=>
  v[0]===clerestory.origin[0]&&v[1]===clerestory.origin[1]&&
  v[2]===clerestory.origin[2]&&v[3]===3));
 assert.notEqual(sawtooth.geometrySha256,raised.geometrySha256);
 assert.equal(sawtooth.worldWrites,0);
 assert.deepEqual(sawtooth.gates,Array(9).fill('BLOCKED'));
 assert.throws(()=>compileArchitecturePlan({...base,expression:{
  ...expression,roofProfile:'flat'}}),/R125_PLAN_EXPRESSION_ROOF_VOLUME/);
 assert.throws(()=>compileArchitecturePlan({...base,expression:{
  ...expression,roofVolume:'imaginary'}}),/R125_PLAN_EXPRESSION_ROOF_VOLUME/);
});

test('raised sawtooth roof turns deep steps into source-backed glazed clerestories on either axis',()=>{
 const base=plan('sawtooth-clerestory',['x'],['workroom','viewing room']);
 base.footprint={width:24,depth:24};
 for(const roofAxis of ['x','z']){
  const original=structuredClone(base);
  const result=compileArchitecturePlan({...base,expression:{
   setbackSide:'none',setbackDepth:0,roofProfile:'sawtooth',roofAxis,
   facadeLanguage:'plain',roofVolume:'raised'}},
   {entrancePlacement:'source-accessible'});
  const pane=result.design.elements.find(e=>
   e.id==='roof-raised-step-closure-6');
  assert.ok(pane,roofAxis);
  assert.equal(pane.material,'glass',roofAxis);
  assert.deepEqual(pane.size,roofAxis==='x'?[1,2,22]:[22,2,1]);
  const actual=new Map(result.compiled.primitives.map(v=>
   [v.slice(0,3).join(','),v[3]]));
  for(let a=0;a<pane.size[0];a++)for(let y=0;y<pane.size[1];y++)
   for(let c=0;c<pane.size[2];c++)
    assert.equal(actual.get([pane.origin[0]+a,pane.origin[1]+y,
     pane.origin[2]+c].join(',')),3,roofAxis);
  assert.equal(verifyCompiled(result.design,result.compiled),true);
  assert.equal(auditArchitecturePlanCirculation(result).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(auditR125SourceRoutes(result).status,
   'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(result.worldWrites,0);
  assert.deepEqual(base,original);
 }
});

test('separate author-raised ridge and L-corner retain authentic Qwen flat-roof SOURCE',()=>{
 const input=JSON.parse(fs.readFileSync(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url),'utf8'));
 const snapshot=structuredClone(input);
 const original=compileArchitecturePlan(input,{entrancePlacement:'source-accessible'});
 assert.equal(original.compiled.primitives.length,1336);
 assert.equal(auditR125SourceRoutes(original).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 for(const [side,axis] of [['east','x'],['west','z']]){
  // This is a separately AUTHORED research choice; not the Qwen raw answer.
  const changed=structuredClone(input);
  changed.id='r125-author-roof-'+side;
  changed.title='Independent study of a raised L-corner roof '+side;
  changed.expression={...changed.expression,
   roofProfile:'ridge',roofAxis:axis,roofVolume:'raised',
   rearCornerCut:{...changed.expression.rearCornerCut,side}};
  const out=compileArchitecturePlan(changed,{entrancePlacement:'source-accessible'});
  assert.equal(verifyCompiled(out.design,out.compiled),true);
  assert.equal(auditR125SourceRoutes(out).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(out.plan.expression.roofProfile,'ridge');
  assert.equal(out.plan.expression.roofVolume,'raised');
  assert(out.design.elements.some(e=>e.id.startsWith('recess-outer-roof-seal-')));
  assert(out.compiled.primitives.length>original.compiled.primitives.length);
  const real=voxels(out.compiled),top=6,cutX=side==='west'?1:19;
  for(let x=cutX;x<cutX+4;x++)for(let z=19;z<23;z++)
   for(let y=1;y<=top+3;y++)
    assert.equal(includes(real,x,y,z),false,'open-air corner remains truly roofless');
  assert.equal(includes(real,10,6,10),false,'old roof becomes usable air');
  assert(real.size>0);
  assert.equal(out.worldWrites,0);
  assert.deepEqual(out.gates,Array(9).fill('BLOCKED'));
 }
 assert.deepEqual(input,snapshot);
 const unsupported=structuredClone(input);
 unsupported.expression.roofProfile='ridge';
 assert.throws(()=>compileArchitecturePlan(unsupported),/EXPRESSION_CORNER_CONFLICT/);
 unsupported.expression.roofVolume='raised';
 unsupported.expression.roofProfile='sawtooth';
 assert.throws(()=>compileArchitecturePlan(unsupported),/EXPRESSION_CORNER_CONFLICT/);
});

test('source-accessible portico relocates blocked entrances without changing AI-selected room',()=>{
 for(const example of [
  {id:'wide-east-portico',w:32,d:26,axis:'x',zone:'second'},
  {id:'compact-z-portico',w:16,d:24,axis:'z',zone:'first'}
 ]){
  const authored=plan(example.id,[example.axis],
   ['customer-facing work area','private preparation area']);
  authored.footprint={width:example.w,depth:example.d};
  authored.entryZone=example.zone;
  authored.expression={setbackSide:'none',setbackDepth:0,
   roofProfile:'flat',roofAxis:'x',facadeLanguage:'recessed-portico'};
  const snapshot=structuredClone(authored);
  const product=compileArchitecturePlan(authored,
   {entrancePlacement:'source-accessible'});
  const door=product.design.elements.find(e=>e.id==='exterior-entrance');
  assert.ok(door,'real B143 entry cut exists');
  assert.equal(door.mode,'cut');
  assert.deepEqual(door.size,[2,3,1]);
  assert.equal(door.origin[2],4,'three-deep covered approach');
  const portico=product.design.elements.find(e=>e.id==='portico-open-forecourt');
  assert.deepEqual(portico.size,[9,4,3]);
  if(example.zone==='second'){
   assert.ok(door.origin[0]>=product.program[0].splitCoordinate,
    'entrance remains in authored second x zone');
  }
  assert.equal(verifyCompiled(product.design,product.compiled),true);
  assert.equal(auditR125SourceRoutes(product).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(auditArchitecturePlanCirculation(product).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.deepEqual(authored,snapshot);
  assert.equal(product.worldWrites,0);
  assert.deepEqual(product.compiled.BuildPlan.operations,[]);
 }
 // Existing 24-wide Qwen corner and its valid portico keep exact voxels
 // and original entry x=10, asserted by the frozen research regression.
});

test('explicit researcher portico is a real three-deep B143 volume, preserves original Qwen, and rejects blocked envelopes',()=>{
 const original=JSON.parse(fs.readFileSync(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url),'utf8'));
 const originalCopy=structuredClone(original);
 const flat=compileArchitecturePlan(original,{entrancePlacement:'source-accessible'});
 assert.equal(flat.compiled.primitives.length,1336);
 const p=structuredClone(original);
 p.id='r125-author-roof-east';
 p.title='Independent study of a raised L-corner roof east';
 p.expression={...p.expression,roofProfile:'ridge',roofAxis:'x',
  roofVolume:'raised',rearCornerCut:{...p.expression.rearCornerCut,side:'east'}};
 const baseline=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 assert.equal(baseline.compiled.primitives.length,1426);
 p.expression.facadeLanguage='recessed-portico';
 const candidate=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const occupied=voxels(candidate.compiled);
 const finalMaterials=new Map(candidate.compiled.primitives.map(v=>
  [v.slice(0,3).join(','),v[3]]));
 assert.equal(candidate.compiled.primitives.length,1445);
 assert.equal(verifyCompiled(candidate.design,candidate.compiled),true);
 const doorway=candidate.design.elements.filter(e=>e.id==='exterior-entrance');
 assert.equal(doorway.length,1);
 assert.deepEqual(doorway[0].origin,[10,2,4]);
 for(let x=10;x<=11;x++)for(let z=1;z<=5;z++){
  assert.equal(includes(occupied,x,1,z),true);
  for(let y=2;y<=4;y++)
   assert.equal(includes(occupied,x,y,z),false,'true clear covered forecourt');
 }
 for(let x=5;x<=8;x++)for(let y=2;y<=4;y++)
  assert.equal(finalMaterials.get([x,y,4].join(',')),3,'true B143 display glazing');
 for(const x of [4,12])for(let z=1;z<=4;z++)
  assert.equal(includes(occupied,x,2,z),true,'real side return wall');
 assert.equal(includes(occupied,8,5,1),true,'real entrance lintel');
 assert.equal(auditR125SourceRoutes(candidate).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(candidate).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(candidate.worldWrites,0);
 assert.equal(candidate.compiled.BuildPlan.operations.length,0);
 assert.deepEqual(candidate.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(original,originalCopy);
 const bad=plan('too-compact-forecourt',['x']);
 bad.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'flat',roofAxis:'x',facadeLanguage:'recessed-portico'};
 assert.throws(()=>compileArchitecturePlan(bad,{entrancePlacement:'source-accessible'}),
  /EXPRESSION_PORTICO_PROGRAM_CONFLICT/);
});

test('source-only split-monitor gives distinct physical roof volumes and open daylight to real interior',()=>{
 const original=JSON.parse(fs.readFileSync(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url),'utf8'));
 const snapshot=structuredClone(original);
 for(const side of ['east','west']){
  const p=structuredClone(original);
  p.id='r125-split-monitor-'+side;
  p.title='Research authored split monitor '+side;
  p.expression={...p.expression,roofProfile:'split-monitor',
   roofAxis:'x',roofVolume:'raised',facadeLanguage:'recessed-portico',
   rearCornerCut:{...p.expression.rearCornerCut,side}};
  const c=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  const vox=voxels(c.compiled),materials=new Map(c.compiled.primitives.map(v=>
   [v.slice(0,3).join(','),v[3]]));
  const xMonitor=c.program[0].splitCoordinate+1;
  assert.equal(verifyCompiled(c.design,c.compiled),true);
  assert.equal(includes(vox,6,6,10),true,'lower real roof');
  assert.equal(includes(vox,16,10,10),true,'upper real roof');
  assert.equal(includes(vox,16,6,10),false,'no false flat room ceiling');
  for(let z=5;z<15;z++)for(let y=7;y<9;y++){
   assert.equal(materials.get([xMonitor,y,z].join(',')),3,'actual glass');
   assert.equal(includes(vox,xMonitor-1,y,z),false,'exterior side air');
   assert.equal(includes(vox,xMonitor+1,y,z),false,'interior side air');
  }
  for(let x=15;x<19;x++)for(let y=7;y<9;y++)
   assert.equal(materials.get([x,y,1].join(',')),3,'front elevated glazing');
  const cutX=side==='west'?1:19;
  for(let x=cutX;x<cutX+4;x++)for(let z=19;z<23;z++)
   for(let y=1;y<12;y++)
    assert.equal(includes(vox,x,y,z),false,'real L courtyard remains outdoors');
  assert.equal(auditArchitecturePlanCirculation(c).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(auditR125SourceRoutes(c).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(c.worldWrites,0);
  assert.deepEqual(c.compiled.BuildPlan.operations,[]);
  assert.deepEqual(c.gates,Array(9).fill('BLOCKED'));
 }
 const invalid=structuredClone(original);
 invalid.expression.roofProfile='split-monitor';
 assert.throws(()=>compileArchitecturePlan(invalid),
  /EXPRESSION_MONITOR_PROGRAM_CONFLICT/);
 invalid.expression.roofVolume='raised';
 invalid.expression.roofAxis='z';
 assert.throws(()=>compileArchitecturePlan(invalid),
  /EXPRESSION_MONITOR_PROGRAM_CONFLICT/);
 assert.deepEqual(original,snapshot);
});

test('physical two-elevation monitor glazing is air-backed and adapts to a compact span',()=>{
 const original=JSON.parse(fs.readFileSync(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url),'utf8'));
 const snapshot=structuredClone(original);
 for(const side of ['east','west']){
  const p=structuredClone(original);
  p.id='r125-monitor-visibility-'+side;
  p.title='Research aligned physical facade '+side;
  p.expression={...p.expression,roofProfile:'split-monitor',
   roofAxis:'x',roofVolume:'raised',facadeLanguage:'recessed-portico',
   rearCornerCut:{...p.expression.rearCornerCut,side}};
  const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  const material=new Map(r.compiled.primitives.map(v=>
   [v.slice(0,3).join(','),v[3]]));
  assert.equal(verifyCompiled(r.design,r.compiled),true);
  assert(r.design.elements.some(e=>e.id==='roof-monitor-ground-light'));
  for(let x=15;x<=18;x++)for(let y of [3,4,7,8]){
   assert.equal(material.get([x,y,1].join(',')),3,'real two-elevation glass');
   assert.equal(material.has([x,y,0].join(',')),false,'external air');
   assert.equal(material.has([x,y,2].join(',')),false,'interior air');
  }
  assert.equal(auditR125SourceRoutes(r).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(r.worldWrites,0);
  assert.deepEqual(r.compiled.BuildPlan.operations,[]);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 }
 const compact=structuredClone(original);
 compact.footprint.depth=16;
 delete compact.expression.rearCornerCut;
 compact.expression={...compact.expression,roofProfile:'split-monitor',
  roofAxis:'x',roofVolume:'raised',facadeLanguage:'recessed-portico'};
 const shorter=compileArchitecturePlan(compact,{entrancePlacement:'source-accessible'});
 const light=shorter.design.elements.find(e=>e.id==='roof-monitor-westerly-light');
 assert.equal(light.size[2],8);
 assert.equal(light.origin[2],5);
 assert.equal(light.origin[2]+light.size[2],13,'two solid far-end cells remain');
 assert.equal(verifyCompiled(shorter.design,shorter.compiled),true);
 assert.deepEqual(original,snapshot);
});

test('model-authored broad L-shaped courts are genuine open-air circulation, not a decorative cut',()=>{
 const frozen=JSON.parse(fs.readFileSync(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url),'utf8'));
 const originalGeometry=compileArchitecturePlan(frozen,
  {entrancePlacement:'source-accessible'}).geometrySha256;
 for(const side of ['east','west'])for(const pitched of [false,true]){
  const p=structuredClone(frozen);
  p.id='broad-court-'+side+(pitched?'-ridge':'-flat');
  p.title='Original broad L-court design '+side;
  p.expression={...p.expression,roofProfile:pitched?'ridge':'flat',
   roofAxis:'x',...(pitched?{roofVolume:'raised'}:{}),
   rearCornerCut:{width:8,depth:8,side,access:'paved'}};
  const unedited=structuredClone(p);
  const b=compileArchitecturePlan(p,
   {entrancePlacement:'source-accessible'});
  const cells=new Map(b.compiled.primitives.map(([x,y,z,m])=>
   [[x,y,z].join(','),m]));
  const startX=side==='west'?1:p.footprint.width-1-8;
  const startZ=p.footprint.depth-1-8;
  let paved=0;
  for(let x=startX;x<startX+8;x++)for(let z=startZ;z<startZ+8;z++){
   assert.ok(cells.has([x,1,z].join(',')),'all 64 outdoor pads exist');
   paved++;
   for(let y=2;y<b.design.bounds.height;y++)
    assert.equal(cells.has([x,y,z].join(',')),false,
     'the authored court must open fully to sky');
  }
  assert.equal(paved,64);
  assert.equal(b.courtyardSourceOnly.status,
   'SOURCE_2_WIDE_PAVED_COURT_REACHABLE');
  assert.equal(verifyCompiled(b.design,b.compiled),true);
  assert.equal(auditR125SourceRoutes(b).status,
   'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(auditArchitecturePlanCirculation(b).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.ok(b.design.elements.some(e=>e.id==='recess-paved-court-access'));
  assert.deepEqual(p,unedited,'never change model-authored raw plan');
  assert.equal(b.worldWrites,0);
  assert.deepEqual(b.compiled.BuildPlan.operations,[]);
 }
 assert.equal(compileArchitecturePlan(frozen,
  {entrancePlacement:'source-accessible'}).geometrySha256,
  originalGeometry,'frozen real Qwen 4x4 L-corner cannot change');
});

test('author-opt-in 4x4 paved outdoor court has a real two-wide route, open sky, and does not rewrite the Qwen L-corner',()=>{
 const original=JSON.parse(fs.readFileSync(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url),'utf8'));
 const frozen=structuredClone(original);
 const legacy=compileArchitecturePlan(original,{entrancePlacement:'source-accessible'});
 assert.equal(legacy.compiled.primitives.length,1336);
 assert.equal(legacy.courtyardSourceOnly,undefined);
 for(const [side,expectedCount,expectedMoves] of [
  ['east',1601,24],['west',1605,22]]){
  const p=structuredClone(original);
  p.id='r125-court-'+side;
  p.title='Author opted in to a paved courtyard '+side;
  p.expression={...p.expression,roofProfile:'split-monitor',roofAxis:'x',
   roofVolume:'raised',facadeLanguage:'recessed-portico',
   rearCornerCut:{...p.expression.rearCornerCut,side,access:'paved'}};
  const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  assert.equal(verifyCompiled(r.design,r.compiled),true);
  assert.equal(r.compiled.primitives.length,expectedCount);
  const occupied=voxels(r.compiled);
  const left=side==='east'?19:1;
  for(let x=left;x<left+4;x++)for(let z=19;z<23;z++){
   assert.equal(includes(occupied,x,1,z),true,'real paved floor');
   for(let y=2;y<r.design.bounds.height;y++)
    assert.equal(includes(occupied,x,y,z),false,'no roof or wall inside court');
  }
  for(let x=left+1;x<left+3;x++)for(let y=2;y<=4;y++)
   assert.equal(includes(occupied,x,y,18),false,'actual indoor/outdoor doorway');
  assert.equal(r.courtyardSourceOnly.status,'SOURCE_2_WIDE_PAVED_COURT_REACHABLE');
  assert.equal(r.courtyardSourceOnly.reachedTwoWidePadCount,12);
  assert.equal(r.courtyardSourceOnly.sourceGraphMoves,expectedMoves);
  assert.equal(r.courtyardSourceOnly.actualMinecraftWalking,'NOT_TESTED');
  assert.equal(auditR125SourceRoutes(r).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(r.worldWrites,0);
  assert.deepEqual(r.compiled.BuildPlan.operations,[]);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 }
 const invalid=structuredClone(original);
 invalid.expression.rearCornerCut={...invalid.expression.rearCornerCut,side:'east',access:'decorative'};
 assert.throws(()=>compileArchitecturePlan(invalid),/R125_PLAN_EXPRESSION_CORNER_CUT/);
 invalid.expression.rearCornerCut.access='paved';
 invalid.expression.rearCornerCut.width=3;
 assert.throws(()=>compileArchitecturePlan(invalid),/R125_PLAN_EXPRESSION_CORNER_CUT/);
 assert.deepEqual(original,frozen);
});

test('explicit east/rear glazing creates real inside/outside daylight without opening an authored room divider',()=>{
 const original=JSON.parse(fs.readFileSync(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url),'utf8'));
 const snapshot=structuredClone(original);
 for(const [side,n,expected] of [['east',1601,60],['west',1605,58]]){
  const p=structuredClone(original);
  p.id='authored-daylight-'+side;
  p.title='Author chose east and rear glazing '+side;
  p.expression={...p.expression,roofProfile:'split-monitor',
   roofAxis:'x',roofVolume:'raised',facadeLanguage:'recessed-portico',
   rearCornerCut:{...p.expression.rearCornerCut,side,access:'paved'}};
  const baseline=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  p.expression.daylightFacade='east-and-rear-bays';
  const candidate=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  const a=new Map(baseline.compiled.primitives.map(v=>
   [v.slice(0,3).join(','),v[3]]));
  const b=new Map(candidate.compiled.primitives.map(v=>
   [v.slice(0,3).join(','),v[3]]));
  assert.equal(baseline.compiled.primitives.length,n);
  assert.equal(candidate.compiled.primitives.length,n);
  assert.equal(verifyCompiled(candidate.design,candidate.compiled),true);
  let changed=0;
  for(const [k,m] of b)if(a.get(k)!==m){
   changed++;assert.equal(a.get(k),0);assert.equal(m,3);
  }
  assert.equal(changed,expected,'only genuine existing stone converted');
  const open=[];
  for(const z of [5,6,7,8,13,14,15,16])
   for(const y of [3,4,7,8])
    open.push([[22,y,z],[21,y,z],[23,y,z]]);
  const start=side==='west'?6:3;
  for(const x of [
   ...Array.from({length:3},(_,i)=>start+i),
   ...Array.from({length:side==='west'?2:3},(_,i)=>start+4+i)])
   for(const y of [3,4])
    open.push([[x,y,22],[x,y,21],[x,y,23]]);
  for(let x=14;x<=17;x++)for(const y of [3,4,7,8])
   open.push([[x,y,22],[x,y,21],[x,y,23]]);
  assert.equal(open.length,expected);
  for(const [pane,inside,outside] of open){
   assert.equal(b.get(pane.join(',')),3,'real B143 glazed wall');
   assert.equal(b.has(inside.join(',')),false,'actual indoor air');
   assert.equal(b.has(outside.join(',')),false,'actual outdoor air');
  }
  if(side==='west')assert.equal(b.get('12,3,22'),0,
   'author-chosen room divider remains stone');
  assert.equal(candidate.courtyardSourceOnly.status,
   'SOURCE_2_WIDE_PAVED_COURT_REACHABLE');
  assert.equal(auditR125SourceRoutes(candidate).status,
   'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(candidate.worldWrites,0);
  assert.deepEqual(candidate.compiled.BuildPlan.operations,[]);
  assert.deepEqual(candidate.gates,Array(9).fill('BLOCKED'));
 }
 const invalid=structuredClone(original);
 invalid.id='invalid-daylight';
 invalid.title='Unsupported daylight contract';
 invalid.expression={...invalid.expression,roofProfile:'split-monitor',
  roofAxis:'x',roofVolume:'raised',facadeLanguage:'recessed-portico',
  rearCornerCut:{...invalid.expression.rearCornerCut,side:'east',access:'paved'},
  daylightFacade:'unknown'};
 assert.throws(()=>compileArchitecturePlan(invalid),
  /EXPRESSION_DAYLIGHT_FACADE_CONFLICT/);
 invalid.expression.daylightFacade='east-and-rear-bays';
 invalid.expression.roofProfile='ridge';
 assert.throws(()=>compileArchitecturePlan(invalid),
  /EXPRESSION_DAYLIGHT_FACADE_CONFLICT/);
 assert.deepEqual(original,snapshot);
});

test('explicit one-cell two-volume roof eaves alter actual B143 skyline while preserving the paved courtyard and old author',()=>{
 const original=JSON.parse(fs.readFileSync(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url),'utf8'));
 const snapshot=structuredClone(original);
 assert.equal(compileArchitecturePlan(original,
  {entrancePlacement:'source-accessible'}).compiled.primitives.length,1336);
 for(const [side,size,expected] of [
  ['east',4,1717],['west',4,1721],['east',5,1708],['west',5,1712]]){
  const p=structuredClone(original);
  p.id='r125-author-eave-'+side+'-'+size;
  p.title='Author-specified one-cell shaded roof '+side+' '+size;
  p.expression={...p.expression,roofProfile:'split-monitor',roofAxis:'x',
   roofVolume:'raised',facadeLanguage:'recessed-portico',
   rearCornerCut:{side,width:size,depth:size,access:'paved'},
   daylightFacade:'east-and-rear-bays'};
  const previous=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  p.expression.roofOverhang='one-block';
  const actual=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  assert.equal(actual.compiled.primitives.length,expected);
  assert.equal(verifyCompiled(actual.design,actual.compiled),true);
  const a=new Map(previous.compiled.primitives.map(v=>
   [v.slice(0,3).join(','),v[3]]));
  const b=new Map(actual.compiled.primitives.map(v=>
   [v.slice(0,3).join(','),v[3]]));
  let added=0;
  for(const [k,v] of a)assert.equal(b.get(k),v,'no authored voxel changed');
  for(const [k,v] of b)if(!a.has(k)){
   assert.equal(v,4,'the authored wood roof material is reused');
   added++;
  }
  assert.equal(added,116,'true eave solids, not a texture swap');
  const start=side==='west'?1:23-size;
  const end=side==='west'?1+size:23;
  assert.equal(end-start,size,'sky-open court X span matches authored corner width');
  for(let x=start;x<end;x++)for(let z=23-size;z<23;z++){
   assert.equal(b.get([x,1,z].join(',')),4,'paved wooden courtyard floor');
   for(let y=2;y<actual.design.bounds.height;y++)
    assert.equal(b.has([x,y,z].join(',')),false,'the court stays sky-open');
  }
  assert.equal(actual.courtyardSourceOnly.status,
   'SOURCE_2_WIDE_PAVED_COURT_REACHABLE');
  assert.equal(auditR125SourceRoutes(actual).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(actual.worldWrites,0);
  assert.deepEqual(actual.compiled.BuildPlan.operations,[]);
  assert.deepEqual(actual.gates,Array(9).fill('BLOCKED'));
 }
 const bad=structuredClone(original);
 bad.expression.roofOverhang='one-block';
 assert.throws(()=>compileArchitecturePlan(bad),
  /EXPRESSION_ROOF_OVERHANG_CONFLICT/);
 assert.deepEqual(original,snapshot);
});

test('model-selected fixtures become B143 voxels and retain reachable two-wide service side',()=>{
 const authored=plan('model-fixture-shop',['x'],['retail display','staff workshop']);
 authored.levels[0].spaces[0].fixture='display';
 authored.levels[0].spaces[1].fixture='workbench';
 const legacy=structuredClone(authored);
 delete legacy.levels[0].spaces[0].fixture;
 delete legacy.levels[0].spaces[1].fixture;
 const options={entrancePlacement:'source-accessible'};
 const baseline=compileArchitecturePlan(legacy,options);
 const built=compileArchitecturePlan(authored,options);
 assert.equal(built.fixtureTargets.length,2);
 assert.notEqual(baseline.geometrySha256,built.geometrySha256);
 assert.ok(built.design.elements.some(e=>e.id==='fx-l0-z0-glass'));
 assert.ok(built.design.elements.some(e=>e.id==='fx-l0-z1-top'));
 const routes=auditR125SourceRoutes(built,{featureTargets:built.fixtureTargets});
 assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(routes.featureAccess.every(x=>x.reachableFromEntrance&&
  x.supportedTwoWideServiceWitness!==null));
 assert.equal(auditArchitecturePlanCirculation(built).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(built.worldWrites,0);
 assert.deepEqual(built.compiled.BuildPlan.operations,[]);
 assert.ok(built.gates.every(g=>g==='BLOCKED'));
});

test('model high window falls back to a smaller real glazed bay only when full 5-wide fails',()=>{
 const p=plan('test-clerestory-narrow-wall',['x'],
  ['assembly workspace','storage']);
 p.footprint={width:24,depth:24};
 const shell=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const selected=structuredClone(p);
 selected.levels[0].spaces[0].daylight='clerestory';
 const area=shell.program[0].zones[0].range;
 const y=shell.program[0].standingFloorY+2;
 const openX=[7,8,9];
 const blocking=[];
 const box=(id,x,z)=>blocking.push({id,shape:'box',mode:'add',
  material:'metal',origin:[x,y,z],size:[1,1,1]});
 for(let x=area.x[0];x<=area.x[1];x++){
  if(!openX.includes(x))box('blocked-front-'+x,x,0);
  box('blocked-rear-'+x,x,p.footprint.depth-1);
 }
 for(let z=area.z[0];z<=area.z[1];z++)
  box('blocked-west-'+z,0,z);
 const design={...shell.design,elements:[...shell.design.elements,...blocking]};
 const compiled=compileDesign(design);
 assert.equal(verifyCompiled(design,compiled),true);
 const source={...shell,plan:selected,design,compiled,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256};
 const outcome=addAuthoredRoomDaylight(source,{
  auditCirculation:auditArchitecturePlanCirculation});
 assert.equal(outcome.daylightTargets.length,1);
 const win=outcome.daylightTargets[0];
 assert.equal(win.face,'front');
 assert.equal(win.kind,'clerestory');
 assert.equal(win.origin[0],7);
 assert.deepEqual(win.size,[3,1,1]);
 assert.equal(win.adaptedWidthFrom,5);
 assert.equal(win.outsideAirVerified,true);
 assert.equal(win.sillLintelVerified,true);
 assert.equal(auditR125SourceRoutes(outcome).status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(outcome).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.deepEqual(outcome.compiled.BuildPlan.operations,[]);
 assert.equal(outcome.worldWrites,0);
});
test('unsupported high window fails with bounded reasons and no false SOURCE promotion',()=>{
 const p=plan('test-clerestory-hold',['x'],
  ['assembly workspace','control room']);
 p.footprint={width:24,depth:24};
 const shell=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const selected=structuredClone(p);
 selected.levels[0].spaces[0].daylight='clerestory';
 const area=shell.program[0].zones[0].range;
 const y=shell.program[0].standingFloorY+2;
 const blocks=[];
 const at=(id,x,z)=>blocks.push({id,shape:'box',mode:'add',
  material:'metal',origin:[x,y,z],size:[1,1,1]});
 for(let x=area.x[0];x<=area.x[1];x++){
  at('block-front-'+x,x,0);
  at('block-rear-'+x,x,p.footprint.depth-1);
 }
 for(let z=area.z[0];z<=area.z[1];z++)at('block-west-'+z,0,z);
 const design={...shell.design,elements:[...shell.design.elements,...blocks]};
 const compiled=compileDesign(design);
 const source={...shell,plan:selected,design,compiled,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256};
 let error;
 try{addAuthoredRoomDaylight(source,{
  auditCirculation:auditArchitecturePlanCirculation});}
 catch(e){error=e;}
 assert.equal(error?.message,
  'R125_PLAN_DAYLIGHT_NO_SUPPORTED_EXTERIOR_BAY_area-0a');
 assert.deepEqual(error.daylightPlacement.attemptedWidths,[5,4,3]);
 assert.ok(error.daylightPlacement.candidatesEvaluated>0);
 assert.ok(error.daylightPlacement.rejected.EXTERIOR_AIR_BLOCKED>0);
 assert.equal(error.daylightPlacement.originalPlanEdited,false);
 assert.equal(error.daylightPlacement.worldWrites,0);
 assert.equal(shell.worldWrites,0);
});
test('a solid-only daylight replacement retains true SOURCE routes and all occupied coordinates',()=>{
 const original=plan('daylight-no-air-change',['x']);
 original.footprint={width:24,depth:24};
 const before=compileArchitecturePlan(original,{entrancePlacement:'source-accessible'});
 const light=structuredClone(original);
 light.levels[0].spaces[0].daylight='clerestory';
 const after=compileArchitecturePlan(light,{entrancePlacement:'source-accessible'});
 assert.equal(after.daylightTargets.length,1);
 const occupied=out=>new Set(out.compiled.primitives.map(v=>v.slice(0,3).join(',')));
 assert.deepEqual(occupied(after),occupied(before),
  'A wall->glass window MUST NOT change what is solid');
 assert.equal(auditArchitecturePlanCirculation(before).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditArchitecturePlanCirculation(after).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditR125SourceRoutes(after).status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(after.worldWrites,0);
});
test('already broken base building reports actual circulation failure before daylight candidates',()=>{
 const sourcePlan=plan('daylight-preexisting-zone-block',['x']);
 sourcePlan.footprint={width:24,depth:24};
 const baseline=compileArchitecturePlan(sourcePlan,
  {entrancePlacement:'source-accessible'});
 const selected=structuredClone(sourcePlan);
 selected.levels[0].spaces[1].daylight='clerestory';
 const zone=baseline.program[0].zones[0].range;
 const obstruction={id:'block-entire-left-room',shape:'box',
  mode:'add',material:'metal',
  origin:[zone.x[0],baseline.program[0].standingFloorY,zone.z[0]],
  size:[zone.x[1]-zone.x[0]+1,2,zone.z[1]-zone.z[0]+1]};
 const design={...baseline.design,
  elements:[...baseline.design.elements,obstruction]};
 const compiled=compileDesign(design);
 assert.equal(verifyCompiled(design,compiled),true);
 const shell={...baseline,plan:selected,design,compiled,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 const baseResult=auditArchitecturePlanCirculation(shell);
 assert.ok(baseResult.failures.some(x=>
  x.code==='ZONE_HAS_NO_TWO_WIDE_CLEAR_SOURCE_FLOOR'));
 let error=null;
 try{addAuthoredRoomDaylight(shell,
  {auditCirculation:auditArchitecturePlanCirculation});}
 catch(e){error=e;}
 assert.equal(error?.message,
  'R125_PLAN_DAYLIGHT_BASELINE_SOURCE_HOLD_area-0b');
 assert.equal(error?.daylightPlacement?.candidatesEvaluated,0);
 assert.equal(error?.daylightPlacement?.upstreamOfWindow,true);
 assert.ok(error.daylightPlacement.baselineCirculationFailures.some(x=>
  x.code==='ZONE_HAS_NO_TWO_WIDE_CLEAR_SOURCE_FLOOR'));
 assert.equal(error.daylightPlacement.originalPlanEdited,false);
 assert.equal(error.daylightPlacement.modelCalls,0);
 assert.equal(error.daylightPlacement.worldWrites,0);
 assert.equal(baseline.worldWrites,0);
});
test('model-selected wide-bay and clerestory create real glass with exterior AIR',()=>{
 const p=plan('daylight-shop',['x'],['customer retail','making lab']);
 p.footprint={width:24,depth:24};
 p.levels[0].spaces[0].daylight='wide-bay';
 p.levels[0].spaces[1].daylight='clerestory';
 const original=structuredClone(p);
 original.levels[0].spaces.forEach(s=>delete s.daylight);
 const baseline=compileArchitecturePlan(original,{entrancePlacement:'source-accessible'});
 const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 assert.equal(built.daylightTargets.length,2);
 assert.notEqual(baseline.geometrySha256,built.geometrySha256);
 assert.equal(verifyCompiled(built.design,built.compiled),true);
 const map=new Map(built.compiled.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 for(const b of built.daylightTargets){
  assert.equal(b.outsideAirVerified,true);
  const [x,y,z]=b.origin,[sx,sy,sz]=b.size;
  assert.equal(Math.max(sx,sz),b.kind==='wide-bay'?4:5);
  for(let i=x;i<x+sx;i++)for(let yy=y;yy<y+sy;yy++)
   for(let j=z;j<z+sz;j++){
    assert.equal(map.get([i,yy,j].join(',')),3);
    const outside=b.face==='front'?[i,yy,j-1]:
     b.face==='rear'?[i,yy,j+1]:
     b.face==='east'?[i+1,yy,j]:[i-1,yy,j];
    assert.equal(map.has(outside.join(',')),false);
   }
 }
 assert.equal(auditR125SourceRoutes(built).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(built).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.deepEqual(built.compiled.BuildPlan.operations,[]);
});
test('window-to-room viewing band stays two adjacent clear columns on all four facades',()=>{
 const scenarios=[
  {face:'front',origin:[3,3,1],size:[4,2,1],inside:(u,y)=>[3+u,y,2]},
  {face:'rear',origin:[3,3,14],size:[4,2,1],inside:(u,y)=>[3+u,y,13]},
  {face:'east',origin:[14,3,3],size:[1,2,4],inside:(u,y)=>[13,y,3+u]},
  {face:'west',origin:[1,3,3],size:[1,2,4],inside:(u,y)=>[2,y,3+u]}
 ];
 for(const item of scenarios){
  const t={zoneId:'shared-room',kind:'wide-bay',face:item.face,
   origin:item.origin,size:item.size};
  const scene=positions=>({primitives:positions.map(p=>[...p,0,0])});
  const view=vox=>auditR125FixtureDaylightView(scene(vox),[t]);
  assert.equal(view([]).status,'DAYLIGHT_VIEW_CLEAR',item.face);
  // Three blocked neighbors leave only a single clear column.
  const blocked=[0,1,2].map(u=>item.inside(u,3));
  assert.equal(view(blocked).status,'DAYLIGHT_VIEW_HOLD',item.face);
  assert.equal(view(blocked).blocked[0].maxClearAdjacentColumns,1);
  // Blocking one edge still leaves at least two adjacent clear positions.
  assert.equal(view([item.inside(0,4)]).status,'DAYLIGHT_VIEW_CLEAR');
  assert.equal(view([]).windowCount,1);
 }
 assert.equal(auditR125FixtureDaylightView(sceneForNoWindows(),[]).status,
  'NO_AUTHORED_DAYLIGHT');
 function sceneForNoWindows(){return {primitives:[]};}
});
test('window and authored equipment retain a real SOURCE-visible aperture across uses',()=>{
 for(const [id,roomOne,roomTwo,feature] of [
  ['home-view','Living room','Sleep and study','desk'],
  ['shop-view','Customer display','Back-room storage','display'],
  ['laboratory-view','Analysis lab','Visitor interpretation','electronics']
 ]){
  const p=plan(id,['x'],[roomOne,roomTwo]);
  p.footprint={width:24,depth:24};
  p.levels[0].spaces[0].daylight='wide-bay';
  // New equipment roles belong to the explicit model-owned fixtures array.
  p.levels[0].spaces[0].fixtures=[feature];
  p.levels[0].spaces[1].daylight='clerestory';
  const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  assert.equal(built.daylightTargets.length,2,id);
  assert.equal(built.fixtureTargets.length,1,id);
  const v=auditR125FixtureDaylightView(built.compiled,built.daylightTargets);
  assert.equal(v.status,'DAYLIGHT_VIEW_CLEAR',id);
  assert.equal(v.blocked.length,0);
  assert.equal(auditR125SourceRoutes(built,{featureTargets:built.fixtureTargets}).status,
   'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(verifyCompiled(built.design,built.compiled),true);
  assert.equal(built.worldWrites,0);
 }
});
test('model-selected daylight and real furniture coexist with a raised roof',()=>{
 const p=plan('daylight-maker',['z'],['visitor display','private workbench']);
 p.footprint={width:24,depth:28};
 p.levels[0].spaces[0].daylight='wide-bay';
 p.levels[0].spaces[1].daylight='clerestory';
 p.levels[0].spaces[0].fixture='display';
 p.levels[0].spaces[1].fixture='workbench';
 p.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'ridge',roofAxis:'x',roofVolume:'raised',facadeLanguage:'fins'};
 const result=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 assert.equal(result.daylightTargets.length,2);
 assert.equal(result.fixtureTargets.length,2);
 const routes=auditR125SourceRoutes(result,{featureTargets:result.fixtureTargets});
 assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(verifyCompiled(result.design,result.compiled),true);
 assert.deepEqual(result.compiled.BuildPlan.operations,[]);
});
test('model-selected paired exterior window bays are genuinely distinct, air-backed and reachable',()=>{
 const p=plan('dual-daylight-laboratory',['x'],
  ['Coastal laboratory with two viewing directions','Visitor room']);
 p.footprint={width:30,depth:30};
 p.levels[0].spaces[0].daylight='paired-bays';
 p.levels[0].spaces[0].fixtures=['workbench'];
 const unchanged=structuredClone(p);
 const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 assert.deepEqual(p,unchanged,'original AI plan is not edited');
 assert.equal(built.daylightTargets.length,2);
 assert.deepEqual(built.daylightTargets.map(t=>t.paneIndex),[0,1]);
 assert.equal(new Set(built.daylightTargets.map(t=>t.face)).size,2,
  'prefer two independent facade views when original room has both');
 assert.equal(built.design.elements.filter(e=>
  /^daylight-l0-z0-p[01]-glass$/.test(e.id)).length,2);
 assert.equal(auditR125FixtureDaylightView(
  built.compiled,built.daylightTargets).status,'DAYLIGHT_VIEW_CLEAR');
 assert.equal(built.fixtureTargets.length,1);
 const viewpoints=auditR125PairedBayApproach(built);
 assert.equal(viewpoints.status,'PAIRED_BAY_APPROACH_PASS',
  JSON.stringify(viewpoints.blocked));
 assert.equal(viewpoints.windowCount,2);
 assert(viewpoints.witnesses.every(w=>
  w.reachableFromEntrance&&w.supportedTwoWideServiceWitness!==null));
 assert.equal(viewpoints.actualMinecraftWalking,'NOT_TESTED');
 const route=auditR125SourceRoutes(built,{featureTargets:built.fixtureTargets});
 assert.equal(route.status,'SOURCE_ROUTES_REACH_ALL_ZONES',
  JSON.stringify(route.issues));
 assert.equal(route.featureAccess.length,1);
 assert.equal(route.featureAccess[0].reachableFromEntrance,true);
 assert.equal(auditArchitecturePlanCirculation(built).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(verifyCompiled(built.design,built.compiled),true);
 assert.deepEqual(built.compiled.BuildPlan.operations,[]);
 assert.equal(built.worldWrites,0);
 const single=structuredClone(p);
 single.levels[0].spaces[0].daylight='wide-bay';
 const old=compileArchitecturePlan(single,{entrancePlacement:'source-accessible'});
 assert.equal(old.daylightTargets.length,1,'legacy single bay is unchanged');
});
test('window approach witnesses require the interior face, not an exterior shortcut',()=>{
 const p=plan('paired-interior-only',['x'],
  ['Working laboratory','Visitor interpretation area']);
 p.footprint={width:30,depth:30};
 p.levels[0].spaces[0].daylight='paired-bays';
 const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const result=auditR125PairedBayApproach(built);
 assert.equal(result.status,'PAIRED_BAY_APPROACH_PASS');
 assert.equal(result.witnesses.length,2);
 for(const w of result.witnesses)
  assert(['near','far','left','right'].includes(w.sourceServiceSide));
 const target=built.daylightTargets.find(x=>x.face==='front');
 assert(target,'one genuinely exterior front bay exists');
 const wrongSide={id:'outside-shortcut',zoneId:target.zoneId,
  origin:[target.origin[0],built.program[0].standingFloorY,target.origin[2]],
  size:[target.size[0],3,target.size[2]],requiredServiceSide:'near'};
 const bad=auditR125SourceRoutes(built,{featureTargets:[wrongSide]});
 assert.equal(bad.status,'HOLD_SOURCE_ROUTES');
 assert.equal(bad.featureAccess[0].reachableFromEntrance,false,
  'an exterior approach must not be mistaken for a usable indoor view');
 assert.throws(()=>auditR125SourceRoutes(built,{
  featureTargets:[{...wrongSide,requiredServiceSide:'diagonal'}]
 }),/INVALID_FEATURE_SERVICE_SIDE/);
 assert.equal(result.worldWrites,0);
});
test('opt-in daylight does not change legacy and rejects bogus choices',()=>{
 const p=plan('daylight-legacy',['x']);
 assert.equal(compileArchitecturePlan(p).sourceSha256,
  compileArchitecturePlan(structuredClone(p)).sourceSha256);
 p.levels[0].spaces[0].daylight='unbounded-window';
 assert.throws(()=>compileArchitecturePlan(p),/R125_PLAN_SPACE_DAYLIGHT_ROLE/);
});

test('unknown room utility is rejected; legacy source remains identical',()=>{
 const p=plan('fixture-compatibility',['z']);
 const first=compileArchitecturePlan(p);
 assert.equal(compileArchitecturePlan(structuredClone(p)).sourceSha256,
  first.sourceSha256);
 p.levels[0].spaces[0].fixture='nonexistent-role';
 assert.throws(()=>compileArchitecturePlan(p),/R125_PLAN_SPACE_FIXTURE_ROLE/);
});

test('failed furniture placement preserves source and reports exact candidate failure reasons',()=>{
 const p=plan('trace-room-placement',['x']);
 const base=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const originalGeometry=base.geometrySha256;
 const authored={...base,plan:structuredClone(base.plan)};
 authored.plan.levels[0].spaces[0].fixtures=['workbench'];
 let failure=null;
 try {
  // Deliberately fail circulation after the exact real B143 access checks,
  // proving the diagnostic is tied to a precise authored room and candidate.
  addAuthoredRoomFixtures(authored,{auditCirculation:()=>({
   status:'SOURCE_CLEARANCE_PROBES_HOLD',
   failures:[{code:'TEST_CIRCULATION_REFUSAL'}]
  })});
 } catch(e) { failure=e; }
 assert.equal(failure?.message,'R125_PLAN_FIXTURE_NO_REACHABLE_POSITION');
 const diag=failure.fixturePlacement;
 assert.equal(diag.schema,'r125-fixture-placement-failure-v1');
 assert.equal(diag.failed.zoneId,'area-0a');
 assert.equal(diag.failed.kind,'workbench');
 assert.equal(diag.failed.level,0);
 assert.ok(diag.candidateCount>9);
 assert.equal(diag.rejectedCandidates.length,diag.candidateCount);
 assert.ok(diag.rejectedCandidates.every(x=>
  x.reason==='OUTSIDE_AUTHORED_ZONE'||
  x.reason==='UNSUPPORTED_FLOOR'||
  x.reason==='EXISTING_VOXEL_COLLISION'||
  x.reason==='SOURCE_SERVICE_ACCESS_HOLD'||
  x.reason==='SOURCE_CIRCULATION_HOLD'||
  x.reason==='PROGRAM_FLOOR_COMPONENT_COUNT_CHANGED'));
 assert.equal(diag.modelCalls,0);
 assert.equal(diag.worldWrites,0);
 assert.equal(base.geometrySha256,originalGeometry);
 assert.equal(verifyCompiled(base.design,base.compiled),true);
});

test('zone-local backtracking changes only positions and retains all SOURCE checks',()=>{
 const p=plan('locally-rearranged-lab',['x'],
  ['multipurpose equipment studio','visitor space']);
 p.footprint={width:30,depth:30};
 const shell=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const single=structuredClone(p);
 single.levels[0].spaces[0].fixtures=['seating'];
 const authored={...shell,plan:single};
 const first=addAuthoredRoomFixtures(authored,{
  auditCirculation:auditArchitecturePlanCirculation
 }).fixtureTargets[0].origin;
 p.levels[0].spaces[0].fixtures=['seating','desk'];
 const withTwo={...shell,plan:p};
 const strict=trial=>{
  const original=auditArchitecturePlanCirculation(trial);
  if(original.status!=='SOURCE_CLEARANCE_PROBES_PASS')return original;
  const seat=trial.design.elements.find(e=>e.id==='fx-l0-z0-i0-seat');
  const desk=trial.design.elements.find(e=>e.id==='fx-l0-z0-i1-desk-top');
  // A synthetic layout preference forces the usual greedy seat placement
  // to fail only AFTER the second role. The SOURCE route auditor is real.
  if(seat&&desk&&seat.origin.join(',')===first.join(','))
   return {status:'SOURCE_CLEARANCE_PROBES_HOLD',
    failures:[{code:'TEST_UNPREFERRED_SEAT_POSITION'}]};
  return original;
 };
 const rebuilt=addAuthoredRoomFixtures(withTwo,{auditCirculation:strict});
 assert.equal(rebuilt.fixtureTargets.length,2);
 assert.equal(rebuilt.fixtureTargets[0].kind,'seating');
 assert.equal(rebuilt.fixtureTargets[1].kind,'desk');
 assert.notDeepEqual(rebuilt.fixtureTargets[0].origin,first);
 assert.equal(rebuilt.fixtureSearch?.length,1);
 assert.equal(rebuilt.fixtureSearch[0].arrangementFound,true);
 assert.equal(rebuilt.fixtureSearch[0].searchLimitReached,false);
 assert.ok(rebuilt.fixtureSearch[0].candidateEvaluations<=360);
 assert.equal(auditR125SourceRoutes(rebuilt,{
  featureTargets:rebuilt.fixtureTargets}).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(rebuilt).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.deepEqual(rebuilt.compiled.BuildPlan.operations,[]);
 assert.equal(rebuilt.worldWrites,0);
 assert.equal(shell.geometrySha256,
  compileArchitecturePlan(p.levels[0].spaces[0].fixtures===undefined?
   p:({...p,levels:p.levels.map(l=>({...l,spaces:l.spaces.map(s=>
    ({id:s.id,purpose:s.purpose}))}))}),
   {entrancePlacement:'source-accessible'}).geometrySha256);
});
test('rotation fallback can free a two-wide passage alongside a shallow fixture',()=>{
 const p=plan('narrow-research-layout',['x'],
  ['small electronics control zone','utility corridor']);
 p.footprint={width:30,depth:30};
 const base=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const firstZone=base.program[0].zones[0];
 const originalRange=firstZone.range.x;
 // Simulate the actual 3-wide program subzone without changing model
 // source geometry or providing an edited model response.
 firstZone.range.x=[originalRange[0],originalRange[0]+2];
 const authored=structuredClone(p);
 authored.levels[0].spaces[0].fixtures=['desk','storage'];
 const source={...base,plan:authored};
 const audit=trial=>{
  const clear=auditArchitecturePlanCirculation(trial);
  if(clear.status!=='SOURCE_CLEARANCE_PROBES_PASS')return clear;
  const desk=trial.design.elements.find(e=>e.id==='fx-l0-z0-i0-desk-top');
  const storage=trial.design.elements.find(e=>e.id==='fx-l0-z0-i1-top-shelf');
  // Require both genuinely distinct roles to have independent access.
  // This blocks the default full-width desk after the second role, while
  // allowing the same equipment to rotate along the real room wall.
  if(desk&&storage&&desk.size[0]===3)
   return {status:'SOURCE_CLEARANCE_PROBES_HOLD',
    failures:[{code:'TEST_BLOCKED_TWO_WIDE_SIDE'}]};
  return clear;
 };
 const out=addAuthoredRoomFixtures(source,{auditCirculation:audit});
 assert.equal(out.fixtureTargets.length,2);
 assert.equal(out.fixtureTargets[0].kind,'desk');
 assert.equal(out.fixtureTargets[1].kind,'storage');
 assert.equal(out.fixtureTargets[0].orientation,'quarter-turn');
 assert.deepEqual(out.fixtureTargets[0].size,[1,3,3]);
 const deskPart=out.design.elements.find(e=>e.id==='fx-l0-z0-i0-desk-top');
 assert.deepEqual(deskPart.size,[1,1,3]);
 assert.equal(out.fixtureSearch.length,1);
 assert.equal(out.fixtureSearch[0].arrangementFound,true);
 assert.ok(out.fixtureSearch[0].rotatedCandidateEvaluations>0);
 assert.ok(out.fixtureSearch[0].candidateEvaluations<=540);
 assert.equal(auditR125SourceRoutes(out,{
  featureTargets:out.fixtureTargets}).status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(out).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(verifyCompiled(out.design,out.compiled),true);
 assert.equal(base.worldWrites,0);
 assert.equal(out.worldWrites,0);
});
test('one room can hold genuinely different reachable bed and desk and storage',()=>{
 const p=plan('inhabited-home',['x'],['sleeping and personal study','living']);
 p.footprint={width:30,depth:30};
 p.levels[0].spaces[0].fixtures=['bed','desk','storage'];
 p.levels[0].spaces[1].fixtures=['seating','washbasin'];
 const before=structuredClone(p);
 before.levels[0].spaces.forEach(s=>delete s.fixtures);
 const noFurniture=compileArchitecturePlan(before,{entrancePlacement:'source-accessible'});
 const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 assert.equal(built.fixtureTargets.length,5);
 assert.equal(new Set(built.fixtureTargets.map(x=>x.id)).size,5);
 assert.deepEqual(built.fixtureTargets.map(x=>x.kind),
  ['bed','desk','storage','seating','washbasin']);
 assert.notEqual(built.geometrySha256,noFurniture.geometrySha256);
 const voxels=new Set(built.compiled.primitives.map(x=>x.slice(0,3).join(',')));
 const bed=built.fixtureTargets[0];
 assert.equal(bed.size[2],4);
 assert.equal(voxels.has([bed.origin[0]+1,bed.origin[1]+1,bed.origin[2]+1].join(',')),true);
 const audit=auditR125SourceRoutes(built,{featureTargets:built.fixtureTargets});
 assert.equal(audit.status,'SOURCE_ROUTES_REACH_ALL_ZONES',JSON.stringify(audit.issues));
 assert.equal(audit.featureAccess.length,5);
 assert.ok(audit.featureAccess.every(x=>x.reachableFromEntrance));
 assert.equal(auditArchitecturePlanCirculation(built).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.deepEqual(built.compiled.BuildPlan.operations,[]);
 assert.equal(built.worldWrites,0);
});

test('electronics research room has distinct real voxel equipment and still opens to circulation',()=>{
 const p=plan('functional-electronics',['z'],
  ['electronics prototyping laboratory','record keeping']);
 p.footprint={width:30,depth:30};
 p.levels[0].spaces[0].fixtures=['electronics','workbench','storage'];
 p.levels[0].spaces[1].fixtures=['desk','display'];
 const out=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 assert.deepEqual(out.fixtureTargets.map(t=>t.kind),
  ['electronics','workbench','storage','desk','display']);
 const audit=auditR125SourceRoutes(out,{featureTargets:out.fixtureTargets});
 assert.equal(audit.status,'SOURCE_ROUTES_REACH_ALL_ZONES',JSON.stringify(audit.issues));
 assert.ok(audit.featureAccess.every(x=>x.reachableFromEntrance));
 assert.equal(verifyCompiled(out.design,out.compiled),true);
 assert.deepEqual(out.compiled.BuildPlan.operations,[]);
});

test('two model-authored workbenches in one real laboratory remain separate and reachable',()=>{
 const p=plan('repeated-authored-lab',['x'],
  ['independent water sample stations','visitor observation room']);
 p.footprint={width:30,depth:30};
 p.levels[0].spaces[0].fixtures=['workbench','workbench','storage'];
 const original=structuredClone(p);
 const without=structuredClone(p);
 delete without.levels[0].spaces[0].fixtures;
 const base=compileArchitecturePlan(without,{entrancePlacement:'source-accessible'});
 const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 assert.deepEqual(p,original,'author original is never edited');
 assert.equal(built.fixtureTargets.length,3);
 assert.deepEqual(built.fixtureTargets.map(f=>f.kind),
  ['workbench','workbench','storage']);
 const [first,second]=built.fixtureTargets;
 assert.notEqual(first.id,second.id,'each repeated role has a distinct target ID');
 assert.notDeepEqual(first.origin,second.origin,'two benches must not overlap');
 assert.equal(new Set(built.fixtureTargets.map(f=>f.id)).size,3);
 assert.equal(built.design.elements.filter(e=>
  /^fx-l0-z0-i[01]-top$/.test(e.id)).length,2,
  'both author-requested benches are actual B143 geometry');
 const routes=auditR125SourceRoutes(built,{
  featureTargets:built.fixtureTargets});
 assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES',
  JSON.stringify(routes.issues));
 assert.equal(routes.featureAccess.length,3);
 assert(routes.featureAccess.every(f=>f.reachableFromEntrance));
 assert.equal(auditArchitecturePlanCirculation(built).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(verifyCompiled(built.design,built.compiled),true);
 assert.notEqual(built.geometrySha256,base.geometrySha256);
 assert.deepEqual(built.compiled.BuildPlan.operations,[]);
 assert.equal(built.worldWrites,0);
});

test('multi-room fixture grammar is bounded and preserves old single fixture geometry',()=>{
 const p=plan('multifurniture-grammar',['x']);
 // A bed AND a desk need an actually usable floor; a cramped 18x18
 // house should HOLD rather than pretend both service routes are valid.
 p.footprint={width:30,depth:30};
 p.levels[0].spaces[0].fixtures=['bed','desk'];
 const valid=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 assert.equal(valid.fixtureTargets.length,2);
 for(const bad of [
  [],['bed','desk','storage','seating'],['wrong']
 ]) {
  const q=structuredClone(p);
  q.levels[0].spaces[0].fixtures=bad;
  assert.throws(()=>compileArchitecturePlan(q),/R125_PLAN_SPACE_FIXTURE_GROUP/);
 }
 const both=structuredClone(p);
 both.levels[0].spaces[0].fixture='seating';
 assert.throws(()=>compileArchitecturePlan(both),/R125_PLAN_SPACE_FIXTURE_GROUP/);
 const legacy=plan('legacy-single-fixture',['x']);
 legacy.levels[0].spaces[0].fixture='seating';
 // Legacy default centred entrance can be physically cut off by the
 // model-authored x partition. Test preservation under the SAME valid,
 // explicitly chosen generic entrance policy.
 const a=compileArchitecturePlan(legacy,{entrancePlacement:'source-accessible'});
 const b=compileArchitecturePlan(structuredClone(legacy),
  {entrancePlacement:'source-accessible'});
 assert.equal(a.sourceSha256,b.sourceSha256);
 assert.equal(a.geometrySha256,b.geometrySha256);
});
test('all five purpose-neutral room fixture forms survive true SOURCE access checks',()=>{
 for(const role of ['counter','workbench','display','storage','seating']){
  const p=plan('fixture-'+role,['x'],['useful entry room','service zone']);
  p.levels[0].spaces[0].fixture=role;
  const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  const audit=auditR125SourceRoutes(built,{featureTargets:built.fixtureTargets});
  assert.equal(audit.status,'SOURCE_ROUTES_REACH_ALL_ZONES',role);
  assert.equal(audit.featureAccess.length,1,role);
  assert.equal(audit.featureAccess[0].reachableFromEntrance,true,role);
  if(role==='storage'){
   assert.ok(built.design.elements.some(x=>x.id==='fx-l0-z0-top-shelf'));
   assert.equal(built.compiled.primitives.some(v=>v[1]===3&&
    v[0]===built.fixtureTargets[0].origin[0]+1&&
    v[2]===built.fixtureTargets[0].origin[2]),false,
    'storage shelf has an actual open middle bay');
  }
  assert.deepEqual(built.compiled.BuildPlan.operations,[]);
 }
});

// A model-authored expressive form, functional room equipment, and the
// unchanged generic B143 compiler must work together, not only in separate
// synthetic unit tests. This still does NOT claim genuine LLM inference.
test('one actual raised architectural volume combines two practical fixture roles with reached service routes',()=>{
 const p=plan('integrated-raised-market',['x'],
  ['customer exhibition space','maker service workbench']);
 p.footprint={width:24,depth:24};
 p.levels[0].spaces[0].fixture='display';
 p.levels[0].spaces[1].fixture='workbench';
 p.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'ridge',roofAxis:'x',
  facadeLanguage:'fins',roofVolume:'raised'};
 const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const v=voxels(built.compiled);
 const ceiling=1+5*p.levels.length;
 assert.equal(verifyCompiled(built.design,built.compiled),true);
 assert.equal(built.fixtureTargets.length,2);
 assert.ok(built.design.elements.some(e=>e.id.startsWith('roof-raised-skin-')));
 assert.ok(built.design.elements.some(e=>e.id==='fx-l0-z0-glass'));
 assert.ok(built.design.elements.some(e=>e.id==='fx-l0-z1-top'));
 assert.equal(includes(v,Math.floor(p.footprint.width/2),ceiling,12),false,
  'raised roof has real air under pitched roof, not a solid flat cap');
 const route=auditR125SourceRoutes(built,{featureTargets:built.fixtureTargets});
 assert.equal(route.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(route.featureAccess.length,2);
 assert.ok(route.featureAccess.every(x=>x.reachableFromEntrance));
 assert.equal(auditArchitecturePlanCirculation(built).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(built.worldWrites,0);
 assert.deepEqual(built.compiled.BuildPlan.operations,[]);
});

test('compact ground z partition clears stair end in source-accessible mode',()=>{
 const p=plan('compact-stair-door',['z','x']);
 p.footprint={width:16,depth:16};
 p.expression={setbackSide:'east',setbackDepth:2,roofProfile:'ridge',roofAxis:'z',facadeLanguage:'fins'};
 const legacy=compileArchitecturePlan(p);
 assert.ok(auditArchitecturePlanCirculation(legacy).failures.some(f=>f.code==='PARTITION_OPENING_NOT_SUPPORTED_AND_CLEAR'&&f.level===0));
 const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
 assert.equal(auditArchitecturePlanCirculation(built).status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditR125SourceRoutes(built).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.deepEqual(built.plan,p);
});

test('author-selected raised pitched eaves change true B143 silhouette without touching interior or baseline source',()=>{
 const raw=plan('fresh-architectural-massing',['x'],['studio','equipment room']);
 raw.footprint={width:24,depth:26};
 raw.materials={floor:'wood',wall:'stone',roof:'metal'};
 for(const roofProfile of ['ridge','sawtooth']){
  for(const roofAxis of ['x','z']){
   const expression={setbackSide:'none',setbackDepth:0,roofProfile,
    roofAxis,facadeLanguage:'plain',roofVolume:'raised'};
   const bare=compileArchitecturePlan({...raw,expression},
    {entrancePlacement:'source-accessible'});
   const eaved=compileArchitecturePlan({...raw,expression:{
    ...expression,roofOverhang:'one-block'}},
    {entrancePlacement:'source-accessible'});
   const before=new Map(bare.compiled.primitives.map(p=>
    [p.slice(0,3).join(','),p[3]]));
   const after=new Map(eaved.compiled.primitives.map(p=>
    [p.slice(0,3).join(','),p[3]]));
   assert.equal(verifyCompiled(eaved.design,eaved.compiled),true);
   assert.ok(after.size>before.size,roofProfile+roofAxis);
   for(const [k,v] of before)assert.equal(after.get(k),v,k);
   for(const [k,v] of after)if(!before.has(k)){
    const [x,,z]=k.split(',').map(Number);
    assert.ok(x===0||x===raw.footprint.width-1||
      z===0||z===raw.footprint.depth-1,k);
    assert.equal(v,2); // B143 metal material index, not a new structure.
   }
   assert.equal(auditArchitecturePlanCirculation(eaved).status,
    'SOURCE_CLEARANCE_PROBES_PASS');
   assert.equal(auditR125SourceRoutes(eaved).status,
    'SOURCE_ROUTES_REACH_ALL_ZONES');
   assert.equal(eaved.compiled.BuildPlan.operations.length,0);
   assert.equal(eaved.worldWrites,0);
   assert.notEqual(eaved.sourceSha256,bare.sourceSha256);
  }
 }
 const invalid={setbackSide:'none',setbackDepth:0,roofProfile:'ridge',
  roofAxis:'x',facadeLanguage:'plain',roofOverhang:'one-block'};
 assert.throws(()=>compileArchitecturePlan({...raw,expression:invalid}),
  /R125_PLAN_EXPRESSION_ROOF_OVERHANG_CONFLICT/);
 assert.throws(()=>compileArchitecturePlan({...raw,expression:{
  ...invalid,roofVolume:'raised',roofOverhang:'two-block'}}),
  /R125_PLAN_EXPRESSION_ROOF_OVERHANG_CONFLICT/);
 assert.throws(()=>compileArchitecturePlan({...raw,expression:{
  ...invalid,roofVolume:'raised',rearCornerCut:{width:4,depth:4}}}),
  /R125_PLAN_EXPRESSION_ROOF_OVERHANG_CONFLICT/);
});


test('authored hip roof adds real four-sided B143 volume, preserves facilities and differs by ridge axis',()=>{
 const p=plan('hip-family',['x'],['family food-preparation room','quiet bedroom']);
 p.footprint={width:28,depth:26};
 p.levels[0].spaces[0].fixtures=['oven','washbasin'];
 p.levels[0].spaces[1].fixtures=['bed'];
 const older=structuredClone(p);
 older.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'ridge',roofAxis:'x',roofVolume:'raised',facadeLanguage:'plain'};
 const baseline=compileArchitecturePlan(older,{entrancePlacement:'source-accessible'});
 const hashes=[];
 for(const axis of ['x','z'])for(const eaves of [false,true]){
  const input=structuredClone(p);
  input.expression={...older.expression,roofProfile:'hip',roofAxis:axis,
   ...(eaves?{roofOverhang:'one-block'}:{})};
  const untouched=structuredClone(input);
  const result=compileArchitecturePlan(input,{entrancePlacement:'source-accessible'});
  assert.equal(verifyCompiled(result.design,result.compiled),true);
  assert.ok(result.design.elements.some(x=>x.id==='roof-hip-ridge'));
  assert.equal(result.design.elements.some(x=>x.id==='roof-base'),false);
  assert.equal(result.design.elements.filter(x=>x.id.startsWith('roof-hip-eave-')).length,
   eaves?4:0);
  assert.notEqual(result.geometrySha256,baseline.geometrySha256);
  assert.deepEqual(result.fixtureTargets.map(x=>x.kind),['oven','washbasin','bed']);
  const routes=auditR125SourceRoutes(result,{featureTargets:result.fixtureTargets});
  assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES',JSON.stringify(routes.issues));
  assert.ok(routes.featureAccess.every(x=>x.reachableFromEntrance));
  assert.equal(auditArchitecturePlanCirculation(result).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  const vox=voxels(result.compiled),cx=Math.floor(input.footprint.width/2),
   cz=Math.floor(input.footprint.depth/2);
  assert.equal(includes(vox,cx,6,cz),false,'roof has real raised center interior air');
  assert.ok(result.compiled.bounds.maxY>6);
  assert.equal(includes(vox,1,6,1),true,'all four roof corners are present');
  if(eaves)assert.equal(includes(vox,0,6,1),true);
  assert.ok(result.design.elements.length<=160);
  assert.deepEqual(result.compiled.BuildPlan.operations,[]);
  assert.equal(result.worldWrites,0);
  assert.deepEqual(input,untouched);
  if(!eaves)hashes.push(result.geometrySha256);
 }
 assert.notEqual(hashes[0],hashes[1],
  'model-authored ridge direction must change actual voxels');
 assert.equal(compileArchitecturePlan(older,
  {entrancePlacement:'source-accessible'}).sourceSha256,baseline.sourceSha256);
});
test('raised hip roof works over a real two-storey stair and rejects invalid authored combinations',()=>{
 for(const axis of ['x','z'])for(const setbackSide of ['none','east','rear']){
  const p=plan('hip-tower-'+axis+'-'+setbackSide,['x','z'],
   ['workroom','records']);
  p.footprint={width:30,depth:28};
  p.expression={setbackSide,setbackDepth:setbackSide==='none'?0:3,
   roofProfile:'hip',roofAxis:axis,facadeLanguage:'plain',roofVolume:'raised'};
  const result=compileArchitecturePlan(p,
   {entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
  assert.equal(verifyCompiled(result.design,result.compiled),true);
  assert.equal(auditArchitecturePlanCirculation(result).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(auditR125SourceRoutes(result).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.ok(result.design.elements.length<=160);
  assert.deepEqual(result.compiled.BuildPlan.operations,[]);
 }
 const invalid=plan('hip-without-volume');
 invalid.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'hip',roofAxis:'x',facadeLanguage:'plain'};
 assert.throws(()=>compileArchitecturePlan(invalid),
  /R125_PLAN_EXPRESSION_HIP_CONFLICT/);
 invalid.expression.roofVolume='raised';
 invalid.expression.rearCornerCut={width:6,depth:6,side:'west'};
 assert.throws(()=>compileArchitecturePlan(invalid),
  /R125_PLAN_EXPRESSION_HIP_CONFLICT/);
});
test('model-selected generic oven produces real block geometry with reachable service in two distinct building uses',()=>{
 for(const genre of ['home','bakery']){
  const p=plan('oven-'+genre,['x'],['functional food-preparation zone',
   genre==='home'?'living space':'customer display']);
  p.footprint={width:30,depth:30};
  p.levels[0].spaces[0].fixtures=genre==='home'?
   ['oven','washbasin']:['oven','workbench'];
  p.levels[0].spaces[0].fixtureDetail='crafted';
  p.levels[0].spaces[1].fixtures=genre==='home'?['seating']:['display'];
  const original=structuredClone(p);
  const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  assert.equal(built.fixtureTargets.length,3);
  assert.equal(built.fixtureTargets.filter(f=>f.kind==='oven').length,1);
  assert.ok(built.design.elements.some(e=>e.id.endsWith('-door-glass')));
  assert.ok(built.design.elements.some(e=>e.id.endsWith('-hearth-glow')));
  assert.ok(built.design.elements.some(e=>e.id.endsWith('-heat-control')));
  const routes=auditR125SourceRoutes(built,{featureTargets:built.fixtureTargets});
  assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES',JSON.stringify(routes.issues));
  assert.ok(routes.featureAccess.every(e=>e.reachableFromEntrance));
  assert.equal(auditArchitecturePlanCirculation(built).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(verifyCompiled(built.design,built.compiled),true);
  assert.ok(built.design.elements.length<=160);
  assert.deepEqual(built.compiled.BuildPlan.operations,[]);
  assert.equal(built.worldWrites,0);
  assert.deepEqual(p,original);
 }
});
test('authored crafted equipment keeps old 7-role geometry optional and builds identifiable real shapes',()=>{
 const original=plan('crafted-equipment-studio',['x'],
  ['work zone','service zone']);
 original.footprint={width:30,depth:30};
 const choices=[
  ['counter','register'],['workbench','bench-vise'],
  ['display','display-object'],['storage','shelf-object'],
  ['seating','left-arm'],['bed','foot-left'],
  ['desk','monitor-frame-left'],['washbasin','basin-water'],
  ['electronics','control-unit']
 ];
 for(const [kind,marker] of choices){
  const base=structuredClone(original);
  base.levels[0].spaces[0].fixtures=[kind];
  const old=compileArchitecturePlan(base,
   {entrancePlacement:'source-accessible'});
  const detailed=structuredClone(base);
  detailed.levels[0].spaces[0].fixtureDetail='crafted';
  const newer=compileArchitecturePlan(detailed,
   {entrancePlacement:'source-accessible'});
  assert.ok(!old.design.elements.some(e=>e.id.endsWith('-'+marker)));
  assert.ok(newer.design.elements.some(e=>e.id.endsWith('-'+marker)),kind);
  assert.ok(newer.compiled.primitives.length>old.compiled.primitives.length,kind);
  assert.equal(newer.fixtureTargets[0].detail,'crafted');
  assert.equal(newer.fixtureTargets[0].kind,kind);
  assert.equal(verifyCompiled(newer.design,newer.compiled),true);
  assert.equal(auditArchitecturePlanCirculation(newer).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(auditR125SourceRoutes(newer,{
   featureTargets:newer.fixtureTargets}).status,
   'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.deepEqual(newer.compiled.BuildPlan.operations,[]);
  assert.equal(newer.worldWrites,0);
  assert.deepEqual(base.levels[0].spaces[0].fixtures,[kind]);
 }
 const wrong=structuredClone(original);
 wrong.levels[0].spaces[0].fixtureDetail='crafted';
 assert.throws(()=>compileArchitecturePlan(wrong),
  /R125_PLAN_SPACE_FIXTURE_DETAIL/);
 wrong.levels[0].spaces[0].fixtures=['desk'];
 wrong.levels[0].spaces[0].fixtureDetail='unknown';
 assert.throws(()=>compileArchitecturePlan(wrong),
  /R125_PLAN_SPACE_FIXTURE_DETAIL/);
});

test('three room T plan genuinely changes SOURCE and reaches distinct rooms',()=>{
 for(const axis of ['x','z'])for(const expressive of [false,true]){
  const p=plan('t-three-'+axis+'-'+(expressive?'raised':'flat'),
   [axis],['lively making room','recording area']);
  p.footprint={width:26,depth:26};
  p.levels[0].spaces.push({id:'area-0c',purpose:'quiet storage office'});
  p.levels[0].spaces[0].fixture='workbench';
  p.levels[0].spaces[2].fixture='storage';
  if(expressive)p.expression={setbackSide:'none',setbackDepth:0,
   roofProfile:'ridge',roofAxis:axis,roofVolume:'raised',facadeLanguage:'plain'};
  const two=structuredClone(p);two.levels[0].spaces.pop();
  const baseline=compileArchitecturePlan(two,{entrancePlacement:'source-accessible'});
  const out=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  assert.equal(out.program[0].zones.length,3);
  assert.notEqual(out.geometrySha256,baseline.geometrySha256);
  assert.ok(out.design.elements.some(v=>v.id==='l0-secondary-divider'));
  assert.ok(out.design.elements.some(v=>v.id==='l0-secondary-door'));
  assert.equal(verifyCompiled(out.design,out.compiled),true);
  const circulation=auditArchitecturePlanCirculation(out);
  assert.equal(circulation.status,'SOURCE_CLEARANCE_PROBES_PASS',
   JSON.stringify(circulation.failures));
  assert.equal(circulation.levels[0].secondaryPartitionSourcePass,true);
  const routes=auditR125SourceRoutes(out,{featureTargets:out.fixtureTargets});
  assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES',
   JSON.stringify(routes.issues));
  assert.equal(routes.zones.length,3);
  assert.ok(routes.zones.every(v=>v.reachedFromEntrance));
  assert.ok(routes.featureAccess.every(v=>v.reachableFromEntrance));
  assert.deepEqual(out.compiled.BuildPlan.operations,[]);
 }
});
test('two storeys with 3 rooms each remain source-connected via staircase',()=>{
 const p=plan('t-six',['x','z'],['entry lab','private workroom']);
 p.footprint={width:28,depth:28};
 p.levels[0].spaces.push({id:'area-0c',purpose:'ground service room'});
 p.levels[1].spaces.push({id:'area-1c',purpose:'upstairs equipment room'});
 p.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'sawtooth',roofAxis:'x',roofVolume:'raised',
  facadeLanguage:'plain'};
 const out=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 assert.deepEqual(out.program.map(l=>l.zones.length),[3,3]);
 assert.equal(auditR125SourceRoutes(out).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(out).status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.deepEqual(out.compiled.BuildPlan.operations,[]);
});
test('fourth room is not accepted',()=>{
 const p=plan('fourth-reject',['x'],['first area','second area']);
 p.levels[0].spaces.push({id:'area-0c',purpose:'third area'});
 assert.equal(validateArchitecturePlan(p),true);
 p.levels[0].spaces.push({id:'area-0d',purpose:'fourth area'});
 assert.throws(()=>validateArchitecturePlan(p),/R125_PLAN_LEVEL_PROGRAM/);
});


test('equal-height raised roof SOURCE strips compress only as needed and preserve every B143 voxel',()=>{
 const cases=['ridge','sawtooth'];
 for(const roofProfile of cases)for(const roofAxis of ['x','z']){
  const old=plan('roof-packing-'+roofProfile+'-'+roofAxis,['x'],
   ['assembly and work zone','reading and equipment zone']);
  old.footprint={width:32,depth:32};
  old.expression={setbackSide:'none',setbackDepth:0,roofProfile,
   roofAxis,facadeLanguage:'plain',roofVolume:'raised',
   roofOverhang:'one-block'};
  const original=compileArchitecturePlan(old,
   {entrancePlacement:'source-accessible'});
  const sourceElementCount=original.design.elements.length;
  const packedElements=packR125RaisedRoofStrips(original.design.elements,roofAxis);
  assert.ok(packedElements.length<sourceElementCount,roofProfile+'/'+roofAxis);
  assert.ok(packedElements.some(e=>e.id.startsWith('roof-raised-skin-')&&e.repeat),
   'real existing B143 repeat primitive used');
  if(roofProfile==='sawtooth')
   assert.ok(packedElements.some(e=>e.id.startsWith('roof-pitched-eave-')&&
    e.repeat?.offset[roofAxis==='x'?0:2]===6),
    'periodic pitched eaves are also losslessly packed');
  const packedDesign={...original.design,elements:packedElements};
  const compiled=compileDesign(packedDesign);
  assert.equal(verifyCompiled(packedDesign,compiled),true);
  const byCell=list=>new Map(list.map(v=>[v.slice(0,3).join(','),v[3]]));
  assert.deepEqual(byCell(compiled.primitives),
   byCell(original.compiled.primitives),
   roofProfile+'/'+roofAxis+' exact material-and-geometry equality');
  assert.equal(original.design.elements.length,sourceElementCount,
   'old success unmodified');
  assert.deepEqual(original.compiled.BuildPlan.operations,[]);
 }
});
test('roof element budget counts model-authored paired windows and repeated equipment exactly',()=>{
 const p=plan('paired-roof-budget',['x'],['research workspace','visitor records']);
 const old=structuredClone(p);
 assert.equal(estimateR125AuthoredElementReserve(p),0);
 p.levels[0].spaces[0].daylight='wide-bay';
 assert.equal(estimateR125AuthoredElementReserve(p),2);
 p.levels[0].spaces[0].daylight='paired-bays';
 assert.equal(estimateR125AuthoredElementReserve(p),4,
  'two pairs of actual B143 cut and glass elements are reserved');
 p.levels[0].spaces[0].fixtures=['workbench','workbench','storage'];
 assert.equal(estimateR125AuthoredElementReserve(p),4+3+3+4,
  'repeated role instances each reserve real B143 parts');
 p.levels[0].spaces[0].fixtureDetail='crafted';
 assert.equal(estimateR125AuthoredElementReserve(p),4+4+4+5);
 assert.equal(estimateR125AuthoredElementReserve(old),0,
  'existing author designs keep their original budget');
});
test('equipment budget reservation chooses roof packing without deleting authored roles',()=>{
 const p=plan('equipment-roof-pack',['x','z'],
  ['functional workshop','wash and records']);
 p.footprint={width:32,depth:32};
 p.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'sawtooth',roofAxis:'x',facadeLanguage:'plain',
  roofVolume:'raised',roofOverhang:'one-block'};
 for(const level of p.levels)for(const space of level.spaces){
  space.fixtures=['workbench','storage'];
  space.fixtureDetail='crafted';
 }
 const snapshot=structuredClone(p);
 const built=compileArchitecturePlan(p,{
  entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
 assert.ok(built.design.elements.length<=160);
 assert.ok(built.design.elements.some(e=>e.id.startsWith('roof-raised-skin-')&&e.repeat));
 assert.equal(built.fixtureTargets.length,8);
 assert.equal(built.fixtureTargets.filter(x=>x.detail==='crafted').length,8);
 assert.equal(verifyCompiled(built.design,built.compiled),true);
 assert.equal(auditR125SourceRoutes(built,{featureTargets:built.fixtureTargets}).status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(built).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.deepEqual(p,snapshot);
 assert.deepEqual(built.compiled.BuildPlan.operations,[]);
 assert.equal(built.worldWrites,0);
});
test('large pitched eaves pack real B143 elements without losing any roof edge',()=>{
 for(const roofProfile of ['ridge','sawtooth'])for(const roofAxis of ['x','z']){
  const p=plan('packed-eave-'+roofProfile+'-'+roofAxis,['x'],
   ['living studio','equipment service']);
  p.footprint={width:32,depth:32};
  p.materials={floor:'wood',wall:'stone',roof:'metal'};
  p.expression={setbackSide:'none',setbackDepth:0,roofProfile,
   roofAxis,facadeLanguage:'plain',roofVolume:'raised',
   roofOverhang:'one-block'};
  const result=compileArchitecturePlan(p,
   {entrancePlacement:'source-accessible'});
  assert.ok(result.design.elements.length<=160,roofProfile+'/'+roofAxis);
  const material=new Map(result.compiled.primitives.map(v=>
   [v.slice(0,3).join(','),v[3]]));
  for(let pos=0;pos<30;pos++){
   const rise=roofProfile==='ridge'?
    Math.min(3,Math.floor(Math.min(pos,29-pos)/2)):
    (pos%6===0?0:Math.ceil((pos%6)/2));
   const y=6+rise;
   const expected=roofAxis==='x'?
    [[1+pos,y,0],[1+pos,y,31]]:
    [[0,y,1+pos],[31,y,1+pos]];
   for(const at of expected)assert.equal(material.get(at.join(',')),2,
    'missing original one-block roof eave '+at.join(','));
  }
  assert.equal(verifyCompiled(result.design,result.compiled),true);
  assert.equal(auditArchitecturePlanCirculation(result).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(auditR125SourceRoutes(result).status,
   'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.deepEqual(result.compiled.BuildPlan.operations,[]);
  assert.equal(result.worldWrites,0);
 }
});

test('authored T-room capacity reflects the REAL secondary SOURCE partition',()=>{
 for(const axis of ['x','z'])for(const percent of [35,50,65]){
  const p=plan('capacity-'+axis+'-'+percent,[axis],
   ['shared workshop','archive and records']);
  p.footprint={width:30,depth:30};
  p.levels[0].spaces.push({id:'area-0c',purpose:'private instruments'});
  p.levels[0].secondarySplitPercent=percent;
  const snapshot=structuredClone(p);
  const estimate=assessR125AuthoredRoomCapacity(p);
  const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  for(let i=0;i<3;i++){
   const room=estimate.zones[i],actual=built.program[0].zones[i].range;
   assert.equal(room.nominalWidth,actual.x[1]-actual.x[0]+1,
    axis+' '+percent+' room '+i+' width');
   assert.equal(room.nominalDepth,actual.z[1]-actual.z[0]+1,
    axis+' '+percent+' room '+i+' depth');
  }
  assert.deepEqual(p,snapshot,'capacity advisory must not edit authored plan');
  assert.equal(estimate.originalPlanEdited,false);
  assert.equal(estimate.worldWrites,0);
 }
});

test('model-authored unequal T zones yield real sized, navigable and equipped spaces',()=>{
 for(const axis of ['x','z']){
  const base=plan('variable-t-'+axis,[axis],['open making floor','archive and records']);
  base.footprint={width:30,depth:30};
  base.levels[0].spaces.push({id:'area-0c',purpose:'private instruments'});
  const baseline=compileArchitecturePlan(base,{entrancePlacement:'source-accessible'});
  const exact=structuredClone(base);exact.levels[0].secondarySplitPercent=50;
  const equal=compileArchitecturePlan(exact,{entrancePlacement:'source-accessible'});
  assert.equal(equal.geometrySha256,baseline.geometrySha256,'omitted 50% keeps old actual cells');
  const measured=[];
  for(const percent of [35,65]){
   const q=structuredClone(base);
   q.levels[0].secondarySplitPercent=percent;
   q.levels[0].spaces[1].fixtures=[axis==='x'?'workbench':'desk'];
   q.levels[0].spaces[2].fixtures=[axis==='x'?'storage':'display'];
   const result=compileArchitecturePlan(q,{entrancePlacement:'source-accessible'});
   assert.equal(validateArchitecturePlan(q),true);
   const expected=Math.floor(1+27*percent/100);
   assert.equal(result.program[0].secondarySplitCoordinate,expected);
   assert.equal(result.program[0].secondarySplitAxis,axis==='x'?'z':'x');
   measured.push(expected);
   assert.notEqual(result.geometrySha256,baseline.geometrySha256);
   assert.equal(verifyCompiled(result.design,result.compiled),true);
   const circulation=auditArchitecturePlanCirculation(result);
   assert.equal(circulation.status,'SOURCE_CLEARANCE_PROBES_PASS',
    JSON.stringify(circulation.failures));
   const routes=auditR125SourceRoutes(result,{featureTargets:result.fixtureTargets});
   assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES',
    JSON.stringify(routes.issues));
   assert.equal(routes.zones.length,3);
   assert.equal(routes.featureAccess.length,2);
   assert.ok(routes.featureAccess.every(v=>v.reachableFromEntrance));
   assert.deepEqual(result.compiled.BuildPlan.operations,[]);
   assert.equal(result.worldWrites,0);
  }
  assert.ok(measured[0]<measured[1]);
  const invalid=structuredClone(base);
  invalid.levels[0].spaces.pop();invalid.levels[0].secondarySplitPercent=35;
  assert.throws(()=>validateArchitecturePlan(invalid),
   /THREE_ROOM_SECONDARY_PERCENT/);
  const badValue=structuredClone(base);badValue.levels[0].secondarySplitPercent=99;
  assert.throws(()=>validateArchitecturePlan(badValue),
   /THREE_ROOM_SECONDARY_PERCENT/);
 }
});

test('one fixture in a wide room recovers reachable mid-wall placement when corners are blocked',()=>{
 const basePlan=plan('wide-single-service-recovery',['x'],
  ['reception and walkway','actual workshop']);
 basePlan.footprint={width:26,depth:26};
 const shell=compileArchitecturePlan(basePlan,
  {entrancePlacement:'source-accessible'});
 const area=shell.program[0].zones[1].range;
 const y=shell.program[0].standingFloorY;
 const corners=[
  [area.x[0],area.z[1]],
  [area.x[1]-2,area.z[1]],
  [area.x[0],area.z[0]],
  [area.x[1]-2,area.z[0]]
 ];
 // Four real B143 obstacles prevent the old corner-only algorithm from
 // placing a 3x1 workbench. The central room and door are still open.
 const obstacles=corners.map(([x,z],index)=>({
  id:'existing-corner-obstacle-'+index,shape:'box',mode:'add',
  material:'metal',origin:[x+1,y+1,z],size:[1,1,1]
 }));
 const sourceDesign={...shell.design,elements:[
  ...shell.design.elements,...obstacles]};
 const compiled=compileDesign(sourceDesign);
 assert.equal(verifyCompiled(sourceDesign,compiled),true);
 const selected=structuredClone(basePlan);
 selected.levels[0].spaces[1].fixture='workbench';
 const source={...shell,plan:selected,design:sourceDesign,compiled,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 const beforePlan=structuredClone(selected);
 const outcome=addAuthoredRoomFixtures(source,{
  auditCirculation:auditArchitecturePlanCirculation});
 assert.equal(outcome.fixtureTargets.length,1);
 const target=outcome.fixtureTargets[0];
 assert.equal(target.kind,'workbench');
 assert.equal(target.zoneId,'area-0b');
 assert.ok(!corners.some(([x,z])=>
  target.origin[0]===x&&target.origin[2]===z));
 assert.equal(outcome.fixtureSearch?.[0]?.arrangementFound,true);
 assert.ok(outcome.fixtureSearch[0].candidateEvaluations<=540);
 assert.equal(auditR125SourceRoutes(outcome,{
  featureTargets:outcome.fixtureTargets}).status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(outcome).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(verifyCompiled(outcome.design,outcome.compiled),true);
 const actual=voxels(outcome.compiled);
 for(const [x,z] of corners)assert.ok(includes(actual,x+1,y+1,z));
 assert.deepEqual(selected,beforePlan,'the AI-owned room and role must not change');
 assert.equal(outcome.worldWrites,0);
 assert.deepEqual(outcome.compiled.BuildPlan.operations,[]);
});

test('a lone narrow-zone fixture uses true B143 rotation only after normal candidates fail',()=>{
 const p=plan('single-narrow-workshop',['x'],
  ['small electronics service zone','connected circulation zone']);
 p.footprint={width:30,depth:30};
 const baseline=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const originalRange=baseline.program[0].zones[0].range.x;
 baseline.program[0].zones[0].range.x=[originalRange[0],originalRange[0]+2];
 const planWithFixture=structuredClone(p);
 planWithFixture.levels[0].spaces[0].fixture='workbench';
 const source={...baseline,plan:planWithFixture};
 const sourceAuditor=trial=>{
  const original=auditArchitecturePlanCirculation(trial);
  if(original.status!=='SOURCE_CLEARANCE_PROBES_PASS')return original;
  const top=trial.design.elements.find(e=>e.id==='fx-l0-z0-top');
  // Synthetic corridor restriction makes all non-rotated 3-wide options
  // genuinely fail a source auditor, allowing 1-wide alternate geometry.
  if(top&&top.size[0]===3)return {
   status:'SOURCE_CLEARANCE_PROBES_HOLD',
   failures:[{code:'FIXTURE_BLOCKS_TWO_WIDE_SERVICE_CORRIDOR'}]};
  return original;
 };
 const output=addAuthoredRoomFixtures(source,{auditCirculation:sourceAuditor});
 assert.equal(output.fixtureTargets.length,1);
 assert.equal(output.fixtureTargets[0].kind,'workbench');
 assert.equal(output.fixtureTargets[0].orientation,'quarter-turn');
 assert.equal(output.fixtureTargets[0].id,'fx-l0-z0');
 assert.deepEqual(output.fixtureTargets[0].size,[1,3,3]);
 const top=output.design.elements.find(e=>e.id==='fx-l0-z0-top');
 assert.deepEqual(top.size,[1,1,3]);
 assert.ok(output.fixtureSearch?.[0]?.rotatedCandidateEvaluations>0);
 assert.equal(output.fixtureSearch[0].arrangementFound,true);
 const routes=auditR125SourceRoutes(output,{featureTargets:output.fixtureTargets});
 assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES',
  JSON.stringify(routes.issues));
 assert.equal(routes.featureAccess[0].reachableFromEntrance,true);
 assert.equal(auditArchitecturePlanCirculation(output).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(verifyCompiled(output.design,output.compiled),true);
 assert.equal(baseline.sourceSha256,
  compileArchitecturePlan(p,{entrancePlacement:'source-accessible'}).sourceSha256);
 assert.equal(planWithFixture.levels[0].spaces[0].fixture,'workbench');
 assert.deepEqual(output.compiled.BuildPlan.operations,[]);
 assert.equal(output.worldWrites,0);
});

test('wide authored room recovers rotated equipment only after all old placements fail',()=>{
 const p=plan('wide-room-rotation-recovery',['x'],
  ['electronics workspace','adjacent service room']);
 const shell=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const zone=shell.program[0].zones[0].range;
 assert.ok(zone.x[1]-zone.x[0]+1>4);
 const authored=structuredClone(p);
 authored.levels[0].spaces[0].fixture='workbench';
 const unchanged=structuredClone(authored);
 const auditor=trial=>{
  const actual=auditArchitecturePlanCirculation(trial);
  if(actual.status!=='SOURCE_CLEARANCE_PROBES_PASS')return actual;
  const top=trial.design.elements.find(e=>e.id==='fx-l0-z0-top');
  if(top?.size[0]===3)return {status:'SOURCE_CLEARANCE_PROBES_HOLD',
   failures:[{code:'TEST_WIDE_ZONE_NEEDS_LONGITUDINAL_WORKBENCH'}]};
  return actual;
 };
 const output=addAuthoredRoomFixtures({...shell,plan:authored},
  {auditCirculation:auditor});
 assert.equal(output.fixtureTargets.length,1);
 assert.equal(output.fixtureTargets[0].kind,'workbench');
 assert.equal(output.fixtureTargets[0].orientation,'quarter-turn');
 assert.deepEqual(output.fixtureTargets[0].size,[1,3,3]);
 assert.equal(output.fixtureSearch?.[0]?.orientationFallback,
  'WIDE_ZONE_AFTER_LEGACY_HOLD');
 assert.ok(output.fixtureSearch[0].rotatedCandidateEvaluations>0);
 assert.ok(output.fixtureSearch[0].candidateEvaluations<=540);
 assert.equal(auditArchitecturePlanCirculation(output).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditR125SourceRoutes(output,{
  featureTargets:output.fixtureTargets}).status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(verifyCompiled(output.design,output.compiled),true);
 assert.deepEqual(authored,unchanged);
 assert.deepEqual(output.compiled.BuildPlan.operations,[]);
 assert.equal(output.worldWrites,0);
});

test('all eighteen grammar-permitted utilities receive source service audits without relaxing B143',()=>{
 const p=plan('eighteen-utility-study',['x','x']);
 p.footprint={width:30,depth:30};
 p.expression={setbackSide:'none',setbackDepth:0,roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'};
 for(const [li,level] of p.levels.entries()){
  level.spaces.push({id:'third-'+li,purpose:'another independent work area'});
  for(const room of level.spaces)room.fixtures=['workbench','desk','storage'];
 }
 const saved=structuredClone(p);
 const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
 const route=auditR125SourceRoutes(r,{featureTargets:r.fixtureTargets});
 assert.equal(r.fixtureTargets.length,18);
 assert.equal(route.featureAccess.length,18);
 assert.ok(route.featureAccess.every(f=>f.reachableFromEntrance));
 assert.equal(route.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(r.design.elements.length<=160);
 assert.equal(verifyCompiled(r.design,r.compiled),true);
 assert.throws(()=>auditR125SourceRoutes(r,{featureTargets:[...r.fixtureTargets,r.fixtureTargets[0]]}),/FEATURE_TARGET_CONTRACT/);
 assert.deepEqual(p,saved);
});

test('monitor roof x step is independent of z room division and short daylight stays air-backed',()=>{
 for(const depth of [16,18,20])for(const percent of [40,60]){
  const p=plan('cross-axis-monitor-'+depth+'-'+percent,['z','z']);
  p.footprint={width:26,depth};
  p.levels[1].splitPercent=percent;
  p.expression={setbackSide:'none',setbackDepth:0,roofProfile:'split-monitor',roofAxis:'x',roofVolume:'raised',facadeLanguage:'plain'};
  const original=structuredClone(p);
  const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
  assert.equal(r.program[1].splitAxis,'z');
  assert.equal(r.program[1].requestedPercent,percent);
  const light=r.design.elements.find(e=>e.id==='roof-monitor-westerly-light');
  assert.equal(light.size[2],Math.min(10,depth-8));
  const v=new Map(r.compiled.primitives.map(c=>[c.slice(0,3).join(','),c[3]]));
  const [x,y,z]=light.origin;
  for(let dz=0;dz<light.size[2];dz++)for(let dy=0;dy<2;dy++){
   assert.equal(v.get([x,y+dy,z+dz].join(',')),3);
   assert.equal(v.has([x-1,y+dy,z+dz].join(',')),false);
   assert.equal(v.has([x+1,y+dy,z+dz].join(',')),false);
  }
  assert.equal(verifyCompiled(r.design,r.compiled),true);
  assert.equal(auditR125SourceRoutes(r).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.deepEqual(p,original);
 }
});

test('two-wide ground turn clears a divider two rows after the last stair tread',()=>{
 const p=plan('two-wide-stair-turn',['z','x']);
 p.footprint={width:24,depth:24};
 p.levels[0].splitPercent=40;
 p.expression={setbackSide:'none',setbackDepth:0,roofProfile:'ridge',roofAxis:'z',roofVolume:'raised',facadeLanguage:'plain'};
 const before=compileArchitecturePlan(p,{upperDoorPlacement:'stair-clear'});
 const after=compileArchitecturePlan(p,{entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
 assert.equal(before.program[0].splitCoordinate,9);
 const floor=r=>critiqueArchitecture({design:r.design,compiled:r.compiled}).objectiveAudit.elevationConnectivity.find(l=>l.standingY===2);
 assert.equal(floor(before).componentCount,2);
 assert.equal(floor(after).componentCount,1);
 // A genuine 2-component floor must expose all precise B143 pad bounds
 // and the authored room / door evidence for an OFFLINE repair decision.
 const failed=assessR125ProgramGeometry(before,critiqueArchitecture({
  design:before.design,compiled:before.compiled}));
 const floorEvidence=failed.programFloorEvidence.find(x=>x.standingY===2);
 assert.equal(failed.status,'HOLD_PROGRAM_FLOORS');
 assert.equal(floorEvidence.componentCount,2);
 assert.equal(floorEvidence.components.length,2);
 assert.equal(floorEvidence.components.reduce((n,x)=>n+x.stationCount,0),
  floorEvidence.totalStandingSquares);
 assert.ok(floorEvidence.components.every(x=>
  x.sourceBounds.minX<=x.sourceBounds.maxX&&
  x.sourceBounds.minZ<=x.sourceBounds.maxZ));
 assert.ok(floorEvidence.doorwayCuts.some(x=>x.id==='l0-internal-door'&&
  x.origin[2]===9));
 assert.ok(floorEvidence.zones.length>=2);
 assert.deepEqual(failed.programFloorIssues.find(x=>
  x.code==='PROGRAM_FLOOR_DISCONNECTED_OR_MISSING'&&x.standingY===2)
  .componentBounds,floorEvidence.components);
 const oldDoor=before.design.elements.find(e=>e.id==='l0-internal-door');
 const newDoor=after.design.elements.find(e=>e.id==='l0-internal-door');
 assert.deepEqual(oldDoor.origin,[3,2,9]);
 assert.deepEqual(newDoor.origin,[7,2,9]);
 assert.deepEqual(before.design.elements.filter(e=>e.id!=='l0-internal-door'),after.design.elements.filter(e=>e.id!=='l0-internal-door'));
 for(const level of p.levels)for(const room of level.spaces)room.fixtures=['workbench','desk','storage'];
 const equipped=compileArchitecturePlan(p,{entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
 assert.equal(equipped.fixtureTargets.length,12);
 assert.equal(floor(equipped).componentCount,1);
 assert.equal(auditR125SourceRoutes(equipped,{featureTargets:equipped.fixtureTargets}).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(equipped).status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.deepEqual(equipped.compiled.BuildPlan.operations,[]);
 assert.equal(equipped.worldWrites,0);
});

test('HOST fixture placement preserves a connected two-wide floor at a recessed entrance',()=>{
 const p={schema:SCHEMA,id:'entry-clear-regression',
  title:'Entry clearance regression',
  brief:'A generic two-room work building with a covered entrance.',
  footprint:{width:24,depth:24},levels:[{splitAxis:'z',splitPercent:50,
   spaces:[{id:'work-area',purpose:'work and instrument area',
    fixtures:['workbench','electronics'],fixtureDetail:'crafted'},
    {id:'public-room',purpose:'public viewing area'}]}],
  materials:{floor:'concrete',wall:'stone',roof:'metal'},entryZone:'first',
  expression:{setbackSide:'none',setbackDepth:0,roofProfile:'sawtooth',
   roofAxis:'z',facadeLanguage:'recessed-portico',roofVolume:'raised',
   roofOverhang:'one-block'}};
 const original=structuredClone(p);
 const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible',
  upperDoorPlacement:'stair-clear'});
 const audit=critiqueArchitecture({design:r.design,compiled:r.compiled});
 const floor=audit.objectiveAudit.elevationConnectivity.find(x=>
  x.standingY===r.program[0].standingFloorY);
 assert.equal(floor.componentCount,1);
 assert.equal(r.fixtureTargets.length,2);
 assert.equal(r.fixtureTargets[1].kind,'electronics');
 assert.notDeepEqual(r.fixtureTargets[1].origin,[10,2,6],
  'the centered rack would break the recessed-entrance two-wide floor');
 assert.equal(audit.worldWrites,0);
 assert.deepEqual(p,original);
});

test('explicit HOST spatial detail creates a supported recessed entrance and preserves all authored equipment',()=>{
 for(const roof of ['ridge','sawtooth','split-monitor']){
  const p=plan('spatial-detail-'+roof,['z','x']);p.footprint={width:24,depth:24};
  p.expression={setbackSide:'none',setbackDepth:0,roofProfile:roof,roofAxis:'x',roofVolume:'raised',facadeLanguage:'fins'};
  for(const level of p.levels)for(const room of level.spaces)room.fixtures=['desk','storage'];
  const saved=structuredClone(p),policy={entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'};
  const old=compileArchitecturePlan(p,policy),now=compileArchitecturePlan(p,{...policy,hostDetail:'spatial-v1'});
  assert.deepEqual(p,saved);assert.deepEqual(now.plan,saved);
  assert.equal(compileArchitecturePlan(p,policy).sourceSha256,old.sourceSha256);
  assert.notEqual(now.geometrySha256,old.geometrySha256);
  assert.equal(now.spatialDetail.owner,'HOST');assert.equal(now.spatialDetail.equipmentAdded,0);
  assert.equal(now.spatialDetail.roofProfilePreserved,roof);
  const v=voxels(now.compiled),ex=now.spatialDetail.recessedEntry[0];
  assert.equal(now.spatialDetail.recessedEntry[2],4);
  for(let x=ex;x<=ex+1;x++)for(let z=0;z<=5;z++){
   assert(includes(v,x,1,z),'ground supported approach');
   for(let y=2;y<=4;y++)assert(!includes(v,x,y,z),'three-high real entry passage');
  }
  assert(includes(v,ex,5,1),'actual entrance canopy');
  for(let y=6;y<now.design.bounds.height;y++)assert(!includes(v,ex,y,2),'full-height notch removes upper slab and roof');
  assert.deepEqual(now.fixtureTargets.map(x=>[x.zoneId,x.kind]),old.fixtureTargets.map(x=>[x.zoneId,x.kind]));
  assert.equal(now.fixtureTargets.length,8);assert.ok(now.fixtureTargets.every(x=>x.kind!=='oven'));
  const route=auditR125SourceRoutes(now,{featureTargets:now.fixtureTargets});
  assert.equal(route.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.ok(route.featureAccess.every(x=>x.reachableFromEntrance));
  assert.equal(auditArchitecturePlanCirculation(now).status,'SOURCE_CLEARANCE_PROBES_PASS');
  const critique=critiqueArchitecture({design:now.design,compiled:now.compiled});
  assert.deepEqual(assessR125ProgramGeometry(now,critique).programFloorIssues,[]);
  assert.ok(now.design.elements.length<=160);assert(verifyCompiled(now.design,now.compiled));
  assert.equal(now.worldWrites,0);assert.deepEqual(now.compiled.BuildPlan.operations,[]);
 }
});


test('hip roof meets actual recessed-entry walls at true authored roof elevation, both ridge axes',()=>{
 for(const roofAxis of ['x','z']){
  const p=plan('hip-court-integration-'+roofAxis,['z','x'],
   ['food and family preparation','quiet bedroom']);
  p.footprint={width:28,depth:26};
  p.expression={setbackSide:'none',setbackDepth:0,
   roofProfile:'hip',roofAxis,roofVolume:'raised',facadeLanguage:'fins'};
  p.levels[0].spaces[0].fixtures=['oven','washbasin'];
  p.levels[0].spaces[1].fixtures=['bed'];
  p.levels[1].spaces[0].fixtures=['desk','storage'];
  const original=structuredClone(p);
  const opts={entrancePlacement:'source-accessible',
   upperDoorPlacement:'stair-clear'};
  const bare=compileArchitecturePlan(p,opts);
  const built=compileArchitecturePlan(p,{...opts,hostDetail:'spatial-v1'});
  assert.deepEqual(p,original,'original author must not be rewritten');
  assert.equal(verifyCompiled(built.design,built.compiled),true);
  assert.notEqual(built.geometrySha256,bare.geometrySha256);
  assert.equal(built.spatialDetail.roofProfilePreserved,'hip');
  assert.deepEqual(built.fixtureTargets.map(f=>f.kind),
   bare.fixtureTargets.map(f=>f.kind));
  assert.ok(built.fixtureTargets.length>=5);
  // The roof is NOT a level 11 flat cap: the roof height at the recessed
  // rear wall differs by ridge direction and actual B143 tier.
  const {left,right,back}=built.spatialDetail.court;
  const hipSkins=bare.design.elements.filter(e=>
   e.mode==='add'&&e.shape==='box'&&
   /^(roof-hip-(?:\d+-(?:front|rear|west|east)|inner-(?:front|rear|west|east)|ridge))$/.test(e.id));
  const at=(x,z)=>{
   const roofs=hipSkins.filter(e=>x>=e.origin[0]&&
    x<e.origin[0]+e.size[0]&&z>=e.origin[2]&&
    z<e.origin[2]+e.size[2]);
   assert.ok(roofs.length>0,'original roof must cover the return');
   return Math.max(...roofs.map(e=>e.origin[1]+e.size[1]-1));
  };
  // The HOST packs adjacent equal-shape entrance boxes into B143 repeat
  // elements. Validate *expanded* physical instances, not vanished source
  // element IDs. No loosened roof alignment tolerances.
  const returnWalls=new Map();
  for(const e of built.design.elements.filter(e=>
   /^detail-entry-(?:return|back)-/.test(e.id))){
   for(let n=0;n<(e.repeat?.count??1);n++){
    const x=e.origin[0]+n*(e.repeat?.offset[0]??0);
    assert.equal(returnWalls.has(x),false,'duplicated return wall at '+x);
    returnWalls.set(x,{height:e.size[1],
     y:e.origin[1]+n*(e.repeat?.offset[1]??0)});
   }
  }
  assert.equal(returnWalls.size,right-left+1,'all actual return cells kept');
  let physicallyRaised=0;
  for(let x=left;x<=right;x++){
   const expected=at(x,back),wall=returnWalls.get(x);
   assert.ok(wall,'physical entry return wall missing '+x);
   assert.equal(wall.y,2,'same actual standing-floor wall base');
   assert.equal(wall.height,expected-1,
    'enclosure reaches the authored hip roof, not an assumed flat cap');
   if(expected>11)physicallyRaised++;
  }
  assert.ok(physicallyRaised>0,'test needs a raised roof over its actual entrance');
  const routes=auditR125SourceRoutes(built,{featureTargets:built.fixtureTargets});
  assert.equal(routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES',
   JSON.stringify(routes.issues));
  assert.ok(routes.featureAccess.every(f=>f.reachableFromEntrance));
  assert.equal(auditArchitecturePlanCirculation(built).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.deepEqual(built.compiled.BuildPlan.operations,[]);
  assert.equal(built.worldWrites,0);
  // No implicit opt-in or change to the original hip geometry.
  assert.equal(compileArchitecturePlan(p,opts).sourceSha256,bare.sourceSha256);
 }
});
test('adjacent SOURCE box packing retains material voxels and does not cross cuts or shell boundaries',()=>{
 const original=compileArchitecturePlan(plan('adjacent-box-proof')).design;
 const d=structuredClone(original);
 const b=(id,x,material='metal')=>({id,shape:'box',mode:'add',material,origin:[x,3,6],size:[1,2,1]});
 d.elements.push(b('pair-a',5),b('pair-b',7),b('pair-c',9),
  {id:'cut-between',shape:'box',mode:'cut',origin:[5,3,6],size:[1,1,1]},b('after-cut',11),
  {...b('shell-a',12),size:[3,3,3],shell:1},{...b('solid-b',14),size:[3,3,3]});
 const before=compileDesign(d),packed={...d,elements:packR125AdjacentBoxes(d.elements)},after=compileDesign(packed);
 assert.deepEqual(after.primitives,before.primitives);
 assert.deepEqual(packed.elements.find(e=>e.id==='pair-a').repeat,{count:3,offset:[2,0,0]});
 assert(packed.elements.some(e=>e.id==='cut-between'));assert(packed.elements.some(e=>e.id==='after-cut'));
 assert(packed.elements.some(e=>e.id==='shell-a'));assert(packed.elements.some(e=>e.id==='solid-b'));
 assert(verifyCompiled(packed,after));
});

test('spatial HOST keeps beds modest in height and fails explicitly when a real entry court cannot fit',()=>{
 const p=plan('spatial-bed-scale',['z']);p.footprint={width:24,depth:20};
 p.expression={setbackSide:'none',setbackDepth:0,roofProfile:'ridge',roofAxis:'x',roofVolume:'raised',facadeLanguage:'plain'};
 p.levels[0].spaces[1].fixtures=['bed','storage'];p.levels[0].spaces[1].fixtureDetail='crafted';
 const policy={entrancePlacement:'source-accessible'},old=compileArchitecturePlan(p,policy);
 const now=compileArchitecturePlan(p,{...policy,hostDetail:'spatial-v1'});
 const head=r=>r.design.elements.find(e=>e.id.endsWith('-headboard'));
 assert.equal(head(old).size[1],2);assert.equal(head(now).size[1],1);
 assert.equal(now.fixtureTargets.length,2);
 assert.equal(auditR125SourceRoutes(now,{featureTargets:now.fixtureTargets}).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 const narrow=plan('narrow-real-entry',['x']);narrow.expression=p.expression;narrow.entryZone='first';
 assert.throws(()=>compileArchitecturePlan(narrow,{...policy,hostDetail:'spatial-v1'}),/ENTRY_COURT_DOES_NOT_FIT/);
 assert.throws(()=>compileArchitecturePlan(p,{hostDetail:'invented'}),/HOST_DETAIL_MODE/);
});

test('a Qwen-authorable front courtyard is a true L footprint with walkable outdoor source',()=>{
 for(const side of ['west','east'])for(const axis of ['x','z']){
  const p=plan('front-court-'+side+'-'+axis,[axis]);
  p.footprint={width:28,depth:28};
  p.expression={setbackSide:'none',setbackDepth:0,roofProfile:'flat',
   roofAxis:'x',facadeLanguage:'plain',
   frontCornerCut:{width:6,depth:5,side,access:'paved'}};
  const snapshot=structuredClone(p);
  const b=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  const v=voxels(b.compiled),x0=side==='west'?1:21;
  for(let x=x0;x<x0+6;x++)for(let z=1;z<=5;z++){
   assert.equal(includes(v,x,1,z),true,'supported court floor');
   for(let y=2;y<b.design.bounds.height;y++)
    assert.equal(includes(v,x,y,z),false,'outdoor court has no roof or wall');
  }
  for(let x=x0+2;x<=x0+3;x++)for(let y=2;y<=4;y++)
   assert.equal(includes(v,x,y,6),false,'actual two-wide internal doorway');
  assert.equal(verifyCompiled(b.design,b.compiled),true);
  assert.equal(auditArchitecturePlanCirculation(b).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(auditR125SourceRoutes(b).status,
   'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(b.courtyardSourceOnly?.face,'front');
  assert.equal(b.courtyardSourceOnly?.status,
   'SOURCE_2_WIDE_PAVED_COURT_REACHABLE');
  assert.deepEqual(p,snapshot,'author input is unchanged');
  assert.equal(b.worldWrites,0);
  assert.deepEqual(b.compiled.BuildPlan.operations,[]);
 }
});

test('front court rejects unsafe mass combinations and narrow footprints',()=>{
 const p=plan('front-court-reject');
 p.footprint={width:28,depth:28};
 p.expression={setbackSide:'none',setbackDepth:0,roofProfile:'flat',
  roofAxis:'x',facadeLanguage:'plain',
  frontCornerCut:{width:6,depth:5,side:'west',access:'paved'}};
 const rejects=(mutate,reason)=>{
  const q=structuredClone(p);mutate(q);
  assert.throws(()=>compileArchitecturePlan(q,{entrancePlacement:'source-accessible'}),
   new RegExp('R125_PLAN_'+reason));
 };
 rejects(q=>q.expression.frontCornerCut.width=9,'EXPRESSION_FRONT_COURT');
 rejects(q=>q.footprint.width=18,'EXPRESSION_FRONT_COURT');
 rejects(q=>q.expression.roofProfile='ridge','EXPRESSION_FRONT_COURT_CONFLICT');
 rejects(q=>q.expression.rearCornerCut={width:4,depth:4},'EXPRESSION_FRONT_COURT_CONFLICT');
 rejects(q=>q.expression.facadeLanguage='recessed-portico','EXPRESSION_FRONT_COURT_CONFLICT');
});

test('author-controlled U-shaped rear courtyard alters primary roof volume with true two-wide outdoor route',()=>{
 for(const axis of ['x','z'])for(const alignment of ['west','center','east']){
  const p=plan('u-court-'+axis+'-'+alignment,[axis]);
  p.footprint={width:30,depth:30};
  p.expression={setbackSide:'none',setbackDepth:0,
   roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain',
   rearCourt:{width:8,depth:6,alignment,entrySide:alignment==='east'?'east':'west',access:'paved'}};
  const raw=JSON.stringify(p);
  const result=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  const cells=voxels(result.compiled);
  const spare=p.footprint.width-2-8;
  const x0=1+(alignment==='west'?5:alignment==='east'?spare-5:Math.floor(spare/2));
  const z0=p.footprint.depth-1-6;
  for(let x=x0;x<x0+8;x++)for(let z=z0;z<z0+6;z++){
   assert.equal(includes(cells,x,1,z),true,'paved outdoor surface');
   for(let y=2;y<result.design.bounds.height;y++)
    assert.equal(includes(cells,x,y,z),false,'real roofless U-shaped opening');
  }
  assert.equal(result.courtyardSourceOnly?.massing,'U');
  assert.equal(result.courtyardSourceOnly?.alignment,alignment);
  assert.equal(result.courtyardSourceOnly?.status,'SOURCE_2_WIDE_PAVED_COURT_REACHABLE');
  assert.equal(auditArchitecturePlanCirculation(result).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(auditR125SourceRoutes(result).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(verifyCompiled(result.design,result.compiled),true);
  assert.equal(result.worldWrites,0);
  assert.deepEqual(result.compiled.BuildPlan.operations,[]);
  assert.equal(JSON.stringify(p),raw,'original model-intent plan must not change');
 }
});

test('U-shaped rear court refuses impossible spans, multiple storeys and incompatible competing forms',()=>{
 const p=plan('u-court-guard');
 p.footprint={width:28,depth:28};
 p.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain',
  rearCourt:{width:9,depth:6,alignment:'center',entrySide:'west',access:'paved'}};
 const reject=(change,reason)=>{
  const q=structuredClone(p);change(q);
  assert.throws(()=>compileArchitecturePlan(q,{entrancePlacement:'source-accessible'}),
   new RegExp('R125_PLAN_'+reason));
 };
 reject(q=>q.expression.rearCourt.width=15,'EXPRESSION_REAR_COURT');
 reject(q=>q.expression.rearCourt.depth=11,'EXPRESSION_REAR_COURT');
 reject(q=>q.footprint.width=19,'EXPRESSION_REAR_COURT');
 reject(q=>q.expression.rearCourt.entrySide='middle','EXPRESSION_REAR_COURT');
 reject(q=>q.expression.roofProfile='ridge','EXPRESSION_REAR_COURT_CONFLICT');
 reject(q=>q.expression.rearCornerCut={width:5,depth:5},'EXPRESSION_REAR_COURT_CONFLICT');
 reject(q=>q.expression.frontCornerCut={width:4,depth:4,side:'west',access:'paved'},
  'EXPRESSION_REAR_COURT_CONFLICT');
 reject(q=>q.levels.push(structuredClone(q.levels[0])),'EXPRESSION_REAR_COURT_CONFLICT');
});

test('model-selected U courtyard with raised pitched roof has sealed reentrant gables and sky-open floor',()=>{
 for(const axis of ['x','z'])for(const align of ['west','center','east']){
  const p=plan('u-ridge-'+axis+'-'+align,[axis]);
  p.footprint={width:30,depth:30};
  p.expression={setbackSide:'none',setbackDepth:0,roofProfile:'ridge',
   roofAxis:axis,roofVolume:'raised',facadeLanguage:'plain',
   rearCourt:{width:12,depth:8,alignment:align,
    entrySide:align==='east'?'east':'west',access:'paved'}};
  const original=JSON.stringify(p);
  const built=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
  const v=voxels(built.compiled),spare=30-2-12;
  const left=align==='west'?5:align==='east'?spare-5:Math.floor(spare/2);
  const x0=1+left,z0=30-1-8;
  for(let x=x0;x<x0+12;x++)for(let z=z0;z<z0+8;z++){
   assert.equal(includes(v,x,1,z),true,'actual paved floor');
   for(let y=2;y<built.design.bounds.height;y++)
    assert.equal(includes(v,x,y,z),false,'raised roof must not bridge open sky');
  }
  assert(built.compiled.primitives.some(c=>c[1]>7),'real raised roof');
  const roofRise=(x,z)=>{
   const pos=axis==='x'?x-1:z-1;
   return Math.min(3,Math.floor(Math.min(pos,27-pos)/2));
  };
  // Behind the new inner/re-entrant walls, the raised roof has no gaps.
  const innerX=x0+6,innerZ=z0-1;
  const innerRise=roofRise(innerX,innerZ);
  assert(innerRise>0);
  for(let y=6;y<6+innerRise;y++)
   assert.equal(includes(v,innerX,y,innerZ),true,
    'inner courtyard rear wall must meet the exact ridge skin');
  const sideZ=z0+3,sideX=x0-1,sideRise=roofRise(sideX,sideZ);
  assert(sideRise>0);
  for(let y=6;y<6+sideRise;y++)
   assert.equal(includes(v,sideX,y,sideZ),true,
    'courtyard wing return wall must meet the exact ridge skin');
  assert.equal(verifyCompiled(built.design,built.compiled),true);
  assert.equal(auditArchitecturePlanCirculation(built).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(auditR125SourceRoutes(built).status,
   'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(built.courtyardSourceOnly?.massing,'U');
  assert.equal(built.courtyardSourceOnly?.status,
   'SOURCE_2_WIDE_PAVED_COURT_REACHABLE');
  assert.deepEqual(built.compiled.BuildPlan.operations,[]);
  assert.equal(built.worldWrites,0);
  assert.equal(JSON.stringify(p),original);
 }
});

test('U raised roof rejects roof plate, fake unraised pitched geometry and incompatible forms',()=>{
 const p=plan('u-ridge-valid');
 p.footprint={width:30,depth:30};
 p.expression={setbackSide:'none',setbackDepth:0,roofProfile:'ridge',
  roofAxis:'x',roofVolume:'raised',facadeLanguage:'plain',
  rearCourt:{width:10,depth:8,alignment:'center',entrySide:'west',access:'paved'}};
 const reject=(mutation)=>{
  const q=structuredClone(p);mutation(q);
  assert.throws(()=>compileArchitecturePlan(q,
   {entrancePlacement:'source-accessible'}),/R125_PLAN_/);
 };
 reject(q=>delete q.expression.roofVolume);
 reject(q=>q.expression.roofProfile='sawtooth');
 reject(q=>q.expression.roofProfile='hip');
 reject(q=>q.expression.roofOverhang='one-block');
 reject(q=>{q.expression.roofProfile='flat'});
});

test('optional glazed sawtooth ribbon reduces opaque roof skin without changing source footprint or author plan',()=>{
 const authored=plan('tide-roof-review',['x'],['sensor lab','field station']);
 authored.footprint={width:24,depth:24};
 authored.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'sawtooth',roofAxis:'x',roofVolume:'raised',facadeLanguage:'plain'};
 const raw=JSON.stringify(authored);
 const original=compileArchitecturePlan(authored,{entrancePlacement:'source-accessible'});
 const glazed=compileArchitecturePlan(authored,{
  entrancePlacement:'source-accessible',roofGlazing:'sawtooth-ribbon'});
 assert.equal(JSON.stringify(authored),raw,'model-authored bytes stay untouched');
 assert.equal(glazed.planSha256,original.planSha256);
 assert.notEqual(glazed.sourceSha256,original.sourceSha256);
 assert.equal(verifyCompiled(glazed.design,glazed.compiled),true);
 const occupied=scene=>scene.compiled.primitives.map(x=>x.slice(0,3).join(',')).sort();
 assert.deepEqual(occupied(glazed),occupied(original),
  'replacing roof material never makes gaps or adds extra roof mass');
 const originalSkin=original.design.elements.filter(e=>e.id.startsWith('roof-raised-skin-'));
 const glazedSkin=glazed.design.elements.filter(e=>e.id.startsWith('roof-raised-skin-'));
 assert.equal(glazedSkin.length,originalSkin.length);
 const changed=glazedSkin.filter((e,i)=>e.material!==originalSkin[i].material);
 assert(changed.length>=2,'one glass ribbon per six raised sawtooth strips');
 assert(changed.every(e=>e.material==='glass' &&
  Number(e.id.slice('roof-raised-skin-'.length))%6===4));
 assert.equal(auditArchitecturePlanCirculation(glazed).status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditR125SourceRoutes(glazed).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(glazed.inGameWalking,'NOT_TESTED');
 assert.equal(glazed.worldWrites,0);
 assert.throws(()=>compileArchitecturePlan(authored,{roofGlazing:'unknown'}),
  /R125_PLAN_ROOF_GLAZING_MODE/);
 assert.throws(()=>compileArchitecturePlan({...authored,expression:{
  ...authored.expression,roofProfile:'ridge'}},
  {roofGlazing:'sawtooth-ribbon'}),
  /R125_PLAN_ROOF_GLAZING_REQUIRES_RAISED_SAWTOOTH/);
});


test('AI-author steep ridge reduces wide roof plateau and preserves floor and traffic',()=>{
 const p=plan('author-steep-roof',['z','x'],
  ['visitor studio','instrument analysis']);
 p.footprint={width:30,depth:28};
 p.expression={setbackSide:'east',setbackDepth:3,
  roofProfile:'ridge',roofAxis:'z',roofVolume:'raised',
  facadeLanguage:'plain'};
 const raw=structuredClone(p);
 const old=compileArchitecturePlan(p,{
  entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
 const chosen=structuredClone(p);
 chosen.expression.ridgeProfile='steep';
 const newRoof=compileArchitecturePlan(chosen,{
  entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
 assert.deepEqual(p,raw,'new roof is explicit, never inferred in old author');
 assert.ok(newRoof.compiled.bounds.maxY>old.compiled.bounds.maxY,
  'wide pitched roof becomes taller instead of a broad 3-block-rise plateau');
 assert.notEqual(old.geometrySha256,newRoof.geometrySha256);
 assert.equal(verifyCompiled(newRoof.design,newRoof.compiled),true);
 assert.equal(auditArchitecturePlanCirculation(newRoof).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditR125SourceRoutes(newRoof).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 const oldV=new Map(old.compiled.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const newV=new Map(newRoof.compiled.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 // Wall/floor/door/furniture/source voxels below top floor ceiling must
 // remain unchanged; the author chose roof silhouette, not new rooms.
 const top=1+5*chosen.levels.length;
 for(const [key,mat] of oldV){
  const y=Number(key.split(',')[1]);
  if(y<top)assert.equal(newV.get(key),mat,
   'no roof style may silently alter usable occupied floors: '+key);
 }
 assert.deepEqual(newRoof.compiled.BuildPlan.operations,[]);
 assert.equal(newRoof.worldWrites,0);
 for(const invalid of [
  {ridgeProfile:'steep',roofProfile:'flat',roofVolume:undefined},
  {ridgeProfile:'steep',roofProfile:'sawtooth'},
  {ridgeProfile:'steep',rearCornerCut:{width:4,depth:4}}
 ]){
  const bad=structuredClone(chosen);
  bad.expression={...bad.expression,...invalid};
  assert.throws(()=>compileArchitecturePlan(bad),
   /R125_PLAN_EXPRESSION_RIDGE_PROFILE/);
 }
});

test('AI-author selected verified hearth supports exact B143 Education SOURCE export',()=>{
 const p=plan('verified-hearth-architect',['x'],
  ['public viewing space','private baking room']);
 p.footprint={width:26,depth:26};
 p.levels[0].spaces[1].fixtures=['oven'];
 p.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'};
 const unverified=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const original=structuredClone(p);
 const authored=structuredClone(p);
 authored.levels[0].spaces[1].ovenHearth='accent';
 const safe=compileArchitecturePlan(authored,{entrancePlacement:'source-accessible'});
 assert.deepEqual(p,original);
 assert.equal(verifyCompiled(safe.design,safe.compiled),true);
 assert.equal(auditArchitecturePlanCirculation(safe).status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(auditR125SourceRoutes(safe,{featureTargets:safe.fixtureTargets}).status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 const prior=unverified.design.elements.find(e=>e.id.endsWith('-hearth-glow'));
 const replacement=safe.design.elements.find(e=>e.id.endsWith('-hearth-glow'));
 assert.equal(prior.material,'glow');
 assert.equal(replacement.material,'accent');
 assert.deepEqual({...prior,material:'accent'},replacement,
  'only the explicit oven hearth block material is changed');
 const oldCells=new Map(unverified.compiled.primitives.map(v=>
  [v.slice(0,3).join(','),v[3]]));
 const newCells=new Map(safe.compiled.primitives.map(v=>
  [v.slice(0,3).join(','),v[3]]));
 assert.equal(oldCells.size,newCells.size);
 assert.equal([...oldCells].filter(([k,v])=>newCells.get(k)!==v).length,1,
  'one true source voxel changes, not a substitute building');
 const palette=JSON.parse(fs.readFileSync(
  new URL('../configs/r125-education-verified-palette-v26.33.json',
   import.meta.url),'utf8'));
 assert.throws(()=>exportB143EducationMakeCode({
  design:unverified.design,scene:unverified.compiled,
  provenance:'LOCAL_MODEL_CAPTURE',groundLowestLayer:true,
  verifiedPalette:palette}),/UNVERIFIED_MATERIAL_GLOW/);
 const packet=exportB143EducationMakeCode({
  design:safe.design,scene:safe.compiled,
  provenance:'LOCAL_MODEL_CAPTURE',groundLowestLayer:true,
  verifiedPalette:palette});
 assert.equal(packet.sourceSha256,safe.sourceSha256);
 assert.equal(packet.geometrySha256,safe.geometrySha256);
 assert.equal(packet.materialMode,'STRICT_USER_ATTESTED');
 assert.equal(packet.plannedVoxelCount,safe.compiled.primitives.length);
 assert.equal(packet.usedMaterials.some(x=>x.material==='glow'),false);
 assert.equal(packet.usedMaterials.some(x=>x.material==='accent'),true);
 assert.equal(packet.programExecuted,false);
 assert.equal(packet.actualEducationExecution,'NOT_TESTED');
 assert.deepEqual(packet.BuildPlan.operations,[]);
 assert.equal(packet.worldWrites,0);
 const bad=structuredClone(p);
 bad.levels[0].spaces[0].ovenHearth='accent';
 assert.throws(()=>validateArchitecturePlan(bad),/R125_PLAN_SPACE_OVEN_HEARTH/);
});


test('AI-authored focal work island places actual B143 equipment centrally without changing old design',()=>{
 const p=plan('focal-public-workspace',['x'],
  ['visitor workshop','small maintenance room']);
 p.footprint={width:30,depth:30};
 p.levels[0].spaces[0].fixtures=['workbench'];
 const original=structuredClone(p);
 const legacy=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 const chosen=structuredClone(p);
 chosen.levels[0].spaces[0].fixtureArrangement='focal-island';
 const result=compileArchitecturePlan(chosen,{entrancePlacement:'source-accessible'});
 assert.deepEqual(p,original,'no old plan rewriting');
 assert.equal(legacy.fixtureTargets.length,1);
 assert.equal(result.fixtureTargets.length,1);
 const a=legacy.fixtureTargets[0],b=result.fixtureTargets[0];
 const zone=result.program[0].zones[0].range;
 const midX=Math.floor((zone.x[0]+zone.x[1]-3+1)/2);
 const midZ=Math.floor((zone.z[0]+zone.z[1]-1+1)/2);
 assert.deepEqual([b.origin[0],b.origin[2]],[midX,midZ],
  'model-chosen focal workstation is centered on real room floor');
 assert.equal(b.arrangement,'focal-island');
 assert.notDeepEqual(a.origin,b.origin);
 assert.notEqual(legacy.geometrySha256,result.geometrySha256);
 assert.equal(verifyCompiled(result.design,result.compiled),true);
 assert.equal(auditR125SourceRoutes(result,{featureTargets:result.fixtureTargets}).status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditArchitecturePlanCirculation(result).status,
  'SOURCE_CLEARANCE_PROBES_PASS');
 assert.deepEqual(result.compiled.BuildPlan.operations,[]);
 assert.equal(result.worldWrites,0);
});
test('authored center can be rejected by real traffic and older room schemas stay unchanged',()=>{
 const p=plan('focal-layout-validated',['x']);
 p.levels[0].spaces[0].fixtureArrangement='focal-island';
 assert.throws(()=>validateArchitecturePlan(p),/R125_PLAN_SPACE_FIXTURE_ARRANGEMENT/);
 p.levels[0].spaces[0].fixtures=['desk'];
 assert.equal(validateArchitecturePlan(p),true);
 p.levels[0].spaces[0].fixtureArrangement='unverified';
 assert.throws(()=>validateArchitecturePlan(p),/R125_PLAN_SPACE_FIXTURE_ARRANGEMENT/);
 delete p.levels[0].spaces[0].fixtureArrangement;
 assert.equal(validateArchitecturePlan(p),true);
});

test('AI-authored front setback gives real upper terrace with entrance and perimeter, not a faux facade',()=>{
 for(const axis of ['x','z'])for(const roofProfile of ['flat','ridge','hip']){
  const p=plan('front-setback-'+axis+'-'+roofProfile,['x',axis],
   ['public arrival and studio','workroom']);
  p.footprint={width:26,depth:26};
  p.expression={setbackSide:'front',setbackDepth:2,
   roofProfile,roofAxis:'x',facadeLanguage:'plain',
   ...(roofProfile!=='flat'?{roofVolume:'raised'}:{})};
  const saved=structuredClone(p);
  const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible',
   upperDoorPlacement:'stair-clear'});
  assert.deepEqual(p,saved);
  const cells=voxels(r.compiled);
  assert.ok(r.design.elements.some(e=>e.id==='upper-terrace-access'));
  assert.ok(r.design.elements.some(e=>e.id==='front-terrace-parapet-street'));
  assert.equal(includes(cells,10,7,1),true,'street parapet on upper slab');
  assert.equal(includes(cells,10,7,2),false,'terrace stays open');
  assert.equal(includes(cells,11,7,3),false,'real two-wide upper access');
  assert.equal(includes(cells,10,6,2),true,'supported outdoor terrace floor');
  assert.equal(verifyCompiled(r.design,r.compiled),true);
  assert.equal(auditArchitecturePlanCirculation(r).status,
   'SOURCE_CLEARANCE_PROBES_PASS',axis+'/'+roofProfile);
  assert.equal(auditR125SourceRoutes(r).status,'SOURCE_ROUTES_REACH_ALL_ZONES',
   axis+'/'+roofProfile);
  assert.deepEqual(r.compiled.BuildPlan.operations,[]);
  assert.equal(r.worldWrites,0);
  const historical=structuredClone(p);
  historical.expression.setbackSide='rear';
  const old=compileArchitecturePlan(historical,{entrancePlacement:'source-accessible',
   upperDoorPlacement:'stair-clear'});
  assert.ok(!old.design.elements.some(e=>e.id.startsWith('front-terrace-parapet')));
  assert.notEqual(old.geometrySha256,r.geometrySha256);
 }
});
test('new street setback must be two-level exactly two blocks',()=>{
 const p=plan('valid-front-street',['x','z']);
 p.expression={setbackSide:'front',setbackDepth:2,roofProfile:'flat',
  roofAxis:'x',facadeLanguage:'plain'};
 assert.equal(validateArchitecturePlan(p),true);
 p.expression.setbackDepth=3;
 assert.throws(()=>validateArchitecturePlan(p),/R125_PLAN_EXPRESSION_SETBACK/);
 p.expression.setbackDepth=2;
 p.levels=p.levels.slice(0,1);
 assert.throws(()=>validateArchitecturePlan(p),/R125_PLAN_EXPRESSION_SETBACK/);
});


test('front-setback two-story x40/z60 recessed portico keeps stair source-reachable',()=>{
 // Separate synthetic structure matching the reported shape, not a copied
 // PRIVATE model response. Test the physical entrance/upper route directly.
 for(const secondAccess of ['shared','staff']){
  const p=plan('front-portico-stair-'+secondAccess,['x','z'],
   ['children reading room','paper craft workshop']);
  p.footprint={width:32,depth:32};
  p.levels[0].splitPercent=40;
  p.levels[0].spaces[0].id='reading-room';
  p.levels[0].spaces[1].id='workshop';
  p.levels[0].spaces[0].access='public';
  p.levels[0].spaces[1].access='public';
  p.levels[1].splitPercent=60;
  p.levels[1].spaces[0].id='staff-area';
  p.levels[1].spaces[0].access=secondAccess==='shared'?'shared':'staff';
  p.levels[1].spaces[1].id='entrance-hall';
  p.levels[1].spaces[1].access='shared';
  p.entryZone='first';
  p.expression={setbackSide:'front',setbackDepth:2,
   roofProfile:'ridge',roofAxis:'z',
   facadeLanguage:'recessed-portico',roofVolume:'raised'};
  const untouched=structuredClone(p);
  const b=compileArchitecturePlan(p,{
   entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
  assert.deepEqual(p,untouched,'model-authored layout may not be repaired');
  const entry=b.design.elements.find(e=>e.id==='exterior-entrance');
  const returnCut=b.design.elements.find(e=>
   e.id==='portico-stair-vestibule-cut');
  assert.deepEqual(entry.origin.slice(1),[2,4]);
  assert.deepEqual(returnCut.origin,[5,2,2]);
  assert.deepEqual(returnCut.size,[1,3,2]);
  assert.equal(verifyCompiled(b.design,b.compiled),true);
  const cells=voxels(b.compiled);
  assert.equal(includes(cells,5,2,2),false);
  assert.equal(includes(cells,5,3,3),false);
  assert.equal(includes(cells,5,5,3),true,'real over-door lintel retained');
  assert.equal(auditArchitecturePlanCirculation(b).status,
   'SOURCE_CLEARANCE_PROBES_PASS');
  const route=auditR125SourceRoutes(b);
  assert.equal(route.status,'SOURCE_ROUTES_REACH_ALL_ZONES',
   JSON.stringify({issues:route.issues,zones:route.zones,
    entry:route.sourceInteriorEntrance}));
  assert.ok(route.zones.every(z=>z.reachedFromEntrance));
  const visitor=auditR125VisitorRoutes(b,p);
  if(secondAccess==='shared'){
   // Both upper rooms are publicly traversable; SOURCE-only route succeeds.
   assert.equal(visitor.status,'SOURCE_VISITOR_ROUTES_AVOID_STAFF',
    JSON.stringify(visitor));
  }else{
   // Model-authored staff room still separates the upstairs shared room:
   // adding stair access must not silently mislabel this as visitor-safe.
   assert.equal(visitor.status,'HOLD_VISITOR_STAFF_SEPARATION');
   assert.deepEqual(visitor.blocked,['entrance-hall']);
  }
  assert.deepEqual(b.compiled.BuildPlan.operations,[]);
  assert.equal(b.worldWrites,0);
 }
});
test('recessed-portico stair threshold never changes historical setback modes',()=>{
 for(const side of ['none','east','rear']){
  const p=plan('historical-portico-'+side,['x','z']);
  p.footprint={width:32,depth:32};
  p.levels[0].splitPercent=40;
  p.levels[1].splitPercent=60;
  p.entryZone='first';
  p.expression={setbackSide:side,setbackDepth:side==='none'?0:2,
   roofProfile:'ridge',roofAxis:'z',
   facadeLanguage:'recessed-portico',roofVolume:'raised'};
  const b=compileArchitecturePlan(p,{
   entrancePlacement:'source-accessible',upperDoorPlacement:'stair-clear'});
  assert.equal(b.design.elements.some(e=>
   e.id==='portico-stair-vestibule-cut'),false);
  assert.equal(b.worldWrites,0);
 }
});

test('authored fins do not block the two-wide actual ground entrances',()=>{
 for(const axis of ['x','z'])for(const zone of axis==='x'?['first','second']:['first']){
  const p=plan('fin-clear-'+axis+'-'+zone,[axis]);
  p.footprint={width:24,depth:24};p.entryZone=zone;
  p.expression={setbackSide:'none',setbackDepth:0,
   roofProfile:'flat',roofAxis:'x',facadeLanguage:'fins'};
  const original=structuredClone(p);
  const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible',
   hostDetail:'clear-front-fins'});
  const door=r.design.elements.find(e=>e.id==='exterior-entrance');
  assert.ok(door);
  const fins=r.design.elements.filter(e=>/^l0-fin-/.test(e.id));
  assert.ok(fins.length>0,'keep the other facade fins');
  assert.ok(fins.every(e=>e.origin[0]<door.origin[0]-1||
   e.origin[0]>=door.origin[0]+door.size[0]+1));
  const solid=new Set(r.compiled.primitives.map(v=>v[0]+','+v[1]+','+v[2]));
  for(let x=door.origin[0];x<door.origin[0]+door.size[0];x++)
   for(let y=door.origin[1];y<door.origin[1]+door.size[1];y++)
    assert.equal(solid.has(x+','+y+','+(door.origin[2]-1)),false,
     'actual B143 outside threshold must be clear');
  assert.deepEqual(p,original,'authored plan must remain unchanged');
  assert.equal(r.worldWrites,0);
  assert.deepEqual(r.compiled.BuildPlan.operations,[]);
 }
});

test('authored fins also leave a front setback terrace doorway open',()=>{
 const p=plan('fin-clear-front-terrace',['x','z']);
 p.footprint={width:24,depth:24};
 p.expression={setbackSide:'front',setbackDepth:2,
  roofProfile:'flat',roofAxis:'x',facadeLanguage:'fins'};
 const original=structuredClone(p);
 const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible',
  upperDoorPlacement:'stair-clear',hostDetail:'clear-front-fins'});
 const door=r.design.elements.find(e=>e.id==='upper-terrace-access');
 assert.ok(door);
 const fins=r.design.elements.filter(e=>/^l1-fin-/.test(e.id));
 assert.ok(fins.length>0,'keep other upper facade fins');
 assert.ok(fins.every(e=>e.origin[0]<door.origin[0]-1||
  e.origin[0]>=door.origin[0]+door.size[0]+1));
 const solid=new Set(r.compiled.primitives.map(v=>v[0]+','+v[1]+','+v[2]));
 for(let x=door.origin[0];x<door.origin[0]+door.size[0];x++)
  for(let y=door.origin[1];y<door.origin[1]+door.size[1];y++)
   assert.equal(solid.has(x+','+y+','+(door.origin[2]-1)),false);
 assert.deepEqual(p,original);
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.compiled.BuildPlan.operations,[]);
});


test('front-fin clearance is opt-in, not a historical Qwen geometry rewrite',()=>{
 const p=plan('facade-fin-default-frozen',['x']);
 p.footprint={width:24,depth:24};p.entryZone='first';
 p.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'flat',roofAxis:'x',facadeLanguage:'fins'};
 const opts={entrancePlacement:'source-accessible'};
 const legacy=compileArchitecturePlan(p,opts);
 const a=compileArchitecturePlan(p,{...opts,hostDetail:'clear-front-fins'});
 const b=compileArchitecturePlan(p,{...opts,hostDetail:'clear-front-fins'});
 assert.equal(a.sourceSha256,b.sourceSha256);
 assert.notEqual(legacy.geometrySha256,a.geometrySha256);
 assert.ok(legacy.design.elements.some(e=>e.id==='l0-fin-10'));
 assert.equal(a.design.elements.some(e=>e.id==='l0-fin-10'),false);
 assert.equal(a.worldWrites,0);
});

test('explicit steeper ridge A/B changes only roof voxels and preserves author original',()=>{
 for(const axis of ['x','z']){
  const p=plan('original-ridge-art-'+axis,['x','z']);
  p.footprint={width:32,depth:32};
  p.expression={setbackSide:'east',setbackDepth:2,
   roofProfile:'ridge',roofAxis:axis,roofVolume:'raised',
   facadeLanguage:'plain'};
  const original=structuredClone(p);
  const policy={entrancePlacement:'source-accessible',
   upperDoorPlacement:'stair-clear'};
  const before=compileArchitecturePlan(p,policy);
  const after=compileArchitecturePlan(p,{...policy,
   roofMassing:'steep-ridge-review'});
  const repeat=compileArchitecturePlan(p,{...policy,
   roofMassing:'steep-ridge-review'});
  assert.deepEqual(p,original,'model plan must remain unchanged');
  assert.equal(before.sourceSha256,compileArchitecturePlan(p,policy).sourceSha256);
  assert.equal(after.sourceSha256,repeat.sourceSha256);
  assert.notEqual(before.geometrySha256,after.geometrySha256);
  const top=1+5*p.levels.length;
  const below=r=>new Map(r.compiled.primitives.filter(v=>v[1]<top)
   .map(v=>[v.slice(0,3).join(','),v[3]]));
  assert.deepEqual(below(after),below(before),'lower-floor voxel materials unchanged');
  const crest=r=>Math.max(...r.design.elements.filter(e=>
   /^roof-raised-skin-\d+$/.test(e.id)).map(e=>e.origin[1]));
  assert.ok(crest(after)>crest(before),'new roof crest must be taller');
  assert.equal(verifyCompiled(after.design,after.compiled),true);
  assert.deepEqual(after.compiled.BuildPlan.operations,[]);
  assert.equal(after.worldWrites,0);
  assert.deepEqual(after.gates,Array(9).fill('BLOCKED'));
 }
});

test('ridge ART opt-in refuses incompatible existing authored roofs',()=>{
 const p=plan('ridge-art-refuse',['x']);
 p.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'};
 assert.throws(()=>compileArchitecturePlan(p,{
  roofMassing:'steep-ridge-review'}),/ROOF_MASSING_REQUIRES_UNMODIFIED_RAISED_RIDGE/);
 p.expression={...p.expression,roofProfile:'ridge',roofVolume:'raised',
  rearCornerCut:{width:4,depth:4,side:'east',access:'paved'}};
 assert.throws(()=>compileArchitecturePlan(p,{
  roofMassing:'steep-ridge-review'}),/ROOF_MASSING_REQUIRES_UNMODIFIED_RAISED_RIDGE/);
});
