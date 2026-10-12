/** B104: bounded alternating room/gallery co-design over five independent building types.
 * Input B100/B101/B102/B103 baselines are READ ONLY; all coordinates are imaginary local cells.
 * No Minecraft API, world connection, block command, or material certification.
 */
import {synthesizeRooms} from '../../b102/main/b102-synthesis-voxels.mjs';
import {planB103,auditB103} from '../../b103/main/b103-circulation-3d.mjs';
const ck=(x,z)=>x+','+z;
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
const square=p=>[{x:p.x,z:p.z},{x:p.x+1,z:p.z},{x:p.x,z:p.z+1},{x:p.x+1,z:p.z+1}];
const inner=(r,p)=>p.x>=r.x&&p.z>=r.z&&p.x<r.x+r.width&&p.z<r.z+r.depth;
const rects=r=>{const out=[];for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)out.push({x,z});return out;};
const order=(a,b)=>a.z-b.z||a.x-b.x;
function isSafe(c){
 return !!c&&c.constructionApproved===false&&c.worldCoordinates===null&&
 Array.isArray(c.blockOperations)&&c.blockOperations.length===0&&Array.isArray(c.floors)&&
 c.floors.length>0&&c.floors.every((f,i)=>f.level===i&&Array.isArray(f.gallery));
}
function cloneWithGallery(c,galleries){
 if(!isSafe(c)||!Array.isArray(galleries)||galleries.length!==c.floors.length)throw Error('B104_UNSAFE_GALLERY_INPUT');
 const result=structuredClone(c);
 for(let i=0;i<result.floors.length;i++)result.floors[i].gallery=galleries[i].map(p=>({x:p.x,z:p.z}));
 return result;
}
/** Generate a new geometric gallery from the floor mask and 3x3 core only, not the old gallery.
 * Corridor cells are a union of adjacent 2x2 squares; a graph search roots all spokes at the core.
 */
