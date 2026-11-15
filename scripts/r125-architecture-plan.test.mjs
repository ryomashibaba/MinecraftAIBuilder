import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {SCHEMA,validateArchitecturePlan,compileArchitecturePlan,
 auditArchitecturePlanCirculation,assessR125ProgramGeometry}
 from '../source/ai/r125-architecture-plan.mjs';
import {addAuthoredRoomFixtures} from '../source/ai/r125-room-fixtures.mjs';
import {addAuthoredRoomDaylight} from '../source/ai/r125-room-daylight.mjs';
import {verifyCompiled,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
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
  p=>p.levels[0].spaces.push({id:'room-three',purpose:'extra'}),
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
  {...expression,rearCornerCut:{width:6,depth:4}},
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
 assert(sawtooth.design.elements.some(e=>e.id.startsWith('roof-raised-step-closure-')));
 assert.notEqual(sawtooth.geometrySha256,raised.geometrySha256);
 assert.equal(sawtooth.worldWrites,0);
 assert.deepEqual(sawtooth.gates,Array(9).fill('BLOCKED'));
 assert.throws(()=>compileArchitecturePlan({...base,expression:{
  ...expression,roofProfile:'flat'}}),/R125_PLAN_EXPRESSION_ROOF_VOLUME/);
 assert.throws(()=>compileArchitecturePlan({...base,expression:{
  ...expression,roofVolume:'imaginary'}}),/R125_PLAN_EXPRESSION_ROOF_VOLUME/);
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

test('physical two-elevation monitor glazing is source-aligned, air-backed and short-span fail closed',()=>{
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
 assert.throws(()=>compileArchitecturePlan(compact,
  {entrancePlacement:'source-accessible'}),/EXPRESSION_MONITOR_CLERESTORY_SPAN/);
 assert.deepEqual(original,snapshot);
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
  x.reason==='SOURCE_CIRCULATION_HOLD'));
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

test('multi-room fixture grammar is bounded, duplicate-free, and preserves old single fixture geometry',()=>{
 const p=plan('multifurniture-grammar',['x']);
 // A bed AND a desk need an actually usable floor; a cramped 18x18
 // house should HOLD rather than pretend both service routes are valid.
 p.footprint={width:30,depth:30};
 p.levels[0].spaces[0].fixtures=['bed','desk'];
 const valid=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 assert.equal(valid.fixtureTargets.length,2);
 for(const bad of [
  [],['bed','bed'],['bed','desk','storage','seating'],['wrong']
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
