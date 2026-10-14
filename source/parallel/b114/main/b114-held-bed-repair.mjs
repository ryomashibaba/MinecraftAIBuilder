/**
 * B114 review-only redesign suggestions for B113's four held two-bed rooms.
 * Enumerates full-room connected circulation and reachable long-side access.
 * Reads only the isolated furniture reconciliation model. NO construction.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const k=p=>p.x+','+p.z;
const parse=s=>{const [x,z]=s.split(',').map(Number);return {x,z};};
const nb=p=>[{x:p.x+1,z:p.z},{x:p.x-1,z:p.z},{x:p.x,z:p.z+1},{x:p.x,z:p.z-1}];
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const same=(a,b)=>k(a)===k(b);
const lex=(a,b)=>a.z-b.z||a.x-b.x;
const dedupe=a=>[...new Set(a.map(k))].map(parse).sort(lex);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const strictSource=x=>x?.schema==='minecraftaibuilder-b114-furniture-concept-reconciliation-v1'&&
 x.sourceB114Integrity?.length===64&&x.sourceB113Integrity?.length===64&&
 x.reports?.length===15&&x.totals?.rooms===279&&
 x.readiness==='NOT_PREPARED'&&x.directSourceMutation===false&&
 x.constructionApproved===false&&x.executionAllowed===false&&x.worldContacts===0&&
 x.worldCoordinates===null&&x.commandCount===0&&x.BuildPlan?.operations?.length===0&&
 x.gates?.length===9&&x.gates.every(g=>g.status==='BLOCKED');
function footprintCells(room){
 const r=room.roomRectangle,result=[];
 for(let z=r.z+1;z<r.z+r.depth-1;z++)
  for(let x=r.x+1;x<r.x+r.width-1;x++)result.push({x,z});
 return result;
}
function adjacentPairs(cells) {
 const all=new Set(cells.map(k)),found=[];
 for(const p of cells)for(const q of [{x:p.x+1,z:p.z},{x:p.x,z:p.z+1}])
  if(all.has(k(q)))found.push([p,q]);
 return found.sort((a,b)=>lex(a[0],b[0])||lex(a[1],b[1]));
}
function doorInterface(room,inside) {
 const e=room.entrance;
 const near=inside.filter(x=>dist(x,e)===1);
 if(near.length!==1)return {error:'AMBIGUOUS_ROOM_DOOR_INTERIOR',nearest:near.length};
 const start=near[0],dx=start.x-e.x,dz=start.z-e.z;
 const buffer=[start,{x:start.x+dx,z:start.z+dz}].filter(p=>inside.some(q=>same(q,p)));
 return {entry:start,protectedCells:buffer,entrance:e};
}
function evaluate(cells,interfaceData,first,second) {
 const all=new Set(cells.map(k)),a=new Set(first.map(k)),b=new Set(second.map(k));
 const blocked=new Set([...a,...b]);
 if([...a].some(x=>b.has(x)))return null;
 if(interfaceData.protectedCells.some(p=>blocked.has(k(p))))return null;
 const free=new Set([...all].filter(x=>!blocked.has(x)));
 if(!free.has(k(interfaceData.entry)))return null;
 const visited=new Set([k(interfaceData.entry)]),queue=[interfaceData.entry];
 for(let i=0;i<queue.length;i++)for(const p of nb(queue[i])){
  const id=k(p);
  if(free.has(id)&&!visited.has(id)){visited.add(id);queue.push(p);}
 }
 if(visited.size!==free.size)return null;
 const accesses=[];
 for(const pair of [first,second]){
  const [p,q]=pair,dx=q.x-p.x,dz=q.z-p.z;
  if(Math.abs(dx)+Math.abs(dz)!==1)return null;
  const neighbors=dedupe(pair.flatMap(c=>[
   {x:c.x-dz,z:c.z+dx},{x:c.x+dz,z:c.z-dx}
  ])).filter(x=>visited.has(k(x)));
  if(!neighbors.length)return null;
  accesses.push(neighbors);
 }
 return {reachableFreeCells:visited.size,remainingFreeCells:free.size,
  interactionSideCells:accesses,allFreeInteriorConnected:true,
  bothBedsHaveReachableSideAccess:true,doorBufferUnobstructed:true};
}
function orient(pair,anchor){
 const other=pair.find(p=>!same(p,anchor));
 if(!other)throw Error('B114_BED_PROPOSAL_MISSING_SECOND_CELL');
 return other.x-anchor.x+','+(other.z-anchor.z);
}
function chooseAnchor(pair,old){
 return [...pair].sort((a,b)=>dist(a,old)-dist(b,old)||lex(a,b))[0];
}
function associate(fixtures,pairs,check,caseId){
 const selected=fixtures.map((f,index)=>{
  const pair=pairs[index],anchor=chooseAnchor(pair,f.sourceAnchor);
  const originalOrient=orient(f.groundFootprint,f.sourceAnchor);
  const proposedOrient=orient(pair,anchor);
  const changed=dist(anchor,f.sourceAnchor)>0;
  const orig=new Set(f.groundFootprint.map(k));
  const overlap=pair.filter(p=>orig.has(k(p))).length;
  return {index:f.index,role:'bed',
   originalAnchor:f.sourceAnchor,proposedAnchor:anchor,
   originalFootprint:f.groundFootprint,
   proposedFootprint:pair,
   originalDirection:originalOrient,proposedDirection:proposedOrient,
   anchorRelocated:changed,anchorShiftBlocks:dist(anchor,f.sourceAnchor),
   preservedOriginalFootprintCells:overlap,
   reachableSideApproachCells:check.interactionSideCells[index],
   blockStatesVerified:false,physicalInteractionCertified:false,
   originalSourceUnchanged:true};
 });
 const movement=selected.reduce((n,f)=>n+f.anchorShiftBlocks,0);
 const moved=selected.filter(f=>f.anchorRelocated).length;
 const orientationChanges=selected.filter(f=>f.originalDirection!==f.proposedDirection).length;
 const footprintDelta=selected.reduce((n,f)=>n+(2-f.preservedOriginalFootprintCells),0);
 const approachMargin=new Set(check.interactionSideCells.flat().map(k)).size;
 const score=movement*12 + moved*18 +orientationChanges*6+footprintDelta*2-approachMargin;
 return {sourceCase:caseId,fixtures:selected,score,anchorRelocations:moved,
  displacementBlocks:movement,footprintCellsChanged:footprintDelta,
  orientationChanges,reachableSideAccessCellUnion:approachMargin,
  localPlanValid:true,doorBufferUnobstructed:true,
  reachableFreeCells:check.reachableFreeCells,
  availableFreeCells:check.remainingFreeCells,
  bothBedsHaveReachableSideAccess:true,
  educationCollisionCertified:false,userApproved:false,
  sourceGeometryChanged:false,autoApplied:false,
  recipeStatesAssigned:false};
}
function optimizeHeld(room,buildingId,{maxSuggestions=3}={}) {
 const id=buildingId+'/L'+room.level+'/'+room.roomId;
 const sourceOriginal=room.candidateFixtures.map(f=>({
  fixtureIndex:f.index,role:f.role,anchor:f.sourceAnchor,
  footprint:f.groundFootprint,priorApproachCells:f.interactionApproachCells
 }));
 const result={id,buildingId,level:room.level,roomId:room.roomId,
  originalReviewProblems:room.reviewProblems,
  roomRectangle:room.roomRectangle,
  original:sourceOriginal,
  candidateCountExamined:0,validGeometricCandidates:0,
  alternatives:[],proposedSourceAnchorMovementNeedsApproval:true,
  designApproved:false,physicallyUsableCertified:false,
  reconstructionApplied:false,worldContacts:0,reviewGate:'HOLD'};
 if(room.provisionalFullReplacement||room.reviewProblems.length===0)
  throw Error('B114_BED_OPTIMIZER_ONLY_FOR_HELD_ROOMS');
 const fixtures=room.candidateFixtures;
 if(fixtures.length!==2||fixtures.some(f=>f.role!=='bed'||f.groundFootprint.length!==2)){
  result.reviewFailure='NOT_A_TWO_BED_ROOM';return result;
 }
 const cells=footprintCells(room);
 const door=doorInterface(room,cells);
 if(door.error){result.reviewFailure=door.error;return result;}
 result.doorInterior=door.entry;result.protectedDoorApproach=door.protectedCells;
 const pairs=adjacentPairs(cells),plans=[];
 const shapeKeys=new Set();
 for(let i=0;i<pairs.length;i++)for(let j=i+1;j<pairs.length;j++){
  const pairA=pairs[i],pairB=pairs[j],check=evaluate(cells,door,pairA,pairB);
  result.candidateCountExamined++;
  if(!check)continue;
  result.validGeometricCandidates++;
  for(const candidatePairs of [[pairA,pairB],[pairB,pairA]]){
   const plan=associate(fixtures,candidatePairs,check,id);
   const signature=plan.fixtures.map(f=>f.proposedFootprint.map(k).sort().join('|')).join(';');
   if(shapeKeys.has(signature))continue;
   shapeKeys.add(signature);plans.push(plan);
  }
 }
 plans.sort((a,b)=>a.score-b.score||a.anchorRelocations-b.anchorRelocations||
  a.orientationChanges-b.orientationChanges||
  JSON.stringify(a.fixtures.map(f=>f.proposedFootprint)).localeCompare(
   JSON.stringify(b.fixtures.map(f=>f.proposedFootprint))));
 result.alternatives=plans.slice(0,maxSuggestions);
 if(!result.alternatives.length)result.reviewFailure='NO_VALID_LOCAL_TWO_BED_GEOMETRY';
 else result.reviewGate='GEOMETRIC_CANDIDATES_FOUND_AWAITING_HUMAN_AND_EDUCATION_VERIFICATION';
 return result;
}
export function proposeHeldBedRepairs(r) {
 if(!strictSource(r))throw Error('B114_HELD_BED_INVALID_INPUT');
 const held=r.reports.flatMap(b=>b.rooms.filter(room=>!room.provisionalFullReplacement).
  map(room=>({building:b.id,room})));
 if(held.length!==r.totals.unreconciledRooms)
  throw Error('B114_HELD_BED_COUNT_MISMATCH');
 const proposals=held.map(x=>optimizeHeld(x.room,x.building));
 const solved=proposals.filter(x=>x.alternatives.length>0);
 const candidateCount=proposals.reduce((n,x)=>n+x.validGeometricCandidates,0);
 const totals={
  initialHeldRooms:held.length,
  candidateReadyForDesignerReview:solved.length,
  stillWithoutGeometryCandidate:held.length-solved.length,
  totalDistinctGeometricPairPlacements:candidateCount,
  selectedAlternativesPresented:proposals.reduce((n,x)=>n+x.alternatives.length,0),
  physicallyCertifiedRooms:0,
  actualSourceRoomChanges:0,
  actualWorldOperations:0,
  educationDoorOrBedInteractionCertified:0
 };
 const body={schema:'minecraftaibuilder-b114-held-beds-local-redesign-v1',
  sourceB114Integrity:r.sourceB114Integrity,sourceB113Integrity:r.sourceB113Integrity,
  sourceFurnitureReconciliationSha256:sha(r),
  reports:proposals,totals,
  scoring:'MINIMIZE_ANCHOR_SHIFTS_AND_ORIENTATION_CHANGES_WITH_SIDE_ACCESS_AND_DOOR_BUFFER',
  alternativeDesignStatus:'OFFLINE_CANDIDATES_ONLY',
  proposalsAppliedToSource:false,
  constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  readiness:'NOT_PREPARED',
  gates:r.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}
 };
 return {...body,integritySha256:sha(body)};
}
export function validateHeldBedRepair(r){
 try{
  const {integritySha256,...body}=r;
  return sha(body)===integritySha256&&r.schema==='minecraftaibuilder-b114-held-beds-local-redesign-v1'&&
   r.sourceB114Integrity?.length===64&&r.sourceB113Integrity?.length===64&&
   r.sourceFurnitureReconciliationSha256?.length===64&&
   r.totals.initialHeldRooms===r.reports.length&&
   r.totals.candidateReadyForDesignerReview<=r.totals.initialHeldRooms&&
   r.totals.physicallyCertifiedRooms===0&&r.totals.actualSourceRoomChanges===0&&
   r.totals.actualWorldOperations===0&&r.proposalsAppliedToSource===false&&
   r.reports.every(x=>x.designApproved===false&&x.reconstructionApplied===false&&
    x.physicallyUsableCertified===false&&x.worldContacts===0&&
    x.alternatives.every(p=>p.userApproved===false&&p.autoApplied===false&&
      p.educationCollisionCertified===false&&p.fixtures.every(f=>f.originalSourceUnchanged===true&&
       f.blockStatesVerified===false)))&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan.operations.length===0&&r.BuildPlan.commandCount===0;
 }catch{return false;}
}
const xml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const rect=(x,y,w,h,fill,stroke='none',sw=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const text=(x,y,s,size=14,fill='#edf3fa',weight=500)=>'<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+fill+'">'+xml(s)+'</text>';
function drawing(held){
 const W=1540,H=1200,cell=22,body=[];
 for(const [index,p] of held.reports.entries()){
  const row=Math.floor(index/2),col=index%2,bx=20+col*770,by=113+row*521;
  const rr=p.roomRectangle;
  body.push(rect(bx,by,746,497,'#132539','#324d62',1));
  body.push(text(bx+20,by+35,p.buildingId+'  L'+p.level+' '+p.roomId,19,'#eff5f9',700));
  const original=p.original.map(x=>x.footprint),best=p.alternatives[0]??null;
  for(let side=0;side<2;side++){
   const x0=bx+28+side*366,y0=by+108;
   body.push(text(x0,by+74,side?'PROPOSAL — NOT APPROVED':'SOURCE B113 — HELD',13,
    side?'#98e1c1':'#ffd3a3',700));
   const footprints=side?best?.fixtures.map(x=>x.proposedFootprint)??original:original;
   const blocked=new Set(footprints.flatMap(x=>x.map(k)));
   const approaches=side&&best?new Set(best.fixtures.flatMap(f=>f.reachableSideApproachCells.map(k))):new Set();
   for(let z=rr.z;z<rr.z+rr.depth;z++)
    for(let x=rr.x;x<rr.x+rr.width;x++){
     const border=x===rr.x||x===rr.x+rr.width-1||z===rr.z||z===rr.z+rr.depth-1;
     let color=border?'#cadaea':'#425f75';
     if(approaches.has(x+','+z))color='#9bdcc1';
     if(blocked.has(x+','+z))color='#ecb26c';
     if(x===p.original[0].anchor.x&&z===p.original[0].anchor.z&&!side)color='#f7cf92';
     body.push(rect(x0+(x-rr.x)*cell,y0+(z-rr.z)*cell,cell,cell,color,'#263c4c',.5));
    }
   const entrance=p.doorInterior;
   if(entrance)body.push(rect(x0+(entrance.x-rr.x)*cell+5,y0+(entrance.z-rr.z)*cell+5,
    cell-10,cell-10,'#58e6bd'));
  }
  if(best)body.push(text(bx+28,by+444,'Displacement '+best.displacementBlocks+
   ' blocks • moved anchors '+best.anchorRelocations+
   ' • connected free cells '+best.reachableFreeCells,12,'#a9d9c7'));
  body.push(text(bx+28,by+467,p.alternatives.length+' proposed choices • human sign-off and real Education physics PENDING',11,'#e5bea2'));
 }
 const title=text(37,56,'B114 / FOUR HELD BEDROOMS — TARGETED REPAIR STUDY',27,'#eaf2f8',700)+
  text(38,83,'Source footprints versus independently tested side-access layouts • local design coordinates',13,'#9fb5c9');
 const footer=text(38,H-28,'HOLD / NOT_PREPARED / 9 BLOCKED / worldContacts=0 / no source edits',13,'#a5bbc9');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+
 '" viewBox="0 0 '+W+' '+H+'"><title>Held bedroom placement study</title>'+
 rect(0,0,W,H,'#0a1828')+title+body.join('')+footer+'</svg>\n';
}
export function writeHeldBedRepairs(result,output){
 if(!validateHeldBedRepair(result))throw Error('B114_HELD_BED_WRITE_UNSAFE');
 fs.mkdirSync(output,{recursive:true});
 const json=path.join(output,'B114_Four_Held_Rooms_Bed_Redesign.json');
 const md=path.join(output,'B114_Four_Held_Rooms_Review_JA.md');
 const svg=path.join(output,'B114_Four_Held_Rooms_SideAccess.svg');
 fs.writeFileSync(json,JSON.stringify(result,null,2)+'\n');
 const pic=drawing(result);
 if(/<script|<foreignObject|(?:xlink:)?href=|javascript:/i.test(pic))throw Error('B114_HELD_BED_SVG_UNSAFE');
 fs.writeFileSync(svg,pic);
 const t=result.totals;
 fs.writeFileSync(md,[
  '# B114 — 保留4室のベッド配置改善候補（非施工）','',
  '元の部屋・外壁・ドア・通路・部屋IDを移動せず、2台のベッドの局所占有セルだけを探索した。',
  '各室に最大3案、入口2セルのアプローチ、無料移動経路、両ベッド長辺への接近を独立に検証。','',
  '|検査|結果|','|---|---:|',
  '|元の保留室|'+t.initialHeldRooms+'|',
  '|幾何的配置候補がある室|'+t.candidateReadyForDesignerReview+'|',
  '|候補が見つからない室|'+t.stillWithoutGeometryCandidate+'|',
  '|候補として提示する配置案|'+t.selectedAlternativesPresented+'|',
  '|実機で使えると認証した部屋|0|','',
  ...result.reports.flatMap(x=>[
   '## '+x.id,
   '- 探索組合せ '+x.candidateCountExamined+'、幾何的に成立 '+x.validGeometricCandidates,
   ...x.alternatives.map((a,i)=>'- 第'+(i+1)+'候補: スコア '+a.score+
    ' / アンカー移動 '+a.anchorRelocations+' / 合計移動 '+a.displacementBlocks+
    ' ブロック / ベッド側面接近可能: '+a.bothBedsHaveReachableSideAccess),
   '- 実施工・部屋完成の承認: HOLD',''
  ]),
  'B113の元アンカーは変更しない。移動案は必ず設計レビュー、Educationのドア・ベッドの状態/操作は別途実機確認が必要。',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,md,svg};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const input=JSON.parse(fs.readFileSync(path.resolve('b114-review-output/B114_Furniture_Reconciliation_15_Buildings.json'),'utf8'));
 const result=proposeHeldBedRepairs(input);
 console.log(JSON.stringify({totals:result.totals,output:writeHeldBedRepairs(result,path.resolve('b114-review-output'))},null,2));
}