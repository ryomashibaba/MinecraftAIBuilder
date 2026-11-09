import test from 'node:test';
import assert from 'node:assert/strict';
import {INTEGRATED_SEMANTIC_SCHEMA,validateIntegratedSemanticIntent,
 prepareIntegratedSemanticBridge,assertAuthoredSemanticsUnchanged,
 INTEGRATED_SPATIAL_V7_SUPPORTED_PROMPT,INTEGRATED_SPATIAL_V7_SUPPORTED_PROTOCOL,
 projectIntegratedSemanticOperations,executeIntegratedSemanticBridge}
 from '../source/ai/r125-integrated-semantic-bridge.mjs';
const synthetic=()=>({
 schema:INTEGRATED_SEMANTIC_SCHEMA,id:'model-design-sample',
 concept:'Quiet reading rooms around a shared arrival hall with an outdoor loggia',
 spaces:[
  {key:'hall',purpose:'Shared arrival and group gathering',link:null},
  {key:'reading',purpose:'Quiet individual reading and study',link:{to:'hall',kind:'open'}}
 ],
 roofs:[
  {space:'hall',profile:'gable',axis:'x',rank:'primary'},
  {space:'reading',profile:'shed',axis:'z',rank:'secondary'}
 ],
 entry:{face:'south',space:'hall',intent:'A clear public arrival before private rooms'},
 shelters:[{purpose:'Sheltered approach and social pause',connectTo:'hall',edge:'south',scale:'medium',roof:'shed'}],
 features:[{space:'reading',kind:'seat',purpose:'Quiet reading seat and book ledge'}]
});
test('synthetic author intent is preserved, but it is NOT genuine B143',()=>{
 const p=synthetic(),original=JSON.stringify(p);
 const result=prepareIntegratedSemanticBridge(p);
 assert.equal(JSON.stringify(p),original);
 assert.equal(result.status,'PREPARED_SEMANTIC_HANDOFF_NOT_B143');
 assert.equal(result.realB143,'NOT_TESTED');
 assert.equal(result.reason,'PRIVATE_HOST_EXPANSION_REQUIRED');
 assert.equal(result.modelCalls,0);assert.equal(result.worldWrites,0);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(result.BuildPlan.operations,[]);
 assertAuthoredSemanticsUnchanged(result,p);
 const changed=synthetic();changed.entry.face='north';
 assert.throws(()=>assertAuthoredSemanticsUnchanged(result,changed),
  /HOST_CHANGED_AUTHOR_CHOICES/);
});
test('PRIVATE operation plan projects every authored choice without geometry defaults',()=>{
 const raw=synthetic(),snapshot=JSON.stringify(raw);
 const {operations,operationSha256}=projectIntegratedSemanticOperations(raw);
 assert.equal(operations.length,8);
 assert.deepEqual(operations.map(o=>o.type),
  ['CONCEPT','SPACE','SPACE','ROOF','ROOF','ENTRY','SHELTER','FEATURE']);
 assert.equal(operations[0].id,raw.id);
 assert.equal(operations[0].concept,raw.concept);
 assert.deepEqual(operations[2].link,{to:'hall',kind:'open'});
 assert.equal(operations[3].profile,'gable');
 assert.equal(operations[5].face,'south');
 assert.equal(operations[6].roof,'shed');
 assert.equal(operations[7].kind,'seat');
 assert.equal(JSON.stringify(raw),snapshot);
 const ready=prepareIntegratedSemanticBridge(raw);
 assert.deepEqual(ready.payload.operations,operations);
 assert.equal(ready.payload.operationSha256,operationSha256);
 assert.equal(ready.realB143,'NOT_TESTED');
 const tampered=prepareIntegratedSemanticBridge(raw);
 tampered.payload.operations[3].profile='flat';
 assert.throws(()=>assertAuthoredSemanticsUnchanged(tampered,raw),
  /OPERATION_PLAN_TAMPERED/);
});
test('author topology, roof priority and all meaning must be explicit',()=>{
 const changes=[
  p=>{p.spaces[1].link.to='missing';},
  p=>{p.roofs[1].rank='primary';},
  p=>{p.roofs.pop();},
  p=>{p.roofs[1].profile='unsupported';},
  p=>{p.entry.space='not-real';},
  p=>{p.shelters[0].connectTo='not-real';},
  p=>{p.features[0].space='not-real';},
  p=>{p.spaces[0].link={to:'hall',kind:'open'};},
  p=>{p.entry.x=10;},
  p=>{p.sourceSha256='a'.repeat(64);},
  p=>{p.spaces[1].voxelCoords=[1,2,3];},
  p=>{p.features=[];}
 ];
 for(const change of changes){const p=synthetic();change(p);
  assert.throws(()=>validateIntegratedSemanticIntent(p),/R125_INTEGRATED_SEMANTIC_/);
 }
});
test('no type-specific layouts: same contract accepts other semantic programs',()=>{
 const p=synthetic();p.id='station-candidate';
 p.concept='A clear transit-like arrival and sheltered waiting space';
 p.spaces[1].purpose='Arrival and departure waiting room';
 p.shelters.push({purpose:'Shelter for onward departure',connectTo:'reading',edge:'north',scale:'large',roof:'segmented'});
 p.features[0]={space:'hall',kind:'service',purpose:'Information and ticket service counter'};
 const out=prepareIntegratedSemanticBridge(p);
 assert.equal(out.payload.authoredChoices.shelters.length,2);
 assert.equal(out.payload.authoredChoices.features[0].purpose,'Information and ticket service counter');
 assert.equal(out.status,'PREPARED_SEMANTIC_HANDOFF_NOT_B143');
});

