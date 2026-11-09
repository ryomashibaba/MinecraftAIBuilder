import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectB111LegalBedOrientation,auditB111OrientationOnly}
 from './b111-original-anchor-orientation-selector.mjs';
import {auditRoomTwoWide} from './b111-independent-two-wide-room-audit.mjs';
function room(){return {level:1,roomId:'R001',roomRectangle:{x:25,z:9,width:5,depth:6},
 doorInterior:{x:26,z:10},sourceFixtureAnchors:[{x:28,y:6,z:13},{x:28,y:6,z:12}],
 furniture:[{fixtureIndex:0,role:'bed',anchor:{x:28,z:13},footprint:[{x:28,z:13},{x:27,z:13}]},
 {fixtureIndex:1,role:'bed',anchor:{x:28,z:12},footprint:[{x:28,z:12},{x:27,z:12}]}]};}
test('same B111 original bed grammar fixes one 5x6 room without moving B110 anchors',()=>{
 const r=room(),frozen=structuredClone(r);
 assert.equal(auditRoomTwoWide(r).status,'HOLD_2W_FIXTURE_APPROACH');
 const result=selectB111LegalBedOrientation(r);
 assert.equal(result.status,'UNADOPTED_B111_LEGAL_BED_ORIENTATION');
 assert.equal(result.choiceCount,2);
 const candidate=r.furniture.map((f,i)=>({...f,footprint:result.alternative.changes[i].suggestedFootprint}));
 assert.equal(auditRoomTwoWide({...r,furniture:candidate}).status,'2W_PROXY_CLEAR');
 for(const c of result.alternative.changes)assert.deepEqual(c.originalAnchor,c.newAnchor);
 assert.deepEqual(r,frozen);
});
test('reject B110 anchor mutation and detect unsupported source',()=>{
 const r=room();r.sourceFixtureAnchors[0].x++;
 assert.throws(()=>selectB111LegalBedOrientation(r),/B110_SOURCE_ANCHOR_MISMATCH/);
 assert.throws(()=>auditB111OrientationOnly([],Buffer.alloc(0)),/PINNED_PUBLIC_ARCHIVE_MISMATCH/);
});
test('frozen archived 279-room source yields exact 230/40/9 without adoption',
 {skip:!process.env.B111_PINNED_PUBLIC_LAYOUTS},()=>{
 const path=process.env.B111_PINNED_PUBLIC_LAYOUTS;
 const bytes=fs.readFileSync(path),rows=JSON.parse(bytes),before=JSON.stringify(rows);
 const report=auditB111OrientationOnly(rows,bytes);
 assert.deepEqual(report.summary,{rooms:279,unchanged2DClear:230,
  fixedAnchorsB111OrientationCandidates:40,requiresB110AnchorOrRoomReview:9,
  adoptedLayoutChanges:0,modelCalls:0,worldContacts:0,worldWrites:0});
 assert.equal(report.unadoptedResearch.length,49);
 assert.equal(JSON.stringify(rows),before);
});
