import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {variants,shortestProtectedCorridor,searchRoomRelayout,compileB84} from './compile-b84.mjs';
import {hash} from '../../b79/main/compile-b79.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const report=JSON.parse(fs.readFileSync(path.join(here,'B84_LAYOUT_OPTIONS_REPORT.json'),'utf8'));
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const v=p=>`${p.x},${p.y},${p.z}`;
const xy=p=>typeof p==='string'?p:`${p.x},${p.z}`;
const options=report.sections.flatMap(s=>s.rooms).filter(r=>r.best);
const empty=()=>({solids:new Set(),reserved:new Set(),protectedSites:new Set()});
function mini(corridors=[{x:3,z:0}]){return {level:1,floorMaskRows:Array(7).fill('1111111'),conceptReservations:{corridors,stairs:[],elevators:[]}};}
function index(blocks=[]){return {final:new Map(blocks.map(p=>[v(p),{occupied:true}])),slabBase:new Map()};}
test('B84 report provenance/hash and independent frozen source evidence',()=>{
 const b83=get('parallel/b83/main/B83_HELD_ROOM_TEMPLATE_REPORT.json');
 assert.equal(report.provenance.b83,b83.reportSha256);
 const {reportSha256,...body}=report;assert.equal(hash(body),reportSha256);
 assert.deepEqual(report.productionReplays,b83.productionReplays);
});
test('preserves B83 275, and reports 39 reviewed local relayouts without promoting them',()=>{
 assert.equal(report.totals.immutableEarlierCandidates,275);
 assert.equal(report.totals.examinedHeld,39);
 assert.equal(report.totals.layoutChangeAlternatives,12);
 assert.equal(report.totals.stillHeldWithoutLayoutAlternative,27);
 assert.equal(options.length,12);
 assert.equal(report.sections.length,30);
});
test('all 12 candidates hold approval and global execution, no world commands',()=>{
 assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.executionAllowed,false);
 assert.equal(report.constructionApproved,false);assert.equal(report.worldContacts,0);
 assert.equal(report.gates.length,9);assert(report.gates.every(g=>g.status==='BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);assert.equal(report.BuildPlan.commandCount,0);
 for(const sec of report.sections){assert.deepEqual(sec.operations,[]);assert.equal(sec.worldCoordinates,null);for(const row of sec.rooms){
  assert.deepEqual(row.operations,[]);assert.equal(row.worldCoordinates,null);assert.equal(row.autoApply,false);
  if(row.best){assert.deepEqual(row.best.operations,[]);assert.equal(row.best.placementAllowed,false);assert.equal(row.best.doorHinge,null);assert.equal(row.best.worldCoordinates,null);}
 }}
});
test('local door openings two high and frames never self-intersect',()=>{
 for(const {best:o} of options){
  const open=o.local3DVoxels.filter(v=>v.role==='DOOR_VOID');
  assert.equal(open.length,2);assert.equal(open[1].y,open[0].y+1);
  assert.equal(o.local3DVoxels.length,9);
  assert.equal(new Set(o.local3DVoxels.map(v)).size,9);
  assert.equal(new Set(o.local3DVoxels.map(v=>`${v.x}:${v.y}:${v.z}`)).size,9);
  assert.equal(o.protectedRoomCore.length,4);
  assert(o.protectedRoute.length>0);
  assert(o.proposedCorridorAirCells.length>0);
 }});
test('all new floor-level alternatives mutually compatible at their solid/air claims',()=>{
 for(const sec of report.sections){const occupied=new Set(),doorAir=new Set(),paths=new Set(),newCorridors=new Set();
  for(const {best:o} of sec.rooms.filter(r=>r.best)){
   for(const p of o.local3DVoxels){const k=v(p);assert(!occupied.has(k));assert(!doorAir.has(k));if(p.role==='DOOR_VOID')doorAir.add(k);else occupied.add(k);}
   for(const p of o.localSwingAirReservation){assert(!occupied.has(v(p)));doorAir.add(v(p));}
   const ownPaths=new Set([...o.protectedRoute,...o.protectedRoomCore].map(xy));for(const k of ownPaths){assert(!paths.has(k));paths.add(k);}
   for(const p of o.proposedCorridorAirCells){assert(!newCorridors.has(xy(p)));newCorridors.add(xy(p));}
  }
 }});
test('trimming rooms never invents a room larger than the original, preserves min 3x3',()=>{
 const r={x:2,z:3,width:5,depth:4};const x=variants(r);assert.equal(x.length,5);
 assert(x.every(n=>n.width>=3&&n.depth>=3&&n.x>=r.x&&n.z>=r.z&&n.x+n.width<=r.x+r.width&&n.z+n.depth<=r.z+r.depth));
});
test('corridor path reaches a real named corridor, avoids retained room and other room',()=>{
 const shape=mini([{x:5,z:3}]),hall={x:1,z:3};
 const p=shortestProtectedCorridor({hall,shape,idx:index(),rooms:[{id:'a',x:1,z:1,width:2,depth:2}],ownRoomId:'a',immutable:empty(),retainedRoom:{x:1,z:1,width:2,depth:2}});
 assert(p);assert.deepEqual(p.namedTarget,{x:5,z:3});
 assert(p.cells.every(c=>!(c.x>=1&&c.x<3&&c.z>=1&&c.z<3)));
 const blocked=shortestProtectedCorridor({hall,shape,idx:index(),rooms:[{id:'a',x:1,z:1,width:2,depth:2},{id:'b',x:0,z:0,width:7,depth:7}],ownRoomId:'a',immutable:empty()});
 assert.equal(blocked,null);
});
test('physical production blockage and protected corridor prevents fake routes',()=>{
 const shape=mini([{x:2,z:0}]),hall={x:2,z:2};
 const base={hall,shape,rooms:[],ownRoomId:'x',immutable:empty()};
 assert(shortestProtectedCorridor({...base,idx:index()}));
 assert.equal(shortestProtectedCorridor({...base,idx:index([{x:2,y:1,z:2}])}),null);
 const fix=empty();fix.protectedSites.add('2,2');
 assert.equal(shortestProtectedCorridor({...base,idx:index(),immutable:fix}),null);
});
test('all 8 template groups tracked independently per actual floor',()=>{
 assert.equal(report.templateValidation.length,8);
 const b83=get('parallel/b83/main/B83_HELD_ROOM_TEMPLATE_REPORT.json');
 assert.deepEqual(report.templateValidation.map(t=>t.templateId),b83.templateAnalysis.map(t=>t.templateId));
 assert(report.templateValidation.every(t=>t.members===t.localRelayoutAlternatives+t.stillBlocked&&t.crossFloorValidationRequired));
});
test('selected corridors reclassified only when corresponding proposed routes prove continuity',()=>{
 for(const {best:p} of options){
  assert.equal(p.proposedNewCorridorCells.length,p.requiredCorridorReclassification);
  assert(p.proposedCorridorAirCells.length>=1);
  assert.deepEqual(p.proposedCorridorAirCells.at(-1),p.verifiedNamedCorridorTarget);
  assert(p.proposedCorridorAirCells.every((x,i,a)=>i===0||Math.abs(x.x-a[i-1].x)+Math.abs(x.z-a[i-1].z)===1));
  assert.equal(p.immutableEnvelopeModified,false);
 }});
test('reviewable candidates explicitly preserve original source and require approval even when room unchanged',()=>{
 assert(options.every(x=>x.best.existingTypedAssemblyModified===false&&x.best.existingSourceDoorModified===false&&x.best.doorClosure==='UNAPPROVED'));
 assert.equal(report.totals.roomsNeedingResize,4);
 assert.equal(report.totals.corridorCellReclassifications,5);
});
test('all B83 held room identities accounted for once, including 27 still blocked',()=>{
 const b83=get('parallel/b83/main/B83_HELD_ROOM_TEMPLATE_REPORT.json');
 const expected=b83.sections.flatMap(s=>s.rooms).filter(r=>!r.proposed).map(r=>r.portId).sort();
 const got=report.sections.flatMap(s=>s.rooms).map(r=>r.portId).sort();assert.deepEqual(got,expected);
});
test('source report cannot include construction operations or execution bypass',()=>{
 for(const phrase of ['PROPOSED_ONLY','NOT_PREPARED','BLOCKED'])assert(JSON.stringify(report).includes(phrase));
 assert.equal(report.totals.constructionCommands,0);assert.equal(report.totals.productionModifications,0);
});