// Injected transport/product only: no claim to execute the PRIVATE engine in CI.
import {compileDesign,SCHEMA,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {createIntegratedSpatialHost} from '../source/ai/r125-integrated-spatial-host.mjs';
function injectedHost(change=()=>{}){
 return {
  expand:p=>({authorEcho:p.authoredChoices,operations:p.operations}),
  derive:e=>{
   const design={schema:SCHEMA,id:'synthetic-boundary',title:'Injected boundary product',
    brief:'Synthetic B143 contract fixture, no semantic or art certification',
    designOnly:true,bounds:{width:8,height:8,depth:8},elements:[
     {id:'floor',shape:'box',mode:'add',material:'stone',origin:[0,1,0],size:[8,1,8]}]};
   const r={design,compiled:compileDesign(design),readiness:'NOT_PREPARED',
    constructionApproved:false,executionAllowed:false,worldContacts:0,worldWrites:0,
    gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
   change(r,e);return r;
  }
 };
}
test('bound PRIVATE executor recompiles source and every voxel; it never certifies meaning or ART',async()=>{
 const a=synthetic(),snapshot=JSON.stringify(a);
 const r=await executeIntegratedSemanticBridge(a,injectedHost());
 assert.equal(r.status,'GENUINE_B143_CANDIDATE');
 assert.equal(r.realB143,'RECOMPILED_SHA_MATCH');
 assert.equal(r.semanticFulfillment,'NOT_CERTIFIED');
 assert.equal(r.provenance,'CALLER_SUPPLIED_UNATTESTED');
 assert.equal(r.art,'ART_HOLD');assert.equal(r.modelCalls,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(JSON.stringify(a),snapshot);
 assert.equal((await executeIntegratedSemanticBridge(a,{})).reason,'PRIVATE_HOST_NOT_BOUND');
});
test('host rejection, semantic mutation, voxel tampering and unsafe products HOLD without leaking PRIVATE text',async()=>{
 const hosts=[
  {expand:()=>{throw Error('PRIVATE sensitive path and text');},derive:()=>{}},
  injectedHost((r,e)=>{e.authorEcho.entry.face='north';}),
  injectedHost(r=>{r.compiled.primitives[0][0]++;}),
  injectedHost(r=>{r.compiled.geometrySha256='0'.repeat(64);}),
  injectedHost(r=>{r.worldWrites=1;}),
  injectedHost(r=>{r.executionAllowed=true;}),
  injectedHost(r=>{r.gates[0]='PASS';}),
  injectedHost(r=>{r.BuildPlan.operations.push({type:'unsafe'});})
 ];
 for(const host of hosts){const r=await executeIntegratedSemanticBridge(synthetic(),host);
  assert.equal(r.status,'HOLD');assert.equal(r.reason,'PRIVATE_HOST_REJECTED');
  assert.equal(r.worldWrites,0);assert.equal(r.realB143,'NOT_TESTED');
  assert(!('privateProduct' in r));assert(!JSON.stringify(r).includes('sensitive'));
 }
});

function supportedSpatialAuthor(){
 const a=synthetic();a.roofs.forEach(r=>r.profile='shed');
 a.shelters[0].roof='flat';return a;
}
test('common HOST mechanically expands author topology, actual door walls, fixtures and independent roof sections',()=>{
 const host=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE engine not available in public CI');}});
 const a=supportedSpatialAuthor();
 const expand=a=>host.expand(prepareIntegratedSemanticBridge(a).payload);
 const open=expand(a);
 assert.deepEqual(open.authorEcho,a);assert.equal(open.intent.spaces.length,a.spaces.length);
 assert.equal(open.intent.partitions.length,0);
 assert.equal(open.intent.architecture.roofSections.length,a.roofs.length);
 assert.equal(open.intent.architecture.shelters.length,a.shelters.length);
 assert.equal(open.intent.fixtures.length,a.features.length);
 assert.equal(open.journal.length,projectIntegratedSemanticOperations(a).operations.length);
 a.spaces[1].link.kind='door';
 const door=expand(a);assert.equal(door.intent.partitions.length,1);
 assert(door.intent.joins.some(j=>j.spaces.includes('reading')&&j.openingId!==null));
 a.features[0].kind='storage';const storage=expand(a);
 assert.notDeepEqual(storage.intent.fixtures[0].parts,door.intent.fixtures[0].parts);
 // The host has a procedural support-floor seed, never a historical model source.
 assert.equal(storage.provenance,'PROCEDURAL_HOST_SOURCE_SEED_NOT_HISTORICAL_SOURCE');
 assert.equal(storage.base.compiled.primitives.filter(c=>c[1]===1).length,120);
});
test('authored service vs worktop survives mechanical expansion into distinct genuine B143 fixture voxels',()=>{
 const host=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE_ENGINE_NOT_AVAILABLE');}});
 const buildFixture=kind=>{
  const a=supportedSpatialAuthor();
  a.features=[{space:'reading',kind,purpose:'Function chosen by the author'}];
  const expanded=host.expand(prepareIntegratedSemanticBridge(a).payload);
  const fixture=expanded.intent.fixtures[0];
  const design={schema:SCHEMA,id:'semantic-fixture-check',title:'Independent physical role test',
   brief:'Synthetic author choice only; no claim of a full building or private source',
   designOnly:true,bounds:{width:124,height:24,depth:124},
   elements:fixture.parts.map((p,i)=>({
    id:'fixture-piece-'+i,shape:'box',mode:'add',material:p.material,
    origin:p.origin,size:p.size
   }))};
  const compiled=compileDesign(design);
  assert(verifyCompiled(design,compiled));
  assert(compiled.primitives.length>0);
  return {fixture,compiled};
 };
 const worktop=buildFixture('worktop'),service=buildFixture('service');
 // The exact approach/service pad remains identical, preserving clearance contracts.
 assert.deepEqual(service.fixture.servicePad,worktop.fixture.servicePad);
 assert.equal(service.fixture.space,worktop.fixture.space);
 assert.equal(service.fixture.role,worktop.fixture.role);
 assert.notDeepEqual(service.fixture.parts,worktop.fixture.parts);
 assert.notEqual(service.compiled.geometrySha256,worktop.compiled.geometrySha256);
 assert(service.fixture.parts.some(p=>p.material==='metal'));
 // No claim of independent PRIVATE function/ART or Minecraft walking.
});

test('compact dual feature intent maps to two independently accessible 2x2 pads',()=>{
 const h=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE_ONLY');}});
 const a=supportedSpatialAuthor();
 a.spaces[1].footprint={width:8,depth:8};
 a.features=[
  {space:'reading',kind:'worktop',purpose:'Hands-on working surface'},
  {space:'reading',kind:'service',purpose:'Visitor service aperture'}
 ];
 const expanded=h.expand(prepareIntegratedSemanticBridge(a).payload);
 const fixtures=expanded.intent.fixtures;
 assert.equal(fixtures.length,2);
 assert.notDeepEqual(fixtures[0].parts,fixtures[1].parts);
 const [rx,rz,rw,rd]=expanded.intent.spaces.find(s=>s.id==='reading').rect;
 const solid=new Set();
 for(const f of fixtures){
  const local=new Set();
  for(const p of f.parts)for(let x=p.origin[0];x<p.origin[0]+p.size[0];x++)
   for(let z=p.origin[2];z<p.origin[2]+p.size[2];z++)local.add(x+','+z);
  assert([...local].every(k=>!solid.has(k)),'no inter-fixture collision');
  for(const k of local)solid.add(k);
 }
 const free=([x,z])=>x>=rx+1&&x+1<=rx+rw-2&&
  z>=rz+1&&z+1<=rz+rd-2&&
  ![[x,z],[x+1,z],[x,z+1],[x+1,z+1]].some(([i,j])=>solid.has(i+','+j));
 assert(fixtures.every(f=>free(f.servicePad)));
 const join=expanded.intent.joins.find(j=>j.spaces.includes('reading'));
 const seed=[Math.min(rx+rw-3,Math.max(rx+1,join.clearPad[0])),
  Math.min(rz+rd-3,Math.max(rz+1,join.clearPad[1]))];
 assert(free(seed));
 const q=[seed],seen=new Set([seed.join(',')]);
 for(let i=0;i<q.length;i++)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const [x,z]=q[i],p=[x+dx,z+dz],key=p.join(',');
  if(!seen.has(key)&&free(p)){seen.add(key);q.push(p);}
 }
 assert(fixtures.every(f=>seen.has(f.servicePad.join(','))));
 assert.equal(verifyCompiled(expanded.base.design,expanded.base.compiled),true);
 // Independent PRIVATE full-building geometry and Minecraft remain HOLD.
});

test('six equipment kinds across compact rooms never claim usable 2x2 pads or joins without clearance',()=>{
 const h=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE_ONLY');}});
 const kinds=['seat','worktop','storage','display','service','equipment'];
 const sizes=[[8,8],[9,9],[10,10],[12,10],[14,14]];
 let accepted=0,held=0;
 for(const [w,d] of sizes)for(const direction of ['north','south'])
  for(const k1 of kinds)for(const k2 of kinds){
   const a=supportedSpatialAuthor();
   a.spaces[1].footprint={width:w,depth:d};
   a.entry.face=direction;a.shelters[0].edge=direction;
   a.features=[{space:'reading',kind:k1,purpose:'First functional equipment'},
    {space:'reading',kind:k2,purpose:'Second functional equipment'}];
   let e;
   try{e=h.expand(prepareIntegratedSemanticBridge(a).payload);}
   catch(error){
    assert(/PRIVATE_SPATIAL_FIXTURE_2X2_PATH_CAPACITY/.test(String(error)),
     'only explicit geometry capacity HOLD is acceptable: '+String(error));
    held++;continue;
   }
   accepted++;
   const room=e.intent.spaces.find(s=>s.id==='reading').rect,
    [rx,rz,rw,rd]=room,solid=new Set();
   for(const f of e.intent.fixtures){
    const own=new Set();
    for(const p of f.parts)for(let x=p.origin[0];x<p.origin[0]+p.size[0];x++)
     for(let z=p.origin[2];z<p.origin[2]+p.size[2];z++)own.add(x+','+z);
    assert([...own].every(s=>!solid.has(s)),'inter-fixture overlap');
    for(const s of own)solid.add(s);
   }
   const free=([x,z])=>x>=rx+1&&x<=rx+rw-3&&z>=rz+1&&z<=rz+rd-3&&
    ![[x,z],[x+1,z],[x,z+1],[x+1,z+1]].some(([i,j])=>solid.has(i+','+j));
   assert(e.intent.fixtures.every(f=>free(f.servicePad)),
    'both full 2x2 service pads accessible');
   const entryPads=e.intent.joins.filter(j=>j.spaces.includes('reading')).map(j=>{
    const [x,z]=j.clearPad;
    if(x<rx+1)return [0,1,2].map(i=>[rx+1,z+i]);
    if(x>rx+rw-3)return [0,1,2].map(i=>[rx+rw-3,z+i]);
    if(z<rz+1)return [0,1,2].map(i=>[x+i,rz+1]);
    if(z>rz+rd-3)return [0,1,2].map(i=>[x+i,rz+rd-3]);
    return [];
   }).map(xs=>xs.filter(free));
   assert(entryPads.length>0&&entryPads.every(xs=>xs.length>0),
    'at least one truly open two-wide JOIN seed');
   let linked=false;
   for(const origin of entryPads[0]){
    const q=[origin],seen=new Set([origin.join(',')]);
    for(let i=0;i<q.length;i++)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const [x,z]=q[i],p=[x+dx,z+dz],key=p.join(',');
     if(!seen.has(key)&&free(p)){seen.add(key);q.push(p);}
    }
    if(entryPads.every(xs=>xs.some(p=>seen.has(p.join(','))))&&
     e.intent.fixtures.every(f=>seen.has(f.servicePad.join(','))))linked=true;
   }
   assert(linked,'all entry and equipment pads share 2-wide reachable component');
   assert.equal(verifyCompiled(e.base.design,e.base.compiled),true);
  }
 assert.equal(accepted+held,360);
 assert(accepted>=200,'unexpected capability collapse');
 // Bounded public mechanical preflight only; never attest PRIVATE 10/10.
});

test('parent choice moves the physical space; unsupported engine capabilities HOLD without replacement',async()=>{
 const host=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('NO_PRIVATE_ENGINE');}});
 const a=supportedSpatialAuthor();
 a.spaces.push({key:'workshop',purpose:'Public hands-on practical work',link:{to:'reading',kind:'door'}});
 a.roofs.push({space:'workshop',profile:'shed',axis:'x',rank:'subordinate'});
 const before=host.expand(prepareIntegratedSemanticBridge(a).payload);
 a.spaces[2].link.to='hall';
 const after=host.expand(prepareIntegratedSemanticBridge(a).payload);
 assert.notDeepEqual(before.intent.spaces[2].rect,after.intent.spaces[2].rect);
 for(const change of [a=>a.roofs[0].profile='gable',a=>a.entry.face='east',
  a=>a.shelters[0].roof='shed',a=>a.shelters=[]]){
  const b=supportedSpatialAuthor();change(b);
  const result=await executeIntegratedSemanticBridge(b,host);
  assert.equal(result.status,'HOLD');assert(!result.privateProduct);
 }
 assert.throws(()=>createIntegratedSpatialHost(),/EXISTING_ENGINE_REQUIRED/);
});

