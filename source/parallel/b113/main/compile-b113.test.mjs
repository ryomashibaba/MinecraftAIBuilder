import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assembleB111} from '../../b111/main/compile-b111.mjs';
import {buildB113,validateB113,writeB113,sha} from './compile-b113.mjs';
import {blockEvidence,inspectStateCandidate,OBSERVATION} from './b113-evidence.mjs';
import {straightFlight,auditFlight,intersects} from './b113-geometry.mjs';
import {inspectDoorPair,inspectBedPair,inspectRoomAssembly} from './b113-interiors.mjs';
let parent,report;
const all=()=>report??(parent=process.env.B113_PARENT_CACHE?JSON.parse(fs.readFileSync(process.env.B113_PARENT_CACHE,'utf8')):assembleB111(),report=buildB113(parent));
const rehash=r=>{const {integritySha256,...b}=r;return {...b,integritySha256:sha(b)};};
test('01 version comes from non-contact Windows package/file evidence, never v26.3 guessing',()=>{
 assert.equal(OBSERVATION.packageVersion,'1.26.3200.0');assert.equal(OBSERVATION.executableProductVersion,'1.26.32.0');
 assert.equal(OBSERVATION.gameStarted,false);assert.equal(OBSERVATION.legacyEvidenceImported,false);
});
test('02 all nine roles stay UNVERIFIED despite installed asset presence',()=>{
 const rows=blockEvidence();assert.equal(rows.length,9);assert(rows.every(r=>r.educationStatus==='UNVERIFIED'&&!r.executable));
 assert.equal(rows.find(r=>r.role==='frame').installedAssetStatus,'DIRECT_RESOURCE_KEY_ABSENT_NOT_RUNTIME_UNSUPPORTED');
});
test('03 a valid documented state shape is still not executable',()=>{
 const r=inspectStateCandidate('bed',{direction:0,head_piece_bit:false,occupied_bit:false},'1.26.32.0');
 assert.equal(r.documentationShapeValid,true);assert.equal(r.executionAllowed,false);assert.equal(r.educationStatus,'UNVERIFIED');
});
test('04 no coercion or version-family fallback',()=>{
 const r=inspectStateCandidate('bed',{direction:'0',head_piece_bit:0,occupied_bit:false},'v26.3');
 assert(r.issues.includes('EXACT_TARGET_VERSION_MISMATCH'));assert(r.issues.includes('INVALID_STATE_VALUE:direction'));
});
test('05 legacy door names cannot silently masquerade as the current documented schema',()=>{
 const r=inspectStateCandidate('door',{direction:0,door_hinge_bit:false,open_bit:false,upper_block_bit:false},'1.26.32.0');
 assert(r.issues.includes('UNKNOWN_STATE:direction'));assert(r.issues.includes('MISSING_STATE:minecraft:cardinal_direction'));
});
test('06 corrected corner domain rejects Java straight and arbitrary integers',()=>{
 assert.equal(inspectStateCandidate('stairs',{'minecraft:corner':'straight',weirdo_direction:4,upside_down_bit:false},'1.26.32.0').documentationShapeValid,false);
});
test('07 two door halves share facing, hinge and open state; upper flag differs',()=>{
 const lower={id:'minecraft:spruce_door',local:{x:0,y:1,z:0},states:{'minecraft:cardinal_direction':'north',door_hinge_bit:false,open_bit:false,upper_block_bit:false}};
 const upper={...structuredClone(lower),local:{x:0,y:2,z:0}};upper.states.upper_block_bit=true;
 assert(inspectDoorPair(lower,upper).offlinePairConsistent);
 upper.states.door_hinge_bit=true;assert(!inspectDoorPair(lower,upper).offlinePairConsistent);
 upper.states.door_hinge_bit=false;upper.local.y=3;assert(!inspectDoorPair(lower,upper).offlinePairConsistent);
});
test('08 a bed pair must be adjacent, level, and point toward its head',()=>{
 const foot={local:{x:0,y:1,z:0},headPiece:false,semanticDirection:'E'};
 const head={local:{x:1,y:1,z:0},headPiece:true,semanticDirection:'E'};
 assert(inspectBedPair(foot,head).offlinePairConsistent);
 head.local.x=-1;assert(!inspectBedPair(foot,head).offlinePairConsistent);
 head.local.x=1;head.local.y=2;assert(!inspectBedPair(foot,head).offlinePairConsistent);
});
test('09 five-rise flight reaches the upper surface using ten half-rises and two landings',()=>{
 const f=straightFlight();assert.equal(f.length,7);assert.equal(f.samples.at(-1).y,5);
 assert.equal(f.samples.length,12);assert(auditFlight(f).offlineGeometryClear);assert.equal(auditFlight(f).physicalTraversalCertified,false);
});
test('10 a full upper floor blocks headroom; computed aperture clears the conservative body sweep',()=>{
 const f=straightFlight(),floor=Array.from({length:f.length},(_,x)=>({x,y:4,z:0,width:1,height:1,depth:2}));
 assert(!auditFlight(f,floor).offlineGeometryClear);
 assert(!f.upperAperture.includes(0)&&!f.upperAperture.includes(f.length-1));
 assert(auditFlight(f,floor.filter(p=>!f.upperAperture.includes(p.x))).offlineGeometryClear);
});
test('11 a lower ceiling also requires its own opening',()=>{
 const f=straightFlight(),ceiling=Array.from({length:f.length},(_,x)=>({x,y:3,z:0,width:1,height:1,depth:2}));
 assert(!auditFlight(f,ceiling).offlineGeometryClear);
 assert(auditFlight(f,ceiling.filter(p=>!f.lowerCeilingAperture.includes(p.x))).offlineGeometryClear);
});
test('12 contact with a support surface is not penetration',()=>{
 assert.equal(intersects({x:0,y:1,z:0,width:1,height:2,depth:1},{x:0,y:0,z:0,width:1,height:1,depth:1}),false);
});
test('13 disconnected room space and furniture at the door approach cannot pass',()=>{
 const room={id:'R',level:0,x:0,z:0,width:5,depth:5,purpose:'test'},door={roomId:'R',level:0,side:'S',localLower:{x:2,y:1,z:4},localUpper:{x:2,y:2,z:4},interiorCell:{x:2,z:3}};
 const b={roomId:'R',level:0,furniture:[{fixtureIndex:0,role:'generic',anchor:{x:2,z:3},footprint:[{x:2,z:3}]}]};
 const r=inspectRoomAssembly(room,door,b);assert(!r.offlineOccupancyClear);assert(r.issues.includes('ENTRY_BLOCKED'));
});
test('14 all 15 B112 identities are pinned; 279 doors, 558 anchors and 300 beds conserved',()=>{
 const r=all();assert(validateB113(r));
 assert.equal(r.totals.rooms,279);assert.equal(r.totals.fixtureAnchors,558);assert.equal(r.totals.twoCellBeds,300);
});
test('15 all 102 inherited stair links overshoot under literal bottom-stair substitution',()=>{
 const r=all();assert.equal(r.totals.stairOvershoots,102);assert(r.cases.flatMap(c=>c.stairs).every(s=>s.upperOvershoot===1));
});
test('16 actual landing adjacency is checked; recorded existence cannot certify a connection',()=>{
 const r=all();assert.equal(r.totals.lowerLandingGaps,31);assert.equal(r.totals.upperLandingGaps,84);
 assert(r.cases.flatMap(c=>c.stairs).every(s=>s.decision==='REQUIRES_STAIR_REDESIGN'));
});
test('17 bounded bed rotations improve interaction access without moving source anchors',()=>{
 const t=all().totals;assert.equal(t.roomOccupancyProblemsBefore,99);assert.equal(t.roomOccupancyProblemsAfter,4);assert.equal(t.refinedBedLayouts,95);
 assert(all().cases.flatMap(c=>c.rooms).every(r=>r.sourceAnchorsPreserved&&r.bedRotationsEvaluated<=64));
});
test('18 2-wide additive galleries repair primary entrance/core routes for 279 rooms',()=>{
 const r=all();assert.equal(r.totals.repairedHorizontalRoomConnections,279);assert(r.totals.horizontalRoomConnections<279);
 assert(r.cases.flatMap(c=>c.horizontalRoutes).every(f=>f.repair.sourceCellsPreserved&&f.repair.allNewCellsOutsideRoomsAndCores&&!f.repair.appliedToSource));
});
test('19 replacement reservation excludes rooms but never claims stair integration',()=>{
 assert.equal(all().totals.linksWithReplacementFootprints,78);
 assert(all().cases.flatMap(c=>c.stairs).every(s=>!s.reservation.fullBuildingIntegrationCertified&&!s.reservation.applied));
});
test('20 source mutation is rejected even before output creation',()=>{
 all();const p=structuredClone(parent);p.sourceDesigns[0].plan.floors[0].rooms[0].x++;
 assert.throws(()=>buildB113(p),/PARENT_SOURCE_CHANGED/);
});
test('21 rehashing cannot turn any safety invariant into permission',()=>{
 for(const mutate of [r=>r.readiness='PREPARED',r=>r.worldContacts=1,r=>r.worldCoordinates={},r=>r.commandCount=1,
  r=>r.constructionApproved=true,r=>r.executionAllowed=true,r=>r.gates[0].status='PASS',r=>r.BuildPlan.operations.push({kind:'fill'}),
  r=>r.totals.legacyUnapproved=0,r=>r.totals.legacyHeld=0]){
  const r=structuredClone(all());mutate(r);assert.equal(validateB113(rehash(r)),false);
 }
});
test('22 rehashed runtime evidence and physical furniture certification are rejected',()=>{
 for(const mutate of [r=>r.blockRoles[0].educationStatus='VERIFIED',r=>r.environmentObservation.executableProductVersion='v26.3',
  r=>r.cases[0].rooms[0].fixtures[0].physicallyUsableCertified=true,r=>r.cases[0].horizontalRoutes[0].repair.appliedToSource=true,
  r=>r.cases[0].metrics.refinedBedLayouts++]){
  const r=structuredClone(all());mutate(r);assert.equal(validateB113(rehash(r)),false);
 }
});
test('23 five representative typologies have explicit unresolved physical completion',()=>{
 assert.equal(all().representativeIds.length,5);assert(all().cases.every(c=>c.physicalCompletion==='UNVERIFIED'));
});
test('24 export review, matrix, diagnostics; refuse forged approval',()=>{
 const r=all();const out=writeB113(r,'b113-review-output');assert.equal(out.files,3);
 assert.equal(fs.readFileSync('b113-review-output/B113_15_Building_Matrix.csv','utf8').trim().split('\n').length,16);
 const bad=structuredClone(r);bad.executionAllowed=true;
 assert.throws(()=>writeB113(rehash(bad),'b113-review-output'),/UNSAFE_EXPORT/);
});
test('25 diagnostics import graph cannot reach a network or Minecraft transport',()=>{
 const seen=new Set();
 function inspect(file){
  if(seen.has(file))return;seen.add(file);const code=fs.readFileSync(file,'utf8');
  const specs=[...code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]);
  for(const spec of specs){
   assert(!/^(?:node:)?(?:net|http|https|tls|child_process)$/.test(spec));
   assert(!/socket|websocket|minecraft_builder|bridge\/|mcp\//i.test(spec));
   if(spec.startsWith('.'))inspect(path.resolve(path.dirname(file),spec));
  }
  assert(!/\b(?:fetch|WebSocket)\s*\(/.test(code));
 }
 inspect(fileURLToPath(new URL('./compile-b113.mjs',import.meta.url)));assert(seen.size>10);
});
