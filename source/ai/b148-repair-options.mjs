/**
 * B148: diagnostic-driven, source-pinned geometric repair OPTIONS.
 * Deterministic offline candidates only; no model API or Minecraft commands.
 * No candidate is automatically approved or installed in a real world.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled,validateDesign} from './b143-building-dsl.mjs';
import {diagnoseDetached} from './b147-detachment-diagnosis.mjs';

export const SCHEMA='minecraftaibuilder-b148-repair-options-v1';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const safe=(ok,reason)=>{if(!ok)throw Error('B148_'+reason);};
const boundsOf=points=>{
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 for(const p of points)for(let i=0;i<3;i++){low[i]=Math.min(low[i],p[i]);high[i]=Math.max(high[i],p[i]);}
 return [low,high];
};
const boxFor=(points,padding,bounds)=>{
 const [low,high]=boundsOf(points);
 const origin=low.map((v,i)=>Math.max(0,v-padding));
 const end=high.map((v,i)=>Math.min([bounds.width-1,bounds.height-1,bounds.depth-1][i],v+padding));
 return {origin,size:end.map((v,i)=>v-origin[i]+1)};
};
/**
 * Returns at most 2 proposals addressing exactly one diagnosed component.
 * A one-voxel bridge is not less "valid" than a 25-voxel change.
 * Construction is still denied regardless of geometry connectivity.
 */
export function generateRepairOptions(source,{searchRadius=8}={}){
 validateDesign(source);
 const frozen=JSON.stringify(source),baseline=compileDesign(source);
 safe(verifyCompiled(source,baseline),'BASE_INVALID');
 const diagnostic=diagnoseDetached(baseline,{searchRadius});
 safe(diagnostic.detachedComponentCount>0,'NO_DETACHED_COMPONENT');
 const target=[...diagnostic.components].sort((a,b)=>b.cellCount-a.cellCount||a.componentId-b.componentId)[0];
 const witness=target.nearestBasalConnectedWitness;
 safe(witness&&witness.conceptualMissingCells.length>=1&&witness.conceptualMissingCells.length<=15,
  'NO_BOUNDED_BRIDGE_WITNESS');
 const points=witness.conceptualMissingCells,variants=[
  {type:'minimum-face-bridge',label:'最小接続候補（局所幾何）',padding:0},
  {type:'wider-contact-patch',label:'接触面の広い候補（強度未検証）',padding:1}
 ];
 const options=[];
 for(let i=0;i<variants.length;i++){
  const v=variants[i],region=boxFor(points,v.padding,source.bounds);
  const local=JSON.parse(frozen);
  local.id=source.id+'-suggestion-'+(i===0?'a':'b');
  safe(local.id.length<=48&&/^[a-z][a-z0-9-]+$/.test(local.id),'SUGGESTION_ID_LIMIT');
  local.title=source.title+' 接続案'+(i===0?'A':'B');
  local.brief='ChatGPTによる検討用の局所接続候補。物理強度・動線・実施工は未検証。';
  const element={id:'b148-repair-'+(i===0?'a':'b'),shape:'box',
   mode:'add',material:'metal',...region};
  safe(!local.elements.some(e=>e.id===element.id),'ELEMENT_COLLISION');
  local.elements.push(element);
  validateDesign(local);
  const compiled=compileDesign(local),audit=diagnoseDetached(compiled,{searchRadius});
  safe(verifyCompiled(local,compiled)&&audit.detachedCellCount<diagnostic.detachedCellCount,
   'CANDIDATE_NO_IMPROVEMENT');
  safe(audit.detachedComponentCount<=diagnostic.detachedComponentCount,'CANDIDATE_WORSENED');
  const item={
   id:local.id,type:v.type,label:v.label,
   targetComponentId:target.componentId,baseSourceSha256:baseline.sourceSha256,
   newSourceSha256:compiled.sourceSha256,
   baseGeometrySha256:baseline.geometrySha256,
   newGeometrySha256:compiled.geometrySha256,
   sourceDiagnosisSha256:diagnostic.sha256,
   revisedDiagnosisSha256:audit.sha256,
   localAddedElement:element,
   beforeDetachedCells:diagnostic.detachedCellCount,
   afterDetachedCells:audit.detachedCellCount,
   beforeDetachedGroups:diagnostic.detachedComponentCount,
   afterDetachedGroups:audit.detachedComponentCount,
   proposedBlockCount:compiled.primitives.length-baseline.primitives.length,
   rationale:'Only a face-connected local voxel repair candidate, not a load-bearing structural claim.',
   designOnly:true,constructionApproved:false,
   physicalStructuralProof:false,worldCoordinates:null,worldContacts:0,
   readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]}
  };
  options.push({design:local,scene:compiled,diagnosis:audit,
   summary:{...item,sha256:digest(item)}});
 }
 safe(JSON.stringify(source)===frozen,'SOURCE_MUTATION');
 safe(options[0].scene.geometrySha256!==options[1].scene.geometrySha256,'DUPLICATE_CANDIDATES');
 const result={
  schema:SCHEMA,sourceId:source.id,
  baseSourceSha256:baseline.sourceSha256,baseGeometrySha256:baseline.geometrySha256,
  diagnosedComponent:target.componentId,
  witness,sourceDiagnosisSha256:diagnostic.sha256,
  options:options.map(x=>x.summary),
  selected:null,approved:false,constructionApproved:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  worldContacts:0,BuildPlan:{operations:[]}
 };
 return {report:{...result,sha256:digest(result)},candidates:options};
}
export function verifyRepairOptions(source,report){
 try{
  const expected=generateRepairOptions(source);
  return JSON.stringify(expected.report)===JSON.stringify(report)&&
   report.options?.every(x=>x.constructionApproved===false&&
    x.BuildPlan.operations.length===0&&x.gates.every(g=>g==='BLOCKED'))&&
   report.selected===null&&report.approved===false;
 }catch{return false;}
}