test('V7 optional model contract names only currently implemented PRIVATE HOST capabilities',()=>{
 const prompt=INTEGRATED_SPATIAL_V7_SUPPORTED_PROMPT;
 assert.equal(INTEGRATED_SPATIAL_V7_SUPPORTED_PROTOCOL,'V7_PRIVATE_SINGLE_SEMANTIC_SPATIAL_HOST_V1');
 assert(prompt.includes(INTEGRATED_SEMANTIC_SCHEMA));
 assert(prompt.includes('2..4 rooms'));
 assert(prompt.includes('profile:shed|hip|barrel'));
 assert(prompt.includes('face:north|south'));
 assert(prompt.includes('roof:flat'));
 assert(prompt.includes('no more than TWO per room'));
 assert(prompt.includes('under 4096 UTF-8 bytes'));
 assert(!prompt.includes('gable|shed|flat|segmented'));
 // Synthetic candidate is host-supported but not real-model evidence.
 const host=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE_ONLY');}});
 const expanded=host.expand(prepareIntegratedSemanticBridge(supportedSpatialAuthor()).payload);
 assert.equal(expanded.intent.architecture.shelters.length,1);
});

test('all shelter JOIN pads straddle their threshold and external approach stays on its floor',()=>{
 const host=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE_ONLY');}});
 const overlaps2=(pad,rect)=>pad[0]+1>=rect[0]&&pad[0]<rect[0]+rect[2]&&
  pad[1]+1>=rect[1]&&pad[1]<rect[1]+rect[3];
 const inRect=(pad,rect)=>pad[0]>=rect[0]&&pad[0]<rect[0]+rect[2]&&
  pad[1]>=rect[1]&&pad[1]<rect[1]+rect[3];
 function check(a,which){
  const intent=host.expand(prepareIntegratedSemanticBridge(a).payload).intent;
  const shell=intent.architecture.shelters[which];
  const join=intent.joins.find(j=>j.spaces[1]===shell.id);
  const parent=intent.spaces.find(s=>s.id===a.shelters[which].connectTo);
  const opening=intent.openings.find(o=>o.id===shell.connectionOpening);
  const side=a.shelters[which].edge;
  assert(join&&opening&&parent);
  assert.equal(join.openingId,opening.id);
  const o=opening.origin;
  const outside={north:[o[0],o[2]-1],south:[o[0],o[2]+1],
   east:[o[0]+1,o[2]],west:[o[0]-1,o[2]]}[side];
  assert.equal(inRect(outside,shell.rect),true,side+': outdoor approach is on shelter floor');
  assert.equal(inRect(outside,parent.rect),false,side+': outdoor approach is outside parent wall');
  const threshold={north:outside,south:[outside[0],outside[1]-1],
   east:[outside[0]-1,outside[1]],west:outside}[side];
  assert.deepEqual(join.clearPad,threshold,side+': JOIN must straddle its threshold');
  assert.equal(overlaps2(join.clearPad,parent.rect),true,side+': parent contact');
  assert.equal(overlaps2(join.clearPad,shell.rect),true,side+': shelter contact');
  assert.equal(overlaps2(join.clearPad,[o[0],o[2],opening.size[0],opening.size[2]]),true,
   side+': declared opening contact');
 }
 for(const face of ['north','south']){
  const a=supportedSpatialAuthor();
  a.entry.face=face;a.shelters[0].edge=face;
  check(a,0);
 }
 for(const [face,space] of [['east','reading'],['west','hall']]){
  const a=supportedSpatialAuthor();
  a.shelters.push({purpose:'Sheltered exterior service and waiting',
   connectTo:space,edge:face,scale:'medium',roof:'flat'});
  check(a,1);
 }
});

