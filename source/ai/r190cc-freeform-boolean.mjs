/** R190-CC: true 3D rotated implicit author brushes, NO stacked contours.
 * The built outline is the boundary of the authored union MINUS authored voids.
 * Floor strata and previously author-defined route are explicit design requirements.
 * Study-only. No model, no world, no inference of missing stairs, no template fallback.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-r190cc-freeform-3d-boolean-architecture-v1';
export const CB_SHA='041ac8905c697cb3eb347f8af3300d1ab470657edb8c841944eafdab7e8df353';
const H=v=>createHash('sha256').update(v).digest('hex');
const ok=(v,n)=>{if(!v)throw Error('R190CC_'+n)};
const fields=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===k.length&&k.every(p=>Object.hasOwn(x,p));
const integer=(x,lo,hi)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
function validateBrush(b,sz){
 ok(fields(b,['id','center','radii','rotate','power','material']),'BRUSH_FIELDS');
 ok(typeof b.id==='string'&&/^[a-z][a-z0-9-]{2,48}$/.test(b.id),'BRUSH_ID');
 ok(Array.isArray(b.center)&&b.center.length===3&&
  b.center.every((q,i)=>integer(q,0,sz[i]-1)),'BRUSH_CENTER');
 ok(Array.isArray(b.radii)&&b.radii.length===3&&
  b.radii.every(v=>integer(v,4,68)),'BRUSH_RADII');
 ok(Array.isArray(b.rotate)&&b.rotate.length===3&&
  b.rotate.every(v=>integer(v,-65,65)),'BRUSH_ROTATION');
 ok(typeof b.power==='number'&&b.power>=2&&b.power<=5,'BRUSH_POWER');
 ok(integer(b.material,0,6),'BRUSH_MATERIAL');
}
export function validateR190CC(p){
 ok(fields(p,['schema','id','title','originalBriefSha256','bounds','designIntent',
  'solids','cuts','shellThickness','floorYs','floorMaterial','protectedVoids',
  'routeRef','designOnly']),'SOURCE_FIELDS');
 ok(p.schema===SCHEMA&&p.designOnly===true,'SCHEMA');
 ok(typeof p.id==='string'&&/^[a-z][a-z0-9-]{3,50}$/.test(p.id)&&
  typeof p.title==='string'&&p.title.length>=8&&p.title.length<140,'ID');
 ok(/^[a-f0-9]{64}$/.test(p.originalBriefSha256),'BRIEF_HASH');
 ok(fields(p.bounds,['width','height','depth']),'BOUNDS_FIELDS');
 const {width:w,height:h,depth:d}=p.bounds;
 ok(integer(w,56,128)&&integer(h,60,128)&&integer(d,40,96)&&w*h*d<=850000,'BOUNDS');
 ok(fields(p.designIntent,['spatialExperience','silhouette','failureToAvoid'])&&
  Object.values(p.designIntent).every(s=>typeof s==='string'&&s.length>=35&&s.length<=550),
  'AUTHORSHIP_INTENT');
 ok(Array.isArray(p.solids)&&p.solids.length>=3&&p.solids.length<=12,'SOLID_COUNT');
 ok(Array.isArray(p.cuts)&&p.cuts.length>=3&&p.cuts.length<=12,'CUT_COUNT');
 const seen=new Set();
 for(const q of [...p.solids,...p.cuts]){
  validateBrush(q,[w,h,d]);ok(!seen.has(q.id),'BRUSH_DUPLICATE');seen.add(q.id);
 }
 ok(integer(p.shellThickness,1,4)&&integer(p.floorMaterial,0,6),'SHELL_FLOOR');
 ok(Array.isArray(p.floorYs)&&p.floorYs.length>=6&&p.floorYs.length<=26&&
  p.floorYs.every(y=>integer(y,3,h-4))&&new Set(p.floorYs).size===p.floorYs.length,'FLOOR_LEVELS');
 ok(Array.isArray(p.protectedVoids)&&p.protectedVoids.length>=2&&p.protectedVoids.length<=9,'VOIDS');
 for(const v of p.protectedVoids){
  ok(fields(v,['id','origin','size']),'VOID_FIELDS');
  ok(typeof v.id==='string'&&/^[a-z0-9-]{3,45}$/.test(v.id)&&!seen.has(v.id),
   'VOID_ID');seen.add(v.id);
  ok(Array.isArray(v.origin)&&v.origin.length===3&&Array.isArray(v.size)&&v.size.length===3&&
  v.origin.every((n,i)=>integer(n,0,[w,h,d][i]-1))&&
  v.size.every((n,i)=>integer(n,2,[w,h,d][i]-v.origin[i])),'VOID_BOUNDS');
 }
 ok(fields(p.routeRef,['originalRawSha256','source','contract'])&&
  p.routeRef.originalRawSha256===CB_SHA&&
  p.routeRef.source==='evidence/r190cb/RIFT_LANTERN.json'&&
  p.routeRef.contract==='PRESERVE_AUTHOR_NODES_NO_AUTOMATIC_ROUTE_GENERATION','ROUTE_PROVENANCE');
 return true;
}
function within(q,x,y,z){
 const yaw=q.rotate[0]*Math.PI/180,pitch=q.rotate[1]*Math.PI/180,
   roll=q.rotate[2]*Math.PI/180;
 let a=x-q.center[0],b=y-q.center[1],c=z-q.center[2];
 const rollX=a*Math.cos(roll)+b*Math.sin(roll),rollY=-a*Math.sin(roll)+b*Math.cos(roll);
 a=rollX;b=rollY;
 const pitchY=b*Math.cos(pitch)+c*Math.sin(pitch),pitchZ=-b*Math.sin(pitch)+c*Math.cos(pitch);
 b=pitchY;c=pitchZ;
 const yawX=a*Math.cos(yaw)-c*Math.sin(yaw),yawZ=a*Math.sin(yaw)+c*Math.cos(yaw);
 a=yawX;c=yawZ;
 return (Math.abs(a/q.radii[0])**q.power+
         Math.abs(b/q.radii[1])**q.power+
         Math.abs(c/q.radii[2])**q.power)<=1;
}
const inside=(x,z,poly)=>{
 let v=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])v=!v;
 }return v;
};
export function compileR190CC(raw,routeRaw){
 const bytes=typeof raw==='string'?Buffer.from(raw,'utf8'):raw;
 ok(bytes instanceof Uint8Array&&bytes.length>450&&bytes.length<100000,'RAW');
 let p,route;
 try{p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  route=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(routeRaw))}
 catch{throw Error('R190CC_INVALID_JSON')}
 validateR190CC(p);
 ok(H(routeRaw)===CB_SHA&&route.originalBriefSha256===p.originalBriefSha256,
  'FROZEN_ROUTE_OR_BRIEF_CHANGED');
 ok(JSON.stringify(route.architecture.bounds)===JSON.stringify(p.bounds),'BOUND_MISMATCH');
 const {width:w,height:h,depth:d}=p.bounds,wh=w*d,sz=w*h*d;
 const mask=new Uint8Array(sz),mats=new Int8Array(sz).fill(-1);
 const ix=(x,y,z)=>(y*d+z)*w+x;
 let initial=0,deleted=0;
 // True 3D occupancy evaluated against all three coordinates simultaneously.
 for(let y=1;y<h-1;y++)for(let z=1;z<d-1;z++)for(let x=1;x<w-1;x++){
  const index=ix(x,y,z);
  for(const solid of p.solids)if(within(solid,x+.5,y+.5,z+.5)){
   mask[index]=1;mats[index]=solid.material;break;
  }
  if(!mask[index])continue;
  initial++;
  if(p.cuts.some(voidBrush=>within(voidBrush,x+.5,y+.5,z+.5))){
   mask[index]=0;mats[index]=-1;deleted++;
  }
 }
 ok(initial>=16000&&deleted>=800,'SOURCE_VOLUME_TOO_SMALL');
 const voxels=new Map();
 const range=p.shellThickness;
 const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 let faces=0,floors=0;
 for(let y=1;y<h-1;y++)for(let z=1;z<d-1;z++)for(let x=1;x<w-1;x++){
  const k=ix(x,y,z);if(!mask[k])continue;
  let exposed=false;
  for(const [a,b,c] of dirs){if(exposed)break;
   for(let radius=1;radius<=range;radius++){
    const xx=x+a*radius,yy=y+b*radius,zz=z+c*radius;
    if(xx<0||xx>=w||yy<0||yy>=h||zz<0||zz>=d||!mask[ix(xx,yy,zz)]){
     exposed=true;break;
    }
   }
  }
  if(exposed){voxels.set(k,mats[k]);faces++;}
  // Preserve exterior skin; never paint every visible sixth-height row as a stripe.
  if(!exposed&&p.floorYs.includes(y)){voxels.set(k,p.floorMaterial);floors++;}
 }
 ok(voxels.size>=7500&&voxels.size<230000,'SHELL_SIZE');
 const nodes=route.circulation.nodes;
 ok(Array.isArray(nodes)&&nodes.length===267,'ROUTE_NODES');
 const support=new Set(),air=new Set();
 for(const [x,y,z] of nodes){
  ok(integer(x,1,w-3)&&integer(y,3,h-4)&&integer(z,1,d-3),'ROUTE_OUT_OF_BOUNDS');
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   support.add(ix(x+dx,y-1,z+dz));
   for(let dy=0;dy<3;dy++)air.add(ix(x+dx,y+dy,z+dz));
  }
 }
 for(const k of support)ok(!air.has(k),'ROUTE_SELF_CONFLICT');
 let carvedForRoute=0;
 for(const k of air){if(voxels.delete(k))carvedForRoute++;}
 for(const k of support)voxels.set(k,0);
 const protectedVoidResults=p.protectedVoids.map(v=>{
  let occupied=0,checked=0;
  for(let y=v.origin[1];y<v.origin[1]+v.size[1];y++)
   for(let z=v.origin[2];z<v.origin[2]+v.size[2];z++)
    for(let x=v.origin[0];x<v.origin[0]+v.size[0];x++){
     checked++;if(voxels.has(ix(x,y,z)))occupied++;
    }
  return {id:v.id,checked,occupied,pass:occupied===0};
 });
 ok(protectedVoidResults.every(v=>v.pass),'PROTECTED_VOID_OCCUPIED');
 const programMetrics=route.architecture.programs.map(q=>{
  let target=0,clear=0,unsupported=0,blocked=0;
  const box=q.polygon,loX=Math.floor(Math.min(...box.map(v=>v[0]))),
   hiX=Math.ceil(Math.max(...box.map(v=>v[0]))),
   loZ=Math.floor(Math.min(...box.map(v=>v[1]))),
   hiZ=Math.ceil(Math.max(...box.map(v=>v[1])));
  for(let x=loX;x<=hiX;x++)for(let z=loZ;z<=hiZ;z++){
   if(!inside(x+.5,z+.5,box))continue;target++;
   if(!voxels.has(ix(x,q.floorY,z))){unsupported++;continue;}
   if([1,2,3].some(dy=>voxels.has(ix(x,q.floorY+dy,z)))){blocked++;continue;}
   clear++;
  }
  return {id:q.id,floorY:q.floorY,requested:target,supportedClear:clear,
   floorAbsent:unsupported,headBlocked:blocked,
   supportedClearFraction:target?Number((clear/target).toFixed(4)):0};
 });
 const primitives=[...voxels].sort(([a],[b])=>a-b).map(([k,mat])=>{
  const x=k%w,z=Math.floor(k/w)%d,y=Math.floor(k/wh);
  return [x,y,z,mat,Math.floor(y/5)];
 });
 const routeProof=nodes.map(([x,y,z])=>{
  let supportGood=true,airGood=true;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   supportGood&&=voxels.has(ix(x+dx,y-1,z+dz));
   for(let i=0;i<3;i++)airGood&&=!voxels.has(ix(x+dx,y+i,z+dz));
  }return supportGood&&airGood;
 });
 ok(routeProof.every(Boolean),'ROUTE_FINAL_VOXEL_INVALID');
 return {
  schema:'minecraftaibuilder-r190cc-true-3d-implicit-voxel-study-v1',
  author:'CHAT_GPT_6_AUTHOR_SPECIFIED_BOOLEAN_3D_NOT_MODEL_OUTPUT',
  originalRawSha256:H(bytes),originalRouteSha256:H(routeRaw),
  geometrySha256:H(JSON.stringify(primitives)),bounds:p.bounds,
  materialNames:['stone','concrete','metal','glass','wood','glow','accent'],primitives,
  metrics:{initialOccupied3d:initial,removedByTrue3dCuts:deleted,
   surfaceCandidateFaces:faces,authoredFloorCandidates:floors,
   corridorCellsCleared:carvedForRoute,authoredRouteNodes:nodes.length,
   supportedRouteNodes:routeProof.filter(Boolean).length,
   finalVoxelCount:primitives.length,protectedVoidResults,programMetrics},
  designOnly:true,readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
  networkRequests:0,modelCalls:0,officialArtAdoptions:0,
  artGate:'ART_HOLD_REAL_EIGHT_VIEWS_REQUIRED',
  functionGate:'HOLD_VISUAL_AND_WALKABILITY_NOT_CERTIFIED',
  realMinecraftWalking:'NOT_TESTED',structuralGate:'NOT_TESTED'
 };
}
