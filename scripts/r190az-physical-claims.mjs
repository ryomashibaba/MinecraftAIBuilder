/**
 * R190-AZ — independent source-voxel assertions for a model's own functional
 * declarations. This adds NO buildings, geometry fixes, provider calls or
 * Minecraft actions. It cannot certify architecture or actual walking.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {fileURLToPath} from 'node:url';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {measureR190TSource} from './r190t-source-comparison.mjs';

export const R190AZ_SCHEMA='minecraftaibuilder-r190az-model-claimed-physical-evidence-v1';
const H=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190AZ_'+x);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const triple=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isSafeInteger);
const key=(x,y,z)=>x+','+y+','+z;
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 modelCallsByReview:0,art:'ART_HOLD',officialArtAdoptions:0});
const resultBase=(sha,bytes)=>({
 schema:R190AZ_SCHEMA,originalSha256:sha,originalBytes:bytes,
 provenance:'UNAUTHENTICATED_ORIGINAL_BYTES_PROVIDER_ID_NOT_PROVEN',
 originalUnmodified:true,hostGeometryRepairs:0,
 actualMinecraftWalking:'NOT_TESTED',humanAestheticReview:'ART_HOLD',
 structuralEngineering:'NOT_CERTIFIED',originality:'NOT_ESTABLISHED',
 requirementFidelity:'NOT_CERTIFIED',...safety()
});
const goodPoint=(p,{width:w,height:h,depth:d})=>
 triple(p)&&p[0]>=0&&p[0]<w&&p[1]>0&&p[1]+1<h&&p[2]>=0&&p[2]<d;
function supportGraph(compiled,bounds,entrance,destinations){
 const occupied=new Set(compiled.primitives.map(p=>key(p[0],p[1],p[2])));
 const stand=p=>goodPoint(p,bounds)&&
  occupied.has(key(p[0],p[1]-1,p[2]))&&
  !occupied.has(key(...p))&&!occupied.has(key(p[0],p[1]+1,p[2]));
 const entryStand=stand(entrance);
 const routeSteps=new Map();
 if(entryStand){
  const queue=[entrance],dist=new Map([[key(...entrance),0]]);
  for(let q=0;q<queue.length;q++){
   const [x,y,z]=queue[q],distance=dist.get(key(x,y,z));
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    for(const dy of [0,1,-1]){
     const t=[x+dx,y+dy,z+dz];
     if(!stand(t))continue;
     // Conservative 1-step motion proxy, not an avatar dynamics solver.
     if(dy===1&&occupied.has(key(x,y+2,z)))continue;
     if(dy===-1&&occupied.has(key(t[0],t[1]+2,t[2])))continue;
     const k=key(...t);
     if(dist.has(k))continue;
     dist.set(k,distance+1);
     queue.push(t);
    }
   }
  }
  for(const dest of destinations){
   routeSteps.set(dest.id,goodPoint(dest.point,bounds)?
     (dist.get(key(...dest.point))??null):null);
  }
 }
 return {entranceStandable:entryStand,
  destinationResults:destinations.map(d=>{
   const valid=stand(d.point),n=routeSteps.get(d.id)??null,
    max=d.maximumPathSteps;
   return {id:d.id,point:d.point,
    pointIsModelDeclaredNotIndependentRoom:true,
    standableTwoHighSourceVoxel:valid,
    connectedStepProxy:n,modelMaximumPathSteps:max,
    withinSelfDeclaredStepBudget:n!==null&&
     Number.isSafeInteger(max)&&max>=n,
    status:!valid?'HOLD_DESTINATION_NOT_STANDABLE':
     n===null?'HOLD_DESTINATION_NOT_CONNECTED':
     Number.isSafeInteger(max)&&n>max?'HOLD_MODEL_PATH_LENGTH_UNSUPPORTED':
     !Number.isSafeInteger(max)?'NOT_CERTIFIED_NO_VALID_LIMIT':
     'SOURCE_PATH_PROXY_WITHIN_DECLARED_LIMIT'};
  }),sourceWalkProxy:'NOT_ACTUAL_MINECRAFT_WALKING'};
}
function inspectModelOriginal(source,hash,bytes){
 const common=resultBase(hash,bytes);
 if(!object(source)||!object(source.design)){
  return {...common,status:'HOLD_NO_DESIGN',firstFailure:'R190AZ_NO_DESIGN',
   geometrySha256:null,physical:null};
 }
 let compiled,physical;
 try{
  compiled=compileDesign(source.design);
  if(!verifyCompiled(source.design,compiled))fail('INDEPENDENT_B143_VERIFICATION');
  physical=measureR190TSource(source.design,source.spatialPlan??null);
 }catch(e){
  return {...common,status:'HOLD_INVALID_B143',
   firstFailure:String(e?.message??e).slice(0,160),
   geometrySha256:null,physical:null};
 }
 const bounds=source.design.bounds,solids=new Set(compiled.primitives.map(p=>
  key(p[0],p[1],p[2])));
 const plan=source.spatialPlan;
 const protectedVoids=Array.isArray(plan?.protectedVoids)?
  plan.protectedVoids.map(v=>{
   const ok=triple(v.origin)&&triple(v.size)&&v.size.every(x=>x>=1)&&
    v.origin.every((x,i)=>x>=0&&x+v.size[i]<=[
      bounds.width,bounds.height,bounds.depth][i]);
   if(!ok)return {id:v?.id??null,status:'NOT_VERIFIED_INVALID_REGION',
    actualOccupied:null,modelMaxOccupied:v.maxOccupiedCells??null};
   let n=0;
   const [x,y,z]=v.origin,[w,h,d]=v.size;
   for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)
    for(let k=z;k<z+d;k++)if(solids.has(key(i,j,k)))n++;
   return {id:v.id,status:Number.isSafeInteger(v.maxOccupiedCells)&&
    v.maxOccupiedCells>=0&&n<=v.maxOccupiedCells?
     'SOURCE_PROTECTED_VOID_OCCUPANCY_WITHIN_LIMIT':
     'HOLD_MODEL_VOID_OCCUPANCY_UNSUPPORTED',
    actualOccupied:n,modelMaxOccupied:v.maxOccupiedCells??null,
    doesNotCertifyRoofOpenToSky:true};
  }):[];
 const cuts=compiled.stats.designOperations.filter(x=>x.mode==='cut')
  .map(x=>({id:x.element,removedSourceVoxels:x.removed,
   status:x.removed>0?'EFFECTIVE_CUT':'HOLD_INEFFECTIVE_CUT'}));
 const destinations=Array.isArray(plan?.destinations)?plan.destinations.slice(0,16):[];
 const graph=supportGraph(compiled,bounds,plan?.entrance,destinations);
 const zoneSamples=physical.modelDeclaredZoneSamples;
 const zones=zoneSamples.map((x,i)=>{
  const z=plan?.functionalZones?.[i];
  const requiredPositions=z?.minimumReachablePositions,
   fraction=z?.minimumReachablePercent;
  const passesAbsolute=Number.isSafeInteger(requiredPositions)&&requiredPositions>=0&&
   x.entranceReachable>=requiredPositions;
  // The fraction denominator is this model-declared zone's supported
  // standable positions, NEVER a proof of usable interior room volume.
  const passesFraction=typeof fraction==='number'&&Number.isFinite(fraction)&&
   fraction>=0&&fraction<=1&&x.supportedStandable>0&&
   x.entranceReachable/x.supportedStandable>=fraction;
  return {...x,modelRequiredReachablePositions:requiredPositions??null,
   modelRequiredReachablePercent:fraction??null,
   status:passesAbsolute&&passesFraction&&x.validRegion?
    'MODEL_ZONE_REACHABILITY_PROXY_MET':
    'HOLD_OR_UNVERIFIABLE_MODEL_ZONE_CLAIM',
   isIndependentRoom:'NOT_ESTABLISHED'};
 });
 const anyDest=destinations.length>0,
  anyZones=zones.length>0,anyVoids=protectedVoids.length>0;
 const allSatisfied=physical.modelDeclaredEntranceStandable&&
  physical.modelDeclaredEntranceHorizontalAirToBoundaryProxy&&
  destinations.length>0&&destinations.length<=16&&
  graph.destinationResults.every(x=>x.status==='SOURCE_PATH_PROXY_WITHIN_DECLARED_LIMIT')&&
  cuts.every(x=>x.removedSourceVoxels>0)&&
  protectedVoids.every(x=>x.status==='SOURCE_PROTECTED_VOID_OCCUPANCY_WITHIN_LIMIT')&&
  zones.every(x=>x.status==='MODEL_ZONE_REACHABILITY_PROXY_MET');
 const missing=!object(plan)||!anyDest||!anyZones||!anyVoids;
 return {...common,
  status:missing?'INSUFFICIENT_AUTHOR_DECLARATIONS':
   allSatisfied?'SOURCE_MODEL_CLAIMS_PHYSICAL_PROXIES_PASS_ART_HOLD':
   'HOLD_MODEL_SOURCE_CLAIMS_UNSUPPORTED',
  firstFailure:null,geometrySha256:compiled.geometrySha256,
  physical:{compiledSourceSha256:compiled.sourceSha256,
   compiledGeometrySha256:compiled.geometrySha256,
   finalSourceVoxelCount:compiled.primitives.length,
   modelEntrance:plan?.entrance??null,
   entranceStandable:graph.entranceStandable,
   entranceToBoundaryAirProxy:physical.modelDeclaredEntranceHorizontalAirToBoundaryProxy,
   cutEvidence:cuts,modelDeclaredProtectedVoidEvidence:protectedVoids,
   modelDeclaredDestinationEvidence:graph.destinationResults,
   modelDeclaredZoneEvidence:zones,
   noIndependentDoorOrRoofCertification:true,
   noIndependentRoomSemanticsCertification:true,
   noStructuralLoadCertification:true,
   stairWalkSimulation:'NOT_RUN',
   actualMinecraftWalking:'NOT_TESTED'}};
}
export function auditR190AZModelClaims(bytes,{expectedSha256}={}){
 if(!(bytes instanceof Uint8Array)||bytes.length<2||bytes.length>200000)
  fail('INVALID_ORIGINAL_BYTES');
 const hash=H(bytes);
 if(expectedSha256!==undefined&&(!/^[a-f0-9]{64}$/.test(expectedSha256)||
  expectedSha256!==hash))fail('ORIGINAL_SHA_MISMATCH');
 let raw;
 try{raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}
 catch{fail('INVALID_UTF8')}
 let parsed;
 try{parsed=JSON.parse(raw)}
 catch{
  return {...resultBase(hash,bytes.length),status:'HOLD_INVALID_JSON',
   firstFailure:'R190AZ_INVALID_JSON',geometrySha256:null,physical:null};
 }
 return inspectModelOriginal(parsed,hash,bytes.length);
}
function input(p){
 if(typeof p!=='string'||!path.isAbsolute(p))fail('ABSOLUTE_INPUT_PATH');
 const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.size<2||s.size>200000)fail('UNSAFE_ORIGINAL');
 return fs.readFileSync(p);
}
export function writeR190AZAudit({originalPath,outDir,expectedSha256}){
 if(typeof outDir!=='string'||!path.isAbsolute(outDir)||fs.existsSync(outDir))
  fail('NEW_ABSOLUTE_OUTPUT_REQUIRED');
 const raw=input(originalPath);
 const audit=auditR190AZModelClaims(raw,{expectedSha256});
 if(H(input(originalPath))!==audit.originalSha256)fail('SOURCE_CHANGED_DURING_AUDIT');
 const parent=fs.lstatSync(path.dirname(outDir));
 if(!parent.isDirectory()||parent.isSymbolicLink())fail('OUTPUT_PARENT');
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'READ_ONLY_PHYSICAL_CLAIMS.json'),
  JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'STATUS_JA.txt'),[
  'R190-AZ — 保存済みモデル回答の幾何と申告を再点検',
  '原文SHA256: '+audit.originalSha256,
  'B143 source: '+audit.status,
  '最初の拒否: '+(audit.firstFailure??'なし'),
  'SOURCEボクセルが比較できない場合、立体・動線・採光の合格を主張しない。',
  '今後有効なB143を入力すると、モデル自身が宣言した入口・目標・吹抜け・用途領域を最終ボクセルから点検する。',
  'これはモデルの独創性や建築としての完成、Minecraft実歩行を認証しない。',
  '入力の原文は変更しない。ホストの修理、モデル実行、ワールド操作は全て0。ART HOLD。',''
 ].join('\n'),{flag:'wx'});
 return audit;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==6||a[0]!=='--original'||a[2]!=='--out'||a[4]!=='--sha')
   fail('CLI_ARGS');
  const r=writeR190AZAudit({originalPath:a[1],outDir:a[3],expectedSha256:a[5]});
  console.log(JSON.stringify({status:r.status,rawSha256:r.originalSha256,
   firstFailure:r.firstFailure,geometrySha256:r.geometrySha256,
   modelCalls:0,worldWrites:0,art:'ART_HOLD'},null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