test('V7 roof form choices survive author handoff and generic HOST without silent replacement',()=>{
 const h=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE_ENGINE_REQUIRED')}});
 const original=supportedSpatialAuthor(),baseline=h.expand(prepareIntegratedSemanticBridge(original).payload);
 assert.deepEqual(baseline.intent.architecture.roofSections.map(x=>x.profile.form),['shed','shed']);
 const varied=structuredClone(original);
 varied.roofs[0].profile='hip';varied.roofs[1].profile='barrel';
 varied.roofs[1].axis='x';
 const prepared=prepareIntegratedSemanticBridge(varied);
 const expanded=h.expand(prepared.payload);
 assertAuthoredSemanticsUnchanged(prepared,expanded.authorEcho);
 assert.deepEqual(expanded.intent.architecture.roofSections.map(x=>x.profile.form),['hip','barrel']);
 assert.deepEqual(expanded.intent.architecture.roofSections.map(x=>x.profile.axis),['x','x']);
 assert.deepEqual(expanded.intent.architecture.roofSections.map(x=>x.profile.eaveY),[7,6]);
 assert(expanded.intent.architecture.roofSections.every(x=>x.profile.rise===1));
 assert.deepEqual(expanded.intent.spaces,baseline.intent.spaces);
 assert.deepEqual(expanded.intent.joins,baseline.intent.joins);
 assert.deepEqual(expanded.intent.architecture.shelters,baseline.intent.architecture.shelters);
 assert.equal(verifyCompiled(expanded.base.design,expanded.base.compiled),true);
 assert.deepEqual(expanded.base.design,baseline.base.design);
 // This proves only HOST handoff. PRIVATE rendering, final pathing and ART remain untested.
 for(const profile of ['gable','flat','segmented']){
  const x=structuredClone(original);x.roofs[0].profile=profile;
  assert.throws(()=>h.expand(prepareIntegratedSemanticBridge(x).payload),/ENGINE_PROFILE_UNSUPPORTED/);
 }
 const shelter=structuredClone(original);shelter.shelters[0].roof='hip';
 assert.throws(()=>h.expand(prepareIntegratedSemanticBridge(shelter).payload),/ENGINE_SHELTER_PROFILE_UNSUPPORTED/);
});
test('optional authored footprint changes host rectangles and real B143 support floor without altering legacy',()=>{
 const h=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE_NOT_AVAILABLE')}});
 const legacy=supportedSpatialAuthor(),unchanged=h.expand(prepareIntegratedSemanticBridge(legacy).payload);
 const a=structuredClone(legacy);
 a.spaces[0].footprint={width:14,depth:12};
 a.spaces[1].footprint={width:10,depth:9};
 const prepared=prepareIntegratedSemanticBridge(a),expanded=h.expand(prepared.payload);
 assertAuthoredSemanticsUnchanged(prepared,expanded.authorEcho);
 assert.deepEqual(unchanged.intent.spaces.map(s=>s.rect),[[40,40,12,10],[51,40,12,10]]);
 assert.deepEqual(expanded.intent.spaces.map(s=>s.rect),[[40,40,14,12],[53,41,10,9]]);
 assert.equal(expanded.base.design.elements[0].size[0],14);
 assert.equal(expanded.base.design.elements[0].size[2],12);
 assert.equal(expanded.base.compiled.primitives.filter(p=>p[1]===1).length,168);
 assert.equal(verifyCompiled(expanded.base.design,expanded.base.compiled),true);
 assert.notEqual(unchanged.base.compiled.geometrySha256,expanded.base.compiled.geometrySha256);
 assert.deepEqual(expanded.intent.architecture.roofSections[0].rect,[40,40,14,12]);
 assert.equal(expanded.intent.openings.find(o=>o.kind==='entry').origin[0],45);
 assert.equal(expanded.intent.openings.find(o=>o.kind==='entry').origin[2],51);
 assert.equal(legacy.spaces[0].footprint,undefined);
 assert(INTEGRATED_SPATIAL_V7_SUPPORTED_PROMPT.includes('Optional footprint'));
});
test('invalid and physically impossible authored dimensions reject rather than silently repairing',()=>{
 const h=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE_NOT_AVAILABLE')}});
 const attempt=change=>{const a=supportedSpatialAuthor();change(a);
  return h.expand(prepareIntegratedSemanticBridge(a).payload);};
 for(const footprint of [{width:7,depth:10},{width:15,depth:10},
  {width:12.5,depth:10},{width:10},{width:10,depth:10,extra:true}]){
  assert.throws(()=>attempt(a=>{a.spaces[0].footprint=footprint}),
   /R125_INTEGRATED_SEMANTIC_/);
 }
 assert.throws(()=>attempt(a=>{
  a.spaces[0].footprint={width:8,depth:8};a.shelters[0].scale='large';
 }),/SHELTER_WIDER_THAN_ROOM/);
 const compact=attempt(a=>{
  a.spaces[1].footprint={width:8,depth:8};
  a.features.push({space:'reading',kind:'seat',purpose:'Second seating area'});
 });
 assert.equal(compact.intent.fixtures.length,2);
});

