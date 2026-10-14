import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('batched models share identical B114 source checksum',()=>{
 const dir='b114-review-output/';
 const files=['B114_Conditional_Circulation_15_Buildings.json',
  'B114_3D_Stack_Audit.json','B114_HOUSE_V3_Integrated_3D.json',
  'B114_HOUSE_V3_Unified_3D_Proposal.json','B114_HOUSE_V3_Architectural_Overlay.json'];
 const r=files.map(f=>JSON.parse(fs.readFileSync(dir+f,'utf8')));
 const id=r[0].integritySha256;
 assert.equal(id.length,64);
 assert.equal(r[1].sourceB114IntegritySha256,id);
 assert(r.slice(2).every(x=>x.sourceB114Integrity===id));
 assert(r.every(x=>x.constructionApproved===false&&x.worldContacts===0&&
  x.worldCoordinates===null&&x.BuildPlan.operations.length===0&&
  x.gates.length===9&&x.gates.every(g=>g.status==='BLOCKED')));
});
test('all five Japanese review reports and original residual CSV still exist',()=>{
 const dir='b114-review-output/';
 const files=['B114_15_Buildings_Residual_Stairs.csv',
  'B114_Combined_Circulation_Review_JA.md',
  'B114_3D_Stack_Review_JA.md',
  'B114_HOUSE_V3_Integrated_Review_JA.md',
  'B114_HOUSE_V3_Unified_3D_Review_JA.md',
  'B114_HOUSE_V3_Architectural_Overlay_Review_JA.md'];
 for(const p of files)assert(fs.statSync(dir+p).size>150);
});