export function seedTwoWideGallery(f,core,shape='CROSS'){
 if(!['CROSS','BEND'].includes(shape)||!Array.isArray(f?.footprintRows))throw Error('B104_BAD_GALLERY_MODE');
 const rows=f.footprintRows,h=rows.length,w=rows[0]?.length;
 if(!w||rows.some(r=>r.length!==w||!/^[01]+$/.test(r)))throw Error('B104_BAD_FOOTPRINT');
 const anchors=new Map();
 for(let z=0;z<h-1;z++)for(let x=0;x<w-1;x++){
  const a={x,z};
  if(square(a).every(p=>rows[p.z]?.[p.x]==='1'&&!inner(core,p)))anchors.set(ck(x,z),a);
 }
 const cc=rects(core),adj=a=>square(a).some(p=>cc.some(q=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z)===1));
 const roots=[...anchors.values()].filter(adj).sort((a,b)=>{
  const dist=p=>Math.abs(p.x-core.x-1)+Math.abs(p.z-core.z-1);
  return dist(a)-dist(b)||order(a,b);
 });
 if(!roots.length)throw Error('B104_NO_CORE_GALLERY_SEED');
 const root=roots[shape==='CROSS'?0:roots.length-1],q=[root],seen=new Set([ck(root.x,root.z)]),
 prev=new Map([[ck(root.x,root.z),null]]);
 for(let i=0;i<q.length;i++)for(const [dx,dz]of dirs){
  const p=q[i],id=ck(p.x+dx,p.z+dz);
  if(!seen.has(id)&&anchors.has(id)){
   seen.add(id);prev.set(id,ck(p.x,p.z));q.push(anchors.get(id));
  }
 }
 const spokes=shape==='CROSS'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[-1,1],[-1,-1],[1,-1]];
 const chosen=new Set([ck(root.x,root.z)]);
 for(const [dx,dz]of spokes){
  const possible=q.map(p=>({p,score:(p.x-core.x)*dx+(p.z-core.z)*dz}))
   .sort((a,b)=>b.score-a.score||order(a.p,b.p));
  if(!possible.length)continue;
  let id=ck(possible[0].p.x,possible[0].p.z);
  while(id&&!chosen.has(id)){chosen.add(id);id=prev.get(id);}
 }
 const gallery=new Map();
 for(const id of chosen)for(const p of square(anchors.get(id)))gallery.set(ck(p.x,p.z),p);
 return [...gallery.values()].sort(order);
}
function safeGeometry(layout,plan,audit){
 return layout.placed===plan.summary.connectedRooms&&layout.unmet.length===0&&
 audit.solidAirCollisions===0&&audit.doorway2HighViolations===0&&
 audit.spiralProxyClearanceViolations===0;
}
function roomSignature(layout){
 return new Set(layout.floors.flatMap(f=>f.rooms.map(r=>
  f.level+'/'+r.purpose+'/'+r.x+'/'+r.z+'/'+r.width+'/'+r.depth)));
}
function changedRooms(base,trial){
 const seen=roomSignature(base);return [...roomSignature(trial)].filter(x=>!seen.has(x)).length;
}
function sumRoomNetArea(layout){return layout.floors.reduce((n,f)=>n+f.rooms.reduce((m,r)=>m+r.netInteriorArea,0),0);}
function candidateScore(layout,plan,audit,changes){
 // Hard constraints dominate any aesthetics or corridor-length proxy.
 const valid=safeGeometry(layout,plan,audit)?1:0;
 const exits=plan.summary.exteriorGroundPortalCandidates;
 return valid*1e9+layout.placed*1e6+plan.summary.connectedRooms*10000+
   (plan.summary.coreCount===2?2000:0)+exits*500+
   Math.min(1000,sumRoomNetArea(layout))*0.01+
   Math.min(100,changes)*0.4-
   plan.summary.regeneratedGalleryCells*0.05;
}
function compare(a,b){
 return b.score-a.score||a.profile.localeCompare(b.profile)||a.round-b.round;
}
function evaluate(c,programme,profile,round,reference){
 const layout=synthesizeRooms(c,programme),plan=planB103(c,layout),audit=auditB103(plan);
 const changes=reference?changedRooms(reference,layout):0;
 return {profile,round,source:c,layout,plan,audit,changes,
  score:candidateScore(layout,plan,audit,changes),
  safe:safeGeometry(layout,plan,audit)};
}
function footprintDifference(a,b){
 let diff=0,total=0;
 for(let i=0;i<a.floors.length;i++){
  const aa=new Set(a.floors[i].gallery.map(p=>ck(p.x,p.z)));
  const bb=new Set(b.floors[i].gallery.map(p=>ck(p.x,p.z)));
  const union=new Set([...aa,...bb]);total+=union.size;
  for(const id of union)if(aa.has(id)!==bb.has(id))diff++;
 }
 return {cellsDifferent:diff,unionCells:total};
}
/** Bounded alternating minimization:
 * propose gallery -> place rooms -> regenerate shortest circulation around placed rooms ->
 * re-place rooms against that corridor -> re-route/audit. Compare baseline+novel seeds.
 * This is NOT a globally optimal solution or a finished building.
 */
