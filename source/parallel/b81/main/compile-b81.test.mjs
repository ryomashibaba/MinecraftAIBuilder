import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
import {parseCatalog,validatePalette,classifyHeld,stageSection,compileB81,MATERIALS,REQUIRED_DOOR_STATES} from './compile-b81.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const r=get('parallel/b81/main/B81_TYPED_LOCAL_ASSEMBLY.json');
const b80=get('parallel/b80/main/B80_LOCAL_3D_FRAME_REPORT.json');
const b65=get('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json');
const vkey=v=>`${v.x},${v.y},${v.z}`;
const catalog=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),'utf8');
test('B81 sealed report and 9/9 gates remain BLOCKED',()=>{
 const {reportSha256,...body}=r;assert.equal(hash(body),reportSha256);
 safe(r,'minecraftaibuilder-b81-typed-local-construction-intents-v1');
 assert.equal(r.kind,'NON_EXECUTABLE_LOCAL_BLOCK_INTENTS');
 assert.equal(r.constructionApproved,false);assert.equal(r.executionAllowed,false);assert.equal(r.worldContacts,0);
});
test('B80/B65 original provenance is pinned and unchanged',()=>{
 safe(b80,'minecraftaibuilder-b80-readonly-local-3d-door-frame-mock-v1');
 safe(b65,'minecraftaibuilder-b65-interior-assembly-intents-v1');
 assert.equal(r.provenance.b80,b80.reportSha256);
 assert.equal(r.provenance.b65,b65.reportSha256);
 assert.equal(r.provenance.officialBlocksSha256,hash(Buffer.from(catalog)));
});
test('official Bedrock catalogue contains all staged materials and door state keys',()=>{
 const c=parseCatalog(catalog),p=validatePalette(c);
 assert.equal(c.size>1000,true);assert.deepEqual(p.doorStateKeys,[...REQUIRED_DOOR_STATES]);
 assert.deepEqual(Object.values(MATERIALS),[p.door,p.frame,p.partition]);
});
test('catalogue rejects truncated, duplicated and unrecognized materials',()=>{
 assert.throws(()=>parseCatalog('| minecraft:spruce_door | upper_block_bit |'),'CATALOG_TRUNCATED');
 assert.throws(()=>parseCatalog(catalog+'\n| minecraft:spruce_door | open_bit |'),'CATALOG_DUPLICATE');
 const c=parseCatalog(catalog);assert.throws(()=>validatePalette(c,{...MATERIALS,door:'minecraft:invented_door'}),'UNKNOWN_MATERIAL');
 assert.throws(()=>validatePalette(c,{...MATERIALS,door:'minecraft:stone_bricks'}),'DOOR_STATE_UNSUPPORTED');
});
test('all 260 door pairs have lower/upper parts with known keys and unresolved hinge',()=>{
 const all=r.sections.flatMap(s=>s.doorPairs);assert.equal(all.length,260);
 for(const d of all){assert.equal(d.parts.length,2);
  const [lower,upper]=d.parts;assert.equal(lower.role,'DOOR_LOWER');assert.equal(upper.role,'DOOR_UPPER');
  assert.equal(upper.y,lower.y+1);assert.equal(lower.x,upper.x);assert.equal(lower.z,upper.z);
  assert.equal(lower.blockId,MATERIALS.door);assert.equal(upper.blockId,MATERIALS.door);
  for(const p of d.parts){assert.deepEqual(Object.keys(p.blockStates).sort(),[...REQUIRED_DOOR_STATES].sort());
   assert.equal(p.blockStates.door_hinge_bit,null);assert.equal(p.blockStates.open_bit,false);
   assert.ok(['east','west','north','south'].includes(p.blockStates['minecraft:cardinal_direction']));
   assert.deepEqual(p.pendingHingeOptions,[false,true]);
  }
  assert.equal(lower.blockStates.upper_block_bit,false);assert.equal(upper.blockStates.upper_block_bit,true);
  assert.equal(d.supportedByOfficialCatalogStateKeys,true);assert.equal(d.notPlaced,true);
  assert.equal(d.hingeCalibration,'UNRESOLVED');assert.equal(d.facingCalibration,'UNRESOLVED');
 }
});
test('all 30 floors have no overlap between door parts and solid intents',()=>{
 for(const s of r.sections){const occupied=new Set(s.solidVoxelIntents.map(vkey));
  assert.equal(occupied.size,s.solidVoxelIntents.length);
  for(const d of s.doorPairs)for(const p of d.parts)assert.equal(occupied.has(vkey(p)),false);
  for(const v of s.solidVoxelIntents){assert.equal(v.blockId,v.role==='PARTITION'?MATERIALS.partition:MATERIALS.frame);assert.deepEqual(v.blockStates,{});}
  assert.equal(s.counts.localSolidBlocks,s.counts.frameBlocks+s.counts.partitionBlocks);
  assert.deepEqual(s.operations,[]);assert.equal(s.worldCoordinates,null);assert.equal(s.placementAuthorized,false);
 }
});
test('counts 520 doors, 1820 jamb/lintel, 4494 partitions, 54 holds',()=>{
 assert.equal(r.totals.originalRooms,314);assert.equal(r.totals.sections,30);
 assert.equal(r.totals.typedDoorBlockCandidates,520);assert.equal(r.totals.typedFrameIntents,1820);
 assert.equal(r.totals.typedPartitionIntents,4494);assert.equal(r.totals.concreteLocalSolidIntents,6314);
 assert.equal(r.totals.blockedRooms,54);assert.equal(r.totals.actualMinecraftBlocksPlaced,0);
});
test('all 137 moved door old-aperture closures stay unapproved and separate',()=>{
 const closures=r.sections.flatMap(s=>s.oldOpeningClosures);assert.equal(closures.length,137);
 for(const c of closures){assert.equal(c.autoApply,false);assert.equal(c.proposedVoxels.length,3);
  assert.ok(c.status.startsWith('UNAPPROVED'));assert.ok(c.proposedVoxels.every(v=>v.blockId===MATERIALS.partition));
 }
});
test('every original room is accounted for exactly once',()=>{
 const ids=new Set();for(const s of r.sections){for(const d of s.doorPairs){assert.ok(!ids.has(d.portId));ids.add(d.portId);}
  for(const d of s.held){assert.ok(!ids.has(d.portId));ids.add(d.portId);}
 }assert.equal(ids.size,314);
});
test('54 held cases carry priority action and no auto-repair',()=>{
 const held=r.sections.flatMap(s=>s.held);assert.equal(held.length,54);
 assert.deepEqual(r.totals.heldReasons,{
  CORRIDOR_TOPOLOGY_OR_OCCUPANCY:13,JAMB_OR_CORNER_TOPOLOGY:8,
  NO_VALID_DOOR_BOUNDARY:32,PRODUCTION_VOXEL_COLLISION:1});
 for(const d of held){assert.equal(d.autoFixAllowed,false);assert.equal(d.worldCoordinates,null);assert.ok(d.action);
  assert.ok(d.sourceReasons.length>0);
 }
});
test('hold classifier prioritizes absent candidate and does not misreport valid door',()=>{
 assert.equal(classifyHeld({selected:{portId:'ok'}}),null);
 const x=classifyHeld({portId:'X',roomId:'R',candidateCount:0,heldReason:'B79_HELD_GEOMETRY_OR_PRODUCTION'});
 assert.equal(x.category,'NO_VALID_DOOR_BOUNDARY');assert.equal(x.autoFixAllowed,false);
});
test('staging rejects unmatched source or malformed frame rather than silently placing',()=>{
 const src=b65.sections[0];const sec=b80.sections[0];
 assert.throws(()=>stageSection({...sec,id:'wrong'},null,src,MATERIALS),'SOURCE_SCOPE');
 const clone=structuredClone(sec),door=clone.rooms.find(d=>d.selected);
 door.selected.local3DVoxels=[];
 assert.throws(()=>stageSection(clone,null,src,MATERIALS),'FRAME_SHAPE');
});
test('full compile from pinned B80 reproducibly matches stored output',()=>{
 const again=compileB81();assert.equal(again.reportSha256,r.reportSha256);
});
test('no world ops, world origins, executable placement or approvals in B81 report',()=>{
 assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.BuildPlan.commandCount,0);assert.equal(r.BuildPlan.worldCoordinates,null);
 assert.deepEqual(r.BuildPlan.materialIds,[]);assert.equal(r.palette.approved,false);
 assert.ok(r.gates.every(g=>g.status==='BLOCKED'));
 assert.equal(r.totals.worldCommands,0);
 for(const s of r.sections)assert.equal(s.commandCount,0);
});
test('root-cause priorities do not claim repair of stairs, hotel façade or external exit',()=>{
 assert.ok(r.pendingReview.includes('25_STAIRS_240_SLAB_CUTS'));
 assert.ok(r.pendingReview.includes('HOTEL_FACADE_APPROVAL'));
 assert.ok(r.pendingReview.includes('COMPLETE_EGRESS_AND_SWING_WALKABILITY'));
});
