/**
 * R27: OFFLINE space/route forensic analysis of an immutable saved source.
 * An illegal CUT.material is deleted ONLY in a volatile in-memory clone.
 * This never repairs/accepts the original and never calls a model or Minecraft.
 *
 * Standable positions and graph edges are the same abstract grid semantics
 * as B198ZR3, except the R27 diagnostic can inspect invalid entrance sites.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileDesign,verifyCompiled,MATERIALS}
 from '../source/ai/b143-building-dsl.mjs';
import {analyzeR26Original}
 from './b198zr26-saved-original-whatif.mjs';

export const SCHEMA='minecraftaibuilder-b198zr27-offline-spatial-connectivity-v1';
const sha=s=>createHash('sha256').update(s).digest('hex');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const validSha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const int=n=>Number.isSafeInteger(n);
const triple=a=>Array.isArray(a)&&a.length===3&&a.every(int);
const idx=(x,y,z,w,d)=>(y*d+z)*w+x;
const code=e=>String(e?.message??'').match(/\b(?:B143|B198[A-Z0-9]+)_[A-Z0-9_]+/)?.[0]??'HOLD_UNCLASSIFIED_ERROR';
const bbox=e=>{
 if(e?.shape==='box'&&triple(e.origin)&&triple(e.size))
  return {min:e.origin,max:e.origin.map((v,i)=>v+e.size[i]-1)};
 return null;
};
const intersects=(a,b)=>a&&b&&[0,1,2].every(i=>a.min[i]<=b.max[i]&&b.min[i]<=a.max[i]);
function inspectGeometry(design,compiled,plan){
 const {width:w,height:h,depth:d}=design.bounds,volume=w*h*d;
 const grid=new Uint8Array(volume);
 for(const [x,y,z,material] of compiled.primitives)
  grid[idx(x,y,z,w,d)]=material+1;
 const inside=(x,y,z)=>x>=0&&x<w&&y>=0&&y<h&&z>=0&&z<d;
 const cell=(x,y,z)=>inside(x,y,z)?grid[idx(x,y,z,w,d)]:0;
 const headroom=[2,3].includes(plan?.headroom)?plan.headroom:2;
 const stand=(x,y,z)=>{
  if(!inside(x,y,z)||y===0||y+headroom-1>=h)return false;
  if(!cell(x,y-1,z))return false;
  for(let i=0;i<headroom;i++)if(cell(x,y+i,z))return false;
  return true;
 };
 const standable=new Uint8Array(volume);
 let standableTotal=0;
 for(let y=1;y<h-headroom+1;y++)
  for(let z=0;z<d;z++)for(let x=0;x<w;x++)
   if(stand(x,y,z)){standable[idx(x,y,z,w,d)]=1;standableTotal++}
 const component=new Int32Array(volume).fill(-1);
 const sizes=[];
 const queue=new Int32Array(standableTotal||1);
 for(let at=0;at<volume;at++){
  if(!standable[at]||component[at]>=0)continue;
  const label=sizes.length;
  let first=0,last=0;
  queue[last++]=at;component[at]=label;
  while(first<last){
   const cur=queue[first++],x=cur%w,z=Math.floor(cur/w)%d,
    y=Math.floor(cur/(w*d));
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])
    for(const dy of [0,1,-1]){
     const nx=x+dx,ny=y+dy,nz=z+dz;
     if(!inside(nx,ny,nz))continue;
     const next=idx(nx,ny,nz,w,d);
     if(!standable[next]||component[next]>=0)continue;
     if(dy===1&&(y+headroom>=h||cell(x,y+headroom,z)))continue;
     if(dy===-1&&cell(nx,ny+headroom,nz))continue;
     component[next]=label;queue[last++]=next;
    }
  }
  sizes.push(last);
 }
 const origin=plan?.entrance,entrance=triple(origin)&&inside(...origin)?origin:null;
 const entranceStatus=entrance?{
  declaredPoint:entrance,
  isStandable:stand(...entrance),
  solidAtFeet:!!cell(...entrance),
  supportedByLocalFloor:entrance[1]>0&&!!cell(entrance[0],entrance[1]-1,entrance[2]),
  clearHeadroom:Array.from({length:headroom},(_,i)=>!cell(entrance[0],entrance[1]+i,entrance[2])).every(Boolean),
  boundaryAtYZero:entrance[1]===0,
  outsideGroundUnverified:true,
  connectedComponent:component[idx(...entrance,w,d)]>=0?
   component[idx(...entrance,w,d)]:null
 }:{declaredPoint:origin??null,isStandable:false,reason:'ENTRANCE_MISSING_OR_OUTSIDE'};
 // Candidate entrance positions are purely diagnostics. Never silently
 // substitute one in a contract, model output, or accepted source.
 const near=[];
 if(entrance){
  for(let y=Math.max(1,entrance[1]-4);y<=Math.min(h-headroom,entrance[1]+4);y++)
   for(let z=Math.max(0,entrance[2]-6);z<=Math.min(d-1,entrance[2]+6);z++)
    for(let x=Math.max(0,entrance[0]-6);x<=Math.min(w-1,entrance[0]+6);x++){
     if(!stand(x,y,z))continue;
     const dist=Math.abs(x-entrance[0])+Math.abs(y-entrance[1])+
      Math.abs(z-entrance[2]);
     if(dist<=8)near.push({point:[x,y,z],manhattanDistance:dist,
      component:component[idx(x,y,z,w,d)]});
    }
 }
 near.sort((a,b)=>a.manhattanDistance-b.manhattanDistance||
  a.point[1]-b.point[1]||a.point[2]-b.point[2]||a.point[0]-b.point[0]);
 const nearestStandableCandidates=near.slice(0,12);
 const zones=Array.isArray(plan?.functionalZones)?plan.functionalZones:[];
 const zoneResults=zones.map((zone,index)=>{
  const id=String(zone?.id??'UNNAMED').slice(0,64);
  const a=zone?.origin,s=zone?.size;
  if(!triple(a)||!triple(s)||s.some(n=>n<=0)||
   a.some((v,i)=>v<0||v+s[i]>[w,h,d][i]))
   return {index,id,validBox:false};
  const total=s[0]*s[1]*s[2],materials={};
  let occupied=0,standableCount=0;
  const components={};
  for(let y=a[1];y<a[1]+s[1];y++)
   for(let z=a[2];z<a[2]+s[2];z++)
    for(let x=a[0];x<a[0]+s[0];x++){
     const c=cell(x,y,z);
     if(c){occupied++;const name=MATERIALS[c-1];
      materials[name]=(materials[name]??0)+1;}
     const label=component[idx(x,y,z,w,d)];
     if(label>=0){standableCount++;
      components[label]=(components[label]??0)+1;}
    }
  const largest=Object.entries(components).sort((a,b)=>b[1]-a[1])[0]??null;
  return {index,id,validBox:true,regionVolume:total,occupiedCells:occupied,
   occupiedPercent:Number((occupied*100/total).toFixed(3)),
   materialCounts:materials,standablePositions:standableCount,
   standablePercent:Number((standableCount*100/total).toFixed(3)),
   standableComponentCount:Object.keys(components).length,
   largestStandableComponent:largest?{id:Number(largest[0]),positions:largest[1]}:null,
   declaredMinimumReachablePositions:zone.minimumReachablePositions??null,
   declaredMinimumReachablePercent:zone.minimumReachablePercent??null,
   impossibleToMeetReachabilityThreshold:
    standableCount<(zone.minimumReachablePositions??0)||
    standableCount*100/total<(zone.minimumReachablePercent??0),
   zoneNotCertifiedAsHabitable:true};
 });
 const dest=Array.isArray(plan?.destinations)?plan.destinations:[];
 const destinationResults=dest.map((v,index)=>{
  const p=v?.point,ok=triple(p)&&inside(...p);
  const componentId=ok?component[idx(...p,w,d)]:-1;
  return {index,id:String(v?.id??'UNNAMED').slice(0,64),point:p??null,
   standable:ok&&stand(...p),component:componentId>=0?componentId:null,
   reachableFromDeclaredEntrance:entranceStatus.isStandable?
    componentId>=0&&componentId===entranceStatus.connectedComponent:null,
   shortestPathStepsNotCalculated:true};
 });
 const elements=Array.isArray(design.elements)?design.elements:[];
 const suspiciousShells=elements.flatMap((e,index)=>{
  if(e?.mode!=='add'||e.shape!=='box'||!/shell|hollow|outer|envelope/i.test(e.id??''))return [];
  const box=bbox(e);
  const vol=e.size?.reduce((a,b)=>a*b,1);
  return [{index,id:e.id,boxVolume:vol,declaredShellThickness:e.shell??0,
   actuallySolidPrimitive:e.shell===undefined||e.shell===0,
   inferredFromNameOnly:true}];
 });
 const cuts=elements.flatMap((e,index)=>e?.mode==='cut'&&bbox(e)?
  [{index,id:e.id,origin:e.origin,size:e.size,
   entranceDeclaredPointInsideCut:entrance?intersects(bbox(e),{
    min:entrance,max:entrance}):null}]:[]);
 return {
  conceptualGridCells:volume,finalOccupiedCells:compiled.primitives.length,
  standablePositions:standableTotal,connectedComponentCount:sizes.length,
  largestComponentPositions:sizes.reduce((m,n)=>Math.max(m,n),0),
  entrance:entranceStatus,
  nearestStandableCandidates,
  zones:zoneResults,destinations:destinationResults,
  namedShellBoxAdvisories:suspiciousShells,boxCuts:cuts,
  independentHumanDesignApproval:false,
  minecraftActualWalkingTested:false
 };
}
export function analyzeR27SavedOriginal(raw,{expectedSha256}={}){
 if(typeof raw!=='string'||!raw.length||Buffer.byteLength(raw)>120000)
  throw Error('B198ZR27_SOURCE_SIZE');
 if(!validSha(expectedSha256)||sha(raw)!==expectedSha256)
  throw Error('B198ZR27_SOURCE_SHA_MISMATCH');
 const r26=analyzeR26Original(raw,{expectedSha256});
 let obj=null;try{obj=JSON.parse(raw)}catch{}
 let status='HOLD_SOURCE_UNPARSEABLE_OR_NOT_ELIGIBLE';
 let details=null,errorCode=null;
 if(obj?.design&&Array.isArray(obj.design.elements)&&
  r26.invalidAddMaterialElements.length===0){
  const clone=structuredClone(obj);
  for(const e of clone.design.elements)
   if(e?.mode==='cut'&&Object.hasOwn(e,'material'))delete e.material;
  try{
   const compiled=compileDesign(clone.design);
   if(!verifyCompiled(clone.design,compiled))throw Error('B143_SOURCE_INTEGRITY');
   details=inspectGeometry(clone.design,compiled,clone.spatialPlan);
   status='OFFLINE_DIAGNOSTICS_COMPLETE_ORIGINAL_STILL_UNAPPROVED';
  }catch(e){status='HOLD_COMPILE_OR_GEOMETRY';errorCode=code(e)}
 }
 return {schema:SCHEMA,rawSha256:sha(raw),
  sourceElementCount:r26.sourceElements,
  originalB143Review:r26.originalReview,
  invalidCutMaterialCount:r26.invalidCutMaterialElements.length,
  invalidAddMaterialCount:r26.invalidAddMaterialElements.length,
  analysisStatus:status,diagnosticErrorCode:errorCode,
  analysisBasedOnVolatileCutMaterialOmission:
   r26.invalidCutMaterialElements.length>0,
  spatialDiagnostics:details,
  originalSourceUnchanged:true,
  hypotheticalSourceNeverWritten:true,
  diagnosticDoesNotApproveRepairOrConstruction:true,
  modelRequests:0,worldContacts:0,worldWrites:0,safety:safety()};
}
export function writeR27SavedOriginal({rawPath,expectedSha256,outPath}={}){
 if(![rawPath,outPath].every(x=>typeof x==='string'&&x.length>0))
  throw Error('B198ZR27_PATHS_REQUIRED');
 const source=path.resolve(rawPath),out=path.resolve(outPath);
 if(source===out)throw Error('B198ZR27_NO_SOURCE_OVERWRITE');
 if(fs.existsSync(out))throw Error('B198ZR27_OUTPUT_EXISTS');
 const report=analyzeR27SavedOriginal(fs.readFileSync(source,'utf8'),{expectedSha256});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==6||args[0]!=='--raw'||args[2]!=='--sha256'||args[4]!=='--out')
   throw Error('B198ZR27_CLI_ARGS');
  const report=writeR27SavedOriginal({rawPath:args[1],
   expectedSha256:args[3],outPath:args[5]});
  console.log('R27_OFFLINE_ONLY',JSON.stringify({
   status:report.analysisStatus,
   sourceSha256:report.rawSha256,
   standable:report.spatialDiagnostics?.standablePositions??null,
   components:report.spatialDiagnostics?.connectedComponentCount??null,
   modelRequests:0,worldWrites:0}));
 }catch(e){console.error('R27_HOLD',code(e));process.exitCode=2}
}
