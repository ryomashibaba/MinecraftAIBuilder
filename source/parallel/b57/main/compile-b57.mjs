/** B57: independent LOCAL-ONLY envelope consistency compiler.
 * No production code import, no Minecraft protocol, no block placement, no exportable build plans.
 */
import {createHash} from 'node:crypto';
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail=s=>{throw new Error('B57_'+s)};
const roles=new Set(['WINDOW_VISUAL_ONLY','FIN_GRAPHIC_ONLY','UNASSIGNED_FACADE_EDGE']);
const faces=new Set(['N','S','E','W']);
const safe=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
function validateHash(r){if(!r||typeof r!=='object')fail('SOURCE');const {reportSha256,...body}=r;if(reportSha256!==hash(body))fail('SOURCE_HASH');}
function raster(rects,w,d,want){
 if(!Array.isArray(rects))fail('RECTANGLES');const mask=new Uint8Array(w*d);let count=0;
 for(const r of rects){if(!r||![r.x,r.z,r.width,r.depth].every(n=>safe(n,64))||!r.width||!r.depth||r.x+r.width>w||r.z+r.depth>d)fail('BAD_RECTANGLE');
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   const k=z*w+x;if(mask[k])fail('RECTANGLE_OVERLAP');mask[k]=1;count++;
  }
 }
 if(count!==want)fail('RECTANGLE_COVERAGE');return mask;
}
function components(mask,w,d){
 const seen=new Uint8Array(mask.length);let groups=0;const stack=[];
 for(let i=0;i<mask.length;i++)if(mask[i]&&!seen[i]){
  groups++;seen[i]=1;stack.push(i);
  while(stack.length){const a=stack.pop(),x=a%w,z=Math.floor(a/w);
   for(const [xx,zz] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]])if(xx>=0&&xx<w&&zz>=0&&zz<d){const n=zz*w+xx;if(mask[n]&&!seen[n]){seen[n]=1;stack.push(n);}}
  }
 }
 return groups;
}
function outsideEmpty(mask,w,d){
 const W=w+2,D=d+2,seen=new Uint8Array(W*D),q=[0];seen[0]=1;
 for(let i=0;i<q.length;i++){let a=q[i],x=a%W,z=Math.floor(a/W);
  for(const [xx,zz] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]])if(xx>=0&&xx<W&&zz>=0&&zz<D){const n=zz*W+xx;
   if(seen[n])continue;
   if(xx>0&&xx<=w&&zz>0&&zz<=d&&mask[(zz-1)*w+xx-1])continue;
   seen[n]=1;q.push(n);
  }
 }
 return (x,z)=>x<0||z<0||x>=w||z>=d||Boolean(seen[(z+1)*W+x+1]);
}
function boundary(mask,w,d){
 const out=new Map(),outside=outsideEmpty(mask,w,d);
 for(let z=0;z<d;z++)for(let x=0;x<w;x++)if(mask[z*w+x]){
  for(const [face,fixed,t,nx,nz] of [['N',z,x,x,z-1],['S',z+1,x,x,z+1],['E',x+1,z,x+1,z],['W',x,z,x-1,z]]){
   if(nx>=0&&nx<w&&nz>=0&&nz<d&&mask[nz*w+nx])continue;
   const k=`${face}/${fixed}/${t}`;
   out.set(k,{face,fixed,t,edgeClass:outside(nx,nz)?'OUTER_FOOTPRINT_EDGE':'ENCLOSED_VOID_EDGE',x,z});
  }
 }
 return out;
}
function countBy(a,k){return a.reduce((o,x)=>{o[x[k]]=(o[x[k]]||0)+1;return o;},{});}
export function compileB57(b53,b56){
 validateHash(b53);validateHash(b56);
 if(b53.schema!=='minecraftaibuilder-b53-offline-visual-comparison-v1'||
  b56.schema!=='minecraftaibuilder-b56-bounded-archive-source-admission-v1'||
  b53.readiness!=='NOT_PREPARED'||b56.safety?.readiness!=='NOT_PREPARED'||
  b53.executionAllowed!==false||b56.safety?.executionAllowed!==false||
  b53.BuildPlan?.operations?.length!==0||b56.safety?.BuildPlan?.operations?.length!==0||
  b53.blockers?.M4Gates?.length!==9||b56.blockers?.M4Gates?.length!==9||
  b53.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||b56.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
  b56.productionParity!=='UNVERIFIED'||b53.buildings?.length!==5)fail('UPSTREAM_SAFETY');
 const buildings=[];let floorCells=0,roofCells=0,edges=0,missing=0,extra=0,courtyard=0,roofMismatch=0;
 for(const b of b53.buildings){
  const w=b.localSite?.width,d=b.localSite?.depth;
  if(!safe(w,48)||!safe(d,40)||w<1||d<1||b.floorPlans?.length!==6||b.variants?.length!==3)fail('SITE');
  const floor=b.floorPlans.map((f,i)=>{if(f.level!==i+1)return fail('LEVEL');return raster(f.floor,w,d,f.floorCells);});
  const roof=b.floorPlans.map(f=>raster(f.roof,w,d,f.roofCells));
  const levels=[],preview=[];let buildingEdges=0,buildingRoof=0,buildingFloor=0,buildingMissing=0,buildingExtra=0,buildingVoids=0;
  for(let li=0;li<6;li++){
   const mask=floor[li],r=roof[li],next=floor[li+1]||new Uint8Array(w*d);
   let mismatches=0,exposed=0,unsupported=0,overlap=0;
   for(let k=0;k<mask.length;k++){
    if(r[k]!==Number(Boolean(mask[k]&&!next[k])))mismatches++;
    if(li&&mask[k]&&!floor[li-1][k])unsupported++;
    if(li&&mask[k]&&floor[li-1][k])overlap++;
    if(r[k])exposed++;
   }
   if(mismatches)fail('ROOF_PROJECTION');
   const expected=boundary(mask,w,d),found=new Map();
   for(const strip of b.facade.strips){
    if(!faces.has(strip.face)||!safe(strip.fixed,64)||!Array.isArray(strip.columns))fail('FACADE_STRIP');
    for(const col of strip.columns){
     if(!safe(col.localT,64)||col.original?.length!==6||col.overlay?.length!==6||col.edgeClasses?.length!==6)fail('FACADE_COLUMN');
     const role=col.original[li],overlay=col.overlay[li],cls=col.edgeClasses[li];
     if(role===null){if(overlay!==null||cls!==null)fail('NULL_FACADE_DRIFT');continue;}
     if(!roles.has(role)||!roles.has(overlay)||!['OUTER_FOOTPRINT_EDGE','ENCLOSED_VOID_EDGE'].includes(cls))fail('FACADE_ROLE');
     const key=`${strip.face}/${strip.fixed}/${col.localT}`;
     if(found.has(key))fail('DUPLICATE_EDGE');
     found.set(key,{role,overlay,cls});
    }
   }
   const missingHere=[...expected.keys()].filter(k=>!found.has(k)).length;
   const extraHere=[...found.keys()].filter(k=>!expected.has(k)).length;
   if(missingHere||extraHere)fail('EDGE_SET_MISMATCH');
   const strips=[];
   for(const [key,edge] of expected){
    const f=found.get(key);if(f.cls!==edge.edgeClass)fail('EDGE_CLASS_MISMATCH');
    if(f.cls==='ENCLOSED_VOID_EDGE')buildingVoids++;
    strips.push([edge.x,edge.z,edge.face,f.role,f.overlay,f.cls]);
   }
   const nc=components(mask,w,d),rc=components(r,w,d);
   buildingEdges+=expected.size;buildingRoof+=exposed;buildingFloor+=b.floorPlans[li].floorCells;
   levels.push({level:li+1,floorCells:b.floorPlans[li].floorCells,roofCells:exposed,
    facadeEdgeUnits:expected.size,facadeMissing:missingHere,facadeExtra:extraHere,
    enclosedVoidEdgeUnits:strips.filter(x=>x[5]==='ENCLOSED_VOID_EDGE').length,
    connectedFloorIslands:nc,connectedRoofIslands:rc,
    localOverhangCells:unsupported,localFootprintOverlapBelow:overlap,
    roofProjectionDifference:mismatches,physicalStructuralValidity:'UNKNOWN'});
   preview.push({level:li+1,floorRectangles:b.floorPlans[li].floor,
    roofRectangles:b.floorPlans[li].roof,facadeSections:strips});
  }
  for(const v of b.variants){
   if(v.approved!==false||v.entry?.verifiedPhysicalPassage!==false||v.rooftop?.verifiedPhysicalSupport!==false)fail('VARIANT_APPROVAL');
   if(!Number.isSafeInteger(v.entry.start)||!Number.isSafeInteger(v.entry.endInclusive)||
    v.entry.start>v.entry.endInclusive||v.entry.start<0||v.entry.endInclusive>=w||v.entry.frontFace!=='N')fail('ENTRY_COORD');
   const t=v.rooftop;if(![t.x,t.z,t.width,t.depth].every(n=>safe(n,64))||t.width<1||t.depth<1||t.x+t.width>w||t.z+t.depth>d)fail('ROOF_COORD');
  }
  const entry=b.variants.map(v=>({profile:v.profile,start:v.entry.start,end:v.entry.endInclusive,
   northBoundaryCovered:Array.from({length:v.entry.endInclusive-v.entry.start+1},(_,j)=>
    boundary(floor[0],w,d).has(`N/${v.entry.frontFixed}/${v.entry.start+j}`)).every(Boolean),
   verifiedPhysicalPassage:false}));
  // Candidate top-roof footprint check is geometric only and does not approve loads, doors or access.
  const rooftop=b.variants.map(v=>{const t=v.rooftop;let cover=0;
   for(let z=t.z;z<t.z+t.depth;z++)for(let x=t.x;x<t.x+t.width;x++)if(roof[5][z*w+x])cover++;
   return {profile:v.profile,roofCellsCovered:cover,requestedCells:t.width*t.depth,
    coveredOnTopRoof:cover===t.width*t.depth,verifiedPhysicalSupport:false};});
  buildings.push({id:b.id,program:b.program,site:{width:w,depth:d,floors:6},levels,
   variants:b.variants.map((v,i)=>({profile:v.profile,entry:entry[i],rooftop:rooftop[i],approved:false})),
   preview:{levels:preview,profiles:b.variants.map(v=>({name:v.profile,entry:[v.entry.start,v.entry.endInclusive],
    rooftop:[v.rooftop.x,v.rooftop.z,v.rooftop.width,v.rooftop.depth]}))},
   totals:{floorCells:buildingFloor,roofCells:buildingRoof,facadeEdges:buildingEdges,
    facadeMissing:buildingMissing,facadeExtra:buildingExtra,enclosedVoidEdges:buildingVoids},
   geometryAudit:'PASS_LOCAL_TOPOLOGY_ONLY',productionParity:'UNVERIFIED',physicalQuality:'UNKNOWN'});
  floorCells+=buildingFloor;roofCells+=buildingRoof;edges+=buildingEdges;
  missing+=buildingMissing;extra+=buildingExtra;courtyard+=buildingVoids;
 }
 if(floorCells!==b53.totals.floorCells||roofCells!==b53.totals.roofCells||edges!==b53.totals.facadeVisualEdges||
  missing!==0||extra!==0||roofMismatch!==0||buildings.length!==5)fail('TOTALS');
 const body={schema:'minecraftaibuilder-b57-offline-envelope-topology-v1',
  kind:'LOCAL_GEOMETRY_FACADE_TOPOLOGY_AND_SCHEMATIC_VISUAL_REVIEW',
  provenance:{b53ReportSha256:b53.reportSha256,b56ReportSha256:b56.reportSha256},
  buildings,totals:{buildings:5,levels:30,floorCells,roofCells,facadeEdges:edges,
   facadeMissing:missing,facadeExtra:extra,enclosedVoidFacadeEdges:courtyard,
   roofProjectionDifferences:roofMismatch,
   localOverhangCells:buildings.reduce((n,b)=>n+b.levels.reduce((m,l)=>m+l.localOverhangCells,0),0),
   disconnectedFloorLevels:buildings.reduce((n,b)=>n+b.levels.filter(l=>l.connectedFloorIslands>1).length,0),
   unverifiedDoorways:15,actualBuildOperations:0},
  evidenceBoundaries:['NO_PRODUCTION_SOURCE','NO_MATERIALS','NO_REAL_BLOCK_STATES',
   'NO_PHYSICAL_OPENINGS','NO_STRUCTURAL_LOAD_CERTIFICATION','NO_STAIRS_ACCESS_VERIFICATION','NO_WORLD_COORDINATES'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',executionAllowed:false,constructionApproved:false,
  engineCalls:0,minecraftCommands:0,worldContacts:0,scans:0,
  productionFacadeParity:'UNVERIFIED',physicalQuality:'UNKNOWN',
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},
  blockers:{M4Gates:b56.blockers.M4Gates.map(g=>({...g}))}};
 return {...body,reportSha256:hash(body)};
}
export function verifyB57(r,b53,b56){
 validateHash(r);
 if(r.schema!=='minecraftaibuilder-b57-offline-envelope-topology-v1'||
  r.readiness!=='NOT_PREPARED'||r.deployment!=='BLOCKED'||r.executionAllowed!==false||
  r.constructionApproved!==false||r.productionFacadeParity!=='UNVERIFIED'||
  r.BuildPlan?.operations?.length!==0||r.BuildPlan?.commandCount!==0||
  r.blockers?.M4Gates?.length!==9||r.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
  r.engineCalls!==0||r.minecraftCommands!==0||r.scans!==0||r.worldContacts!==0||
  r.totals.actualBuildOperations!==0)fail('REPORT_SAFETY');
 if(JSON.stringify(r)!==JSON.stringify(compileB57(b53,b56)))fail('REPLAY');
 return true;
}
