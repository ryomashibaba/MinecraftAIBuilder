import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const d='b114-review-output/';
const r=JSON.parse(fs.readFileSync(d+'B114_Furniture_Reconciliation_15_Buildings.json','utf8'));
test('all 15 buildings and 279 rooms source-linked with blocked construction gates',()=>{
 assert.equal(r.schema,'minecraftaibuilder-b114-furniture-concept-reconciliation-v1');
 assert.equal(r.totals.buildings,15);assert.equal(r.totals.rooms,279);
 assert.equal(r.reports.length,15);assert.equal(r.sourceB114Integrity.length,64);
 assert.equal(r.sourceB113Integrity.length,64);assert.equal(r.directSourceMutation,false);
 assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
 assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);
 assert.equal(r.executionAllowed,false);assert.equal(r.constructionApproved,false);
 assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.commandCount,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
});
test('per-building B105 proxy removal precedes B113 candidate fixture overlay with no duplicate solids',()=>{
 for(const b of r.reports){
  const t=b.totals;
  assert.equal(t.rooms,b.rooms.length);
  assert.equal(t.sourceDisplayProxies,t.obsoleteDisplayProxiesRemoved+t.retainedHeldSourceProxies);
  assert.equal(t.newB113FurnitureBodyCells,b.addedFurnitureBodies.length);
  assert.equal(t.finalLocalSolidCells,b.localOverlay.length);
  assert.equal(t.staticGeometryClashes,0);
  assert.equal(new Set(b.localOverlay.map(p=>p.x+','+p.y+','+p.z)).size,b.localOverlay.length);
  assert(b.rooms.every(room=>!room.provisionalFullReplacement||
   room.reviewProblems.length===0&&room.sourceAnchorsPreserved&&room.b113OccupancyClear));
 }
});
test('HOUSE_V3 all 3 room replacements expand two bed rooms from 2 proxy to 4 fixture cells',()=>{
 const b=r.reports.find(b=>b.id==='HOUSE_V3');
 assert(b);assert.equal(b.rooms.length,3);
 assert.equal(b.totals.replacedRooms,3);
 assert.equal(b.totals.unreconciledRooms,0);
 assert.equal(b.totals.sourceDisplayProxies,6);
 assert.equal(b.totals.obsoleteDisplayProxiesRemoved,6);
 assert.equal(b.totals.newB113FurnitureBodyCells,10);
 assert.equal(b.totals.visualReviewRooms,2);
 const rooms=b.rooms.filter(x=>x.originalB113FootprintCount===4);
 assert.equal(rooms.length,2);
 assert(rooms.every(x=>x.sourceB113Fixtures===2&&x.originalB105ProxyCount===2));
 assert.equal(b.totals.realInteractionCertifiedRooms,0);
});
test('unsupported B113 room layouts stay unpromoted instead of silently passing',()=>{
 const rooms=r.reports.flatMap(b=>b.rooms);
 assert(r.noAutomaticPromotionOfHeldRooms);
 assert.equal(r.totals.unreconciledRooms,rooms.filter(x=>!x.provisionalFullReplacement).length);
 assert(rooms.filter(x=>!x.provisionalFullReplacement).every(x=>x.reviewProblems.length>0));
 assert.equal(r.totals.physicallyCertifiedRoomCount,0);
 assert.equal(r.educationBedOrientationAndDoorStateVerified,false);
 assert.equal(r.recipePaletteVersionUnverified,true);
});
test('HOUSE_V3 preview shows B105 obsolete proxies versus B113 local footprints',()=>{
 const pic=fs.readFileSync(d+'B114_HOUSE_V3_Furniture_Reconciled.svg','utf8');
 assert(pic.includes('HOUSE_V3 / FURNITURE SOURCE RECONCILIATION'));
 assert(pic.includes('B105 proxy 2 cells'));
 assert(pic.includes('B113 4 cells'));
 assert(pic.includes('PROPOSED'));
 assert(pic.includes('NOT_PREPARED'));assert(pic.includes('worldContacts=0'));
 assert(!/<script|<foreignObject|(?:xlink:)?href=|javascript:/i.test(pic));
});