test('room-sibling lookahead preserves authorship while avoiding greedy contact dead-end',()=>{
 const h=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE_ONLY');}});
 const a=supportedSpatialAuthor();
 a.spaces[0].footprint={width:11,depth:11};
 a.spaces[1].footprint={width:12,depth:11};
 a.spaces[1].link.kind='door';
 a.spaces.push({key:'records',purpose:'Compact protected archive and records',
  link:{to:'reading',kind:'door'},footprint:{width:8,depth:8}});
 a.spaces.push({key:'gallery',purpose:'Wide community exhibition gallery',
  link:{to:'reading',kind:'door'},footprint:{width:13,depth:10}});
 a.roofs.push({space:'records',profile:'shed',axis:'x',rank:'secondary'},
  {space:'gallery',profile:'shed',axis:'x',rank:'secondary'});
 a.entry={space:'gallery',face:'south',intent:'Direct public gallery entrance'};
 a.shelters[0].connectTo='gallery';
 a.shelters[0].edge='south';
 const prepared=prepareIntegratedSemanticBridge(a);
 const expanded=h.expand(prepared.payload);
 assertAuthoredSemanticsUnchanged(prepared,expanded.authorEcho);
 assert.equal(verifyCompiled(expanded.base.design,expanded.base.compiled),true);
 assert.deepEqual(expanded.intent.spaces.map(s=>[s.id,s.rect]),[
  ['hall',[40,40,11,11]],['reading',[50,40,12,11]],
  ['records',[52,50,8,8]],['gallery',[61,40,13,10]]]);
 // Only the independent sibling declaration order changes. No topology,
 // purpose, roof or ENTRY rewrite is needed to obtain the same rectangles.
 const reordered=structuredClone(a);
 [reordered.spaces[2],reordered.spaces[3]]=[reordered.spaces[3],reordered.spaces[2]];
 const other=h.expand(prepareIntegratedSemanticBridge(reordered).payload);
 const byKey=x=>Object.fromEntries(x.intent.spaces.map(s=>[s.id,s.rect]));
 assert.deepEqual(byKey(expanded),byKey(other));
 assert.equal(expanded.intent.joins.length,4);
 assert.equal(expanded.intent.architecture.roofSections.length,4);
 assert.equal(expanded.intent.architecture.shelters.length,1);
 // This remains synthetic HOST/seed B143 evidence, never PRIVATE, ART, or model authorship.
});