export function coDesignB104(candidate,programme,{includeBend=false,feedback=true}={}){
 if(!isSafe(candidate)||!Array.isArray(programme)||programme.length===0)throw Error('B104_UNSAFE_INPUT');
 if(typeof includeBend!=='boolean'||typeof feedback!=='boolean')throw Error('B104_BAD_OPTIONS');
 const profiles=['BASELINE','CROSS',...(includeBend?['BEND']:[])],proposals=[];
 let baseline=null;
 for(const profile of profiles){
  try{
   const source=profile==='BASELINE'?candidate:cloneWithGallery(candidate,candidate.floors.map(f=>
    seedTwoWideGallery(f,candidate.core,profile)));
   const first=evaluate(source,programme,profile,0,null);
   if(profile==='BASELINE')baseline=first.layout;
   first.changes=changedRooms(baseline??first.layout,first.layout);
   first.score=candidateScore(first.layout,first.plan,first.audit,first.changes);
   proposals.push(first);
   if(feedback){
    const revised=cloneWithGallery(source,first.plan.floors.map(f=>f.gallery));
    const next=evaluate(revised,programme,profile,1,baseline);
    proposals.push(next);
   }
  }catch(e){
   if(profile==='BASELINE')throw e;
   proposals.push({profile,round:-1,error:String(e),score:-Infinity,safe:false});
  }
 }
 // Preserve the original baseline as a fallback when a novel profile violates constraints.
 const sorted=proposals.filter(x=>x.layout).sort(compare);
 const best=sorted[0],base=proposals.find(x=>x.profile==='BASELINE'&&x.round===0);
 if(!best||!base)throw Error('B104_NO_BASELINE');
 const diff=footprintDifference(candidate,best.source),routed=best.plan.summary.connectedRooms;
 return {schema:'minecraftaibuilder-b104-co-design-v1',candidateId:candidate.id,
  strategy:best.profile,feedbackRound:best.round,searchProfiles:profiles,
  testedProposals:proposals.length,successfulProposals:proposals.filter(p=>p.safe).length,
  baseline:{placed:base.layout.placed,connected:base.plan.summary.connectedRooms,
   galleryCells:base.plan.summary.regeneratedGalleryCells},
  result:{requested:best.layout.requested,placed:best.layout.placed,connected:routed,
   unmet:best.layout.unmet,disconnected:best.layout.placed-routed,
   secondCore:best.plan.cores.length===2,coreCount:best.plan.cores.length,
   groundExitCandidates:best.plan.summary.exteriorGroundPortalCandidates,
   corridorCells:best.plan.summary.regeneratedGalleryCells,
   netRoomArea:sumRoomNetArea(best.layout),movedOrResizedRoomEnvelopes:changedRooms(base.layout,best.layout),
   inputGalleryCellDelta:diff.cellsDifferent,global3DCollisions:best.audit.solidAirCollisions,
   blockedDoorways:best.audit.doorway2HighViolations,
   obstructedStairProxies:best.audit.spiralProxyClearanceViolations,
   conceptualSafe:best.safe},
  experiments:proposals.map(p=>p.error?{profile:p.profile,round:p.round,error:p.error,safe:false}:
   {profile:p.profile,round:p.round,placed:p.layout.placed,connected:p.plan.summary.connectedRooms,
    coreCount:p.plan.cores.length,exitCandidates:p.plan.summary.exteriorGroundPortalCandidates,
    corridorCells:p.plan.summary.regeneratedGalleryCells,roomChanges:p.changes,safe:p.safe}),
  layout:best.layout,plan:best.plan,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,blockOperations:[],
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null},
  readonlyDesign:true,realStairsCertified:false,realExitsCertified:false,finishedInteriors:0};
}
export function drawB104Floor(result,level=0){
 if(!result?.readonlyDesign||result.constructionApproved!==false||result.worldContacts!==0||
 result.BuildPlan?.operations?.length!==0)throw Error('B104_UNSAFE_DRAW');
 const floor=result.plan.floors[level];
 if(!floor)throw Error('B104_UNKNOWN_FLOOR');
 const pic=floor.footprintRows.map(row=>[...row].map(ch=>ch==='1'?'.':' '));
 for(const r of floor.rooms)for(const p of rects(r))pic[p.z][p.x]='R';
 for(const p of floor.gallery)pic[p.z][p.x]='=';
 for(const c of floor.cores)for(const p of rects(c))pic[p.z][p.x]='C';
 for(const r of floor.rooms){const d=r.conceptualDoorOpening;pic[d.z][d.x]='D';}
 for(const e of floor.exits)for(const p of e.edge)pic[p.z][p.x]='E';
 return pic.map(row=>row.join('')).join('\n');
}