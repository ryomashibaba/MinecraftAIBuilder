import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,validateSpatialComposition,placeSpatialRooms,
 compileSpatialComposition} from '../source/ai/r125-spatial-composition.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const r=(id,width,depth,roofY,attach)=>({
 id,purpose:'Distinct functional space '+id,width,depth,roofY,
 ...(attach?{attach}:{})
});
const p=(id,rooms)=>({schema:SCHEMA,id,title:'Independent building composition',
 brief:'A source-authored arrangement of connected functional volumes',
 materials:{floor:'wood',wall:'concrete',roof:'stone'},rooms});
const examples=[
 p('offset-side-wing',[r('front',12,10,6),
  r('rear',9,8,8,{to:'front',side:'east',shift:0})]),
 p('rear-courtyard-axis',[r('front',12,8,7),
  r('rear',9,10,6,{to:'front',side:'south',shift:0})]),
 p('branched-three-rooms',[r('front',12,10,7),
  r('west',8,9,6,{to:'front',side:'west',shift:1}),
  r('east',8,9,9,{to:'front',side:'east',shift:1})])
];
test('3 independent building compositions make distinct real voxels and 2-wide routes',()=>{
 const hashes=new Set();
 for(const plan of examples){
  assert.equal(validateSpatialComposition(plan),true);
  const result=compileSpatialComposition(plan);
  assert.equal(verifyCompiled(result.design,result.compiled),true);
  assert.equal(result.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(result.sourceRoutes.zones.length,plan.rooms.length);
  assert(result.sourceRoutes.zones.every(z=>z.reachedTwoWidePadCount>0));
  assert(result.compiled.primitives.length>100);
  assert.equal(result.layout.connectedDoors,plan.rooms.length-1);
  assert(result.layout.exteriorWindows>0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.readiness,'NOT_PREPARED');
  assert.deepEqual(result.BuildPlan.operations,[]);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  hashes.add(result.geometrySha256);
 }
 assert.equal(hashes.size,3);
});
test('unknown adjacency, unsafe shift, volume collisions and blocked public entry fail',()=>{
 const a=structuredClone(examples[0]);a.rooms[1].attach.to='unknown';
 assert.throws(()=>validateSpatialComposition(a),/ADJACENCY_CONTRACT/);
 const b=structuredClone(examples[0]);b.rooms[1].attach.shift=30;
 assert.throws(()=>validateSpatialComposition(b),/ADJACENCY_CONTRACT/);
 const c=p('overlapping',[r('front',12,10,6),
  r('east',9,10,7,{to:'front',side:'east',shift:0}),
  r('other',9,10,8,{to:'front',side:'east',shift:1})]);
 assert.throws(()=>placeSpatialRooms(c),/VOLUMES_OVERLAP/);
 const d=p('blocked',[r('front',12,10,6),
  r('north',12,9,6,{to:'front',side:'north',shift:0})]);
 assert.throws(()=>placeSpatialRooms(d),/PUBLIC_ENTRY_NOT_EXTERIOR/);
});
test('no mutation of author plan and no implied model or world certification',()=>{
 const a=structuredClone(examples[0]);const before=JSON.stringify(a);
 const result=compileSpatialComposition(a);
 assert.equal(JSON.stringify(a),before);
 assert.equal(result.modelAuthorship,'CALLER_PROVIDED_PLAN_UNVERIFIED');
 assert.equal(result.inGameWalking,'NOT_TESTED');
 assert.equal(result.architecturalQuality,'NOT_REVIEWED');
});

test('universal compact 6-wide or 6-deep rooms are accepted only when real B143 voxels and two-wide interior routes pass',()=>{
 const designs=[
  p('compact-side',[r('front',12,10,6),
   r('compact-back',9,6,7,{to:'front',side:'east',shift:0})]),
  p('compact-front',[r('front',6,10,6),
   r('compact-back',6,6,8,{to:'front',side:'south',shift:0})]),
  p('compact-three-zone',[r('front',12,10,7),
   r('east',6,6,6,{to:'front',side:'east',shift:0}),
   r('west',6,6,8,{to:'front',side:'west',shift:0})])
 ];
 for(const design of designs){
  assert.equal(validateSpatialComposition(design),true);
  const result=compileSpatialComposition(design);
  assert.equal(verifyCompiled(result.design,result.compiled),true);
  assert.equal(result.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(result.sourceRoutes.zones.every(z=>z.reachedTwoWidePadCount>=1));
  assert(result.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
  assert.equal(result.worldWrites,0);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(result.BuildPlan.operations,[]);
 }
 const tooSmall=structuredClone(designs[0]);
 tooSmall.rooms[1].depth=5;
 assert.throws(()=>validateSpatialComposition(tooSmall),/ROOM_CONTRACT/);
});

test('authored spatial daylight creates larger, high, or paired real glass openings without rewriting older compositions',()=>{
 const planned=structuredClone(examples[0]);
 planned.rooms[0].daylight='paired-bays';
 planned.rooms[1].daylight='clerestory';
 const original=JSON.stringify(planned);
 const compiled=compileSpatialComposition(planned);
 assert.equal(JSON.stringify(planned),original);
 assert.equal(compiled.layout.exteriorWindows,3);
 assert.equal(compiled.layout.rooms[0].daylight,'paired-bays');
 assert.equal(compiled.layout.rooms[1].daylight,'clerestory');
 const glass=compiled.design.elements.filter(e=>e.mode==='add'&&e.material==='glass');
 assert.equal(glass.length,3);
 assert.equal(glass.filter(e=>e.size.includes(3)&&e.size.includes(2)).length,2);
 assert(glass.some(e=>e.size[1]===1&&e.origin[1]===planned.rooms[1].roofY-2));
 assert.equal(verifyCompiled(compiled.design,compiled.compiled),true);
 assert.equal(compiled.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(compiled.worldWrites,0);
 assert.deepEqual(compiled.BuildPlan.operations,[]);
 const older=compileSpatialComposition(examples[0]);
 assert.equal(older.layout.exteriorWindows,2);
 assert(older.design.elements.some(e=>e.id==='glaze-0-glass'));
 const impossible=structuredClone(planned);
 impossible.rooms[1].daylight='paired-bays';
 assert.throws(()=>compileSpatialComposition(impossible),/DAYLIGHT_OPENING_UNAVAILABLE_rear/);
 const invalid=structuredClone(planned);
 invalid.rooms[0].daylight='ornamental';
 assert.throws(()=>validateSpatialComposition(invalid),/ROOM_CONTRACT/);
});

test('author-selected public open court makes an actual open-air arrival space between enclosed usable wings',()=>{
 const plan=p('public-courtyard-with-wings',[
  {...r('visitor-court',10,10,6),spatialUse:'open-court'},
  r('workshop',9,9,9,{to:'visitor-court',side:'east',shift:0}),
  r('gallery',9,9,7,{to:'visitor-court',side:'west',shift:0})
 ]);
 const original=JSON.stringify(plan);
 const result=compileSpatialComposition(plan);
 assert.equal(JSON.stringify(plan),original);
 assert.equal(verifyCompiled(result.design,result.compiled),true);
 assert.equal(result.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.layout.connectedDoors,2);
 assert.equal(result.layout.rooms[0].spatialUse,'open-court');
 assert.equal(result.design.elements.some(e=>e.id==='space-0-roof'),false);
 assert.equal(result.design.elements.filter(e=>e.id.endsWith('-roof')).length,2);
 assert(result.design.elements.filter(e=>e.id.startsWith('space-0-')&&
  e.id.endsWith('-west')).every(e=>e.size[1]===1));
 assert(result.layout.exteriorWindows>=1);
 assert.equal(result.worldWrites,0);
 assert.deepEqual(result.BuildPlan.operations,[]);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 const enclosed=p('matching-roofed-court',plan.rooms.map((r,i)=>
  i===0?(({spatialUse,...rest})=>rest)(r):r));
 assert.notEqual(result.geometrySha256,compileSpatialComposition(enclosed).geometrySha256);
 const invalid=structuredClone(plan);
 invalid.rooms[1].spatialUse='open-court';
 assert.throws(()=>validateSpatialComposition(invalid),/ROOM_CONTRACT/);
 const blocked=structuredClone(plan);
 blocked.rooms[0].daylight='wide-bay';
 assert.throws(()=>validateSpatialComposition(blocked),/ROOM_CONTRACT/);
});

test('author-selected paired daylight opens two real public frontage bays without touching the entrance',()=>{
 const authored=p('public-frontage',[
  {...r('visitor-gallery',14,10,8),daylight:'paired-bays'},
  r('inspection-wing',10,9,7,{to:'visitor-gallery',side:'south',shift:0})
 ]);
 const preserved=JSON.stringify(authored);
 const result=compileSpatialComposition(authored);
 const entry=result.design.elements.find(e=>e.id==='exterior-entrance');
 const glass=result.design.elements.filter(e=>
  e.mode==='add'&&e.material==='glass'&&
  e.origin[2]===entry.origin[2]&&e.size[2]===1);
 assert.equal(glass.length,2);
 assert.deepEqual(glass.map(e=>e.origin[0]).sort((a,b)=>a-b),
  [entry.origin[0]-4,entry.origin[0]+3]);
 assert(glass.every(e=>e.size[0]===3&&e.size[1]===2&&
  e.origin[1]===3));
 assert(glass.every(e=>
  e.origin[0]+e.size[0]-1<entry.origin[0]||
  e.origin[0]>entry.origin[0]+entry.size[0]-1));
 assert.equal(JSON.stringify(authored),preserved);
 assert.equal(verifyCompiled(result.design,result.compiled),true);
 assert.equal(result.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.worldWrites,0);
 assert.deepEqual(result.BuildPlan.operations,[]);
 const noFront=structuredClone(authored);
 delete noFront.rooms[0].daylight;
 const earlier=compileSpatialComposition(noFront);
 assert.equal(earlier.design.elements.filter(e=>
  e.id.startsWith('glaze-0-')&&e.material==='glass').length,1);
 assert.notEqual(result.geometrySha256,earlier.geometrySha256);
});

test('model-selected shed roofs create sealed stepped profiles without changing old flat/ridge geometry',()=>{
 const baseline=structuredClone(examples[0]);
 const flat=compileSpatialComposition(baseline);
 const author=structuredClone(baseline);
 author.rooms[0].roofForm='shed';author.rooms[0].roofAxis='x';
 author.rooms[1].roofForm='shed';author.rooms[1].roofAxis='z';
 const original=JSON.stringify(author);
 assert.equal(validateSpatialComposition(author),true);
 const source=compileSpatialComposition(author);
 assert.equal(JSON.stringify(author),original);
 assert.notEqual(source.geometrySha256,flat.geometrySha256);
 assert.equal(source.layout.rooms[0].roofForm,'shed');
 for(const [index,axis] of [[0,'x'],[1,'z']]){
  const room=source.layout.rooms[index];
  const high=source.design.elements.find(e=>
   e.id==='space-'+index+'-shed-high-end');
  assert(high,'sloping roof must close its high face');
  assert.equal(high.mode,'add');
  assert.equal(high.material,author.materials.wall);
  assert.equal(high.size[1],2);
  assert.equal(high.origin[1],room.roofY);
  assert.equal(high.origin[axis==='x'?0:2],
   (axis==='x'?room.x+room.width-1:room.z+room.depth-1));
  const skins=source.design.elements.filter(e=>
   e.id.startsWith('space-'+index+'-shed-skin-'));
  assert(skins.length>=2);
  assert.equal(Math.max(...skins.map(e=>e.origin[1])),room.roofY+2);
  assert(source.design.elements.some(e=>
   e.id.startsWith('space-'+index+'-shed-gable-')));
 }
 assert.equal(verifyCompiled(source.design,source.compiled),true);
 assert.equal(source.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.deepEqual(source.BuildPlan.operations,[]);
 assert.deepEqual(source.gates,Array(9).fill('BLOCKED'));
 assert.equal(source.worldWrites,0);
 const ridge=structuredClone(baseline);
 ridge.rooms[0].roofForm='ridge';ridge.rooms[0].roofAxis='x';
 const beforeRidge=compileSpatialComposition(ridge);
 assert(beforeRidge.design.elements.some(e=>
  e.id==='space-0-ridge-skin-0'));
 assert.equal(compileSpatialComposition(baseline).geometrySha256,
  flat.geometrySha256);
 const invalid=structuredClone(baseline);
 invalid.rooms[0].roofForm='shed';
 assert.throws(()=>validateSpatialComposition(invalid),/ROOM_CONTRACT/);
 const court=structuredClone(author);
 court.rooms[0].spatialUse='open-court';
 assert.throws(()=>validateSpatialComposition(court),/ROOM_CONTRACT/);
});

// This is a real new SOURCE-only massing option, never a retroactive
// Qwen edit, ART pass, game walk certification or world operation.
test('authored spatial ridge forms create distinct real B143 roof volumes',()=>{
 const p=structuredClone(examples[0]);
 const baseline=compileSpatialComposition(p);
 p.rooms[0].roofForm='ridge';p.rooms[0].roofAxis='x';
 p.rooms[1].roofForm='ridge';p.rooms[1].roofAxis='z';
 const authorInput=JSON.stringify(p);
 assert.equal(validateSpatialComposition(p),true);
 const r=compileSpatialComposition(p);
 assert.equal(JSON.stringify(p),authorInput);
 assert.notEqual(r.geometrySha256,baseline.geometrySha256);
 assert.equal(r.design.elements.some(e=>e.id==='space-0-roof'),false);
 assert(r.design.elements.some(e=>e.id.startsWith('space-0-ridge-skin-')&&
  e.origin[1]===p.rooms[0].roofY+2));
 assert(r.design.elements.some(e=>e.id.startsWith('space-1-ridge-gable-')));
 assert.equal(r.layout.rooms[0].roofForm,'ridge');
 assert.equal(r.layout.rooms[1].roofAxis,'z');
 assert.equal(verifyCompiled(r.design,r.compiled),true);
 assert.equal(r.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 const missingAxis=structuredClone(p);delete missingAxis.rooms[0].roofAxis;
 assert.throws(()=>validateSpatialComposition(missingAxis),/ROOM_CONTRACT/);
 const courtyard=structuredClone(p);courtyard.rooms[0].spatialUse='open-court';
 assert.throws(()=>validateSpatialComposition(courtyard),/ROOM_CONTRACT/);
});
