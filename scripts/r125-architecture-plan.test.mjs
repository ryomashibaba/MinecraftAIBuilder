import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,validateArchitecturePlan,compileArchitecturePlan,
 auditArchitecturePlanCirculation}
 from '../source/ai/r125-architecture-plan.mjs';
import {verifyCompiled,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';

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
