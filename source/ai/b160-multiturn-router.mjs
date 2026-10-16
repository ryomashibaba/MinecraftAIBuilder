/**
 * B160 — bounded 3-turn local-voxel skybridge proposals.
 * Checks 8-wide candidate BODY clearance against the ORIGINAL design, then
 * compiles the new floor and replays B152 whole-cell 2x2 route. Uses no
 * world coordinates, SocketBE adapters, commands, network or Minecraft writes.
 */
import {createHash} from 'node:crypto';
import {validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from './b152-footprint-review.mjs';
export const SCHEMA='minecraftaibuilder-b160-multiturn-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const yes=(v,name)=>{if(!v)throw Error('B160_'+name);};
const key=(x,y,z)=>x+','+y+','+z;
const box=(id,origin,size,material='concrete')=>({id,shape:'box',mode:'add',material,origin,size});
const pt=x=>Array.isArray(x)&&x.length===3&&x.every(v=>Number.isSafeInteger(v)&&v>=0&&v<=127);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export const DOPPLER_ROUTE=Object.freeze({
 start:[24,19,20],goal:[67,19,78],footprintWidth:2,footprintDepth:2,
 corridorWidth:8,maxCandidates:450
});
function routeArgs(p){return {
 start:p.start,destinations:[{id:'destination',at:p.goal}],
 width:p.footprintWidth,depth:p.footprintDepth,headroom:2
};}
function reviewRoute(scene,args){
 const r=analyzeFootprint(scene,args);
 yes(verifyFootprint(scene,args,r),'UNVERIFIED_ROUTE');
 return r;
}
function validateParams(d,p){
 validateDesign(d);
 yes(d.designOnly===true&&p&&pt(p.start)&&pt(p.goal)&&
  p.start[1]===p.goal[1]&&p.start[1]>=4&&
  p.start[0]!==p.goal[0]&&p.start[2]!==p.goal[2]&&
  Number.isSafeInteger(p.footprintWidth)&&p.footprintWidth>=2&&p.footprintWidth<=4&&
  Number.isSafeInteger(p.footprintDepth)&&p.footprintDepth>=2&&p.footprintDepth<=4&&
  Number.isSafeInteger(p.corridorWidth)&&p.corridorWidth>=6&&p.corridorWidth<=10&&
  p.corridorWidth>=Math.max(p.footprintWidth,p.footprintDepth)+2&&
  Number.isSafeInteger(p.maxCandidates)&&p.maxCandidates>=1&&p.maxCandidates<=600,
  'PARAMETERS');
}
function segments(p,viaX,viaZ){
 const {start:a,goal:b,corridorWidth:w,footprintWidth:fw,footprintDepth:fd}=p;
 const pad=Math.floor((w-1)/2),y=a[1]-2;
 const h=(name,x0,x1,z)=>box('b160-'+name,
  [Math.min(x0,x1),y,z-pad],
  [Math.abs(x1-x0)+fw,2,w]);
 const v=(name,x,z0,z1)=>box('b160-'+name,
  [x-pad,y,Math.min(z0,z1)],
  [w,2,Math.abs(z1-z0)+fd]);
 return [
  h('leg-entry-x',a[0],viaX,a[2]),
  v('leg-first-z',viaX,a[2],viaZ),
  h('leg-cross-x',viaX,b[0],viaZ),
  v('leg-exit-z',b[0],viaZ,b[2])
 ];
}
function searchChoices(p,d){
 const margin=p.corridorWidth+2,axis=d.bounds.width,depth=d.bounds.depth;
 const x=[],z=[];
 for(let step=4;step<=40;step+=4)
  for(const sign of [-1,1]){
   const a=p.start[0]+step*sign;
   if(a>=margin&&a<=axis-margin&&!x.includes(a))x.push(a);
  }
 for(let step=2;step<=26;step+=2)
  for(const sign of [1,-1]){
   const a=p.goal[2]+step*sign;
   if(a>=margin&&a<=depth-margin&&!z.includes(a))z.push(a);
  }
 const choices=[];
 for(const viaX of x)for(const viaZ of z){
  if(viaX===p.start[0]||viaX===p.goal[0]||viaZ===p.start[2]||viaZ===p.goal[2])continue;
  const floors=segments(p,viaX,viaZ);
  const cost=Math.abs(viaX-p.start[0])+Math.abs(viaZ-p.start[2])+
   Math.abs(p.goal[0]-viaX)+Math.abs(p.goal[2]-viaZ);
  choices.push({viaX,viaZ,cost,floors});
 }
 choices.sort((a,b)=>a.cost-b.cost||a.viaX-b.viaX||a.viaZ-b.viaZ);
 return choices;
}
function preflight(originalSolids,parts,standingY,d){
 for(const e of parts){
  const [x,y,z]=e.origin,[sx,sy,sz]=e.size;
  if(x<0||z<0||x+sx>d.bounds.width||z+sz>d.bounds.depth||
   y<0||y+sy>=d.bounds.height)return 'BOUNDS';
  for(let zz=z;zz<z+sz;zz++)for(let xx=x;xx<x+sx;xx++)
   if(originalSolids.has(key(xx,standingY,zz))||
    originalSolids.has(key(xx,standingY+1,zz)))
    return 'EXISTING_BODY_OCCUPANCY';
 }
 return null;
}
function finishing(floors,standingY,supportBaseY){
 const result=[];
 for(const e of floors){
  const [x,y,z]=e.origin,[sx,,sz]=e.size,alongX=sx>sz,long=alongX?sx:sz,short=alongX?sz:sx;
  if(long<26||short<6)continue; // keep corners open; not a certified handrail
  const trim=10,span=long-2*trim;
  const tag=e.id.replace('b160-leg-','');
  for(const side of [0,1]){
   const outer=alongX?[x+trim,standingY,z+(side?sz:-1)]:
    [x+(side?sx:-1),standingY,z+trim];
   result.push(box('b160-'+tag+'-guard-'+side,outer,
    alongX?[span,2,1]:[1,2,span],'glass'));
   result.push(box('b160-'+tag+'-beam-'+side,
    alongX?[x+trim,y-1,z+(side?sz-1:0)]:[x+(side?sx-1:0),y-1,z+trim],
    alongX?[span,1,1]:[1,1,span],'metal'));
   result.push(box('b160-'+tag+'-light-'+side,
    [outer[0]+(alongX?2:0),standingY+2,outer[2]+(alongX?0:2)],
    alongX?[span-4,1,1]:[1,1,span-4],'glow'));
  }
  result.push(box('b160-'+tag+'-pier',
   [x+Math.floor(sx/2),supportBaseY,z+Math.floor(sz/2)],
   [2,y-supportBaseY,2],'metal'));
  result.push(box('b160-'+tag+'-overhead',
   alongX?[x+Math.floor(sx/2),standingY+6,z-1]:
    [x-1,standingY+6,z+Math.floor(sz/2)],
   alongX?[1,1,sz+2]:[sx+2,1,1],'accent'));
 }
 return result;
}
export function planMultiturnSkybridge(original,params=DOPPLER_ROUTE,{supportBaseY=7}={}){
 validateParams(original,params);
 yes(Number.isSafeInteger(supportBaseY)&&supportBaseY>=0&&
  supportBaseY<params.start[1]-3,'UNSAFE_SUPPORT_BASE');
 const source=compileDesign(original);
 yes(verifyCompiled(original,source)&&source.readiness==='NOT_PREPARED'&&
  source.worldContacts===0&&source.BuildPlan.operations.length===0,'SOURCE_NOT_SAFE');
 const args=routeArgs(params),before=reviewRoute(source,args);
 yes(before.targets[0].status==='FOOTPRINT_UNREACHABLE','NOT_DISCONNECTED');
 const solids=new Set(source.primitives.map(p=>key(p[0],p[1],p[2])));
 const candidateChoices=searchChoices(params,original);
 const examined=[];let chosen=null,route=null,sourceCandidate=null,compiledCandidate=null;
 for(const item of candidateChoices.slice(0,params.maxCandidates)){
  const blocked=preflight(solids,item.floors,params.start[1],original);
  if(blocked){examined.push({viaX:item.viaX,viaZ:item.viaZ,status:blocked});continue}
  try{
   const c={...structuredClone(original),
    id:'doppler-switchback-b160-floor-candidate',
    title:'DOPPLER — 多重折返し候補床のみ',
    brief:'障害物の既存体積を横断しない4本の幅広デッキ設計。建築図形と経路の再検証用。Minecraftの施工・人の歩行を認証しない。',
    elements:[...structuredClone(original.elements),...item.floors]};
   validateDesign(c);
   const v=compileDesign(c);
   yes(verifyCompiled(c,v),'CANDIDATE_COMPILE');
   const r=reviewRoute(v,args);
   examined.push({viaX:item.viaX,viaZ:item.viaZ,
    status:r.targets[0].status,steps:r.targets[0].steps});
   if(r.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
    r.targets[0].path.every(p=>p[1]===params.start[1])){
    chosen=item;route=r;sourceCandidate=c;compiledCandidate=v;break;
   }
  }catch(e){examined.push({viaX:item.viaX,viaZ:item.viaZ,
   status:'CANDIDATE_INVALID',reason:String(e.message).slice(0,120)})}
 }
 yes(chosen&&route&&sourceCandidate&&compiledCandidate,'NO_VALID_MULTITURN_CORRIDOR');
 const added=finishing(chosen.floors,params.start[1],supportBaseY);
 yes(added.length>=8,'NO_MEANINGFUL_ARCHITECTURAL_FINISH');
 const finished={...structuredClone(sourceCandidate),
  id:'doppler-switchback-terminal-generated-detour',
  title:'DOPPLER — 自動障害物回避の多重折返し空中回廊',
  brief:'直線や単純なL字では繋がらない高架ターミナルを、多数候補から通行可能な4区間回廊で結ぶ建築案。柱・ガラス柵・発光帯・門型フレーム付き。構造安全やMinecraft実機移動は未認証。',
  elements:[...structuredClone(sourceCandidate.elements),...added]};
 validateDesign(finished);
 yes(same(finished.elements.slice(0,sourceCandidate.elements.length),
  sourceCandidate.elements),'SOURCE_HISTORY_MUTATED');
 const compiled=compileDesign(finished);
 yes(verifyCompiled(finished,compiled)&&
  compiled.geometrySha256!==compiledCandidate.geometrySha256,'FINISH_NOT_REAL');
 const after=reviewRoute(compiled,args);
 yes(after.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  after.targets[0].path.every(p=>p[1]===params.start[1]),
  'FINISH_BLOCKED_ROUTE');
 const path=after.targets[0].path, turns=path.slice(2).reduce((n,p,i)=>{
  const prior=path[i+1],prevprev=path[i];
  return n+((p[0]-prior[0]!==prior[0]-prevprev[0]||
     p[2]-prior[2]!==prior[2]-prevprev[2])?1:0)
 },0);
 const report={schema:SCHEMA,
  sourceSha256:source.sourceSha256,
  sourceGeometrySha256:source.geometrySha256,
  initialProofSha256:before.sha256,
  floorCandidateSha256:compiledCandidate.sourceSha256,
  selectedFloorGeometrySha256:compiledCandidate.geometrySha256,
  completedDesignSha256:compiled.sourceSha256,
  completedGeometrySha256:compiled.geometrySha256,
  candidateRouteProofSha256:route.sha256,finishedRouteProofSha256:after.sha256,
  examinedCandidateCount:examined.length,chosenWaypoints:{viaX:chosen.viaX,viaZ:chosen.viaZ},
  rawCorridorLength:chosen.cost,verifiedFlatMoves:after.targets[0].steps,
  verifiedPathDirectionChanges:turns,floorSegments:chosen.floors.length,
  finishingElements:added.length,preflightCheckedOriginalSolidCells:true,
  full2x2AfterFinish:true,structuralStrengthCertified:false,
  handrailsCertified:false,playerCollisionCertified:false,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 return {source,before,chosen,examined,sourceCandidate,compiledCandidate,
  route,finished,compiled,after,finishingElements:added,
  report:{...report,sha256:sha(report)}};
}
export function verifyMultiturnSkybridge(original,params,proof){
 try{const r=planMultiturnSkybridge(original,params);
 return same(r.report,proof)&&proof.constructionApproved===false&&
  proof.gates?.length===9&&proof.gates.every(v=>v==='BLOCKED')&&
  proof.BuildPlan?.operations.length===0;}
 catch{return false;}
}
