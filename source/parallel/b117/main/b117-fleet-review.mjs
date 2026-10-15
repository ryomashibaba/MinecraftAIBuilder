/** B117: source-linked offline-only fleet audit. No actual Minecraft world access. */
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
import {straightFlight} from '../../b113/main/b113-geometry.mjs';
import {transformStairBox} from '../../b114/main/b114-stair-grid-frame.mjs';
import {studyFloorSlab,diagnoseTwoWideExit} from './b117-geometry.mjs';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=p=>p.x+','+p.z;
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const gated=(o,label)=>{
 if(o?.readiness!=='NOT_PREPARED'||o.executionAllowed!==false||
  o.constructionApproved!==false||o.worldContacts!==0||o.worldCoordinates!==null||
  o.commandCount!==0||o.gates?.length!==9||o.gates.some(g=>g.status!=='BLOCKED')||
  o.BuildPlan?.operations?.length!==0)throw Error('B117_UNSAFE_SOURCE_'+label);
};
function bodySamples(stair,flight){
 const local=flight.samples.flatMap((p,i)=>{
  const first={x:p.x-.3,y:p.y,z:p.z-.3,width:.6,height:2,depth:.6};
  if(!i)return [first];
  const prior=flight.samples[i-1];
  return [first,{x:Math.min(p.x,prior.x)-.3,y:Math.min(p.y,prior.y),
   z:Math.min(p.z,prior.z)-.3,width:Math.abs(p.x-prior.x)+.6,
   height:Math.abs(p.y-prior.y)+2,depth:Math.abs(p.z-prior.z)+.6}];
 });
 return local.map(b=>transformStairBox(b,{origin:stair.proposedOrigin,
  ascent:stair.proposedAscent,fromLevel:stair.fromLevel}));
}
export async function assembleB117(dir){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const apartment=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json');
 if(!validateB114(b114)||!validateStairGalleryIntegration(gallery)||
  !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apartment)||
  gallery.sourceB114Integrity!==b114.integritySha256||
  cross.sourceB114Integrity!==b114.integritySha256||
  apartment.sourceCrossFlightIntegrity!==cross.integritySha256||
  gallery.sourceApartmentSwitchbackIntegrity!==apartment.integritySha256)
  throw Error('B117_B114_PINNED_SOURCE_REPORT_MISMATCH');
 [b114,gallery,cross,apartment].forEach((x,i)=>gated(x,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==gallery.sourceB113Integrity||
  b113.integritySha256!==b114.sourceB113Digest||parent.sourceDesigns?.length!==15)
  throw Error('B117_B113_PARENT_SOURCE_DIGEST_MISMATCH');
 gated(b113,'B113');
 const flight=straightFlight(),cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId,case114=gallery.cases.find(x=>x.id===id),
   caseCross=cross.cases.find(x=>x.id===id),case113=b113.cases.find(x=>x.id===id),
   caseBase=b114.cases.find(x=>x.id===id);
  if(!case114||!caseCross||!case113||!caseBase||
   case114.stairInterfaces.length!==caseCross.proposedOriginalStairs.length||
   caseBase.stairs.length!==caseCross.proposedOriginalStairs.length)
   throw Error('B117_BUILDING_STAIR_PARENT_MISMATCH:'+id);
  const floors=design.plan.floors,allStairCells=floors.map(()=>new Set()),
   otherOpenings=floors.map(()=>new Set()),staged=[];
  const switchback=id==='APARTMENT_V1'?apartment.selectedCandidate:null;
  for(const [i,s] of caseCross.proposedOriginalStairs.entries()){
   if(s.stairIndex!==i||s.fromLevel+1!==s.toLevel||s.toLevel>=floors.length)
    throw Error('B117_FLOOR_RELATION_INVALID:'+id);
   const turn=switchback?.targetFlight===i;
   const footprint=turn?switchback.footprint:s.cells;
   const lowerLanding=turn?switchback.entryCells:s.lowerLanding,
    upperLanding=turn?switchback.exitCells:s.upperLanding,
    body=turn?switchback.sweptPlayerAABBs:bodySamples(s,flight);
   if(!Array.isArray(footprint)||!Array.isArray(body)||!body.length)
    throw Error('B117_MISSING_STAIR_3D_GEOMETRY');
   for(const level of [s.fromLevel,s.toLevel])for(const p of footprint)allStairCells[level].add(K(p));
   staged.push({...s,turn,lowerLanding,upperLanding,body,
    upperAscent:turn?{dx:-switchback.ascent.dx,dz:-switchback.ascent.dz}:s.proposedAscent});
  }
  const slabs=[],galleryHolds=[],extras=floors.map(()=>[]);
  for(const [i,s]of staged.entries()){
   const slab=studyFloorSlab({fromLevel:s.fromLevel,toLevel:s.toLevel,
    lowerFloor:floors[s.fromLevel],upperFloor:floors[s.toLevel],
    lowerLanding:s.lowerLanding,upperLanding:s.upperLanding,
    bodyAABBs:s.body,otherOpenings:otherOpenings[s.toLevel]});
   for(const p of slab.conceptualOpeningCells)otherOpenings[s.toLevel].add(K(p));
   slabs.push({stairIndex:i,fromLevel:s.fromLevel,toLevel:s.toLevel,coreIndex:s.coreIndex,
    switchedBack:s.turn,...slab});
  }
  // B114 proposes galleries sequentially. Replay only as a read-only mask.
  for(const link of case114.stairInterfaces){
   const s=staged[link.stairIndex];
   for(const proposal of link.proposals){
    const side=proposal.side;
    const level=side==='UPPER'?s.toLevel:side==='LOWER'?s.fromLevel:null;
    if(level===null||proposal.level!==level)throw Error('B117_INTERFACE_SIDE_MISMATCH');
    const walk=new Set([...floors[level].gallery,...case113.horizontalRoutes[level].repair.addedCells,
      ...extras[level]].map(K));
    if(proposal.status==='CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE'){
     extras[level].push(...proposal.addedCells);
     continue;
    }
    const f={...floors[level],__b117Cores:design.plan.cores};
    const diagnosis=diagnoseTwoWideExit({floor:f,landing:proposal.landing,
     ascent:side==='UPPER'?s.upperAscent:s.proposedAscent,
     side,stairCells:allStairCells[level],walk});
    galleryHolds.push({stairIndex:link.stairIndex,fromLevel:s.fromLevel,toLevel:s.toLevel,
     side,level,originalStatus:proposal.status,originalReason:proposal.reason,
     ...diagnosis});
   }
  }
  const problems=[...new Set([...slabs.flatMap(x=>x.issueCodes),...galleryHolds.map(x=>x.reason)])].sort();
  cases.push({id,stairs:staged.length,floors:floors.length,slabs,galleryHolds,
   conceptualOpeningCells:slabs.reduce((n,x)=>n+x.conceptualOpeningCells.length,0),
   openingDesignHolds:slabs.filter(x=>x.status==='HOLD_DESIGN_REVIEW').length,
   unresolvedGalleryInterfaces:galleryHolds.length,
   issueTypes:problems,originalFloorsAndRoomsUntouched:true,worldContactCount:0});
 }
 const flat=cases.flatMap(x=>x.slabs),held=cases.flatMap(x=>x.galleryHolds);
 const reasonCounts=Object.fromEntries([...new Set(held.map(x=>x.reason))].sort().map(code=>
  [code,held.filter(x=>x.reason===code).length]));
 const totals={buildings:cases.length,conceptFloors:cases.reduce((n,x)=>n+x.floors,0),
  sourceStairLinks:flat.length,originalUnresolvedGalleryInterfaces:held.length,
  conceptualOpeningCells:cases.reduce((n,x)=>n+x.conceptualOpeningCells,0),
  upperLandingCellsRetained:flat.reduce((n,x)=>n+x.upperLandingFloorRetained.length,0),
  floorSupportOrSweepReview:cases.reduce((n,x)=>n+x.openingDesignHolds,0),
  unresolvedGalleryReasons:reasonCounts,physicalAccessCertified:0,
  worldContacts:0,constructionCommands:0};
 if(totals.buildings!==15||totals.conceptFloors!==66||totals.sourceStairLinks!==102||
  totals.originalUnresolvedGalleryInterfaces!==9)
  throw Error('B117_EXPECTED_15_BUILDING_102_STAIR_9_GALLERY_COVERAGE');
 const body={schema:'minecraftaibuilder-b117-source-slab-landing-and-gallery-held-review-v1',
  sourceB113Integrity:b113.integritySha256,sourceB114Integrity:b114.integritySha256,
  sourceGalleryIntegrity:gallery.integritySha256,sourceCrossFlightIntegrity:cross.integritySha256,
  sourceApartmentIntegrity:apartment.integritySha256,cases,totals,
  limitations:['2_BLOCK_BODY_AABB_CONSERVATIVE_AND_NOT_BEDROCK_PHYSICS',
   'ALL_FLOOR_OPENINGS_ARE_DESIGN_CANDIDATES_NO_REMOVALS_APPLIED',
   'SUPPORT_PIERS_ROOF_ENVELOPE_DOORS_REAL_BLOCKSTATES_UNVERIFIED',
   'NINE_GALLERY_REPAIRS_STILL_HELD_WITHOUT_SOURCE_MODIFICATION',
   'NO_ACTUAL_WORLD_ACCESS_OR_CONSTRUCTION'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:H(body)};
}
export function validateB117Review(r){
 try{const {integritySha256,...rest}=r??{};
 return H(rest)===integritySha256&&
  r.schema==='minecraftaibuilder-b117-source-slab-landing-and-gallery-held-review-v1'&&
  r.totals.buildings===15&&r.totals.conceptFloors===66&&
  r.totals.sourceStairLinks===102&&r.totals.originalUnresolvedGalleryInterfaces===9&&
  r.totals.upperLandingCellsRetained===204&&
  r.totals.physicalAccessCertified===0&&
  r.cases.length===15&&r.cases.every(c=>c.originalFloorsAndRoomsUntouched&&
   c.slabs.length===c.stairs&&c.slabs.every(s=>s.doesNotApplyAnyFloorRemoval&&
    !s.realSlabSupportCertified&&!s.realMinecraftTraversalCertified)&&
   c.galleryHolds.every(h=>h.proposedSourceCellChanges===0&&!h.physicalNavigationCertified))&&
  r.readiness==='NOT_PREPARED'&&r.executionAllowed===false&&
  r.constructionApproved===false&&r.worldContacts===0&&r.worldCoordinates===null&&
  r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
  r.BuildPlan.status==='NOT_PREPARED'&&r.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeB117Review(r,dir){
 if(!validateB117Review(r))throw Error('B117_REPORT_VALIDATION_FAILED');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B117_15_Building_Slab_And_Gallery_Holds.json'),
  csv=path.join(dir,'B117_Gallery_9_Holds.csv'),md=path.join(dir,'B117_102_Stairs_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const header=['building','stairIndex','level','side','originalStatus','diagnosedReason','firstTwoRowsDefects','reachableAnchors','terminalAnchors'];
 const lines=[header.join(',')];
 for(const c of r.cases)for(const x of c.galleryHolds)
  lines.push([c.id,x.stairIndex,x.level,x.side,x.originalStatus,x.reason,
   x.firstTwoRowsDefects.map(p=>p.reason).join('+'),x.reachableAnchors,x.sourceGalleryTerminalAnchors].join(','));
 fs.writeFileSync(csv,lines.join('\n')+'\n');
 const t=r.totals,report=['# B117 — 15棟の102階段・上階床開口と未接続廊下（非施工）','',
  '|監査範囲|結果|','|---|---:|',
  '|建物|'+t.buildings+'|','|階数|'+t.conceptFloors+'|',
  '|調査した階段|'+t.sourceStairLinks+'|',
  '|仮想的な床開口候補セル（累計）|'+t.conceptualOpeningCells+'|',
  '|維持する上階踊り場床セル|'+t.upperLandingCellsRetained+'|',
  '|床・身体掃引関連の追加レビュー|'+t.floorSupportOrSweepReview+'|',
  '|未解決の幅2廊下入口|'+t.originalUnresolvedGalleryInterfaces+'|',
  '|Minecraftで歩行認証された階段|0|','',
  '## 9件の原因分類',
  ...Object.entries(t.unresolvedGalleryReasons).map(([x,n])=>'- '+x+': '+n+'件'),'',
  '## 未解決の入口（設計変更はまだ実施しない）',
  ...r.cases.flatMap(c=>c.galleryHolds.map(x=>'- '+c.id+' #'+x.stairIndex+' '+x.side+
   ' L'+x.level+' '+x.reason+' / '+x.firstTwoRowsDefects.map(p=>p.reason).join(', '))),'',
  '## 必須の保留',
  '開口候補は人体包絡の床交差から計算しただけで、実際に床を取り除いていません。',
  '上階踊り場は必ず残し、身体包絡との交差を警告として別記します。',
  '階段の支持体・本物のBedrock衝突・扉・床の強度は未認証です。',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'];
 fs.writeFileSync(md,report.join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=await assembleB117(path.resolve(process.argv[2]??'b114-review-output'));
 const out=writeB117Review(report,path.resolve(process.argv[3]??'b117-review-output'));
 console.log(JSON.stringify({totals:report.totals,artifacts:out},null,2));
}
