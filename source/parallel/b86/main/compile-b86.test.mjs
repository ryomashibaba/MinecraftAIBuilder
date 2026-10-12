import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileB86,interiorEdges,productionEditClass,samePlaneWindowReplacements,reconcileJointFloor} from './compile-b86.mjs';
import {hash} from '../../b79/main/compile-b79.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const data=JSON.parse(fs.readFileSync(path.join(here,'B86_JOINT_ENVELOPE_INTERIOR_REPORT.json')));
const sha=x=>createHash('sha256').update(x).digest('hex');
const all=data.sections.flatMap(s=>s.rooms),designs=all.flatMap(r=>r.variants.slice(0,1));
const dangerous=['operations','worldCoordinates'];
test('immutable pinned B85 report digest and provenance',()=>{
 const b85=JSON.parse(fs.readFileSync(path.join(root,'parallel/b85/main/B85_FLOOR_LAYOUT_REPORT.json')));
 assert.equal(data.provenance.b85,b85.reportSha256);assert.equal(hash(Object.fromEntries(Object.entries(b85).filter(([k])=>k!=='reportSha256'))),b85.reportSha256);
});
test('report digest safety, 9 gates, zero executable plan',()=>{
 const {reportSha256,...body}=data;assert.equal(hash(body),reportSha256);
 assert.equal(data.readiness,'NOT_PREPARED');assert.equal(data.constructionApproved,false);assert.equal(data.executionAllowed,false);
 assert.equal(data.BuildPlan.operations.length,0);assert.equal(data.BuildPlan.commandCount,0);assert.equal(data.BuildPlan.worldCoordinates,null);
 assert.equal(data.gates.length,9);assert(data.gates.every(g=>g.status==='BLOCKED'));
});
test('five frozen production operation hashes retained',()=>{
 const prev=JSON.parse(fs.readFileSync(path.join(root,'parallel/b85/main/B85_FLOOR_LAYOUT_REPORT.json')));
 assert.deepEqual(data.productionReplays,prev.productionReplays);
});
test('all 30 levels and precisely 27 held rooms examined',()=>{
 assert.equal(data.sections.length,30);assert.equal(all.length,27);assert.equal(data.totals.priorQualityGatedCandidates,287);
 assert.equal(data.totals.jointReviewOptions+data.totals.stillWithoutJointOption,27);
});
test('all new candidate areas retained, whole-floor arbitration',()=>{
 assert(designs.length>0);assert.equal(designs.length,data.totals.jointReviewOptions);
 assert(designs.every(v=>v.retainedRoomAreaRatio===1));
 assert(data.sections.every(s=>!s.conflictsDeferred.length));
});
test('each candidate has exactly 2 door voids and three tall jambs and lintel',()=>{
 for(const v of designs){assert.equal(v.local3DVoxels.filter(x=>x.role==='DOOR_VOID').length,2);
  assert.equal(v.local3DVoxels.filter(x=>x.role.startsWith('JAMB_')).length,6);
  assert.equal(v.local3DVoxels.filter(x=>x.role==='LINTEL').length,1);
  assert.equal(v.localSwingAirReservation.length,4);assert.equal(v.protectedRoomCore.length,4);}
});
test('frame and doorway correspond to one original room and adjacent corridor',()=>{
 for(const v of designs){const p=v.doorRoomCell,q=v.doorHallCell,r=v.roomRect;
  assert.equal(Math.abs(p.x-q.x)+Math.abs(p.z-q.z),1);
  assert(p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth);
  assert(v.proposedCorridorAirCells.length>=1);
  assert.equal(v.structuralReviewRequired,v.virtualLocalEnvelopePatch.some(x=>x.reviewClass==='STRUCTURAL_ENVELOPE_REVIEW')||v.facadeGlazingCompensation.some(x=>x.structuralReviewRequired));}
});
test('all virtual patch data has explicit source block and review class',()=>{
 const classes=new Set(['REPLACEABLE_PARTITION_REVIEW','STRUCTURAL_ENVELOPE_REVIEW','FACADE_WINDOW_REVIEW']);
 for(const d of designs)for(const p of d.virtualLocalEnvelopePatch){assert(p.priorBlock.startsWith('minecraft:'));
  assert(classes.has(p.reviewClass));assert(Number.isInteger(p.x)&&Number.isInteger(p.y)&&Number.isInteger(p.z));}
 assert.equal(designs.reduce((n,v)=>n+v.jointPatchVoxelCount,0),data.totals.candidatePatchVoxels);
});
test('glass conservation and speculative envelope patch are not materialized',()=>{
 for(const d of designs){assert.equal(d.glassAreaNetChange,0);assert.equal(d.existingGlassRemoved,d.facadeGlazingCompensation.length);
  assert.equal(d.originalPlannerOperationModified,false);assert.equal(d.existingTypedAssemblyModified,false);assert.equal(d.operations.length,0);
  assert.equal(d.worldCoordinates,null);assert.equal(d.executionAllowed,false);assert.equal(d.approval,'REVIEW_ONLY');}
});
test('floor, slab, roof and unknown production material never replaceable',()=>{
 for(const role of ['floor','roof','column','unknown','air'])assert.equal(productionEditClass({role,occupied:true}),'IMMUTABLE_PRODUCTION');
 assert.equal(productionEditClass({role:'primaryWall',occupied:true}),'STRUCTURAL_ENVELOPE_REVIEW');
 assert.equal(productionEditClass({role:'secondaryWall',occupied:true}),'REPLACEABLE_PARTITION_REVIEW');
 assert.equal(productionEditClass({role:'glass',occupied:true}),'FACADE_WINDOW_REVIEW');
});
test('geometry boundary searches do not create corners without jambs',()=>{
 const edges=interiorEdges({x:2,z:4,width:3,depth:3});assert.equal(edges.length,4);
 assert(edges.every(e=>e.left&&e.right&&Math.abs(e.cell.x-e.hall.x)+Math.abs(e.cell.z-e.hall.z)===1));
});
test('window relocation fails closed when no compatible bay exists',()=>{
 const idx={final:new Map()};const s={floorMaskRows:['111','111','111']};
 const result=samePlaneWindowReplacements({glassTouches:[{x:0,z:1,y:1}],idx,shape:s,room:{x:0,z:0,width:1,depth:1},exclude:new Set(),protectedSites:new Set(),protectedVoxels:new Set()});
 assert.equal(result,null);
});
test('window relocation conserves pane count on same local plane, never uses a floor',()=>{
 const idx={final:new Map([['0,1,2',{role:'secondaryWall',block:'minecraft:stone',occupied:true}],['0,1,0',{role:'floor',occupied:true}]])};
 const r=samePlaneWindowReplacements({glassTouches:[{x:0,y:1,z:1}],idx,shape:{floorMaskRows:['111','111','111']},room:{x:1,z:1,width:1,depth:1},exclude:new Set(),protectedSites:new Set(),protectedVoxels:new Set()});
 assert.equal(r?.length,1);assert.deepEqual([r[0].x,r[0].y,r[0].z],[0,1,2]);
});
test('whole-floor arbitration prevents different rooms claiming the same voxel',()=>{
 const v=(roomId,x)=>({roomId,local3DVoxels:[{x,y:1,z:0,role:'JAMB_LEFT'}],localSwingAirReservation:[],virtualLocalEnvelopePatch:[],facadeGlazingCompensation:[],protectedRoomCore:['3,3'],protectedRoute:['2,3'],proposedNewCorridorCells:[]});
 const result=reconcileJointFloor([{roomId:'a',portId:'1',variants:[v('a',1)]},{roomId:'b',portId:'2',variants:[v('b',1)]}]);
 assert.equal(result.accepted.length,1);assert.equal(result.deferred.length,1);
});
test('actual pinned planner replay still returns the archived B86 digest',async()=>{
 const next=await compileB86();assert.deepEqual(next.totals,data.totals);assert.equal(next.reportSha256,data.reportSha256);
});
