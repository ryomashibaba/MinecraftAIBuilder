import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateB143SideFrame,verifyB143} from './b143-office-stair-sideframe-trial.mjs';
const coords=(x,y,z)=>({x,y,z});
const mask=Array.from({length:14},()=>('1'.repeat(20)));
const dirs=[0,1].map(level=>({level,footprintRows:mask,gallery:[],rooms:[]}));
function fixture({blockLeft=false,blockRight=false,blockBoth=false}={}){
 const parts=[];
 for(let index=0;index<=6;index++)for(let lane=0;lane<=1;lane++)
  parts.push({index,lane,kind:index===0?'LOWER_FLOOR_SEAM':index===6?
   'UPPER_FLOOR_SEAM':'NORMAL_OAK_STAIR_CONCEPT',
   position:coords(index+3,index===6?5:index,4+lane)});
 const design={candidateId:'TEST',plan:{floors:structuredClone(dirs),cores:[]}};
 if(blockLeft||blockBoth)
  design.plan.floors[0].gallery.push({x:5,z:3});
 if(blockRight||blockBoth)
  design.plan.floors[0].gallery.push({x:5,z:6});
 const row={stairIndex:0,fromLevel:0,toLevel:1,coreIndex:0,
  selected:{sketch:{sourceFloorRise:5,positions:parts}}};
 const c140={id:'TEST',rows:[row]},c141={id:'TEST',sourceStairs:1,
  merged:{levels:design.plan.floors.map(f=>({combinedCells:f.gallery}))}};
 const volume={candidateId:'TEST',constructionApproved:false,worldContacts:0,
  readonlyArchitecturalIR:true,voxels:[]};
 return {design,c140,c141,volume};
}
test('both outboard sides exist without changing source, no installed supports',()=>{
 const a=fixture(),pre=JSON.stringify(a);
 const r=evaluateB143SideFrame(a.design,a.c140,a.c141,a.volume,0);
 assert.equal(r.clearSideOptions,2);
 assert.equal(r.status,'UNADOPTED_OUTBOARD_SIDEFRAME_GEOMETRY_ONLY');
 assert.equal(r.choices[0].brackets,5);
 assert.equal(r.choices[1].brackets,5);
 assert.equal(r.physicalSupportCertified,false);
 assert.equal(JSON.stringify(a),pre);
});
test('avoid source gallery while preserving the other side',()=>{
 const a=fixture({blockLeft:true});
 const r=evaluateB143SideFrame(a.design,a.c140,a.c141,a.volume,0);
 assert.equal(r.clearSideOptions,1);
 assert.equal(r.suggestedSide,'RIGHT');
 assert(r.choices[0].violations.some(x=>x.code==='BLOCKS_TWO_WIDE_LOWER_GALLERY'));
});
test('both sides blocked stays HOLD, no invented architecture',()=>{
 const a=fixture({blockBoth:true});
 const r=evaluateB143SideFrame(a.design,a.c140,a.c141,a.volume,0);
 assert.equal(r.clearSideOptions,0);
 assert.match(r.status,/^HOLD_/);
});
test('reject foreign source and forged certification',()=>{
 const a=fixture();
 a.c140.id='WRONG';
 assert.throws(()=>evaluateB143SideFrame(a.design,a.c140,a.c141,a.volume,0),/SOURCE_ID_OR_GUARD/);
 assert.equal(verifyB143({integritySha256:'forged'}),false);
});