test('entry canopy footprint is reserved before sibling placement, without changing authored choices',()=>{
 const h=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE_ONLY');}});
 const a=supportedSpatialAuthor();
 a.spaces=[
  {key:'room0',purpose:'Common public meeting and circulation',link:null,
   footprint:{width:9,depth:11}},
  {key:'room1',purpose:'Sheltered visitor arrival and waiting room',
   link:{to:'room0',kind:'open'},footprint:{width:9,depth:10}},
  {key:'room2',purpose:'Public activities and display room',
   link:{to:'room0',kind:'open'},footprint:{width:12,depth:12}}
 ];
 a.roofs=[
  {space:'room0',profile:'hip',axis:'x',rank:'primary'},
  {space:'room1',profile:'barrel',axis:'z',rank:'secondary'},
  {space:'room2',profile:'barrel',axis:'x',rank:'secondary'}
 ];
 a.entry={face:'south',space:'room1',intent:'Covered arrival and wayfinding'};
 a.shelters=[{purpose:'Exterior covered arrival for visitors',
  connectTo:'room1',edge:'south',scale:'small',roof:'flat'}];
 a.features=[{space:'room0',kind:'seat',purpose:'Visitor seating and rest'}];
 const prepared=prepareIntegratedSemanticBridge(a),expanded=h.expand(prepared.payload);
 assertAuthoredSemanticsUnchanged(prepared,expanded.authorEcho);
 assert.deepEqual(expanded.intent.spaces.map(s=>[s.id,s.rect]),[
  ['room0',[40,40,9,11]],['room1',[48,40,9,10]],['room2',[29,39,12,12]]]);
 const canopy=expanded.intent.architecture.shelters[0];
 assert.deepEqual(canopy.rect,[49,50,6,4]);
 const overlaps=(r,s)=>r[0]<s[0]+s[2]&&s[0]<r[0]+r[2]&&
  r[1]<s[1]+s[3]&&s[1]<r[1]+r[3];
 assert(expanded.intent.spaces.every(s=>!overlaps(canopy.rect,s.rect)));
 assert.equal(verifyCompiled(expanded.base.design,expanded.base.compiled),true);
 assert.equal(expanded.intent.architecture.entry.shelterId,canopy.id);
 // A larger child overhangs its parent by one cell. The old all-edge trim
 // silently dropped room2 floor (40,39) from every roof region, violating the
 // real PRIVATE engine's full-coverage contract. Preserve author room cells.
 assert.deepEqual(expanded.intent.architecture.roofSections.map(s=>s.rect),[
  [41,40,8,11],[49,40,8,10],[29,39,12,12]]);
 const planCells=rect=>{const [x,z,w,d]=rect,pts=[];
  for(let i=x;i<x+w;i++)for(let j=z;j<z+d;j++)pts.push(i+','+j);
  return pts;};
 const floors=new Set(expanded.intent.spaces.flatMap(s=>planCells(s.rect)));
 const roofCells=expanded.intent.architecture.roofSections.flatMap(s=>planCells(s.rect));
 assert.equal(new Set(roofCells).size,roofCells.length,'no overlapping roof cells');
 assert.deepEqual([...new Set(roofCells)].sort(),[...floors].sort(),
  'every supported floor cell must have exactly one roof owner');
 // This is a synthetic HOST/seed proof, not an independent PRIVATE B143/ART pass.
});
