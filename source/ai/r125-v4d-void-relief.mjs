/**
 * V4D opt-in second AUTHOR proposal. Keeps the first V4D result and its hashes
 * frozen; adds a source-authored full-depth open-air public transect and a
 * stepped NON-RECTANGULAR perimeter. NOT a new real LLM design or a build plan.
 */
import {createHash} from 'node:crypto';
import {validateSculptedSpineV4D,compileSculptedSpineV4D}
 from './r125-sculpted-spine-v4d.mjs';
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const V4D_RELIEF_SCHEMA='minecraftaibuilder-r125-v4d-void-relief-v1';
const fail=s=>{throw Error('R125_V4D_RELIEF_'+s)};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===keys.slice().sort().join('|');
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const prose=s=>typeof s==='string'&&s.length>=3&&s.length<=100&&
 !/[\u0000-\u001f<>]/.test(s);
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const endX=b=>b.x+b.width-1;
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});

export function validateV4DVoidRelief(input){
 if(!exact(input,['schema','id','base','publicVoid','edgeRelief'])||
  input.schema!==V4D_RELIEF_SCHEMA||!slug(input.id))
  fail('TOP_LEVEL');
 validateSculptedSpineV4D(input.base);
 const bands=input.base.bands,voidIR=input.publicVoid,edge=input.edgeRelief;
 if(!exact(voidIR,['bandId','offsetZ','spanZ','purpose'])||
  !prose(voidIR.purpose)||!integer(voidIR.offsetZ,3,20)||
  !integer(voidIR.spanZ,6,12))fail('PUBLIC_VOID');
 const vb=bands.find(b=>b.id===voidIR.bandId);
 if(!vb||vb.roofY<12||voidIR.offsetZ+voidIR.spanZ>vb.depth-3)
  fail('VOID_BAND_BOUNDS');
 if(!exact(edge,['bandId','side','offsetZ','insets','purpose'])||
  !prose(edge.purpose)||!['west','east'].includes(edge.side)||
  !integer(edge.offsetZ,2,24)||!Array.isArray(edge.insets)||
  edge.insets.length<10||edge.insets.length>20||
  edge.insets.some(d=>!integer(d,0,8))||
  edge.insets[0]!==0||edge.insets.at(-1)!==0||
  Math.max(...edge.insets)<4||
  edge.insets.some((d,i)=>i&&Math.abs(d-edge.insets[i-1])>1))
  fail('EDGE_PROFILE');
 const eb=bands.find(b=>b.id===edge.bandId);
 if(!eb||eb.id===vb.id||
  edge.offsetZ+edge.insets.length>eb.depth-2||
  eb.width-Math.max(...edge.insets)<12)
  fail('EDGE_BAND_BOUNDS');
 // Do not delete existing real glazing, the public loggia or an authored join.
 const g=input.base.glazing,l=input.base.loggia;
 if(edge.bandId===g.bandId&&edge.side===g.side||
  edge.bandId===l.bandId&&edge.side===l.side)
  fail('EDGE_ORIGINAL_OPENING_COLLISION');
 if(voidIR.bandId===g.bandId&&
  !(voidIR.offsetZ+voidIR.spanZ<=g.offsetZ||
    g.offsetZ+g.length<=voidIR.offsetZ))
  fail('VOID_ORIGINAL_GLAZING_COLLISION');
 return {vb,eb};
}

