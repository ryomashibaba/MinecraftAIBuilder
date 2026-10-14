/** B114: separate read-only revision of B113 draft, with NO source construction. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {analyzeB114Case} from './b114-joined-design.mjs';
export const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function buildB114(parent,base){
 if(!validateB113(base)||parent?.models?.length!==15||
 parent.sourceDesigns?.length!==15||parent.parentB110Models?.length!==15)
  throw Error('B114_INVALID_B113_PARENTS');
 const cases=base.cases.map((c,i)=>analyzeB114Case(c,parent.sourceDesigns[i],
  parent.parentB110Models[i],parent.models[i]));
 const sum=k=>cases.reduce((n,c)=>n+c.metrics[k],0);
 const total={
  buildings:15,conceptFloors:66,rooms:279,stairs:sum('sourceStairLinks'),
  inheritedB113ExistingFootprints:sum('b113StraightFootprintCandidates'),
  newlyFoundStraightReservations:sum('extendedFootprintCandidates'),
  remainingNoSourcePreservingStraight:sum('stillWithoutStraightFootprint'),
  hypotheticalGalleryStairLinks:sum('conditionalGalleryToGalleryInterfaces'),
  selectedStairsNeedingGalleryReroute:sum('interfacesNeedingGalleryChange'),
  inheritedProblematicBedrooms:sum('unverifiedBedroomRooms'),
  unapprovedBedroomRelocationOptions:sum('bedroomRelocationOptions'),
  bedroomsStillRequiringRevision:sum('bedroomsStillNeedRedesign'),
  proposedCorridorCells:sum('proposedAdditionalCorridorCells'),
  hypotheticalGroundToRoomPaths:sum('hypotheticalGroundToRooms'),
  physicallyCertifiedFullBuildings:0,
  educationValidatedStairStates:0,constructionCommands:0,worldContacts:0,
  legacyUnapproved:296,legacyHeld:18
 };
 const report={
  schema:'minecraftaibuilder-b114-conditional-access-offline-v1',
  base:'B113_DRAFT_UNMERGED_OFFLINE_REPORT',sourceB113Digest:base.integritySha256,
  frozenB112BaseCommit:base.baseCommit,
  sourceProofs:base.cases.map(c=>({id:c.id,shaB111:c.source.b111Digest,shaDesign:c.source.sourceDesignSha256})),
  cases,totals:total,
  physicalInterpretation:{
   stairBodySweepWithInstalledBlocks:'UNVERIFIED',
   floorApertureAndSupportIntegration:'NOT_APPLIED',
   localEducationVersion:'1.26.32.0_OBSERVED_B113_NOT_LIVE_TESTED',
   doorSwingAndCollisions:'UNVERIFIED',
   oneEntranceAllFloorsActualTravel:'NOT_CERTIFIED',
   familyOfAlternativeStairTypes:'TURNING_OR_SWITCHBACK_NOT_PHYSICALLY_TESTED'
  },
  nextActions:[
   'Resolve remaining footprint and landing connector defects without source edits',
   'Independently evaluate selected stairs with actual supported floor apertures offline',
   'Review anchor relocations only as proposals with affected room source checks',
   'Choose single representative building; require complete conditional route before any real-world test',
   'Request specific approval for a restricted Education world probe only after offline conditions clear'
  ],
  readiness:'NOT_PREPARED',worldContacts:0,worldCoordinates:null,
  commandCount:0,constructionApproved:false,executionAllowed:false,
  gates:base.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}
 };
 return {...report,integritySha256:sha(report)};
}
export function validateB114(r){
 try{
  const {integritySha256,...body}=r??{};
  if(!r||integritySha256!==sha(body)||
   r.schema!=='minecraftaibuilder-b114-conditional-access-offline-v1'||
   r.base!=='B113_DRAFT_UNMERGED_OFFLINE_REPORT'||
   r.sourceB113Digest?.length!==64||r.sourceProofs?.length!==15||
   r.cases?.length!==15||r.nextActions?.length!==5||
   r.readiness!=='NOT_PREPARED'||r.worldContacts!==0||
   r.worldCoordinates!==null||r.constructionApproved!==false||
   r.executionAllowed!==false||r.commandCount!==0||
   r.BuildPlan?.status!=='NOT_PREPARED'||
   r.BuildPlan.worldCoordinates!==null||
   r.BuildPlan.commandCount!==0||r.BuildPlan.operations?.length!==0||
   r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||
   r.physicalInterpretation?.oneEntranceAllFloorsActualTravel!=='NOT_CERTIFIED'||
   r.physicalInterpretation?.floorApertureAndSupportIntegration!=='NOT_APPLIED')
   return false;
  const m=r.totals,sum=k=>r.cases.reduce((n,c)=>n+c.metrics[k],0);
  if(m.buildings!==15||m.conceptFloors!==66||m.rooms!==279||m.stairs!==102||
   m.inheritedB113ExistingFootprints!==78||m.inheritedProblematicBedrooms!==4||
   m.proposedCorridorCells!==3660||m.legacyUnapproved!==296||m.legacyHeld!==18||
   m.physicallyCertifiedFullBuildings!==0||m.educationValidatedStairStates!==0||
   m.constructionCommands!==0||m.worldContacts!==0)return false;
  const keys={
   stairs:'sourceStairLinks',inheritedB113ExistingFootprints:'b113StraightFootprintCandidates',
   newlyFoundStraightReservations:'extendedFootprintCandidates',
   remainingNoSourcePreservingStraight:'stillWithoutStraightFootprint',
   hypotheticalGalleryStairLinks:'conditionalGalleryToGalleryInterfaces',
   selectedStairsNeedingGalleryReroute:'interfacesNeedingGalleryChange',
   inheritedProblematicBedrooms:'unverifiedBedroomRooms',
   unapprovedBedroomRelocationOptions:'bedroomRelocationOptions',
   bedroomsStillRequiringRevision:'bedroomsStillNeedRedesign',
   proposedCorridorCells:'proposedAdditionalCorridorCells',
   hypotheticalGroundToRoomPaths:'hypotheticalGroundToRooms'};
  if(Object.entries(keys).some(([key,source])=>m[key]!==sum(source))||
   m.inheritedB113ExistingFootprints+m.newlyFoundStraightReservations+
   m.remainingNoSourcePreservingStraight!==m.stairs||
   m.inheritedProblematicBedrooms!==m.unapprovedBedroomRelocationOptions+
   m.bedroomsStillRequiringRevision)return false;
  for(let i=0;i<15;i++){
   const c=r.cases[i],p=r.sourceProofs[i];
   if(c.id!==p.id||c.sourceB113Integrity!==p.shaB111||
    c.proposalsApplied!==false||c.legacyGeometryRetained!==true||
    c.physicalWholeBuildingWalkabilityCertified!==false||
    c.minecraftVersionCompatibility!=='UNVERIFIED'||c.conditionalRoutes?.allRoomPathsPhysicallyCertified!==false||
    c.stairs.length!==c.metrics.sourceStairLinks||
    c.conditionalRoutes.hypotheticalGroundToRoomPaths>c.metrics.conceptualRooms||
    c.stairs.some(s=>s.actualTraversabilityCertified!==false||
     s.worldOperations!==0||s.selected?.canExecute===true||
     s.selected?.educationCollisionVerified===true)||
    c.interiorReview.some(room=>room.appliedToOriginal!==false||room.physicalUsabilityCertified!==false||
     room.proposal?.anchorRelocationRequiresUserDesignReview===false))
    return false;
  }
  return true;
 }catch{return false;}
}
export async function assembleB114(){
 const parent=await assembleReferenceParent();
 const b113=buildB113(parent);
 if(!validateB113(b113))throw Error('B114_INVALID_B113_SOURCE');
 const result=buildB114(parent,b113);
 if(!validateB114(result))throw Error('B114_REPORT_INTEGRITY_FAILURE');
 return result;
}
export function writeB114(r,output){
 if(!validateB114(r))throw Error('B114_UNSAFE_EXPORT');
 fs.mkdirSync(output,{recursive:true});
 const jsonPath=path.join(output,'B114_Conditional_Circulation_15_Buildings.json'),
  csvPath=path.join(output,'B114_15_Buildings_Residual_Stairs.csv'),
  mdPath=path.join(output,'B114_Combined_Circulation_Review_JA.md');
 fs.writeFileSync(jsonPath,JSON.stringify(r,null,2)+'\n');
 const keys=['id','typology','levels','sourceStairLinks','b113StraightFootprintCandidates',
  'extendedFootprintCandidates','stillWithoutStraightFootprint',
  'conditionalGalleryToGalleryInterfaces','interfacesNeedingGalleryChange',
  'unverifiedBedroomRooms','bedroomRelocationOptions','bedroomsStillNeedRedesign',
  'hypotheticalGroundToRooms','conceptualRooms','proposedAdditionalCorridorCells'];
 fs.writeFileSync(csvPath,keys.join(',')+'\n'+r.cases.map(c=>keys.map(k=>c[k]??c.metrics[k]).join(',')).join('\n')+'\n');
 const t=r.totals;
 const issues=r.cases.flatMap(c=>c.stairs.filter(s=>!s.selected).map(s=>c.id+': L'+s.fromLevel+'→L'+s.toLevel+' core '+s.coreIndex));
 const md=['# B114 — 廊下・階段・内装の結合監査（オフライン）','',
  'このレポートは実施工の承認ではありません。Minecraft Educationへの接続・ワールド変更・座標変換は行っていません。',
  '',
  '|検証項目|値|','|---|---:|',
  '|前工程で寸法候補を発見した階段接続|'+t.inheritedB113ExistingFootprints+'|',
  '|B114の探索で追加の2×7候補を発見|'+t.newlyFoundStraightReservations+'|',
  '|元部屋・他コアを保護した直線候補なし|'+t.remainingNoSourcePreservingStraight+'|',
  '|廊下との上下端接続を仮定できる候補|'+t.hypotheticalGalleryStairLinks+'|',
  '|選択候補で踊り場→廊下の再設計が必要|'+t.selectedStairsNeedingGalleryReroute+'|',
  '|B113残留の問題部屋|'+t.inheritedProblematicBedrooms+'|',
  '|アンカー移設で改善可能な未適用案|'+t.unapprovedBedroomRelocationOptions+'|',
  '|なお再設計が必要な部屋|'+t.bedroomsStillRequiringRevision+'|',
  '|入口から全階への仮想経路上で届く部屋の合計|'+t.hypotheticalGroundToRoomPaths+' / 279|',
  '|実機で登れることを検証済みの階段|0|',
  '',
  '※「仮想経路」とは、**未設置の階段が条件どおりに通行できると仮定した上限検査**。実ゲームでの移動認証ではない。',
  '2×7の平面寸法だけでは支柱・床開口・天井・連続する体の当たり判定を保証しない。',
  'ベッドのアンカー変更候補はB111ソースの位置を変更せず、元設計の承認を得るまで適用しない。',
  '',
  '## 2×7で候補が見つからない階段',
  ...(issues.length?issues.map(x=>'- '+x):['- 0件（ただし実機経路は未認証）']),
  '',
  '## 次に必要な設計',
  ...r.nextActions.map((x,i)=>String(i+1)+'. '+x),
  '',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[] / 実BlockState認証0。'
 ].join('\n');
 fs.writeFileSync(mdPath,md+'\n');
 return {jsonPath,csvPath,mdPath};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await assembleB114();const output=process.argv.includes('--write-review')?
  writeB114(r,path.resolve('b114-review-output')):null;
 console.log(JSON.stringify({totals:r.totals,output},null,2));
}
