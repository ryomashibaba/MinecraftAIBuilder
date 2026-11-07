/**
 * R125 experimental architectural envelope v2 — whole-building source geometry.
 * Existing v1 model plans and real-world successes remain immutable.
 * A separate architecture author (future real Qwen, or explicit test double)
 * MUST author all roof profiles; HOST may not infer profiles from genre names.
 * Real B143 voxels, connected headroom, watertight voxel boundaries, routes.
 * Absolutely NO Minecraft world writes or construction permissions.
 */
import {createHash} from 'node:crypto';
import {compileSpatialComposition} from './r125-spatial-composition.mjs';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const ENVELOPE_SCHEMA='minecraftaibuilder-r125-author-envelope-v2';
const fail=s=>{throw Error('R125_ENVELOPE_'+s)};
const shape=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const exact=(o,ks)=>shape(o)&&
 Object.keys(o).sort().join('|')===ks.slice().sort().join('|');
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const endX=r=>r.x+r.width-1;
const endZ=r=>r.z+r.depth-1;
const K=(x,y,z)=>x+','+y+','+z;

export function validateEnvelopeIntent(originalPlan,intent){
 if(!exact(intent,['schema','planId','roofs'])||
   intent.schema!==ENVELOPE_SCHEMA||
   intent.planId!==originalPlan?.id||
   !Array.isArray(originalPlan?.rooms)||
   !Array.isArray(intent.roofs)||
   intent.roofs.length!==originalPlan.rooms.length)fail('CONTRACT');
 const ids=new Set(originalPlan.rooms.map(r=>r.id)),seen=new Set();
 for(const r of intent.roofs){
  if(!exact(r,['roomId','form','axis','rise'])||
   !ids.has(r.roomId)||seen.has(r.roomId)||
   !['shed','ridge'].includes(r.form)||
   !['x','z'].includes(r.axis)||
   !Number.isSafeInteger(r.rise)||r.rise<1||r.rise>3)
   fail('ROOF_INTENT');
  seen.add(r.roomId);
 }
 return true;
}
function profile(form,len,rise){
 const heights=[];
 for(let i=0;i<len;i++){
  const t=i/(len-1);
  heights.push(form==='shed'?Math.round(rise*t):
   Math.round(rise*(1-Math.abs(2*t-1))));
 }
 if(Math.max(...heights)<1)fail('PROFILE_NO_RISE');
 return heights;
}
function runs(heights){
 const groups=[];
 for(let start=0;start<heights.length;){
  let stop=start+1;
  while(stop<heights.length&&heights[stop]===heights[start])stop++;
  groups.push({start,len:stop-start,extra:heights[start]});
  start=stop;
 }
 return groups;
}
export function buildEnvelopeElements(rooms,intent,material){
 if(!Array.isArray(rooms)||!material)fail('HOST_INPUT');
 const roofById=new Map(intent.roofs.map(r=>[r.roomId,r]));
 const elements=[],diagnostics=[];
 const add=(id,origin,size,mat)=>elements.push({
  id,shape:'box',mode:'add',material:mat,origin,size});
 for(const [i,r] of rooms.entries()){
  const authored=roofById.get(r.id);
  if(!authored)fail('MISSING_ROOM_INTENT');
  const alongX=authored.axis==='x';
  const length=alongX?r.width:r.depth;
  const hs=profile(authored.form,length,authored.rise);
  const grouped=runs(hs);
  const prefix='mass-'+i;
  const b=r.roofY;
  for(const [g,part] of grouped.entries()){
   const {start,len,extra}=part;
   if(alongX){
    add(prefix+'-skin-'+g,[r.x+start,b+extra,r.z],
     [len,1,r.depth],material.roof);
    if(extra>0){
     add(prefix+'-north-'+g,[r.x+start,b,r.z],[len,extra,1],material.wall);
     add(prefix+'-south-'+g,[r.x+start,b,endZ(r)],[len,extra,1],material.wall);
    }
   }else{
    add(prefix+'-skin-'+g,[r.x,b+extra,r.z+start],
     [r.width,1,len],material.roof);
    if(extra>0){
     add(prefix+'-west-'+g,[r.x,b,r.z+start],[1,extra,len],material.wall);
     add(prefix+'-east-'+g,[endX(r),b,r.z+start],[1,extra,len],material.wall);
    }
   }
  }
  // Seal the two perpendicular end walls from the old wall top up to the
  // new, honestly raised roof. They are wall infills, not false roof decor.
  if(hs[0]>0)add(prefix+'-end0',
    alongX?[r.x,b,r.z+1]:[r.x+1,b,r.z],
    alongX?[1,hs[0],r.depth-2]:[r.width-2,hs[0],1],material.wall);
  if(hs[length-1]>0)add(prefix+'-end1',
    alongX?[endX(r),b,r.z+1]:[r.x+1,b,endZ(r)],
    alongX?[1,hs[length-1],r.depth-2]:[r.width-2,hs[length-1],1],material.wall);
  // Close ALL vertical seams where roof strips have different elevations.
  // These never touch the 2..4-block-high doorway or ordinary standing pads.
  for(let j=1;j<hs.length;j++){
   const previous=hs[j-1],now=hs[j];
   if(previous===now)continue;
   const higherIndex=now>previous?j:j-1;
   const extraY=b+Math.min(previous,now)+1;
   const diff=Math.abs(now-previous);
   add(prefix+'-riser-'+j,
    alongX?[r.x+higherIndex,extraY,r.z+1]:
           [r.x+1,extraY,r.z+higherIndex],
    alongX?[1,diff,r.depth-2]:[r.width-2,diff,1],material.wall);
  }
  diagnostics.push({roomId:r.id,form:authored.form,axis:authored.axis,
   rise:authored.rise,stripHeights:hs,distinctRoofLevels:new Set(hs).size,
   oldRoofY:b,highestRoofY:b+Math.max(...hs),
   surfaceGroups:grouped.length});
 }
 return {elements,diagnostics};
}
function inspectActualRoofAir(before,after,rooms,roofs){
 const beforeSet=new Set(before.compiled.primitives.map(p=>K(p[0],p[1],p[2])));
 const afterSet=new Set(after.primitives.map(p=>K(p[0],p[1],p[2])));
 const checks=[];
 for(const room of rooms){
  const author=roofs.find(r=>r.roomId===room.id);
  const length=author.axis==='x'?room.width:room.depth;
  const h=profile(author.form,length,author.rise);
  let raisedAirCells=0,raisedAirPads=0,sealedEnvelopeCells=0;
  // A 2x2 unobstructed air pad above the OLD roof and connected to the
  // originally walkable lower room is a meaningful increase in headroom.
  for(let x=room.x+1;x<endX(room);x++)
   for(let z=room.z+1;z<endZ(room);z++){
    const k=K(x,room.roofY,z);
    if(beforeSet.has(k)&&!afterSet.has(k))raisedAirCells++;
   }
  for(let x=room.x+1;x<endX(room)-1;x++)
   for(let z=room.z+1;z<endZ(room)-1;z++){
    const cells=[[x,z],[x+1,z],[x,z+1],[x+1,z+1]];
    if(cells.every(([px,pz])=>
     beforeSet.has(K(px,room.roofY,pz))&&
     !afterSet.has(K(px,room.roofY,pz))&&
     !afterSet.has(K(px,room.roofY-1,pz))))raisedAirPads++;
   }
  // The real roof material and all exposed perimeter supports MUST be
  // present at each authored strip. A gap fails instead of silently healing.
  for(let j=0;j<length;j++){
   const y=room.roofY+h[j];
   for(let k=0;k<(author.axis==='x'?room.depth:room.width);k++){
    const x=author.axis==='x'?room.x+j:room.x+k;
    const z=author.axis==='x'?room.z+k:room.z+j;
    if(!afterSet.has(K(x,y,z)))fail('ROOF_SKIN_GAP_'+room.id);
    sealedEnvelopeCells++;
   }
   for(const side of [0,(author.axis==='x'?room.depth:room.width)-1])
    for(let yFill=room.roofY;yFill<y;yFill++){
     const x=author.axis==='x'?room.x+j:room.x+side;
     const z=author.axis==='x'?room.z+side:room.z+j;
     if(!afterSet.has(K(x,yFill,z)))fail('EAVE_PERIMETER_GAP_'+room.id);
    }
  }
  if(raisedAirCells<4||raisedAirPads<1)fail('NO_USABLE_RAISED_AIR_'+room.id);
  checks.push({roomId:room.id,raisedAirCells,raisedTwoWidePads:raisedAirPads,
   verifiedSkinCells:sealedEnvelopeCells,voxelSource:'REAL_FINAL_B143',
   roofWaterproofInRealMinecraft:'NOT_TESTED'});
 }
 return checks;
}
export function compileExpressiveEnvelopeV2({originalPlan,intent}={}){
 validateEnvelopeIntent(originalPlan,intent);
 // The ORIGINAL v1 plan, geometry, source SHA and record are never edited.
 const before=compileSpatialComposition(originalPlan);
 const rooms=before.layout.rooms;
 const authored=buildEnvelopeElements(rooms,intent,originalPlan.materials);
 const fixedElements=before.design.elements.filter(e=>!/^space-\d+-roof$/.test(e.id));
 if(fixedElements.length!==before.design.elements.length-rooms.length)
  fail('LEGACY_ROOF_COUNT');
 const elements=[...fixedElements,...authored.elements];
 if(elements.length>160)fail('B143_ELEMENT_BUDGET');
 const height=Math.max(before.design.bounds.height,
  ...authored.diagnostics.map(x=>x.highestRoofY+3));
 const design={...before.design,bounds:{...before.design.bounds,height},
  elements};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('SOURCE_MISMATCH');
 if(compiled.geometrySha256===before.geometrySha256)fail('NO_EXTERNAL_MASSING_CHANGE');
 const resultForRoutes={...before,design,compiled,
  geometrySha256:compiled.geometrySha256,sourceSha256:compiled.sourceSha256};
 const routes=auditR125SourceRoutes(resultForRoutes);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    routes.zones.length!==rooms.length||
    routes.zones.some(z=>!z.reachedFromEntrance))
  fail('REAL_B143_CIRCULATION_HOLD');
 const air=inspectActualRoofAir(before,compiled,rooms,intent.roofs);
 return {schema:'r125-expressive-envelope-study-v1',
  originalPlanSha256:sha(originalPlan),intentSha256:sha(intent),
  originalGeometrySha256:before.geometrySha256,
  originalSourceSha256:before.sourceSha256,
  geometrySha256:compiled.geometrySha256,sourceSha256:compiled.sourceSha256,
  originalPlan,authoredEnvelopeIntent:intent,design,compiled,
  sourceRoutes:routes,
  massing:{rooms:authored.diagnostics,headroom:air,
   allRoomsTrueRaisedTwoWideAir:air.every(a=>a.raisedTwoWidePads>0)},
  authorship:'ROOF_INTENT_SUPPLIED_EXTERNALLY_NOT_AUTOMATICALLY_QWEN_VERIFIED',
  architecturalArt:'NOT_REVIEWED',inGameWalking:'NOT_TESTED',
  constructionApproved:false,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED')};
}
