/** B118: all nine held stair-to-gallery exits; read-only, local geometry. */
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
import {validateB117Review} from '../../b117/main/b117-fleet-review.mjs';
import {auditB116Corridor} from '../../b116/main/b116-corridor-3d-core.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightFlight} from '../../b113/main/b113-geometry.mjs';
import {transformStairBox} from '../../b114/main/b114-stair-grid-frame.mjs';
import {searchB118Exit,shiftedLandingHints} from './b118-exit-alternatives.mjs';

const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=p=>p.x+','+p.z;
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const gated=(x,label)=>{
 if(x?.readiness!=='NOT_PREPARED'||x.constructionApproved!==false||
  x.executionAllowed!==false||x.worldContacts!==0||x.worldCoordinates!==null||
  x.commandCount!==0||x.gates?.length!==9||x.gates.some(g=>g.status!=='BLOCKED')||
  x.BuildPlan?.operations?.length!==0)throw Error('B118_UNSAFE_PARENT_'+label);
};
const routeKey=(stair,side,level)=>stair+':'+side+':'+level;
export async function assembleB118(dir){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const apartment=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json');
 const b117=read('b117-review-output','B117_15_Building_Slab_And_Gallery_Holds.json');
 if(!validateB114(b114)||!validateStairGalleryIntegration(gallery)||
  !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apartment)||
  !validateB117Review(b117)||b117.sourceB114Integrity!==b114.integritySha256||
  b117.sourceGalleryIntegrity!==gallery.integritySha256||
  b117.sourceCrossFlightIntegrity!==cross.integritySha256||
  b117.sourceApartmentIntegrity!==apartment.integritySha256||
  gallery.sourceB114Integrity!==b114.integritySha256||
  gallery.sourceApartmentSwitchbackIntegrity!==apartment.integritySha256)
  throw Error('B118_PINNED_SOURCE_DIGEST_CHANGED');
 [b114,gallery,cross,apartment,b117].forEach((x,i)=>gated(x,'PARENT_'+i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==b117.sourceB113Integrity||
  parent.sourceDesigns?.length!==15)throw Error('B118_B113_SOURCE_INVALID');
 gated(b113,'B113');
 const flight=straightFlight(),cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId,caseGallery=gallery.cases.find(x=>x.id===id),
   caseCross=cross.cases.find(x=>x.id===id),caseB113=b113.cases.find(x=>x.id===id),
   caseB117=b117.cases.find(x=>x.id===id);
  if(!caseGallery||!caseCross||!caseB113||!caseB117||
   caseGallery.stairLinks!==caseCross.proposedOriginalStairs.length)
   throw Error('B118_SOURCE_CASE_MISMATCH_'+id);
  const src=generateB105(design),qa=auditB105(src,design.plan);
  if(qa.issueCount||qa.envelopeConflicts)throw Error('B118_UNSAFE_B105_PARENT_'+id);
  const floors=design.plan.floors,stairCells=floors.map(()=>new Set()),
   apertures=floors.map(()=>new Set()),extras=floors.map(()=>[]),treads=[];
  const switchback=id==='APARTMENT_V1'?apartment.selectedCandidate:null;
  for(const slab of caseB117.slabs){
   if(!apertures[slab.toLevel])throw Error('B118_SLAB_LEVEL_MISMATCH');
   for(const q of slab.conceptualOpeningCells)apertures[slab.toLevel].add(K(q));
  }
  for(const [i,s]of caseCross.proposedOriginalStairs.entries()){
   if(s.stairIndex!==i||s.toLevel!==s.fromLevel+1)throw Error('B118_STAIR_INDEX_MISMATCH');
   const turn=switchback?.targetFlight===i;
   const footprint=turn?switchback.footprint:s.cells;
   for(const level of [s.fromLevel,s.toLevel])
    for(const q of footprint)stairCells[level].add(K(q));
   if(turn)treads.push(...switchback.stairTreadAABBs,...switchback.platformAABBs);
   else {
    const frame={origin:s.proposedOrigin,ascent:s.proposedAscent,fromLevel:s.fromLevel};
    treads.push(...flight.solids.slice(0,-2).map(b=>transformStairBox(b,frame)));
   }
  }
  const holds=new Map(caseB117.galleryHolds.map(h=>[routeKey(h.stairIndex,h.side,h.level),h]));
  const seen=new Set(),results=[];
  for(const link of caseGallery.stairInterfaces){
   const stair=caseCross.proposedOriginalStairs[link.stairIndex];
   if(!stair)throw Error('B118_GALLERY_STAIR_INDEX_MISSING');
   for(const p of link.proposals){
    if(p.side!=='LOWER'&&p.side!=='UPPER')throw Error('B118_GALLERY_SIDE_INVALID');
    const level=p.side==='UPPER'?stair.toLevel:stair.fromLevel;
    if(level!==p.level)throw Error('B118_GALLERY_LEVEL_INVALID');
    if(p.status==='CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE'){
     // B114 base source is unchanged; its earlier draft additions stay conceptual.
     extras[level].push(...p.addedCells);
     continue;
    }
    const hold=holds.get(routeKey(link.stairIndex,p.side,level));
    if(!hold||hold.originalStatus!==p.status||hold.reason!=='FIRST_TWO_ROWS_BLOCKED')
     throw Error('B118_HELD_EXIT_SOURCE_PROVENANCE_CHANGED');
    const f=floors[level],walk=new Set([...f.gallery,
     ...caseB113.horizontalRoutes[level].repair.addedCells,...extras[level]].map(K));
    const geometry={floor:f,rooms:f.rooms,cores:design.plan.cores,
     stairCells:stairCells[level],apertures:apertures[level],
     landing:p.landing,walk,maxPaths:2};
    const searched=searchB118Exit(geometry);
    const checked=searched.candidates.map((candidate,i)=>{
     const modeled=auditB116Corridor({proposal:{status:'CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE',
      fullFootprintCells:candidate.routeFootprint,addedCells:candidate.addedCells,
      startAnchor:candidate.start,goalAnchor:candidate.goal},
      level,floor:f,rooms:f.rooms,cores:design.plan.cores,
      stairMask:stairCells[level],existingWalk:walk,
      sourceVoxels:src.voxels,stairAABBs:treads,
      proposedApertures:apertures[level]});
     return {rank:i+1,route:candidate,sourceProxyStatus:modeled.status,
      sourceProxyIssueCodes:modeled.issueCodes,
      possibleInScoped2DModel:modeled.status==='NO_CONFLICT_IN_SCOPED_SOURCE_PROXIES',
      MinecraftWalkabilityCertified:false};
    });
    const hints=checked.some(c=>c.possibleInScoped2DModel)?
     {hints:[],totalGeometryFreeShiftHints:0,notNeededForScreening:true,
      noSourceLandingMoved:true,noStairBodyOrSupportRemodelled:true}:
     shiftedLandingHints({...geometry,maxRadius:2});
    const key=routeKey(link.stairIndex,p.side,level);
    if(seen.has(key))throw Error('B118_DUPLICATE_HELD_EXIT');
    seen.add(key);
    results.push({stairIndex:link.stairIndex,side:p.side,level,
     inheritedB117Reason:hold.reason,
     firstRowBlockers:hold.firstTwoRowsDefects.map(x=>x.reason),
     originalFixedLanding:searched.originalLanding,
     originalSearchStatus:searched.status,
     candidates:checked,examinations:searched.examinations,
     conceptualShiftHints:hints.hints,
     shiftHintsNotValidatedAsStairGeometry:true,
     noSourceCellsModified:true,constructionBlocked:true,
     physicalTraversalCertified:false});
   }
  }
  if(results.length!==caseB117.galleryHolds.length)
   throw Error('B118_UNRECONCILED_GALLERY_HOLDS_'+id);
  cases.push({id,conceptFloors:floors.length,sourceStairs:caseGallery.stairLinks,
   remainingOriginalHeldExits:results.length,exits:results,
   originalProtectedLayoutsUnmodified:true,worldContacts:0});
 }
 const all=cases.flatMap(c=>c.exits),sum=f=>all.reduce((n,c)=>n+f(c),0);
 const totals={buildings:cases.length,conceptFloors:cases.reduce((n,c)=>n+c.conceptFloors,0),
  sourceStairs:cases.reduce((n,c)=>n+c.sourceStairs,0),originalHeldExits:all.length,
  fixedLandingTwoWidthConcepts:sum(x=>x.candidates.filter(c=>c.possibleInScoped2DModel).length),
  interfacesWithFixedLandingProxyCandidates:all.filter(x=>x.candidates.some(c=>c.possibleInScoped2DModel)).length,
  interfacesStillNeedingWholeStairRedesign:all.filter(x=>!x.candidates.some(c=>c.possibleInScoped2DModel)).length,
  shiftHintsRequiringStairRedesign:sum(x=>x.conceptualShiftHints.length),
  sourceFootprintsChanged:0,physicallyCertifiedExits:0,worldContacts:0,constructionCommands:0};
 if(totals.buildings!==15||totals.conceptFloors!==66||totals.sourceStairs!==102||
  totals.originalHeldExits!==9||
  totals.interfacesWithFixedLandingProxyCandidates+totals.interfacesStillNeedingWholeStairRedesign!==9)
  throw Error('B118_FLEET_15_102_9_COVERAGE_INVALID');
 const body={schema:'minecraftaibuilder-b118-source-pinned-nine-exit-bounded-alternatives-v1',
  sourceB117Integrity:b117.integritySha256,sourceB114GalleryIntegrity:gallery.integritySha256,
  sourceB113Integrity:b113.integritySha256,cases,totals,
  holds:['ALL_NINE_ORIGINAL_CONNECTIONS_REMAIN_NOT_PREPARED',
   'TWO_WIDE_SIDE_EXITS_ARE_UNBUILT_CONCEPTUAL_DESIGN',
   'SHIFT_HINTS_NEED_WHOLE_STAIR_GEOMETRY_AND_HEADROOM_REMODEL',
   'BEDROCK_STAIR_SUPPORT_DOOR_COLLISIONS_UNVERIFIED',
   'UPPER_SLAB_816_CELLS_NOT_REMOVED_OR_AUTHORIZED',
   'DO_NOT_MERGE_OR_EXECUTE_CONSTRUCTION'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:H(body)};
}
export function validateB118Review(r){
 try{const {integritySha256,...body}=r??{},t=r.totals;
 return H(body)===integritySha256&&
  r.schema==='minecraftaibuilder-b118-source-pinned-nine-exit-bounded-alternatives-v1'&&
  t.buildings===15&&t.conceptFloors===66&&t.sourceStairs===102&&t.originalHeldExits===9&&
  t.interfacesWithFixedLandingProxyCandidates+t.interfacesStillNeedingWholeStairRedesign===9&&
  t.sourceFootprintsChanged===0&&t.physicallyCertifiedExits===0&&t.worldContacts===0&&
  r.cases.every(c=>c.originalProtectedLayoutsUnmodified&&c.exits.every(x=>
   x.noSourceCellsModified&&x.constructionBlocked&&x.physicalTraversalCertified===false&&
   x.conceptualShiftHints.every(y=>y.requiresWholeStairGeometryRedesign&&
    y.notAnAvailableReplacementStair)))&&
  r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
  r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
  r.commandCount===0&&r.gates?.length===9&&r.gates.every(x=>x.status==='BLOCKED')&&
  r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0;
 }catch{return false;}
}
export function writeB118Report(r,out){
 if(!validateB118Review(r))throw Error('B118_UNSAFE_REVIEW_OUTPUT');
 fs.mkdirSync(out,{recursive:true});
 const json=path.join(out,'B118_Nine_Exit_Alternatives.json');
 const csv=path.join(out,'B118_Nine_Exit_Shortlist.csv');
 const md=path.join(out,'B118_Nine_Exit_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const header=['building','stairIndex','side','level','originalBlockers',
  'fixedLandingProxyConcepts','shiftHints','status'];
 const lines=[header.join(',')];
 for(const c of r.cases)for(const x of c.exits)lines.push([c.id,x.stairIndex,x.side,x.level,
  x.firstRowBlockers.join('+'),x.candidates.filter(z=>z.possibleInScoped2DModel).length,
  x.conceptualShiftHints.length,x.candidates.some(z=>z.possibleInScoped2DModel)?
  'FIXED_LANDING_2D_AND_PROXY_IDEA_ONLY':'FULL_STAIR_REDESIGN_REQUIRED'].join(','));
 fs.writeFileSync(csv,lines.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B118 — 9か所の階段出口：元設計保護と幅2の代案（非施工）','',
  '|項目|件数|','|---|---:|',
  '|元の保留出口|'+t.originalHeldExits+'|',
  '|元踊り場から平面＋限定3D代理形状で干渉が見つからなかった出口|'+t.interfacesWithFixedLandingProxyCandidates+'|',
  '|階段全体の再設計が引き続き必要な出口|'+t.interfacesStillNeedingWholeStairRedesign+'|',
  '|再設計が必要な仮移設参考案|'+t.shiftHintsRequiringStairRedesign+'|',
  '|実機の歩行を認証した数|0|','',
  '## 全9件の個別判定',
  ...r.cases.flatMap(c=>c.exits.map(e=>'- '+c.id+' #'+e.stairIndex+' '+e.side+
   ' L'+e.level+': '+(e.candidates.some(x=>x.possibleInScoped2DModel)?
   '元踊り場の概念的な幅2代案あり（ただし元のHOLDは維持）':
   '階段全体の再設計HOLD')+' / 元の閉塞:'+e.firstRowBlockers.join('+'))),
  '','## 非施工・未認証の条件',
  ...r.holds.map(x=>'- '+x),
  '','NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await assembleB118(path.resolve(process.argv[2]??'b114-review-output'));
 const out=writeB118Report(r,path.resolve(process.argv[3]??'b118-review-output'));
 console.log(JSON.stringify({totals:r.totals,output:out},null,2));
}
