/**
 * B162 — design revision resilience.
 *
 * A late-added tower invalidates the previous B161 2x2 corridor. Recompile the
 * immutable changed building and REPLAN from its actual obstacle voxels.
 * Explicitly reject reusing a route that intersects the changed building.
 *
 * Local geometry only; no Minecraft integration or construction permission.
 */
import {createHash} from 'node:crypto';
import {validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {planAdaptiveSkybridge,DEFAULT_ROUTE} from './b161-adaptive-skybridge.mjs';
export const SCHEMA='minecraftaibuilder-b162-revision-replan-v1';
export const REVISIONS=Object.freeze({
 alpha:Object.freeze({id:'alpha',origin:[20,19,47],size:[12,20,15]}),
 beta:Object.freeze({id:'beta',origin:[19,19,46],size:[11,20,16]})
});
const sha=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
const yes=(ok,why)=>{if(!ok)throw Error('B162_'+why);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const int=(v,l,h)=>Number.isSafeInteger(v)&&v>=l&&v<=h;
const idOk=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{1,15}$/.test(x);
export function makeRevisedSkyport(original,revision=REVISIONS.alpha){
 validateDesign(original);
 yes(original.designOnly===true&&revision&&idOk(revision.id)&&
  Array.isArray(revision.origin)&&revision.origin.length===3&&
  revision.origin.every(n=>int(n,0,125))&&
  Array.isArray(revision.size)&&revision.size.length===3&&
  revision.size.every(n=>int(n,1,64))&&
  revision.origin.every((x,i)=>x+revision.size[i]<=[
   original.bounds.width,original.bounds.height,original.bounds.depth][i]),
  'REVISION_INPUT');
 const id=original.id.replace(/-r0$/,'').slice(0,26)+'-revised-'+revision.id;
 yes(id.length<=47&&original.id!==id&&
  !original.elements.some(e=>e.id==='b162-revision-tower'),'DUPLICATE_OR_ID');
 const revised={
  ...structuredClone(original),id,
  title:'DOPPLER — 建築計画変更後の遮蔽タワーと高架宇宙港',
  brief:'運用途中の建築案改訂により、新しい立体遮蔽塔が前回の空中回廊を塞ぐ。古い回廊を利用禁止とし、変更後のボクセルから動線を再探索するオフライン設計専用モデル。',
  elements:[...structuredClone(original.elements),{
   id:'b162-revision-tower',shape:'box',mode:'add',material:'metal',
   origin:[...revision.origin],size:[...revision.size]
  }]
 };
 validateDesign(revised);
 yes(equal(revised.elements.slice(0,original.elements.length),
  original.elements),'SOURCE_ELEMENTS_MODIFIED');
 return revised;
}
function blockedOldRoute(previousRoute,revision,width=2,depth=2,headroom=2){
 const [x0,y0,z0]=revision.origin,[sx,sy,sz]=revision.size;
 const violations=[];
 for(const p of previousRoute.targets[0].path){
  let blocked=false;
  for(let dx=0;dx<width&&!blocked;dx++)
   for(let dz=0;dz<depth&&!blocked;dz++)
    for(let dy=0;dy<headroom;dy++){
     const x=p[0]+dx,y=p[1]+dy,z=p[2]+dz;
     if(x>=x0&&x<x0+sx&&y>=y0&&y<y0+sy&&z>=z0&&z<z0+sz)
      {blocked=true;break;}
    }
  if(blocked)violations.push(p);
 }
 return violations;
}
export function reviewSkyportRevision(original,originalPlan,revision=REVISIONS.alpha){
 yes(originalPlan?.report?.constructionApproved===false&&
  originalPlan.report.gates?.length===9&&
  originalPlan.report.gates.every(x=>x==='BLOCKED')&&
  originalPlan.report.BuildPlan.operations.length===0&&
  originalPlan.finalRoute?.targets?.[0]?.status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  originalPlan.report.finalRouteProofSha256===originalPlan.finalRoute.sha256,
  'PRIOR_PROOF_UNTRUSTED');
 const baseline=compileDesign(original);
 yes(verifyCompiled(original,baseline)&&
  baseline.sourceSha256===originalPlan.report.sourceSha256&&
  baseline.geometrySha256===originalPlan.report.sourceGeometrySha256,
  'PRIOR_SOURCE_CHANGED');
 const originalJson=JSON.stringify(original);
 const revised=makeRevisedSkyport(original,revision);
 const revisedSource=compileDesign(revised);
 yes(verifyCompiled(revised,revisedSource)&&
  revisedSource.sourceSha256!==baseline.sourceSha256&&
  revisedSource.geometrySha256!==baseline.geometrySha256,
  'NO_REAL_MODEL_CHANGE');
 const stale=blockedOldRoute(originalPlan.finalRoute,revision,
  DEFAULT_ROUTE.footprintWidth,DEFAULT_ROUTE.footprintDepth,2);
 yes(stale.length>0,'OLD_PATH_NOT_AFFECTED');
 const rebuilt=planAdaptiveSkybridge(revised,DEFAULT_ROUTE,
  {finishedId:'doppler-switchback-terminal-replanned-r3'});
 yes(rebuilt.before.targets[0].status==='FOOTPRINT_UNREACHABLE'&&
  rebuilt.finalRoute.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  rebuilt.report.final2x2FlatMoves>originalPlan.report.final2x2FlatMoves&&
  !equal(rebuilt.report.dynamicWaypoints,originalPlan.report.dynamicWaypoints),
  'UNCHANGED_OR_UNSAFE_REPLAN');
 const forbidden=blockedOldRoute(rebuilt.finalRoute,revision,
  DEFAULT_ROUTE.footprintWidth,DEFAULT_ROUTE.footprintDepth,2);
 yes(forbidden.length===0&&
  rebuilt.finalRoute.targets[0].path.every(p=>p[1]===DEFAULT_ROUTE.start[1]),
  'REPLANNED_PATH_STILL_INTERSECTS_TOWER');
 yes(JSON.stringify(original)===originalJson,'MUTATED_SOURCE');
 const core={
  schema:SCHEMA,revisionId:revision.id,
  originalSourceSha256:baseline.sourceSha256,
  revisedSourceSha256:revisedSource.sourceSha256,
  revisedGeometrySha256:revisedSource.geometrySha256,
  previousRouteSha256:originalPlan.finalRoute.sha256,
  newRouteSha256:rebuilt.finalRoute.sha256,
  revisedFinishedSha256:rebuilt.finalScene.sourceSha256,
  revisedFinishedGeometrySha256:rebuilt.finalScene.geometrySha256,
  originalMoves:originalPlan.report.final2x2FlatMoves,
  revisedMoves:rebuilt.report.final2x2FlatMoves,
  oldRouteObstructedAnchors:stale.length,
  newRouteObstructedAnchors:forbidden.length,
  previousWaypoints:originalPlan.report.dynamicWaypoints,
  newWaypoints:rebuilt.report.dynamicWaypoints,
  originalSceneUnmodified:true,
  originalRouteRejected:true,
  newRouteRebuiltAfterRevision:true,
  newRouteRerunAfterFinishing:true,
  alteredObstruction:structuredClone(revision),
  structuralStrengthCertified:false,
  handrailCertified:false,
  playerCollisionCertified:false,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,
  readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 return {revised,revisedSource,stale,rebuilt,
  report:{...core,sha256:sha(core)}};
}
export function verifySkyportRevision(original,originalPlan,revision,report){
 try{
  const result=reviewSkyportRevision(original,originalPlan,revision);
  return equal(result.report,report)&&
   report.constructionApproved===false&&report.worldContacts===0&&
   report.gates?.length===9&&report.gates.every(x=>x==='BLOCKED')&&
   report.BuildPlan?.operations?.length===0;
 }catch{return false;}
}