export function compileV4DVoidRelief(input){
 const plan=structuredClone(input),{vb,eb}=validateV4DVoidRelief(plan);
 const base=compileSculptedSpineV4D(plan.base);
 const voidIR=plan.publicVoid,edge=plan.edgeRelief;
 // Full-width transverse public void through the actual facade AND roof.
 // Keep the real Y=1 floor; no fake colored picture of an empty courtyard.
 const els=base.design.elements.map(e=>structuredClone(e));
 els.push(box('v4d-open-air-public-transect','cut',
  [vb.x,2,vb.z+voidIR.offsetZ],
  [vb.width,vb.roofY-1,voidIR.spanZ]));
 const e=endX(eb),roofY=eb.roofY;
 // Shape the physical footprint/roof edge, not just a differently colored wall.
 // All CUTs precede new walls/caps: deterministic B143 ADD/CUT order.
 for(const [i,d] of edge.insets.entries()){
  if(!d)continue;
  const z=eb.z+edge.offsetZ+i;
  const x=edge.side==='east'?e-d+1:eb.x;
  els.push(box('v4d-edge-cut-'+i,'cut',[x,1,z],[d,roofY,1]));
 }
 for(const [i,d] of edge.insets.entries()){
  if(!d)continue;
  const z=eb.z+edge.offsetZ+i;
  const wallX=edge.side==='east'?e-d:eb.x+d;
  els.push(box('v4d-inset-wall-'+i,'add',
   [wallX,2,z],[1,roofY-2,1],plan.base.materials.wall));
 }
 // Caps close the steps between adjacent authored setbacks; do not silently
 // smooth, move, or invent a different outer profile.
 for(let i=1;i<edge.insets.length;i++){
  const a=edge.insets[i-1],b=edge.insets[i];
  if(a===b)continue;
  const z=eb.z+edge.offsetZ+(b>a?i:i-1);
  const left=edge.side==='east'?e-Math.max(a,b):eb.x+Math.min(a,b);
  els.push(box('v4d-edge-cap-'+i,'add',
   [left,2,z],[Math.abs(a-b)+1,roofY-2,1],plan.base.materials.wall));
 }
 if(els.length>160)fail('B143_ELEMENT_BUDGET');
 const design={...base.design,id:plan.id,elements:els};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('COMPILED_DRIFT');
 const map=new Map(compiled.primitives.map(p=>[key(p[0],p[1],p[2]),p[3]]));
 const has=(x,y,z)=>map.has(key(x,y,z));
 const glass=MATERIALS.indexOf('glass');
 const actualGlass=compiled.primitives.filter(p=>p[3]===glass).length;
 if(actualGlass<12)fail('ORIGINAL_GLAZING_LOST');
 // Verify the negative space from the LAST B143 voxel, not the sketch or IR:
 // a roofless, floor-supported, two-wide transect reaching both lateral edges.
 let openSkyPads=0;
 for(let z=vb.z+voidIR.offsetZ;z<vb.z+voidIR.offsetZ+voidIR.spanZ;z++){
  for(let x=vb.x;x<=endX(vb);x++){
   if(!has(x,1,z))fail('PUBLIC_VOID_FLOOR_MISSING');
   for(let y=2;y<=vb.roofY;y++)if(has(x,y,z))
    fail('PUBLIC_VOID_NOT_OPEN_TO_SKY');
   if(x<endX(vb))openSkyPads++;
  }
 }
 let removedFootprint=0,edgeBends=0;
 for(const [i,d] of edge.insets.entries()){
  const z=eb.z+edge.offsetZ+i;
  const wallX=edge.side==='east'?e-d:eb.x+d;
  for(let y=2;y<roofY;y++)if(!has(wallX,y,z))
   fail('INSET_WALL_GAP');
  for(let q=0;q<d;q++){
   const x=edge.side==='east'?e-q:eb.x+q;
   if(has(x,1,z)||has(x,roofY,z))fail('INSET_NOT_REAL');
   removedFootprint++;
  }
  if(i&&d!==edge.insets[i-1])edgeBends++;
 }
 if(removedFootprint<30||edgeBends<8||openSkyPads<180)
  fail('NONRECTANGULAR_PUBLIC_SPACE_INSUFFICIENT');
 const program=structuredClone(base.program);
 const evidence={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 const routes=auditR125SourceRoutes(evidence);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==plan.base.bands.length+1||
  routes.zones.some(z=>!z.reachedFromEntrance))
  fail('TWO_WIDE_ROUTE_HOLD');
 if(compiled.geometrySha256===base.geometrySha256)
  fail('NO_GEOMETRIC_CHANGE');
 return {
  schema:'r125-v4d-void-relief-authored-source-result-v1',
  authorIR:plan,originalPlanSha256:sha(plan),
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  baselineGeometrySha256:base.geometrySha256,
  design,compiled,program,sourceRoutes:routes,
  sourceProof:{
   trueOpenAirTransectFloorPads:openSkyPads,
   authorSpecifiedVoidSpanZ:voidIR.spanZ,
   removedPerimeterFootprintVoxels:removedFootprint,
   nonRectangularEdgeBends:edgeBends,
   authoredEdgeProfile:edge.insets,
   survivingRealGlassVoxels:actualGlass,
   allZonesReachableBySource:true,
   exteriorGroundAndStructuralSafety:'NOT_TESTED'
  },
  provenance:'SYNTHETIC_AUTHOR_SUPPLIED_NOT_REAL_QWEN',
  authorIsRealModel:'NOT_ATTESTED',
  architecturalArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0
 };
}
