import test from 'node:test';
import assert from 'node:assert/strict';
import {auditB142Support,validateB142} from './b142-support-vs-gallery.mjs';
function fixture({sourceGallery=false,solid=false}={}){
 const row=Array.from({length:15},()=>('1'.repeat(20)));
 const step=[];
 for(let i=0;i<7;i++)for(let lane=0;lane<2;lane++)
  step.push({index:i,lane,kind:i===0?'LOWER_FLOOR_SEAM':
   i===6?'UPPER_FLOOR_SEAM':'NORMAL_OAK_STAIR_CONCEPT',
   position:{x:i+2,y:i===6?5:i,z:4+lane}});
 const floors=[0,1].map(level=>({level,footprintRows:row,rooms:[],
  gallery:sourceGallery&&level===0?[{x:4,z:4}]:[]}));
 const design={candidateId:'TEST_ONLY',plan:{floors}};
 const c140={id:'TEST_ONLY',rows:[{stairIndex:0,fromLevel:0,toLevel:1,
  selected:{sketch:{positions:step,sourceFloorRise:5,worldOperations:[]}}}]};
 const c141={id:'TEST_ONLY',sourceStairs:1,selectedStairs:1,unresolved:[],
  merged:{levels:floors.map(f=>({level:f.level,combinedCells:f.gallery}))}};
 const volume={candidateId:'TEST_ONLY',worldContacts:0,constructionApproved:false,
  readonlyArchitecturalIR:true,voxels:solid?[{x:4,y:1,z:4,kind:'FURNITURE_PLACEHOLDER'}]:[]};
 return {design,c140,c141,volume};
}
test('flag support that blocks the source gallery',()=>{
 const a=fixture({sourceGallery:true});
 const r=auditB142Support(a.design,a.c140,a.c141,a.volume);
 assert.equal(r.flagged,1);
 assert(r.rows[0].byKind.SUPPORT_HITS_ORIGINAL_GALLERY>=1);
 assert.equal(r.worldWrites,0);
});
test('flag B105 source solid inside hypothetical support',()=>{
 const a=fixture({solid:true});
 const r=auditB142Support(a.design,a.c140,a.c141,a.volume);
 assert(r.rows[0].byKind.SUPPORT_HITS_B105_SOLID>=1);
});
test('zero flagged supports never authorizes physical construction',()=>{
 const a=fixture();
 const r=auditB142Support(a.design,a.c140,a.c141,a.volume);
 assert.equal(r.unflagged,1);
 assert.equal(r.rows[0].state,'HOLD_EDUCATION_PHYSICS_AND_SUPPORT_UNVERIFIED');
 assert.equal(r.rows[0].physicalSupportsPlaced,0);
});
test('reject stale geometry and forged safety report',()=>{
 const a=fixture();a.c140.id='FORGED';
 assert.throws(()=>auditB142Support(a.design,a.c140,a.c141,a.volume),/PINNED_SOURCE/);
 assert.equal(validateB142({integritySha256:'fake'}),false);
});
