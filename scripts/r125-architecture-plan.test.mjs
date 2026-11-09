import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {SCHEMA,validateArchitecturePlan,compileArchitecturePlan,
 auditArchitecturePlanCirculation,assessR125ProgramGeometry}
 from '../source/ai/r125-architecture-plan.mjs';
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
