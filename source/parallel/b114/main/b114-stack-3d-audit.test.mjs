import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {auditB114Stack,writeB114Stack} from './b114-stack-3d-audit.mjs';
const source=JSON.parse(fs.readFileSync('b114-review-output/B114_Conditional_Circulation_15_Buildings.json','utf8'));
const audit=auditB114Stack(source);
test('B114 stacked stair support/body interference is separately exposed',()=>{
  assert.equal(audit.totals.stairLinks,102);
  assert.equal(audit.totals.provisionalGalleryInterfaces,85);
  assert.equal(audit.totals.galleryInterfacesNeedingRedesign,17);
  assert.equal(audit.gridFrameVersion,'B114_SIGNED_VOXEL_FRAME_V2');
  assert.equal(audit.totals.buildingsWithModelledInterference,
   audit.cases.filter(x=>x.modelledCrossFlightCollisionPairs>0).length);
  assert.equal(audit.totals.modelledCrossFlightCollisionPairs,
   audit.cases.reduce((n,x)=>n+x.modelledCrossFlightCollisionPairs,0));
  assert.equal(audit.totals.modelledSolidBodyCollisionPairs,
   audit.cases.reduce((n,x)=>n+x.modelledSolidBodyCollisionPairs,0));
});
test('representative HOTEL_V1 conditional floor paths do not certify real access',()=>{
  const h=audit.representative;
  assert.equal(h.id,'HOTEL_V1');
  assert.equal(h.conditionalGroundToRooms,25);
  assert.equal(h.conceptualRooms,25);
  assert.equal(h.modelledCrossFlightCollisionPairs,h.collisionPairs.length);
  assert.equal(h.everyFloorPhysicallyReachable,false);
  assert.equal(h.floorOpeningsAndSupportsActuallyIntegrated,false);
});
test('B114 support audit is non-executable and source-preserving',()=>{
  assert.equal(audit.physicalWalkabilityCertified,false);
  assert.equal(audit.executionAllowed,false);
  assert.equal(audit.constructionApproved,false);
  assert.equal(audit.worldContacts,0);
  assert.equal(audit.worldCoordinates,null);
  assert.equal(audit.commandCount,0);
  assert.deepEqual(audit.BuildPlan.operations,[]);
  assert.equal(audit.gates.length,9);
  assert(audit.gates.every(g=>g.status==='BLOCKED'));
  assert(audit.cases.every(c=>c.appliedToOriginal===false));
});
test('reject a modified or forged source report',()=>{
  const bad=structuredClone(source);
  bad.constructionApproved=true;
  assert.throws(()=>auditB114Stack(bad),/REQUIRES_VALID_UNAPPROVED_SOURCE/);
});
test('emits JSON and Japanese report without construction operations',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b114-stack-'));
  try {
    const f=writeB114Stack(audit,dir);
    const data=JSON.parse(fs.readFileSync(f.json,'utf8'));
    assert.equal(data.gridFrameVersion,'B114_SIGNED_VOXEL_FRAME_V2');
    const md=fs.readFileSync(f.md,'utf8');
    assert(md.includes('認証'));
    assert(md.includes('NOT_PREPARED'));
  }finally{fs.rmSync(dir,{force:true,recursive:true});}
});