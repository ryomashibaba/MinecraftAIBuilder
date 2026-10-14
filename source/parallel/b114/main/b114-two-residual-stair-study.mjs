/**
 * B114 two residual cross-flight clashes: true-profile local geometry study.
 *
 * LIBRARY_V2: trim run-length of the last floor-grounded edge piers while
 * preserving tread-underside contact and checking every other stair body.
 * APARTMENT_V1: bounded all-cardinal 2x7 stair relocation search with both
 * source floor masks, rooms, other cores, source B105 voxels, upper apertures,
 * original lower/upper two-wide gallery interface, and all other flights.
 *
 * DESIGN ONLY. No source mutation, Minecraft I/O, world coordinates or states.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {straightFlight,intersects} from '../../b113/main/b113-geometry.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {transformStairBox,STAIR_GRID_FRAME_VERSION} from './b114-stair-grid-frame.mjs';
import {validateB114} from './compile-b114.mjs';
import {validateSupportRails} from './b114-stair-support-reprofile.mjs';
import {validateCrossFlightSearch} from './b114-cross-flight-position-search.mjs';

const h=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cell=p=>p.x+','+p.z;
const key3=p=>p.x+','+p.y+','+p.z;
const directions=[{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}];
const near=p=>directions.map(d=>({x:p.x+d.dx,z:p.z+d.dz}));
const rect=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const box=p=>({...p,width:1,height:1,depth:1});
const hits=(a,b)=>a.some(x=>b.some(y=>intersects(x,y)));
const distance=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z);
const faces=ascent=>Math.abs(ascent.dx)+Math.abs(ascent.dz)===1&&
 Number.isInteger(ascent.dx)&&Number.isInteger(ascent.dz);
function swath(f){
 const boxes=[];
 for(const [i,p] of f.samples.entries()){
  boxes.push({x:p.x-.3,y:p.y,z:p.z-.3,width:.6,height:2,depth:.6});
  if(i){
   const q=f.samples[i-1];
   boxes.push({x:Math.min(q.x,p.x)-.3,y:Math.min(q.y,p.y),
    z:Math.min(q.z,p.z)-.3,width:Math.abs(q.x-p.x)+.6,
    height:Math.abs(q.y-p.y)+2,depth:Math.abs(q.z-p.z)+.6});
  }
 }
 return boxes;
}
function piers(side,runLength=1){
 return Array.from({length:5},(_,i)=>({
  x:i+1,y:-1,z:side==='LEFT'?0:1.75,
  width:i===4?runLength:1,height:i+1,depth:.25}));
}
function plot(origin,dir){
 const out=[];
 for(let i=0;i<7;i++)for(let w=0;w<2;w++)
  out.push({x:origin.x+dir.dx*i-dir.dz*w,
   z:origin.z+dir.dz*i+dir.dx*w});
 return out;
}
function model(stair,origin,dir,sides,flight,body,runLength=1){
 const frame={origin,ascent:dir,fromLevel:stair.fromLevel};
 const apply=parts=>parts.map(p=>transformStairBox(p,frame));
 return {
  origin,ascent:dir,fromLevel:stair.fromLevel,toLevel:stair.toLevel,
  coreIndex:stair.coreIndex,
  body:apply(body),tread:apply(flight.solids.slice(0,-2)),
  support:apply(sides.flatMap(s=>piers(s,runLength))),
  addedToMinecraft:false
 };
}
function pair(a,b){
 const support=hits(a.support,b.body)||hits(b.support,a.body);
 const tread=hits(a.tread,b.body)||hits(b.tread,a.body);
 return {supportBody:support,treadBody:tread,any:support||tread};
}
function pairConflicts(stairs,models){
 const out=[];
 for(let i=0;i<stairs.length;i++)
  for(let j=i+1;j<stairs.length;j++){
   if(stairs[i].fromLevel===stairs[j].fromLevel||
    Math.abs(stairs[i].fromLevel-stairs[j].fromLevel)>1)continue;
   const x=pair(models[i],models[j]);
   if(x.any)out.push({first:i,second:j,...x});
  }
 return out;
}
function twoWideConnected(landing,walkway){
 return landing.length===2&&landing.every(p=>near(p).some(q=>walkway.has(cell(q))));
}
function staticCollisionCount(body,solids){
 const contact=new Set();
 for(const a of body)for(let y=Math.floor(a.y);y<Math.ceil(a.y+a.height);y++)
  for(let z=Math.floor(a.z);z<Math.ceil(a.z+a.depth);z++)
   for(let x=Math.floor(a.x);x<Math.ceil(a.x+a.width);x++){
    const p=solids.get(x+','+y+','+z);
    if(p&&intersects(a,box({x,y,z})))contact.add(key3(p));
   }
 return contact.size;
}
function sourceFloorGuard(stair,origin,dir,design,reference,source,sourceFootprints,modelled){
 const low=design.plan.floors[stair.fromLevel],
  up=design.plan.floors[stair.toLevel],core=design.plan.cores[stair.coreIndex];
 const foot=plot(origin,dir);
 if(!core||!faces(dir)||!foot.some(p=>rect(core,p)))return null;
 const others=design.plan.cores.filter((_,i)=>i!==stair.coreIndex);
 for(const p of foot){
  if(low.footprintRows[p.z]?.[p.x]!=='1'||
   up.footprintRows[p.z]?.[p.x]!=='1'||
   low.rooms.some(r=>rect(r,p))||up.rooms.some(r=>rect(r,p))||
   others.some(r=>rect(r,p)))return null;
 }
 const lower=foot.slice(0,2),upper=foot.slice(-2);
 const r0=reference.horizontalRoutes[stair.fromLevel].repair;
 const r1=reference.horizontalRoutes[stair.toLevel].repair;
 const walk0=new Set([...low.gallery,...r0.addedCells].map(cell)),
  walk1=new Set([...up.gallery,...r1.addedCells].map(cell));
 if(!twoWideConnected(lower,walk0)||!twoWideConnected(upper,walk1))return null;
 const m=modelled(origin,dir);
 if(staticCollisionCount(m.body,source))return null;
 // Shaft aperture: sweep through the upper slab at y=upperLevel*5.
 const aperture=new Set(),y=stair.toLevel*5;
 for(const b of m.body)if(b.y<y+1&&b.y+b.height>y)
  for(let z=Math.floor(b.z);z<Math.ceil(b.z+b.depth);z++)
   for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.width);x++){
    const p={x,z};
    if(up.footprintRows[z]?.[x]==='1'&&
     intersects(b,box({x,y,z}))){
     if(up.rooms.some(r=>rect(r,p)))return null;
     aperture.add(cell(p));
    }
   }
 if(!aperture.size)return null;
 // Do not introduce a 2x7 footprint overlap with a different stair landing
 // on the same level unless the source already had that exact overlap.
 for(const t of sourceFootprints){
  if(t.index===stair.index||t.fromLevel!==stair.fromLevel)continue;
  if(foot.some(p=>t.foot.has(cell(p)))&&!t.oldOverlap) return null;
 }
 return {model:m,footprint:foot,lower,upper,apertureCount:aperture.size};
}
function prepareCase(design,reference,cross,rails,flight,body){
 const states=cross.proposedOriginalStairs,stairMetadata=rails.stairs;
 const models=states.map((s,i)=>model(s,s.proposedOrigin,s.proposedAscent,
  stairMetadata[i].railSides,flight,body));
 return {states,models,metadata:stairMetadata};
}
function targetProof(cross,stairs,curr,expected){
 const pairs=pairConflicts(stairs,curr);
 if(pairs.length!==expected||
  pairs.length!==cross.remainingPairs.length||
  cross.remainingPairs.some(r=>!pairs.some(p=>p.first===r.first&&p.second===r.second&&
   p.supportBody===r.supportBody&&p.treadBody===r.treadBody)))
  throw Error('B114_TARGETED_CONFLICT_BASELINE_DIFFERENT:'+cross.id);
 return pairs;
}
function repairLibrary(cross,stairCase,rails,flight,body){
 const {states,models,metadata}=prepareCase(null,null,cross,rails,flight,body);
 const index=1,stair=states[index],baseline=targetProof(cross,states,models,1);
 const cases=[];
 for(const width of [1,.875,.75,.625,.5]){
  const alt=model(stair,stair.proposedOrigin,stair.proposedAscent,
   metadata[index].railSides,flight,body,width);
  const attempt=[...models];attempt[index]=alt;
  const clashes=pairConflicts(states,attempt);
  const ownPlayerBodyClash=hits(alt.support,alt.body);
  const floorLevel=stair.fromLevel*5;
  const groundContact=alt.support.every((p,i)=>p.y===floorLevel);
  const everyPierUndersideContact=metadata[index].railSides.flatMap(s=>piers(s,width))
   .every(p=>p.y+p.height===p.x-1);
  const doesNotWorsen=clashes.length<=baseline.length;
  const valid=!ownPlayerBodyClash&&groundContact&&
   everyPierUndersideContact&&doesNotWorsen;
  cases.push({width,
   supportCollisionPairs:clashes.filter(p=>p.supportBody).length,
   treadCollisionPairs:clashes.filter(p=>p.treadBody).length,
   totalCollisionPairs:clashes.length,
   ownPlayerBodyClash,groundContact,everyPierUndersideContact,
   needsNonstandardEducationSupportProfile:true,
   onlyIfSourceFloorSupportRemains:true,
   validOfflineGeometry:valid});
 }
 // Choose the largest viable width to preserve material overhang margin.
 const chosen=cases.filter(x=>x.validOfflineGeometry&&x.totalCollisionPairs===0)
  .sort((a,b)=>b.width-a.width)[0]??null;
 return {id:cross.id,originalRemainingPairs:baseline.length,
  targetFlight:index,originalStairOrigin:stair.proposedOrigin,
  originalStairAscent:stair.proposedAscent,
  changedStairFootprints:0,
  originalRailWidthBlocks:1,
  chosenLastPierRunWidthBlocks:chosen?.width??null,
  originalPierCount:metadata[index].railSides.length*5,
  proposedPierCount:metadata[index].railSides.length*5,
  peerInterferenceResolvedInOfflineModel:chosen?.totalCollisionPairs===0,
  sourceFloorContactPreserved:chosen?.groundContact??false,
  treadUndersideContactPreserved:chosen?.everyPierUndersideContact??false,
  shortlistedWidthCandidates:cases,
  remainingPairs:chosen?.totalCollisionPairs??baseline.length,
  outstanding:'NONSTANDARD_0_625_BLOCK_WIDTH_SUPPORT_AND_PHYSICAL_EDUCATION_COLLISION_UNCERTIFIED',
  actualChangesApplied:false,
  realStairAndStructureCertified:false};
}
function searchApartment(design,reference,cross,rails,flight,body){
 const {states,models,metadata}=prepareCase(design,reference,cross,rails,flight,body);
 const baseline=targetProof(cross,states,models,1);
 const volume=generateB105(design),audit=auditB105(volume,design.plan);
 if(audit.issueCount||audit.envelopeConflicts)throw Error('B114_APARTMENT_SOURCE_VOXEL_UNSAFE');
 const source=new Map(volume.voxels.filter(v=>v.kind!=='EXTERIOR_PORTAL_VOID_PROXY')
  .map(p=>[key3(p),p]));
 const target=[baseline[0].first,baseline[0].second];
 const foots=states.map((s,index)=>({index,fromLevel:s.fromLevel,
  foot:new Set(s.cells.map(cell)),oldOverlap:false}));
 // Source B114 has two core-aligned stair flights each floor and the
 // candidate search must not create a new 2x7 intersection.
 for(const a of foots) {
  a.oldOverlap=foots.some(b=>b!==a&&a.fromLevel===b.fromLevel&&
   [...a.foot].some(k=>b.foot.has(k)));
 }
 let scanned=0,sourceMaskReject=0,roomOrDoorReject=0,
  geometryClear=0,total3DEvaluations=0;
 const viable=[],alternatives=[];
 for(const index of target){
  const st=states[index],core=design.plan.cores[st.coreIndex];
  for(const dir of directions)
   for(let z=core.z-7;z<=core.z+core.depth+7;z++)
    for(let x=core.x-7;x<=core.x+core.width+7;x++){
     scanned++;
     const origin={x,z};
     const footprint=plot(origin,dir);
     if(footprint.every(p=>p.x===0&&p.z===0))continue;
     const modelled=(origin,ascent)=>model(st,origin,ascent,
      metadata[index].railSides,flight,body);
     const safe=sourceFloorGuard({...st,index},origin,dir,design,reference,
      source,foots,modelled);
     if(!safe){sourceMaskReject++;continue;}
     geometryClear++;
     const changed=origin.x!==st.proposedOrigin.x||origin.z!==st.proposedOrigin.z||
      dir.dx!==st.proposedAscent.dx||dir.dz!==st.proposedAscent.dz;
     if(!changed)continue;
     const next=[...models];next[index]=safe.model;
     const clashes=pairConflicts(states,next);
     total3DEvaluations++;
     const displacement=distance(origin,st.proposedOrigin);
     const quarterTurn=dir.dx!==st.proposedAscent.dx||dir.dz!==st.proposedAscent.dz;
     const result={targetFlight:index,origin,ascent:dir,
      displacement,quarterTurn,upperSlabApertureCells:safe.apertureCount,
      newInterferencePairs:clashes.length,
      resolvedByModel:clashes.length===0,
      originalSourceIsUntouched:true,
      actualStairPhysicsCertified:false};
     if(clashes.length===0)viable.push(result);
     else if(clashes.length<=baseline.length)alternatives.push(result);
    }
 }
 const sort=(a,b)=>a.newInterferencePairs-b.newInterferencePairs||
  a.displacement-b.displacement||Number(a.quarterTurn)-Number(b.quarterTurn)||
  a.targetFlight-b.targetFlight||a.origin.z-b.origin.z||a.origin.x-b.origin.x;
 viable.sort(sort);alternatives.sort(sort);
 const best=viable[0]??null;
 // Do not apply the new candidate unless zero conflicts in the full
 // adjacent-floor model AND the untouched parent-source guards all pass.
 return {id:cross.id,
  originalRemainingPairs:baseline.length,
  baselineTreadConflictDetail:{
   pair:[...target],lowerFlight:target[0],upperFlight:target[1],
   physics:'LAST_TREADS_OF_LOWER_FLIGHT_VS_INITIAL_TREADS_OF_UPPER_FLIGHT',
   sourceFull2x7CannotBeTruncatedWithout_LOSING_FIVE_RISE_STEPS:true},
  candidateOriginDirectionTrials:scanned,
  screenedOutByMaskDoorOrSource:sourceMaskReject,
  validSourcePreservingGalleryConnectedCandidates:geometryClear,
  full3DPairSetsEvaluated:total3DEvaluations,
  conflictFreeStraightCandidates:viable.length,
  selectedZeroConflictStraightCandidate:best,
  topStraightCandidates:viable.slice(0,6),
  nonImprovingCandidates:alternatives.slice(0,6),
  afterSearchInterferencePairs:best?0:baseline.length,
  fallBackStrategy:best?'REVIEW_NEW_STRAIGHT_2x7_PLACEMENT':
   'DESIGN_EXPLICIT_TURNING_OR_SWITCHBACK_5_RISE_2_WIDE_GEOMETRY',
  alternateFootprintNotYetIntegrated:true,
  originalParentStairNotChanged:true,
  realTurningStairModelValidated:false,
  actualMinecraftChange:false};
}
export function analyzeB114TwoResiduals(parent,b113,b114,stack,rails,cross){
 if(!validateB114(b114)||!validateSupportRails(rails)||
  !validateCrossFlightSearch(cross)||
  cross.integritySha256?.length!==64||
  cross.sourceEdgeSupportIntegrity!==rails.integritySha256||
  cross.sourceB114Integrity!==b114.integritySha256||
  cross.totals.afterSearchInterferencePairs!==2||
  stack.sourceB114IntegritySha256!==b114.integritySha256||
  rails.gridFrameVersion!==STAIR_GRID_FRAME_VERSION||
  parent.sourceDesigns?.length!==15||
  b113.cases?.length!==15)
  throw Error('B114_TWO_RESIDUALS_UNVERIFIED_SOURCE');
 const targetIds=['APARTMENT_V1','LIBRARY_V2'],
  remaining=cross.cases.filter(x=>x.remainingConflicts>0);
 if(remaining.length!==2||remaining.some(x=>!targetIds.includes(x.id))||
  remaining.reduce((n,c)=>n+c.remainingConflicts,0)!==2)
  throw Error('B114_TWO_RESIDUALS_CHANGED');
 const flight=straightFlight(),body=swath(flight);
 const get=(name)=>({
  original:b114.cases.find(c=>c.id===name),
  cross:cross.cases.find(c=>c.id===name),
  rails:rails.cases.find(c=>c.id===name),
  design:parent.sourceDesigns.find(c=>c.candidateId===name),
  b113:b113.cases.find(c=>c.id===name)});
 const a=get('APARTMENT_V1'),l=get('LIBRARY_V2');
 if(Object.values(a).some(x=>!x)||Object.values(l).some(x=>!x))
  throw Error('B114_TWO_RESIDUALS_MISSING_PROVENANCE');
 const library=repairLibrary(l.cross,l.original,l.rails,flight,body);
 const apartment=searchApartment(a.design,a.b113,a.cross,a.rails,flight,body);
 const remainingCount=library.remainingPairs+apartment.afterSearchInterferencePairs;
 if(remainingCount>2||!library.peerInterferenceResolvedInOfflineModel||
  !library.sourceFloorContactPreserved||!library.treadUndersideContactPreserved||
  library.chosenLastPierRunWidthBlocks!==.625)
  throw Error('B114_TWO_RESIDUALS_LIBRARY_SUPPORT_REGRESSION');
 const totals={originalStairInterferencePairs:2,
  afterLibraryPierReprofilePairs:1,
  afterApartmentBoundedStraightResearchPairs:remainingCount,
  eliminatedViaGroundConnectedPierTrim:1,
  physicallyCertifiedInterferenceResolutions:0,
  originalBuildingModified:0,
  actualMinecraftCommands:0,
  worldContacts:0};
 const payload={schema:'minecraftaibuilder-b114-two-residual-targeted-3d-study-v1',
  sourceB114Integrity:b114.integritySha256,
  sourceCrossFlightIntegrity:cross.integritySha256,
  sourceEdgeRailIntegrity:rails.integritySha256,
  geometryFrameVersion:STAIR_GRID_FRAME_VERSION,
  library,apartment,totals,
  noSourceOrWorldChanges:true,halfStepAndBedrockStatesUnverified:true,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...payload,integritySha256:h(payload)};
}
export function validateTwoResiduals(r){
 try{
  const {integritySha256,...body}=r;
  return integritySha256===h(body)&&
   r.schema==='minecraftaibuilder-b114-two-residual-targeted-3d-study-v1'&&
   r.sourceB114Integrity?.length===64&&r.sourceEdgeRailIntegrity?.length===64&&
   r.sourceCrossFlightIntegrity?.length===64&&
   r.geometryFrameVersion===STAIR_GRID_FRAME_VERSION&&
   r.totals.originalStairInterferencePairs===2&&
   r.totals.afterLibraryPierReprofilePairs===1&&
   r.totals.afterApartmentBoundedStraightResearchPairs<=2&&
   r.library.id==='LIBRARY_V2'&&r.library.chosenLastPierRunWidthBlocks===.625&&
   r.library.peerInterferenceResolvedInOfflineModel===true&&
   r.library.changedStairFootprints===0&&
   r.apartment.id==='APARTMENT_V1'&&
   r.apartment.originalParentStairNotChanged===true&&
   r.totals.physicallyCertifiedInterferenceResolutions===0&&
   r.noSourceOrWorldChanges===true&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan.status==='NOT_PREPARED'&&r.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeTwoResidualStudy(r,dir){
 if(!validateTwoResiduals(r))throw Error('B114_TWO_RESIDUALS_UNSAFE_REPORT');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B114_Final_Two_Stair_Conflicts_3D_Study.json'),
  csv=path.join(dir,'B114_Final_Two_Stair_Conflicts_Options.csv'),
  md=path.join(dir,'B114_Final_Two_Stair_Conflicts_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const rows=[
  ['LIBRARY_V2','LAST_PIER_RUN_WIDTH',...r.library.shortlistedWidthCandidates.map(x=>x.width+':'+x.totalCollisionPairs)],
  ['APARTMENT_V1','FOUR_CARDINAL_2X7_SOURCE_MASK_SEARCH',
    String(r.apartment.candidateOriginDirectionTrials),
    String(r.apartment.validSourcePreservingGalleryConnectedCandidates),
    String(r.apartment.conflictFreeStraightCandidates)],
 ];
 fs.writeFileSync(csv,'building,study,candidate_1,candidate_2,candidate_3,candidate_4,candidate_5\n'+rows.map(r=>r.join(',')).join('\n')+'\n');
 fs.writeFileSync(md,[
  '# B114 — 最後の2階段干渉：支持体精密化と全方向直線階段探索','',
  'B114 Draft上の元設計は未変更。実Minecraftへの接続・施工は0。','',
  '## LIBRARY_V2 — 接地した最終支持ピアの短縮',
  '階段番号1の最後の5ブロック高支持ピアを、両側とも進行方向1.0→0.625に短縮。',
  '両レールを床から踏み面まで保ちながら隣の階段の身体包絡との交差を局所AABBで回避。',
  'モデル上の残留衝突: '+r.library.originalRemainingPairs+'→'+r.library.remainingPairs+'。',
  'ただし0.625×0.25の薄い支持材を実Educationのブロックで再現できる証明ではない。','',
  '## APARTMENT_V1 — 4方向の別直線階段を探索',
  '基準の残留干渉: '+r.apartment.originalRemainingPairs+'組。',
  '床マスク・部屋・他コア・2幅廊下・原B105外壁を保護した候補のうち、',
  '局所4方向（コア付近±7ブロック）の原点候補を'+r.apartment.candidateOriginDirectionTrials+'試行。',
  '通行・保護条件を通過した候補: '+r.apartment.validSourcePreservingGalleryConnectedCandidates+'件。',
  '全隣接階段と衝突0の候補: '+r.apartment.conflictFreeStraightCandidates+'件。',
  '現時点の提案: '+r.apartment.fallBackStrategy+'。',
  '候補がない場合は正式な折返し階段の二段階形状、踊り場、頭上2ブロックの掃引を',
  '新規モジュールでモデル化する必要がある。未設計の形状を成功扱いにしない。','',
  '## 全体と安全',
  '既存2組から、検討案で残る組: '+r.totals.afterApartmentBoundedStraightResearchPairs,
  '床開口・廊下接続17箇所・実BlockState・実機通行は今後の独立検証項目。',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}