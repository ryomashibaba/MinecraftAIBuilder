/**
 * B114 ground-connected EDGE-RAIL stair support study.
 * Floor-bearing edge piers replace the over-wide five full support columns
 * ONLY in a reversible local hypothesis. No operation or building changes.
 * Cross-flight tread/body conflicts remain explicitly unresolved.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {straightFlight,intersects} from '../../b113/main/b113-geometry.mjs';
import {transformStairBox,STAIR_GRID_FRAME_VERSION} from './b114-stair-grid-frame.mjs';
import {validateB114} from './compile-b114.mjs';
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const hit=(a,b)=>a.some(p=>b.some(q=>intersects(p,q)));
function sweep(f){
 return f.samples.flatMap((p,i)=>{
  const here={x:p.x-.3,y:p.y,z:p.z-.3,width:.6,height:2,depth:.6};
  if(!i)return [here];
  const prev=f.samples[i-1];
  return [here,{x:Math.min(prev.x,p.x)-.3,y:Math.min(prev.y,p.y),
   z:Math.min(prev.z,p.z)-.3,width:Math.abs(prev.x-p.x)+.6,
   height:Math.abs(prev.y-p.y)+2,depth:Math.abs(prev.z-p.z)+.6}];
 });
}
const stage=(a,stair)=>a.map(b=>transformStairBox(b,{...stair.selected,fromLevel:stair.fromLevel}));
const key=s=>s.fromLevel+':'+s.coreIndex;
const sideBoxes=side=>Array.from({length:5},(_,i)=>({
 x:i+1,y:-1,z:side==='LEFT'?0:1.75,
 width:1,height:i+1,depth:.25}));
const bySide={LEFT:sideBoxes('LEFT'),RIGHT:sideBoxes('RIGHT')};
function bestBuilding(c,prior,flight){
 const stairs=c.stairs;
 if(stairs.some(s=>!s.selected))throw Error('B114_RAIL_UNRESERVED_STAIRS:'+c.id);
 const sweepShapes=sweep(flight),original=flight.supports,solids=flight.solids;
 const shapes=stairs.map(s=>({
  body:stage(sweepShapes,s),
  original:stage(original,s),
  solid:stage(solids,s),
  left:stage(bySide.LEFT,s),
  right:stage(bySide.RIGHT,s)
 }));
 const pairs=[];
 for(let i=0;i<stairs.length;i++)for(let j=i+1;j<stairs.length;j++){
  if(stairs[i].fromLevel===stairs[j].fromLevel||
   Math.abs(stairs[i].fromLevel-stairs[j].fromLevel)>1)continue;
  const A=shapes[i],B=shapes[j];
  const baselineSupport=hit(A.original,B.body)||hit(B.original,A.body);
  const tread=hit(A.solid,B.body)||hit(B.solid,A.body);
  const support=Array.from({length:4},(_,n)=>{
   const ai=(n>>1)?A.right:A.left,bj=(n&1)?B.right:B.left;
   return hit(ai,B.body)||hit(bj,A.body);
  });
  pairs.push({i,j,baselineSupport,tread,
   matrix:[support.slice(0,2),support.slice(2,4)]});
 }
 const baselinePairs=pairs.filter(p=>p.baselineSupport||p.tread).length;
 const sourcePairs=prior.collisionPairs;
 if(baselinePairs!==prior.modelledCrossFlightCollisionPairs||
  pairs.filter(p=>p.tread).length!==prior.modelledSolidBodyCollisionPairs||
  baselinePairs!==sourcePairs.length||
  sourcePairs.some(p=>{
   const i=p.first.index,j=p.second.index;
   const ours=pairs.find(v=>v.i===i&&v.j===j);
   return !ours||ours.baselineSupport!==p.proposedSupportVsBody||
    ours.tread!==p.stairSolidVsBody;
  }))
  throw Error('B114_RAIL_INDEPENDENT_BASELINE_MISMATCH:'+c.id);
 // Exact 2^N one-sided assignments (N<=10 for frozen 15 designs).
 // Minimize total distinct interference pairs first; then support-only
 // interactions, then deterministic minimal index order.
 const n=stairs.length;
 if(n>16)throw Error('B114_RAIL_EXACT_SEARCH_LIMIT');
 let winner=null,enumerated=0;
 for(let bits=0;bits<2**n;bits++){
  let collisions=0,postBody=0;
  for(const p of pairs){
   const conflict=p.matrix[(bits>>p.i)&1][(bits>>p.j)&1];
   if(conflict)postBody++;
   if(conflict||p.tread)collisions++;
  }
  enumerated++;
  if(!winner||collisions<winner.pairs||
   collisions===winner.pairs&&postBody<winner.postBody){
   winner={bits,pairs:collisions,postBody};
  }
 }
 const choices=Array.from({length:n},(_,i)=>new Set([(winner.bits>>i)&1?'RIGHT':'LEFT']));
 // Add a second grounded edge-rail only if it causes NO more support/body
 // intersections. This strengthens the conceptual support footprint.
 function countCurrent(){
  let postBody=0,union=0;
  for(const p of pairs){
   let support=false;
   for(const i of choices[p.i])for(const j of choices[p.j])
    if(p.matrix[i==='RIGHT'?1:0][j==='RIGHT'?1:0])support=true;
   if(support)postBody++;
   if(support||p.tread)union++;
  }
  return {supportPairs:postBody,allPairs:union};
 }
 const beforeDual=countCurrent();
 for(let i=0;i<n;i++){
  const existing=[...choices[i]][0],other=existing==='LEFT'?'RIGHT':'LEFT';
  choices[i].add(other);
  const next=countCurrent();
  if(next.supportPairs!==beforeDual.supportPairs||next.allPairs!==beforeDual.allPairs)
   choices[i].delete(other);
 }
 const final=countCurrent(),issues=[];
 const model=shapes.map((shape,i)=>{
  const chosen=[...choices[i]],boxes=chosen.flatMap(side=>shape[side.toLowerCase()]);
  // Each support pier must start at the source floor slab elevation,
  // meet the underside of its designated lower tread, and stay out
  // of the OWN stair's approximate player body swept envelope.
  const local=chosen.flatMap(side=>bySide[side]);
  const floorY=stairs[i].fromLevel*5,ownCollision=hit(boxes,shape.body);
  const groundContact=local.every((p,j)=>boxes[j].y===floorY);
  const continuity=local.every(p=>p.y===-1&&p.y+p.height===p.x-1);
  const undersideFaceContact=local.every(p=>{
   const tread=flight.solids.find(q=>q.x===p.x&&q.y===p.x-1&&q.width===1);
   return Boolean(tread)&&p.y+p.height===tread.y;
  });
  if(ownCollision||!groundContact||!continuity||!undersideFaceContact)
   issues.push({index:i,ownCollision,groundContact,continuity,undersideFaceContact});
  return {index:i,fromLevel:stairs[i].fromLevel,toLevel:stairs[i].toLevel,
   coreIndex:stairs[i].coreIndex,
   railSides:chosen.sort(),pierBoxes:boxes,originalFullSupportBoxes:shape.original.length,
   fullColumnsOmitted:shape.original.length,
   proposedGroundedSupportPiers:boxes.length,
   floorContactAtSourceLevel:groundContact,
   undersideTreadFaceContact:undersideFaceContact,
   internallyContinuousFootings:continuity,
   selfSweptPlayerCollision:ownCollision,
   actualStructureCertified:false,educationBlocksAssigned:false,
   changesToOriginalGeometry:0};
 });
 if(issues.length)throw Error('B114_RAIL_INTERNAL_SUPPORT_INVARIANT:'+c.id+':'+JSON.stringify(issues.slice(0,3)));
 const still=[];
 for(const p of pairs){
  let support=false;
  for(const a of choices[p.i])for(const b of choices[p.j])
   if(p.matrix[a==='RIGHT'?1:0][b==='RIGHT'?1:0])support=true;
  if(support||p.tread)still.push({first:p.i,second:p.j,
   supportBody:support,treadBody:p.tread,
   requiresFlightRelocationOrTurn:p.tread});
 }
 if(still.length!==final.allPairs||
  final.allPairs>baselinePairs||final.supportPairs>pairs.filter(p=>p.baselineSupport).length)
  throw Error('B114_RAIL_NO_IMPROVEMENT_OR_TALLY_MISMATCH');
 return {id:c.id,stairLinks:n,pairComparisons:pairs.length,
  originalSupportBodyPairs:pairs.filter(p=>p.baselineSupport).length,
  originalTreadBodyPairs:pairs.filter(p=>p.tread).length,
  originalDistinctInterferencePairs:baselinePairs,
  newSupportBodyPairs:final.supportPairs,
  newTreadBodyPairs:pairs.filter(p=>p.tread).length,
  newDistinctInterferencePairs:final.allPairs,
  supportOnlyConflictsEliminated:baselinePairs-final.allPairs,
  exactSingleRailAssignmentsExamined:enumerated,
  dualRailFlights:model.filter(x=>x.railSides.length===2).length,
  singleRailFlights:model.filter(x=>x.railSides.length===1).length,
  groundConnectedDesignOnly:true,
  supportBoxesRemainPhysicallyUnverified:true,
  stairs:model,remainingPairs:still};
}
export function designB114SupportRails(b114,stack){
 if(!validateB114(b114)||
  stack?.schema!=='minecraftaibuilder-b114-vertical-stack-audit-v1'||
  stack.sourceB114IntegritySha256!==b114.integritySha256||
  stack.gridFrameVersion!==STAIR_GRID_FRAME_VERSION||
  stack.cases?.length!==15||stack.readiness!=='NOT_PREPARED'||
  stack.constructionApproved!==false||stack.executionAllowed!==false||
  stack.worldContacts!==0||stack.worldCoordinates!==null||
  stack.commandCount!==0||stack.gates?.length!==9||
  stack.gates.some(x=>x.status!=='BLOCKED')||
  stack.BuildPlan?.operations?.length!==0)
  throw Error('B114_RAIL_REQUIRES_VERIFIED_SAFE_STACK');
 const flight=straightFlight();
 if(flight.rise!==5||flight.width!==2||flight.executable!==false)
  throw Error('B114_RAIL_FLIGHT_SOURCE_CHANGED');
 const cases=b114.cases.map(c=>{
  const prior=stack.cases.find(s=>s.id===c.id);
  if(!prior)throw Error('B114_RAIL_MISSING_CASE:'+c.id);
  return bestBuilding(c,prior,flight);
 });
 const sum=k=>cases.reduce((n,c)=>n+c[k],0);
 const totals={
  buildings:cases.length,stairs:sum('stairLinks'),
  previousFullColumnSupportBodyPairs:sum('originalSupportBodyPairs'),
  previousFullColumnTreadBodyPairs:sum('originalTreadBodyPairs'),
  previousTotalInterferencePairs:sum('originalDistinctInterferencePairs'),
  proposedEdgeRailSupportBodyPairs:sum('newSupportBodyPairs'),
  unchangedTreadBodyPairs:sum('newTreadBodyPairs'),
  proposedTotalInterferencePairs:sum('newDistinctInterferencePairs'),
  interferencePairsRemoved:sum('supportOnlyConflictsEliminated'),
  groundedDualRailFlightCandidates:sum('dualRailFlights'),
  groundedSingleRailFlightCandidates:sum('singleRailFlights'),
  actualStairBuilds:0,certifiedPhysicalSupport:0,worldContacts:0,commands:0
 };
 if(totals.buildings!==15||totals.stairs!==102||
  totals.previousTotalInterferencePairs!==stack.totals.modelledCrossFlightCollisionPairs||
  totals.unchangedTreadBodyPairs!==stack.totals.modelledSolidBodyCollisionPairs||
  totals.proposedTotalInterferencePairs>=totals.previousTotalInterferencePairs)
  throw Error('B114_RAIL_SOURCE_SCOPE_OR_PROGRESS_REGRESSION');
 const body={
  schema:'minecraftaibuilder-b114-grounded-edge-rail-offline-study-v1',
  sourceB114Integrity:b114.integritySha256,
  gridFrameVersion:STAIR_GRID_FRAME_VERSION,
  derivedFromStackAudit:'B114_3D_Stack_Audit.json',
  priority:'MINIMIZE_CROSS_FLIGHT_AABB_BODY_CLASH_WITH_FLOOR_GROUNDED_TREAD_EDGE_PIERS',
  cases,totals,
  caveats:['EDGE_RAIL_IS_ONLY_0_25_BLOCK_WIDE_AND_HAS_NO_REAL_BLOCK_STATES',
   'CONTACT_AT_TREAD_UNDERSIDE_NOT_A_STRUCTURAL_CERTIFICATION',
   'STAIR_TREAD_VS_OTHER_PLAYER_BODY_INTERFERENCE_UNCHANGED',
   'FLOOR_APERTURES_GALLERY_EGRESS_AND_REAL_EDUCATION_COLLISION_UNRESOLVED'],
  originalStairFootprintsUnchanged:true,originalFloorAndRoomsUnchanged:true,
  candidateAppliedToSource:false,structuralEngineeringApproved:false,
  actualPlayerTraversalCertified:false,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}
 };
 return {...body,integritySha256:hash(body)};
}
export function validateSupportRails(r){
 try{
  const {integritySha256,...body}=r;
  return integritySha256===hash(body)&&
   r.schema==='minecraftaibuilder-b114-grounded-edge-rail-offline-study-v1'&&
   r.sourceB114Integrity?.length===64&&r.gridFrameVersion===STAIR_GRID_FRAME_VERSION&&
   r.totals.buildings===15&&r.totals.stairs===102&&
   r.totals.previousTotalInterferencePairs>=r.totals.proposedTotalInterferencePairs&&
   r.totals.certifiedPhysicalSupport===0&&r.totals.actualStairBuilds===0&&
   r.cases.every(c=>c.stairs.every(s=>s.floorContactAtSourceLevel&&
    s.undersideTreadFaceContact&&s.internallyContinuousFootings&&
    s.selfSweptPlayerCollision===false&&s.actualStructureCertified===false))&&
   r.originalStairFootprintsUnchanged===true&&r.originalFloorAndRoomsUnchanged===true&&
   r.candidateAppliedToSource===false&&r.structuralEngineeringApproved===false&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan.status==='NOT_PREPARED'&&r.BuildPlan.operations.length===0&&
   r.BuildPlan.commandCount===0;
 }catch{return false;}
}
export function writeSupportRails(r,dir) {
 if(!validateSupportRails(r))throw Error('B114_RAIL_UNSAFE_OUTPUT');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B114_15_Buildings_EdgeRail_Support_Study.json');
 const csv=path.join(dir,'B114_15_Buildings_EdgeRail_Risk_Changes.csv');
 const md=path.join(dir,'B114_15_Buildings_EdgeRail_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const keys=['id','stairLinks','originalSupportBodyPairs','originalTreadBodyPairs',
  'originalDistinctInterferencePairs','newSupportBodyPairs','newTreadBodyPairs',
  'newDistinctInterferencePairs','supportOnlyConflictsEliminated',
  'dualRailFlights','singleRailFlights'];
 fs.writeFileSync(csv,keys.join(',')+'\n'+r.cases.map(c=>
  keys.map(k=>c[k]).join(',')).join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B114 — 接地式サイドレール型階段支持体のオフライン比較','',
  '15棟102階段。B113の全面柱支持は5段それぞれ階段幅2の全幅が埋まる。',
  'これを階段端の幅0.25だけの床接続した支持ピアに置換する仮案。',
  '1レール左/右を階段ごとに厳密総当たりし、衝突件数を最低化。',
  '干渉を増やさずに可能な階段へは反対側のレールも追加。B114元の階段平面は不変。','',
  '|指標|モデル上の件数|','|---|---:|',
  '|棟数|'+t.buildings+'|',
  '|階段接続|'+t.stairs+'|',
  '|修正前、階段間の干渉組|'+t.previousTotalInterferencePairs+'|',
  '|修正後の支持体起因の干渉組|'+t.proposedEdgeRailSupportBodyPairs+'|',
  '|修正後も残る踏み面起因の干渉組|'+t.unchangedTreadBodyPairs+'|',
  '|修正案全体の干渉組|'+t.proposedTotalInterferencePairs+'|',
  '|比較で減った干渉組|'+t.interferencePairsRemoved+'|',
  '|左右両側を提案した階段|'+t.groundedDualRailFlightCandidates+'|',
  '|片側を提案した階段|'+t.groundedSingleRailFlightCandidates+'|',
  '|実機で確認した階段|0|','',
  '## 引き続き別設計が必要な組',
  ...r.cases.flatMap(c=>c.remainingPairs.map(p=>'- '+c.id+
    ' / stair#'+p.first+'→#'+p.second+
    ' / support-body='+p.supportBody+' / tread-body='+p.treadBody)),
  '',
  '## 絶対条件',
  'サイドレール幅0.25ブロックは構造用Minecraftブロックとして存在することを保証しない。',
  '床に接地し踏み面下面まで繋がるモデル上の接触だけを確認。荷重・強度・ベッド/ドア・実Education衝突は未認証。',
  '残存の踏み面干渉はレール変更だけでは解決しない。階段の形状や位置の再設計が必要。',
  '元設計の変更0・Minecraft操作0・NOT_PREPARED・9 BLOCKED・BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}