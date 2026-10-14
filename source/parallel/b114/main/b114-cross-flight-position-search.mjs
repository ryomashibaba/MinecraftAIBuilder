/**
 * B114 cross-flight tread/support clearance RE-DESIGN (OFFLINE only).
 * Search small source-preserving stair translations and 180-degree reversal,
 * validate B104 floor/room/core masks + 2-wide gallery junctions, then
 * recompute real 3D local AABB conflicts against ALL neighboring flights.
 * A switchback is only an escalation category until independently modelled.
 * Never writes source stairs, rooms, commands or world coordinates.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {straightFlight,intersects} from '../../b113/main/b113-geometry.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {transformStairBox,STAIR_GRID_FRAME_VERSION} from './b114-stair-grid-frame.mjs';
import {validateB114} from './compile-b114.mjs';
import {validateSupportRails} from './b114-stair-support-reprofile.mjs';

const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=p=>p.x+','+p.z;
const Q=p=>p.x+','+p.y+','+p.z;
const walk=[{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
const man=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const rect=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const collides=(a,b)=>a.some(x=>b.some(y=>intersects(x,y)));
const localSupports={
 LEFT:Array.from({length:5},(_,i)=>({x:i+1,y:-1,z:0,width:1,height:i+1,depth:.25})),
 RIGHT:Array.from({length:5},(_,i)=>({x:i+1,y:-1,z:1.75,width:1,height:i+1,depth:.25}))
};
function localBodies(f) {
 return f.samples.flatMap((p,i)=>{
  const b={x:p.x-.3,y:p.y,z:p.z-.3,width:.6,height:2,depth:.6};
  if(!i)return [b];
  const prev=f.samples[i-1];
  return [b,{x:Math.min(prev.x,p.x)-.3,y:Math.min(prev.y,p.y),
   z:Math.min(prev.z,p.z)-.3,
   width:Math.abs(prev.x-p.x)+.6,height:Math.abs(prev.y-p.y)+2,
   depth:Math.abs(prev.z-p.z)+.6}];
 });
}
function footprint(origin,ascent){
 const out=[];for(let i=0;i<7;i++)for(let w=0;w<2;w++)
  out.push({x:origin.x+ascent.dx*i-ascent.dz*w,
   z:origin.z+ascent.dz*i+ascent.dx*w});
 return out;
}
function interface2(landing,gallery){
 return landing.every(p=>walk.some(d=>gallery.has((p.x+d.x)+','+(p.z+d.z))));
}
function sourceCellClash(body,source){
 const hits=new Set();
 for(const a of body)
  for(let y=Math.floor(a.y);y<Math.ceil(a.y+a.height);y++)
   for(let z=Math.floor(a.z);z<Math.ceil(a.z+a.depth);z++)
    for(let x=Math.floor(a.x);x<Math.ceil(a.x+a.width);x++){
     const p=source.get(x+','+y+','+z);
     if(p&&intersects(a,{x,y,z,width:1,height:1,depth:1}))hits.add(Q(p));
    }
 return hits.size;
}
function floorAperture(link,body,design){
 const y=link.toLevel*5,top=design.plan.floors[link.toLevel],res=new Set();
 for(const a of body)if(a.y<y+1&&a.y+a.height>y)
  for(let z=Math.floor(a.z);z<Math.ceil(a.z+a.depth);z++)
   for(let x=Math.floor(a.x);x<Math.ceil(a.x+a.width);x++){
    if(top.footprintRows[z]?.[x]!=='1')continue;
    if(intersects(a,{x,y,z,width:1,height:1,depth:1}))
     res.add(x+','+z);
   }
 return res;
}
function drawCandidate(stair,origin,ascent,design,b113,foot,source,f,local) {
 const low=design.plan.floors[stair.fromLevel],high=design.plan.floors[stair.toLevel];
 const core=design.plan.cores[stair.coreIndex];
 if(!core||foot.length!==14||!foot.some(p=>rect(core,p)))return null;
 const others=design.plan.cores.filter((v,i)=>i!==stair.coreIndex);
 for(const p of foot)if(low.footprintRows[p.z]?.[p.x]!=='1'||
  high.footprintRows[p.z]?.[p.x]!=='1'||
  low.rooms.some(r=>rect(r,p))||high.rooms.some(r=>rect(r,p))||
  others.some(c=>rect(c,p)))return null;
 const joined={selected:{origin,ascent},fromLevel:stair.fromLevel,toLevel:stair.toLevel};
 const lf=b113.horizontalRoutes[stair.fromLevel].repair,
  hf=b113.horizontalRoutes[stair.toLevel].repair;
 const gl=new Set([...low.gallery,...lf.addedCells].map(K)),
  gh=new Set([...high.gallery,...hf.addedCells].map(K));
 const lowerLanding=foot.slice(0,2),upperLanding=foot.slice(-2);
 const lowLinked=interface2(lowerLanding,gl),highLinked=interface2(upperLanding,gh);
 const linked=lowLinked&&highLinked;
 if(stair.selected.hypotheticalInterfloorLink&&!linked)return null;
 const model={
  body:local.body.map(x=>transformStairBox(x,{origin,ascent,fromLevel:stair.fromLevel})),
  tread:local.solid.map(x=>transformStairBox(x,{origin,ascent,fromLevel:stair.fromLevel})),
  support:local.support.flatMap(side=>localSupports[side].map(x=>
   transformStairBox(x,{origin,ascent,fromLevel:stair.fromLevel})))
 };
 const sourceCollision=sourceCellClash(model.body,source);
 if(sourceCollision>0)return null;
 const apertures=floorAperture(joined,model.body,design);
 if([...apertures].some(k=>{
  const [x,z]=k.split(',').map(Number),p={x,z};
  return high.rooms.some(r=>rect(r,p));
 }))return null;
 return {origin,ascent,footprint:foot,lowerLanding,upperLanding,
  lowerLinked:lowLinked,upperLinked:highLinked,
  hypotheticalInterfloorLink:linked,
  upperFloorApertureCellCount:apertures.size,sourceStaticBodyClashes:sourceCollision,
  model,worldContacts:0,actualBlockStatesAssigned:false};
}
function conflict(a,b){
 const support=collides(a.model.support,b.model.body)||
  collides(b.model.support,a.model.body);
 const tread=collides(a.model.tread,b.model.body)||
  collides(b.model.tread,a.model.body);
 return {support,tread,any:support||tread};
}
function scoreState(stairs,states){
 const pairs=[],n=stairs.length;
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  if(stairs[i].fromLevel===stairs[j].fromLevel||
   Math.abs(stairs[i].fromLevel-stairs[j].fromLevel)>1)continue;
  const c=conflict(states[i],states[j]);
  if(c.any)pairs.push({first:i,second:j,
   supportBody:c.support,treadBody:c.tread});
 }
 return pairs;
}
function changedState(stairs,initial,current){
 return current.map((c,i)=>{
  const s=stairs[i],orig=initial[i];
  const changed=c.origin.x!==orig.origin.x||c.origin.z!==orig.origin.z||
   c.ascent.dx!==orig.ascent.dx||c.ascent.dz!==orig.ascent.dz;
  const reversed=c.ascent.dx===-orig.ascent.dx&&c.ascent.dz===-orig.ascent.dz;
  return {stairIndex:i,fromLevel:s.fromLevel,toLevel:s.toLevel,coreIndex:s.coreIndex,
   originalOrigin:orig.origin,proposedOrigin:c.origin,
   originalAscent:orig.ascent,proposedAscent:c.ascent,
   displacement:man(orig.origin,c.origin),reversed,
   changed,originalConditionalLinked:orig.hypotheticalInterfloorLink,
   proposedConditionalLinked:c.hypotheticalInterfloorLink,
   originalUpperFloorOpeningCells:orig.upperFloorApertureCellCount,
   proposedUpperFloorOpeningCells:c.upperFloorApertureCellCount,
   cells:c.footprint,lowerLanding:c.lowerLanding,upperLanding:c.upperLanding,
   physicalRiseCertified:false,sourceFloorChanged:false};
 });
}
function enumerate(stair,design,b113,source,f,local){
 const orig=stair.selected,d=orig.ascent,
  rear={dx:-d.dx,dz:-d.dz},
  reversedOrigin={x:orig.origin.x+6*d.dx-d.dz,
   z:orig.origin.z+6*d.dz+d.dx};
 const choices=[],seen=new Set();
 const seeds=[
  {origin:orig.origin,ascent:d,mode:'SAME_ASCENT'},
  {origin:reversedOrigin,ascent:rear,mode:'REVERSED_ASCENT'}
 ];
 for(const seed of seeds)for(let tz=-2;tz<=2;tz++)
  for(let tx=-2;tx<=2;tx++){
   if(Math.abs(tx)+Math.abs(tz)>2)continue;
   const origin={x:seed.origin.x+tx,z:seed.origin.z+tz};
   const cells=footprint(origin,seed.ascent);
   const key=seed.ascent.dx+','+seed.ascent.dz+':'+cells.map(K).sort().join('|');
   if(seen.has(key))continue;seen.add(key);
   const next=drawCandidate(stair,origin,seed.ascent,design,b113,cells,source,f,local);
   if(next){
    next.changeMode=seed.mode;
    next.translationDistance=Math.abs(tx)+Math.abs(tz);
    choices.push(next);
   }
  }
 // Baseline must match the frozen B114 selected source exactly.
 const first=choices.find(x=>x.origin.x===orig.origin.x&&
  x.origin.z===orig.origin.z&&x.ascent.dx===d.dx&&x.ascent.dz===d.dz);
 if(!first)throw Error('B114_STAIR_POSITION_BASELINE_FAILED_SOURCE_GUARDS');
 choices.sort((a,b)=>Number(a.changeMode==='REVERSED_ASCENT')-
    Number(b.changeMode==='REVERSED_ASCENT')||
    a.translationDistance-b.translationDistance||
    a.origin.z-b.origin.z||a.origin.x-b.origin.x);
 return {baseline:first,candidates:choices};
}
function runCase(c,design,b113,previous,flight,local){
 const id=c.id,sourceVolume=generateB105(design);
 const audit=auditB105(sourceVolume,design.plan);
 if(audit.issueCount||audit.envelopeConflicts)throw Error('B114_SEARCH_UNSAFE_B105:'+id);
 const source=new Map(sourceVolume.voxels.filter(p=>p.kind!=='EXTERIOR_PORTAL_VOID_PROXY')
  .map(p=>[Q(p),p]));
 const edges=previous.stairs,stairs=c.stairs;
 if(edges.length!==stairs.length)throw Error('B114_SEARCH_SOURCE_STAIRS_MISMATCH');
 const localSets=edges.map((s,i)=>({
  body:local.body,solid:flight.solids,
  support:s.railSides
 }));
 const options=stairs.map((s,i)=>enumerate(s,design,b113,source,flight,localSets[i]));
 const baseline=options.map(x=>x.baseline),current=[...baseline],
  initial=scoreState(stairs,baseline);
 if(initial.length!==previous.originalDistinctInterferencePairs&&
  initial.length!==previous.newDistinctInterferencePairs)
  throw Error('B114_SEARCH_BASELINE_UNEXPECTED_'+id);
 if(initial.length!==previous.newDistinctInterferencePairs||
  previous.remainingPairs.some(p=>!initial.some(x=>x.first===p.first&&
   x.second===p.second&&x.supportBody===p.supportBody&&x.treadBody===p.treadBody)))
  throw Error('B114_SEARCH_BASELINE_NOT_EQUAL_EDGE_RAIL_MODEL_'+id);
 const intersectsFootprint=(a,b)=>a.footprint.some(p=>b.footprint.some(q=>K(p)===K(q)));
 // If no previous conflicts, keep all 15 buildings source unchanged.
 let testedCandidates=options.reduce((n,c)=>n+c.candidates.length,0),attempted=0;
 function legal(index,candidate,others){
  if(candidate.sourceStaticBodyClashes>0)return false;
  for(let j=0;j<others.length;j++)if(j!==index&&
   stairs[j].fromLevel===stairs[index].fromLevel&&
   intersectsFootprint(candidate,others[j])&&
   !intersectsFootprint(baseline[index],baseline[j]))
   return false;
  return true;
 }
 function evaluate(next){
  attempted++;
  return scoreState(stairs,next);
 }
 let rounds=0,currentPairs=initial;
 while(rounds<8&&currentPairs.length){
  rounds++;
  let best=null;
  const touched=new Set(currentPairs.flatMap(p=>[p.first,p.second]));
  for(const i of touched)for(const cnd of options[i].candidates){
   if(cnd===current[i]||!legal(i,cnd,current))continue;
   const proposal=[...current];proposal[i]=cnd;
   const ps=evaluate(proposal);
   const changes=changedState(stairs,baseline,proposal);
   const moved=changes.filter(x=>x.changed).length;
   const travel=changes.reduce((n,x)=>n+x.displacement,0);
   if(ps.length>=currentPairs.length)continue;
   const rank={i,cnd,proposal,ps,moved,travel};
   if(!best||rank.ps.length<best.ps.length||
      rank.ps.length===best.ps.length&&(rank.moved<best.moved||
       rank.moved===best.moved&&rank.travel<best.travel))
    best=rank;
  }
  if(!best) {
   // Two adjacent flights may need to move together to be individually feasible.
   outer:
   for(const pair of currentPairs){
    const i=pair.first,j=pair.second;
    for(const a of options[i].candidates)for(const b of options[j].candidates){
     if(a===current[i]&&b===current[j])continue;
     const proposal=[...current];proposal[i]=a;proposal[j]=b;
     if(!legal(i,a,proposal)||!legal(j,b,proposal))continue;
     const ps=evaluate(proposal);
     if(ps.length>=currentPairs.length)continue;
     const changes=changedState(stairs,baseline,proposal),moved=changes.filter(x=>x.changed).length,
      travel=changes.reduce((n,x)=>n+x.displacement,0);
     const rank={proposal,ps,moved,travel};
     if(!best||ps.length<best.ps.length||
      ps.length===best.ps.length&&(moved<best.moved||
      moved===best.moved&&travel<best.travel))best=rank;
     if(ps.length===0)break outer;
    }
   }
  }
  if(!best)break;
  current.splice(0,current.length,...best.proposal);
  currentPairs=best.ps;
 }
 const proposed=changedState(stairs,baseline,current);
 if(proposed.some(x=>x.changed&&x.originalConditionalLinked&&!x.proposedConditionalLinked)||
  currentPairs.length>initial.length)
  throw Error('B114_STAIR_SEARCH_NONREGRESSION_FAILED:'+id);
 const allRemaining=currentPairs.map(p=>({...p,
  correctiveCategory:p.treadBody?'REPROFILE_FLIGHT_TREAD_OR_SWITCHBACK_3D_REQUIRED':
   'RAIL_AND_CIRCULATION_TOPOLOGY_ADJUSTMENT_REQUIRED'}));
 return {id,stairLinks:stairs.length,
  originalConflicts:initial.length,
  originalTreadConflicts:initial.filter(x=>x.treadBody).length,
  originalSupportConflicts:initial.filter(x=>x.supportBody).length,
  remainingConflicts:currentPairs.length,
  remainingTreadConflicts:currentPairs.filter(x=>x.treadBody).length,
  remainingSupportConflicts:currentPairs.filter(x=>x.supportBody).length,
  independentlyEliminatedConflicts:initial.length-currentPairs.length,
  candidateLocalPlacementsExamined:testedCandidates,
  trial3DPairSetsEvaluated:attempted,
  localSearchRounds:rounds,
  shiftedOrReversedFlights:proposed.filter(x=>x.changed).length,
  proposedOriginalStairs:proposed,
  remainingPairs:allRemaining,
  switchbackResearchHeld:currentPairs.some(x=>x.treadBody),
  originalBuildingUnchanged:true,
  sourceStairsRelocated:false,realDoorAndStairPhysicsCertified:false};
}
export function searchB114CrossFlightRepairs(parent,b113,b114,stack,edgeRail){
 if(!validateB114(b114)||!validateSupportRails(edgeRail)||
  parent?.sourceDesigns?.length!==15||
  edgeRail.sourceB114Integrity!==b114.integritySha256||
  stack?.sourceB114IntegritySha256!==b114.integritySha256||
  edgeRail.gridFrameVersion!==STAIR_GRID_FRAME_VERSION||
  edgeRail.totals.proposedTotalInterferencePairs!==13||
  edgeRail.readiness!=='NOT_PREPARED'||
  edgeRail.gates?.length!==9||edgeRail.gates.some(g=>g.status!=='BLOCKED')||
  edgeRail.BuildPlan?.operations?.length!==0)
  throw Error('B114_STAIR_SEARCH_REQUIRES_SOURCE_SAFE_MODEL');
 const flight=straightFlight(),local={body:localBodies(flight)};
 if(flight.rise!==5||flight.width!==2||flight.executable!==false)
  throw Error('B114_STAIR_SEARCH_FLIGHT_CHANGED');
 const results=b114.cases.map(c=>{
  const design=parent.sourceDesigns.find(x=>x.candidateId===c.id),
   reference=b113.cases.find(x=>x.id===c.id),
   prior=edgeRail.cases.find(x=>x.id===c.id);
  if(!design||!reference||!prior)throw Error('B114_STAIR_SEARCH_MISSING_CASE:'+c.id);
  return runCase(c,design,reference,prior,flight,local);
 });
 const sum=k=>results.reduce((n,c)=>n+c[k],0);
 const totals={
  buildings:results.length,stairLinks:sum('stairLinks'),
  initialInterferencePairs:sum('originalConflicts'),
  afterSearchInterferencePairs:sum('remainingConflicts'),
  removedByConservativePositionSearch:sum('independentlyEliminatedConflicts'),
  unresolvedTreadInterferencePairs:sum('remainingTreadConflicts'),
  unresolvedSupportInterferencePairs:sum('remainingSupportConflicts'),
  candidatePlacementsScreened:sum('candidateLocalPlacementsExamined'),
  candidate3DPairSetsScored:sum('trial3DPairSetsEvaluated'),
  designOnlyReorientedFlights:sum('shiftedOrReversedFlights'),
  actualPhysicalTreadValidations:0,actualSourceEdits:0,
  worldContacts:0,constructionCommands:0};
 if(totals.buildings!==15||totals.stairLinks!==102||
  totals.initialInterferencePairs!==edgeRail.totals.proposedTotalInterferencePairs||
  totals.afterSearchInterferencePairs>totals.initialInterferencePairs)
  throw Error('B114_STAIR_SEARCH_AGGREGATE_REGRESSION');
 const payload={schema:'minecraftaibuilder-b114-cross-flight-position-study-v1',
  sourceB114Integrity:b114.integritySha256,
  sourceEdgeSupportIntegrity:edgeRail.integritySha256,
  gridFrameVersion:STAIR_GRID_FRAME_VERSION,
  cases:results,totals,
  mode:'SMALL_LOCAL_TRANSLATION_OR_REVERSED_STRAIGHT_2x7_ONLY',
  sourceFootprintMaskRoomCoreAndTwoGalleryInterfacesRechecked:true,
  collisionAuditIncludesAllAdjacentFloorFlights:true,
  galleryConnectivityNeverDowngradedFromSource:true,
  switchbackGeometryPhysicallyModelled:false,
  switchbackBlockPalettesAssigned:false,
  sourceGeometryUnmodified:true,proposalsAppliedToOriginal:false,
  constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(x=>({...x})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...payload,integritySha256:sha(payload)};
}
export function validateCrossFlightSearch(x){
 try{
  const {integritySha256,...rest}=x;
  return sha(rest)===integritySha256&&
   x.schema==='minecraftaibuilder-b114-cross-flight-position-study-v1'&&
   x.sourceB114Integrity?.length===64&&x.sourceEdgeSupportIntegrity?.length===64&&
   x.gridFrameVersion===STAIR_GRID_FRAME_VERSION&&
   x.totals.buildings===15&&x.totals.stairLinks===102&&
   x.totals.initialInterferencePairs===13&&
   x.totals.afterSearchInterferencePairs<=13&&
   x.cases.length===15&&
   x.cases.every(c=>c.originalBuildingUnchanged===true&&
    c.sourceStairsRelocated===false&&
    c.remainingPairs.length===c.remainingConflicts&&
    c.proposedOriginalStairs.length===c.stairLinks)&&
   x.sourceGeometryUnmodified===true&&x.proposalsAppliedToOriginal===false&&
   x.switchbackGeometryPhysicallyModelled===false&&
   x.totals.actualSourceEdits===0&&x.totals.worldContacts===0&&
   x.totals.constructionCommands===0&&
   x.readiness==='NOT_PREPARED'&&x.constructionApproved===false&&
   x.executionAllowed===false&&x.worldContacts===0&&
   x.worldCoordinates===null&&x.commandCount===0&&
   x.gates.length===9&&x.gates.every(g=>g.status==='BLOCKED')&&
   x.BuildPlan.status==='NOT_PREPARED'&&x.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeCrossFlightSearch(x,output) {
 if(!validateCrossFlightSearch(x))throw Error('B114_STAIR_SEARCH_UNSAFE_REPORT');
 fs.mkdirSync(output,{recursive:true});
 const json=path.join(output,'B114_15_Buildings_CrossFlight_Position_Study.json'),
  csv=path.join(output,'B114_15_Buildings_CrossFlight_Remaining.csv'),
  md=path.join(output,'B114_15_Buildings_CrossFlight_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(x,null,2)+'\n');
 const keys=['id','stairLinks','originalConflicts','remainingConflicts',
  'independentlyEliminatedConflicts','originalTreadConflicts','remainingTreadConflicts',
  'originalSupportConflicts','remainingSupportConflicts',
  'candidateLocalPlacementsExamined','trial3DPairSetsEvaluated','shiftedOrReversedFlights'];
 fs.writeFileSync(csv,keys.join(',')+'\n'+x.cases.map(c=>
  keys.map(k=>c[k]).join(',')).join('\n')+'\n');
 const t=x.totals;
 fs.writeFileSync(md,[
 '# B114 — 上下階階段の移設・反転候補の独立3D検査（設計のみ）','',
 'B113/B114既存の2×7階段を、小規模移動または進行方向反転で探索。',
 '元設計の上下階床マスク・部屋・ほかの階段コアを保護し、各階段の両端2セルが廊下に接するか独立に検証。',
 '従来の条件付き廊下接続が壊れる案は除外。上下階すべての階段間の身体包絡と踏み面、床接続型支持体を再計算。',
 '折返し階段は実3D形状が未設計なので別の課題として表示し、成立を捏造しない。','',
 '|項目|結果|','|---|---:|',
 '|建物|'+t.buildings+'|','|階段接続|'+t.stairLinks+'|',
 '|既存側面支持案で残った干渉組|'+t.initialInterferencePairs+'|',
 '|位置調整後、残る干渉組|'+t.afterSearchInterferencePairs+'|',
 '|削減した干渉組|'+t.removedByConservativePositionSearch+'|',
 '|うち踏み面と体が交差する残留組|'+t.unresolvedTreadInterferencePairs+'|',
 '|候補の2D位置・向きスクリーニング件数|'+t.candidatePlacementsScreened+'|',
 '|3D組合せ再検証の回数|'+t.candidate3DPairSetsScored+'|',
 '|移設・反転を提案する階段|'+t.designOnlyReorientedFlights+'|',
 '|実機の階段通行認証|0|','',
 '## 建物別の未解決',
 ...x.cases.filter(c=>c.originalConflicts>0).flatMap(c=>[
  '### '+c.id+'：'+c.originalConflicts+'→'+c.remainingConflicts+'組',
  ...c.remainingPairs.map(p=>'- '+p.first+'-'+p.second+'：'+
    (p.treadBody?'踏み面自体の衝突、折返し/別形状の設計が必要':'支持体と他階段通路の交差')),
  '- 移設または向き反転の提案は'+c.shiftedOrReversedFlights+'接続（元データには未反映）',''
 ]),
 '## 安全・未認証','',
 '移設案の通行幅・床開口の3Dセルは出力しているが、床開口と支持床の実施工はしていない。',
 '折返し・踊り場・Education階段の実衝突・ブロック向き・荷重・歩行は未認証。',
 'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}