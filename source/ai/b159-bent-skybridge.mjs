/**
 * B159: fail-closed orthogonal bend selection on isolated local 3D designs.
 * A candidate is chosen only after complete 2x2 support/headroom rerouting.
 * Structural drawings are not structural certification or Minecraft writes.
 */
import {createHash} from 'node:crypto';
import {validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from './b152-footprint-review.mjs';
export const SCHEMA='minecraftaibuilder-b159-bent-bridge-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const insist=(value,msg)=>{if(!value)throw Error('B159_'+msg);};
const validPt=p=>Array.isArray(p)&&p.length===3&&p.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=127);
const box=(id,origin,size,material)=>({id,shape:'box',mode:'add',material,origin,size});
const vals=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function safeRoute(scene,opts){
 const p=analyzeFootprint(scene,opts);
 insist(verifyFootprint(scene,opts,p),'UNTRUSTED_ROUTE');
 return p;
}
function routeOptions(params){
 const {start,goal,corridorWidth:w,footprintWidth:fw,footprintDepth:fd}=params;
 const lowX=Math.min(start[0],goal[0]),lowZ=Math.min(start[2],goal[2]);
 const vertical=(x)=>box('b159-vertical-supported-floor',
  [x-Math.floor((w-1)/2),start[1]-2,lowZ],
  [w,2,Math.abs(goal[2]-start[2])+fd],'concrete');
 const horizontal=(z)=>box('b159-horizontal-supported-floor',
  [lowX,start[1]-2,z-Math.floor((w-1)/2)],
  [Math.abs(goal[0]-start[0])+fw,2,w],'concrete');
 return [
  {bend:'X_THEN_Z',floor:[horizontal(start[2]),vertical(goal[0])]},
  {bend:'Z_THEN_X',floor:[vertical(start[0]),horizontal(goal[2])]}
 ];
}
function reviewInputs(original,params){
 insist(original?.designOnly===true&&params&&validPt(params.start)&&validPt(params.goal)&&
  params.start[1]===params.goal[1]&&
  params.start[0]!==params.goal[0]&&params.start[2]!==params.goal[2]&&
  Number.isSafeInteger(params.corridorWidth)&&
  params.corridorWidth>=6&&params.corridorWidth<=14&&
  Number.isSafeInteger(params.footprintWidth)&&params.footprintWidth>=2&&params.footprintWidth<=4&&
  Number.isSafeInteger(params.footprintDepth)&&params.footprintDepth>=2&&params.footprintDepth<=4&&
  params.corridorWidth>=Math.max(params.footprintWidth,params.footprintDepth)+2&&
  params.start[1]>=4&&
  Math.abs(params.start[0]-params.goal[0])<=65&&
  Math.abs(params.start[2]-params.goal[2])<=65,'PARAMETERS');
 validateDesign(original);
}
export function reviewBentBridge(original,params){
 reviewInputs(original,params);
 const source=compileDesign(original);
 insist(verifyCompiled(original,source)&&source.designOnly===true&&
  source.readiness==='NOT_PREPARED'&&source.worldContacts===0&&
  source.BuildPlan.operations.length===0,'SOURCE_SAFETY');
 const args={start:params.start,destinations:[{id:'destination',at:params.goal}],
  width:params.footprintWidth,depth:params.footprintDepth,headroom:2};
 const before=safeRoute(source,args);
 insist(before.targets[0].status==='FOOTPRINT_UNREACHABLE','NOT_A_DISCONNECTED_WALKWAY');
 const attempts=[];
 for(const option of routeOptions(params)){
  let status='UNSUPPORTED_CANDIDATE',candidate=null,scene=null,route=null,reason=null;
  try{
   candidate={...structuredClone(original),
    id:'b159-'+option.bend.toLowerCase().replaceAll('_','-')+'-candidate',
    title:'POLARIS — L字型接続床の未承認候補',
    brief:'B159の段差なし直交経路候補。全セル床支持と頭上2セルを検査した設計案。建築安全・実ワールド通行性能・施工は未認証。',
    elements:[...structuredClone(original.elements),...option.floor]};
   validateDesign(candidate);
   scene=compileDesign(candidate);
   insist(verifyCompiled(candidate,scene),'CANDIDATE_COMPILER_FAIL');
   route=safeRoute(scene,args);
   status=route.targets[0].status;
  }catch(e){reason=String(e.message).slice(0,170);}
  attempts.push({...option,status,reason,candidate,scene,route});
 }
 const viable=attempts.filter(a=>a.status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  a.route.targets[0].path.every(p=>p[1]===params.start[1]));
 viable.sort((a,b)=>a.route.targets[0].steps-b.route.targets[0].steps||
  a.bend.localeCompare(b.bend));
 insist(viable.length>0,'NO_PROVEN_ORTHOGONAL_REPAIR');
 const selected=viable[0];
 insist(vals(selected.candidate.elements.slice(0,original.elements.length),
  original.elements)&&selected.floor.length===2&&
  selected.scene.geometrySha256!==source.geometrySha256,'SOURCE_HISTORY_MUTATED');
 const report={
  schema:SCHEMA,sourceSha256:source.sourceSha256,
  sourceGeometrySha256:source.geometrySha256,
  beforeProofSha256:before.sha256,
  chosenBend:selected.bend,chosenSourceSha256:selected.scene.sourceSha256,
  chosenGeometrySha256:selected.scene.geometrySha256,
  chosenRouteSha256:selected.route.sha256,
  chosenFlatMoves:selected.route.targets[0].steps,
  attemptStatuses:attempts.map(a=>({bend:a.bend,status:a.status,reason:a.reason})),
  testedAlternatives:attempts.length,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,
  playerCollisionCertified:false,structuralStrengthCertified:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
 return {source,before,attempts,selected,routeArgs:args,
  report:{...report,sha256:sha(report)}};
}
function decorate(floor,feet,supportBaseY){
 const shapes=[],w=8;
 for(const e of floor){
  const [x,y,z]=e.origin,[sx,,sz]=e.size,alongX=sx>sz;
  insist((alongX?sz:sx)>=6,'DECK_TOO_NARROW');
  const length=alongX?sx:sz;
  const trim=Math.min(8,Math.floor(length/4)),span=length-2*trim;
  insist(span>=6&&supportBaseY<y-1,'FINISH_SPACE');
  const base=e.id.includes('horizontal')?'horizontal':'vertical';
  for(const side of [0,1]){
   const rail=alongX?
    [x+trim,feet,z+(side?sz:-1)]:
    [x+(side?sx:-1),feet,z+trim];
   const dims=alongX?[span,2,1]:[1,2,span];
   shapes.push(box('b159-'+base+'-glass-'+side,rail,dims,'glass'));
   shapes.push(box('b159-'+base+'-undertruss-'+side,
    alongX?[x+trim,y-1,z+(side?sz-1:0)]:
     [x+(side?sx-1:0),y-1,z+trim],
    alongX?[span,1,1]:[1,1,span],'metal'));
   shapes.push(box('b159-'+base+'-light-'+side,
    [rail[0]+(alongX?2:0),feet+2,rail[2]+(alongX?0:2)],
    alongX?[span-4,1,1]:[1,1,span-4],'glow'));
  }
  const center=alongX?
   [x+Math.floor(sx/2),supportBaseY,z+Math.floor(sz/2)]:
   [x+Math.floor(sx/2),supportBaseY,z+Math.floor(sz/2)];
  shapes.push(box('b159-'+base+'-support-pier',center,
   [2,y-supportBaseY,2],'metal'));
  // Overhead frame: well above two-cell headroom, purely decorative.
  const frame=alongX?
   [x+Math.floor(sx/2),feet+6,z-1]:
   [x-1,feet+6,z+Math.floor(sz/2)];
  shapes.push(box('b159-'+base+'-sky-arch',frame,
   alongX?[1,1,sz+2]:[sx+2,1,1],'accent'));
 }
 return shapes;
}
export function buildFinishedBentBridge(original,params,{supportBaseY=7}={}){
 insist(Number.isSafeInteger(supportBaseY)&&supportBaseY>=0,'SUPPORT_SETTING');
 const base=reviewBentBridge(original,params);
 const extra=decorate(base.selected.floor,params.start[1],supportBaseY);
 const finished={
  ...structuredClone(base.selected.candidate),
  id:'polaris-orbital-switchyard-generated-bent',
  title:'POLARIS — 自動選択されたL字空中回廊と巨大リング宇宙港',
  brief:'通行できない2種類のL字迂回候補から、床支持の証明された候補だけを採用。左右ガラス柵・光帯・床下梁・支柱・頭上フレーム付きの設計案。実ワールドでの安全と移動は未認証。',
  elements:[...structuredClone(base.selected.candidate.elements),...extra]
 };
 validateDesign(finished);
 insist(vals(finished.elements.slice(0,base.selected.candidate.elements.length),
  base.selected.candidate.elements),'CANDIDATE_CHANGED');
 const compiled=compileDesign(finished);
 insist(verifyCompiled(finished,compiled),'FINISHED_COMPILATION');
 const route=safeRoute(compiled,base.routeArgs);
 insist(route.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  route.targets[0].steps===base.selected.route.targets[0].steps&&
  route.targets[0].path.every(p=>p[1]===params.start[1]),
  'FINISH_OBSTRUCTS_BENT_ROUTE');
 const report={
  schema:'minecraftaibuilder-b159-finished-bent-v1',
  proposalReportSha256:base.report.sha256,selectedBend:base.selected.bend,
  finishedSourceSha256:compiled.sourceSha256,
  finishedGeometrySha256:compiled.geometrySha256,
  afterRouteSha256:route.sha256,
  moves:route.targets[0].steps,finishingElements:extra.length,
  floorBoxes:2,glassRails:4,underTrusses:4,
  lightStrips:4,pierDesigns:2,overheadArches:2,
  structuralStrengthCertified:false,playerCollisionCertified:false,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 return {...base,finished,compiled,route,finishingElements:extra,
  finishReport:{...report,sha256:sha(report)}};
}
export function verifyFinishedBentBridge(original,params,proof){
 try{
  const v=buildFinishedBentBridge(original,params);
  return vals(v.finishReport,proof)&&proof.constructionApproved===false&&
   proof.gates?.length===9&&proof.gates.every(g=>g==='BLOCKED')&&
   proof.BuildPlan.operations.length===0;
 }catch{return false;}
}
