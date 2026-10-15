/** B116: read-only fleet corridor assessment; all geometry is in LOCAL design coordinates. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {validateB114} from '../../b114/main/compile-b114.mjs';
import {validateStairGalleryIntegration} from '../../b114/main/b114-stair-gallery-integration.mjs';
import {validateCrossFlightSearch} from '../../b114/main/b114-cross-flight-position-search.mjs';
import {validateApartmentSwitchback} from '../../b114/main/b114-apartment-switchback-3d.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightFlight} from '../../b113/main/b113-geometry.mjs';
import {transformStairBox} from '../../b114/main/b114-stair-grid-frame.mjs';
import {checkB115Footprint} from '../../b115/main/b115-independent-gallery-proof.mjs';
import {auditB116Corridor} from './b116-corridor-3d-core.mjs';
const K=p=>p.x+','+p.z;
const H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
function gates(x,label){
 if(x?.readiness!=='NOT_PREPARED'||x.constructionApproved!==false||
 x.executionAllowed!==false||x.worldContacts!==0||x.worldCoordinates!==null||
 x.commandCount!==0||x.gates?.length!==9||x.gates.some(g=>g.status!=='BLOCKED')||
 x.BuildPlan?.operations?.length!==0)throw Error('B116_UNSAFE_INPUT_'+label);
}
export async function createB116Review(dir){
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const apt=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json');
 if(!validateStairGalleryIntegration(gallery)||!validateB114(b114)||
 !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apt)||
 gallery.sourceB114Integrity!==b114.integritySha256||
 cross.sourceB114Integrity!==b114.integritySha256||
 gallery.sourceCrossFlightIntegrity!==cross.integritySha256||
 gallery.sourceApartmentSwitchbackIntegrity!==apt.integritySha256)
 throw Error('B116_SOURCE_REPORT_DIGEST_MISMATCH');
 [gallery,b114,cross,apt].forEach((v,i)=>gates(v,i));
 const parent=await assembleReferenceParent();
 const b113=buildB113(parent);
 if(!validateB113(b113)||b114.sourceB113Digest!==b113.integritySha256||
 gallery.sourceB113Integrity!==b113.integritySha256||
 parent.sourceDesigns?.length!==15)throw Error('B116_PARENT_DIGEST_MISMATCH');
 const flight=straightFlight(),cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId;
  const g=gallery.cases.find(c=>c.id===id);
  const b=b113.cases.find(c=>c.id===id);
  const crossCase=cross.cases.find(c=>c.id===id);
  if(!g||!b||!crossCase||g.stairLinks!==crossCase.proposedOriginalStairs.length||
  design.plan.floors.length!==b.horizontalRoutes.length)throw Error('B116_BUILDING_SOURCE_MISMATCH_'+id);
  const source=generateB105(design),sourceQA=auditB105(source,design.plan);
  if(sourceQA.issueCount||sourceQA.envelopeConflicts)throw Error('B116_B105_SOURCE_UNSAFE_'+id);
  const selected=id==='APARTMENT_V1'?apt.selectedCandidate:null;
  const floors=design.plan.floors,stairs=floors.map(()=>new Set()),solids=[];
  for(const [index,s]of crossCase.proposedOriginalStairs.entries()){
   const footprint=selected?.targetFlight===index?selected.footprint:s.cells;
   if(!Array.isArray(footprint)||!footprint.every(p=>Number.isInteger(p.x)&&Number.isInteger(p.z)))
    throw Error('B116_STAIR_FOOTPRINT_INVALID');
   for(const level of [s.fromLevel,s.toLevel]){
    if(!stairs[level])throw Error('B116_STAIR_LEVEL_INVALID');
    for(const p of footprint)stairs[level].add(K(p));
   }
   if(selected?.targetFlight===index)solids.push(...selected.stairTreadAABBs,...selected.platformAABBs);
   else{
    const frame={origin:s.proposedOrigin,ascent:s.proposedAscent,fromLevel:s.fromLevel};
    solids.push(...flight.solids.slice(0,-2).map(box=>transformStairBox(box,frame)));
   }
  }
  const accumulated=floors.map(()=>[]),entries=[];
  for(const link of g.stairInterfaces){
   const s=crossCase.proposedOriginalStairs[link.stairIndex];
   if(!s||s.fromLevel!==link.fromLevel||s.toLevel!==link.toLevel)
    throw Error('B116_STAIR_REFERENCE_MISMATCH');
   for(const p of link.proposals){
    const level=p.side==='LOWER'?s.fromLevel:p.side==='UPPER'?s.toLevel:null;
    if(level===null||p.level!==level)throw Error('B116_INTERFACE_LEVEL_MISMATCH');
    if(p.status!=='CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE'){
     entries.push({stairIndex:link.stairIndex,side:p.side,level,
      status:'UNRESOLVED_SOURCE_2D',sourceReason:p.reason,
      physical3DWalkabilityCertified:false});
     continue;
    }
    const floor=floors[level];
    const walk=new Set([...floor.gallery,...b.horizontalRoutes[level].repair.addedCells,...accumulated[level]].map(K));
    const allowed=new Set();
    for(let z=0;z<floor.footprintRows.length;z++)
     for(let x=0;x<floor.footprintRows[z].length;x++){
      if(floor.footprintRows[z][x]!=='1')continue;
      const q={x,z};
      const blocked=[...floor.rooms,...design.plan.cores].some(r=>q.x>=r.x&&q.x<r.x+r.width&&q.z>=r.z&&q.z<r.z+r.depth);
      if(!blocked&&!stairs[level].has(K(q)))allowed.add(K(q));
     }
    const old=checkB115Footprint(p,{allowed,walk});
    const aperture=id==='APARTMENT_V1'&&selected&&
     gallery.apartmentSwitchbackLocalAperture.toLevel===level?
     new Set(gallery.apartmentSwitchbackLocalAperture.proposedRemoveCells.map(K)):new Set();
    const fresh=auditB116Corridor({proposal:p,level,floor,rooms:floor.rooms,
     cores:design.plan.cores,stairMask:stairs[level],existingWalk:walk,
     sourceVoxels:source.voxels,stairAABBs:solids,proposedApertures:aperture});
    const issues=[...fresh.issues];
    if(old.status!=='SOURCE_CONSTRAINED_TOPOLOGY_PASS')
     issues.push({code:'B115_SOURCE_CONSTRAINED_REPLAY_FAILED',details:old.errors});
    entries.push({stairIndex:link.stairIndex,side:p.side,level,
     status:issues.length?'DESIGN_REVIEW_REQUIRED':'NO_CONFLICT_IN_SCOPED_SOURCE_PROXIES',
     issues:issues.slice(0,32),totalIssues:issues.length,
     issueCodes:[...new Set(issues.map(x=>x.code))].sort(),
     originalSourceFloorAndGalleryRechecked:old.status==='SOURCE_CONSTRAINED_TOPOLOGY_PASS',
     testedFootprintCells:fresh.testedFootprintCells,physical3DWalkabilityCertified:false});
    // Replay conditional B114 order without applying changes to source designs.
    accumulated[level].push(...p.addedCells);
   }
  }
  cases.push({id,conceptFloors:floors.length,stairLinks:g.stairLinks,
   b105StaticVoxels:source.voxels.length,
   stagedStairTreadProxies:solids.length,proposals:entries,
   originalRoomsAndCoresUnchanged:true});
 }
 const all=cases.flatMap(c=>c.proposals);
 const totals={buildings:cases.length,conceptFloors:cases.reduce((n,c)=>n+c.conceptFloors,0),
  stairLinks:cases.reduce((n,c)=>n+c.stairLinks,0),
  proposed2DWide:all.filter(x=>x.status!=='UNRESOLVED_SOURCE_2D').length,
  scopedSourceProxyClear:all.filter(x=>x.status==='NO_CONFLICT_IN_SCOPED_SOURCE_PROXIES').length,
  flaggedForDesignReview:all.filter(x=>x.status==='DESIGN_REVIEW_REQUIRED').length,
  unresolved2D:all.filter(x=>x.status==='UNRESOLVED_SOURCE_2D').length,
  physicalWalkabilityCertified:0,worldContacts:0,constructionCommands:0};
 if(totals.buildings!==15||totals.conceptFloors!==66||totals.stairLinks!==102||
  totals.proposed2DWide+totals.unresolved2D!==
  gallery.cases.reduce((n,c)=>n+c.stairInterfaces.reduce((m,s)=>m+s.proposals.length,0),0))
  throw Error('B116_INCOMPLETE_15_BUILDING_COVERAGE');
 const body={schema:'minecraftaibuilder-b116-source-masks-and-3d-proxy-review-v1',
  sourceB113Integrity:b113.integritySha256,sourceB114Integrity:b114.integritySha256,
  sourceCrossFlightIntegrity:cross.integritySha256,
  sourceApartmentSwitchbackIntegrity:apt.integritySha256,
  sourceGalleryIntegrity:gallery.integritySha256,cases,totals,
  scopesHeld:['B104_FLOOR_MASK_NOT_REAL_SUPPORT_BLOCKS',
   'ALL_STAIR_APERTURES_EXCEPT_APARTMENT_V1_NOT_INTEGRATED',
   'SHELL_REPAIRS_PARTITIONS_AND_SUPPORT_PIERS_NOT_RECOMPUTED',
   'BEDROCK_STAIR_AND_DOOR_BLOCKSTATES_AND_PLAYER_PHYSICS_UNVERIFIED',
   'B114_CORRIDORS_ARE_CONDITIONAL_AND_NOT_APPLIED'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:H(body)};
}
export function validateB116Review(r){
 try{const {integritySha256,...body}=r;
 return H(body)===integritySha256&&
  r.schema==='minecraftaibuilder-b116-source-masks-and-3d-proxy-review-v1'&&
  r.totals.buildings===15&&r.totals.conceptFloors===66&&r.totals.stairLinks===102&&
  r.totals.proposed2DWide===r.totals.scopedSourceProxyClear+r.totals.flaggedForDesignReview&&
  r.totals.physicalWalkabilityCertified===0&&r.totals.worldContacts===0&&
  r.totals.constructionCommands===0&&r.cases.every(c=>c.originalRoomsAndCoresUnchanged&&
   c.proposals.every(p=>p.physical3DWalkabilityCertified===false))&&
  r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
  r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
  r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
  r.BuildPlan.status==='NOT_PREPARED'&&r.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeB116Review(r,out){
 if(!validateB116Review(r))throw Error('B116_UNSAFE_OUTPUT');
 fs.mkdirSync(out,{recursive:true});
 const filename=path.join(out,'B116_15_Buildings_Source_3D_Corridor_Review.json');
 fs.writeFileSync(filename,JSON.stringify(r,null,2)+'\n');
 const t=r.totals,lines=[
 '# B116 — 15棟・102階段の幅2廊下/3D代理形状監査（非施工）','',
 '|項目|件数|','|---|---:|',
 '|建物|'+t.buildings+'|','|階数|'+t.conceptFloors+'|','|階段接続|'+t.stairLinks+'|',
 '|新しい幅2通路候補|'+t.proposed2DWide+'|',
 '|元の代理形状との干渉を検出しなかった候補|'+t.scopedSourceProxyClear+'|',
 '|設計レビューが必要|'+t.flaggedForDesignReview+'|',
 '|未解決の2D通路|'+t.unresolved2D+'|','|実機歩行認証|0|','',
 '## 残っている設計課題',
 ...r.cases.flatMap(c=>c.proposals.filter(p=>p.status==='DESIGN_REVIEW_REQUIRED').map(p=>
  '- '+c.id+' stair#'+p.stairIndex+' '+p.side+' L'+p.level+': '+p.issueCodes.join(', '))),
 '','## 対象外・要再検証',
 ...r.scopesHeld.map(x=>'- '+x),'',
 '実際の歩行可能性・本物の床支持・Bedrockの当たり判定を証明していません。',
 'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'];
 const md=path.join(out,'B116_Source_3D_Corridor_Review_JA.md');
 fs.writeFileSync(md,lines.join('\n')+'\n');
 return {json:filename,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=await createB116Review(path.resolve(process.argv[2]??'b114-review-output'));
 const files=writeB116Review(report,path.resolve(process.argv[3]??'b116-review-output'));
 console.log(JSON.stringify({totals:report.totals,files},null,2));
}
