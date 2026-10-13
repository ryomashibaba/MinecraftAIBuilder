/** B113: source-pinned, local-only diagnostics. This entry point has no game/transport imports. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleB111,validateB111Report} from '../../b111/main/compile-b111.mjs';
import {auditB111Model} from '../../b111/main/b111-interior-access.mjs';
import {generateB105} from '../../b105/main/b105-building-volume.mjs';
import {OBSERVATION,blockEvidence} from './b113-evidence.mjs';
import {straightFlight,auditFlight,inspectLegacyStair,findFlightReservations,K,neighbors,reachable} from './b113-geometry.mjs';
import {inspectRoomAssembly,RECIPES} from './b113-interiors.mjs';
import {repairGallery} from './b113-circulation.mjs';
export const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const BASE=JSON.parse(fs.readFileSync(new URL('./b113-baseline.json',import.meta.url),'utf8'));
const safety=r=>r?.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&r.executionAllowed===false&&
 r.worldContacts===0&&r.worldCoordinates===null&&r.commandCount===0&&r.gates?.length===9&&
 r.gates.every(g=>g.status==='BLOCKED')&&r.BuildPlan?.status==='NOT_PREPARED'&&
 Array.isArray(r.BuildPlan.operations)&&r.BuildPlan.operations.length===0&&r.BuildPlan.commandCount===0&&r.BuildPlan.worldCoordinates===null;
function horizontalRoutes(d,b110,volume){
 return d.plan.floors.map(f=>{
  const gallery=new Set(f.gallery.map(K));
  const seed=f.level===0?f.exits[0]?.edge[0]:volume.junctions.find(j=>j.level===f.level&&j.coreIndex===0)?.corridor;
  const seen=seed?reachable(seed,gallery):new Set();
  const allSeeds=f.level===0?f.exits.flatMap(e=>e.edge):volume.junctions.filter(j=>j.level===f.level).map(j=>j.corridor);
  const anySeen=new Set(allSeeds.flatMap(s=>[...reachable(s,gallery)]));
  const doors=b110.doors.filter(x=>x.level===f.level);
   return {level:f.level,sourceSeed:seed??null,galleryCells:gallery.size,reachableGalleryCells:seen.size,
   roomDoorways:doors.length,horizontalRoomConnections:doors.filter(x=>seen.has(K(x.externalGalleryCell))).length,
    connectionsFromAnyDeclaredEntrance:doors.filter(x=>anySeen.has(K(x.externalGalleryCell))).length,
    repair:repairGallery(f,d.plan.cores,doors),
   entryBasis:f.level===0?'GROUND_EXIT_INTERIOR':'CORE_ADJACENT_CELL_ASSUMING_FUTURE_VALID_STAIR',
   actualEntryToFloorTraversal:'UNVERIFIED'};
 });
}
export function buildB113(parent){
 if(!validateB111Report(parent?.report)||parent.models?.length!==15||parent.sourceDesigns?.length!==15||
 parent.parentB110Models?.length!==15||parent.report.parentB110BaselineSha256!==BASE.b100Sha)throw Error('B113_INVALID_PARENT');
 const cases=parent.models.map((m,i)=>{
  const d=parent.sourceDesigns[i],b=parent.parentB110Models[i],pin=BASE.cases[i];
  if(m.id!==pin.id||b.digest!==pin.b110Digest||m.digest!==pin.b111Digest||sha(d)!==pin.sourceDesignSha256||
   !auditB111Model(m,d,b))throw Error('B113_PARENT_SOURCE_CHANGED:'+i);
  const v=generateB105(d),rooms=[];
  for(const f of d.plan.floors)for(const r of f.rooms){
   rooms.push(inspectRoomAssembly({...r,level:f.level},b.doors.find(x=>x.level===f.level&&x.roomId===r.id),
    m.rooms.find(x=>x.level===f.level&&x.roomId===r.id)));
  }
  const stairs=b.stairs.map(s=>({...inspectLegacyStair(s,v),reservation:findFlightReservations(s,d)}));
  const routes=horizontalRoutes(d,b,v);
  return {id:m.id,typology:m.typology,levels:m.levels,source:pin,
   rooms,stairs,horizontalRoutes:routes,
   metrics:{rooms:rooms.length,doorPairs:b.doors.length,fixtureAnchors:b.fixtures.length,
    twoCellBeds:rooms.flatMap(r=>r.fixtures).filter(f=>f.role==='bed').length,
    roomOccupancyProblemsBefore:rooms.filter(r=>r.originalIssues.length).length,
    roomOccupancyProblemsAfter:rooms.filter(r=>r.issues.length).length,
    refinedBedLayouts:rooms.filter(r=>r.bedLayoutRefined).length,
    stairLinks:stairs.length,stairOvershoots:stairs.filter(s=>s.upperOvershoot!==0).length,
    lowerLandingGaps:stairs.filter(s=>s.lowerLandingDistance>1).length,
    upperLandingGaps:stairs.filter(s=>s.upperLandingDistance>1).length,
    linksWithReplacementFootprints:stairs.filter(s=>s.reservation.eligibleFootprints>0).length,
    horizontalRoomConnections:routes.reduce((n,f)=>n+f.horizontalRoomConnections,0),
    horizontalConnectionsAnyEntrance:routes.reduce((n,f)=>n+f.connectionsFromAnyDeclaredEntrance,0),
    repairedHorizontalRoomConnections:routes.reduce((n,f)=>n+f.repair.roomConnections,0),
    proposedGalleryAdditionalCells:routes.reduce((n,f)=>n+f.repair.addedCells.length,0),
    certifiedDoors:0,certifiedStairs:0,certifiedFurniture:0},
   physicalCompletion:'UNVERIFIED',executionAllowed:false};
 });
 const sum=k=>cases.reduce((n,c)=>n+c.metrics[k],0);
 const report={schema:'minecraftaibuilder-b113-offline-compatibility-v1',
  baseCommit:BASE.baseCommit,b112Integrity:BASE.b112Integrity,sourceBaseline:BASE,
  environmentObservation:{...OBSERVATION},blockRoles:blockEvidence(),cases,
  representativeIds:cases.filter(c=>c.id.endsWith('_V1')).map(c=>c.id),
  replacementModule:straightFlight(),replacementModuleAudit:auditFlight(straightFlight()),
  totals:{variants:15,levels:cases.reduce((n,c)=>n+c.levels,0),rooms:sum('rooms'),
   doorPairs:sum('doorPairs'),stairLinks:sum('stairLinks'),conceptTreads:612,
   fixtureAnchors:sum('fixtureAnchors'),twoCellBeds:sum('twoCellBeds'),
   roomOccupancyProblemsBefore:sum('roomOccupancyProblemsBefore'),roomOccupancyProblemsAfter:sum('roomOccupancyProblemsAfter'),
   refinedBedLayouts:sum('refinedBedLayouts'),stairOvershoots:sum('stairOvershoots'),
   lowerLandingGaps:sum('lowerLandingGaps'),upperLandingGaps:sum('upperLandingGaps'),
   linksWithReplacementFootprints:sum('linksWithReplacementFootprints'),horizontalRoomConnections:sum('horizontalRoomConnections'),
   horizontalConnectionsAnyEntrance:sum('horizontalConnectionsAnyEntrance'),
   repairedHorizontalRoomConnections:sum('repairedHorizontalRoomConnections'),proposedGalleryAdditionalCells:sum('proposedGalleryAdditionalCells'),
   legacyUnapproved:296,legacyHeld:18,educationVerifiedBlockStates:0,physicallyCertifiedBuildings:0},
  nextChecks:[
   {priority:1,task:'Education 1.26.32.0: exact door ID/state schema, upper/lower creation/update order and hinge/open passage',requiresGameApproval:true},
   {priority:2,task:'5-rise straight stair module: ascent mapping, half-step collision, supported landings and upper-floor aperture',requiresGameApproval:true},
   {priority:3,task:'Bed two-cell placement, head direction, support, sleep interaction and side approach',requiresGameApproval:true},
   {priority:4,task:'Fence/slab desk support, barrel facing/opening/inventory, bookshelf display and decorative chair limitations',requiresGameApproval:true},
   {priority:5,task:'Reserve larger cores and reroute galleries before approving a building-wide replacement',requiresGameApproval:false}
  ],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:parent.report.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...report,integritySha256:sha(report)};
}
export function validateB113(r){
 try{
  const {integritySha256,...body}=r??{};
  if(!safety(r)||integritySha256!==sha(body)||r.schema!=='minecraftaibuilder-b113-offline-compatibility-v1'||
   sha(r.sourceBaseline)!==sha(BASE)||r.baseCommit!==BASE.baseCommit||r.b112Integrity!==BASE.b112Integrity||
   sha(r.environmentObservation)!==sha(OBSERVATION)||sha(r.blockRoles)!==sha(blockEvidence())||
   sha(r.replacementModule)!==sha(straightFlight())||sha(r.replacementModuleAudit)!==sha(auditFlight(straightFlight()))||
   r.cases.length!==15||r.nextChecks.length!==5||r.nextChecks.some((c,i)=>c.priority!==i+1||c.requiresGameApproval!==(i<4)))return false;
  for(const [i,c] of r.cases.entries()){
   if(c.id!==BASE.cases[i].id||sha(c.source)!==sha(BASE.cases[i])||c.executionAllowed!==false||c.physicalCompletion!=='UNVERIFIED'||
    c.metrics.certifiedDoors!==0||c.metrics.certifiedStairs!==0||c.metrics.certifiedFurniture!==0||
    c.rooms.length!==c.metrics.rooms||c.stairs.length!==c.metrics.stairLinks||
    c.rooms.some(x=>x.physicalRoomCertified!==false||x.sourceAnchorsPreserved!==true||
      x.offlineOccupancyClear!==(x.issues.length===0)||x.door.executable!==false||
      x.fixtures.some(f=>f.physicallyUsableCertified!==false||f.materialStatesAssigned!==false||sha(f.recipe)!==sha(RECIPES[f.role])))||
    c.horizontalRoutes.some(f=>f.repair.executionAllowed!==false||f.repair.appliedToSource!==false||f.repair.roomsMoved!==false||
     f.repair.coresMoved!==false||f.repair.allNewCellsOutsideRoomsAndCores!==true)||
    c.stairs.some(s=>s.physicalTraversalCertified!==false||s.decision!=='REQUIRES_STAIR_REDESIGN'||s.reservation.applied!==false||
     s.reservation.sample?.executable===true))return false;
   const recomputed={rooms:c.rooms.length,doorPairs:c.rooms.length,fixtureAnchors:c.rooms.reduce((n,r)=>n+r.fixtures.length,0),
    twoCellBeds:c.rooms.flatMap(r=>r.fixtures).filter(f=>f.role==='bed').length,
    roomOccupancyProblemsBefore:c.rooms.filter(r=>r.originalIssues.length).length,roomOccupancyProblemsAfter:c.rooms.filter(r=>r.issues.length).length,
    refinedBedLayouts:c.rooms.filter(r=>r.bedLayoutRefined).length,stairLinks:c.stairs.length,
    stairOvershoots:c.stairs.filter(s=>s.upperOvershoot!==0).length,lowerLandingGaps:c.stairs.filter(s=>s.lowerLandingDistance>1).length,
    upperLandingGaps:c.stairs.filter(s=>s.upperLandingDistance>1).length,linksWithReplacementFootprints:c.stairs.filter(s=>s.reservation.eligibleFootprints>0).length,
    horizontalRoomConnections:c.horizontalRoutes.reduce((n,f)=>n+f.horizontalRoomConnections,0),
    horizontalConnectionsAnyEntrance:c.horizontalRoutes.reduce((n,f)=>n+f.connectionsFromAnyDeclaredEntrance,0),
    repairedHorizontalRoomConnections:c.horizontalRoutes.reduce((n,f)=>n+f.repair.roomConnections,0),
    proposedGalleryAdditionalCells:c.horizontalRoutes.reduce((n,f)=>n+f.repair.addedCells.length,0)};
   if(Object.entries(recomputed).some(([k,v])=>c.metrics[k]!==v))return false;
  }
  const invariants={variants:15,levels:66,rooms:279,doorPairs:279,stairLinks:102,conceptTreads:612,fixtureAnchors:558,
   twoCellBeds:300,legacyUnapproved:296,legacyHeld:18,educationVerifiedBlockStates:0,physicallyCertifiedBuildings:0};
  for(const [k,v] of Object.entries(invariants))if(r.totals[k]!==v)return false;
  for(const k of ['rooms','doorPairs','stairLinks','fixtureAnchors','twoCellBeds','roomOccupancyProblemsBefore','roomOccupancyProblemsAfter',
   'refinedBedLayouts','stairOvershoots','lowerLandingGaps','upperLandingGaps','linksWithReplacementFootprints','horizontalRoomConnections',
   'repairedHorizontalRoomConnections','proposedGalleryAdditionalCells','horizontalConnectionsAnyEntrance'])
   if(r.totals[k]!==r.cases.reduce((n,c)=>n+c.metrics[k],0))return false;
  return true;
 }catch{return false;}
}
export function assembleB113(){const r=buildB113(assembleB111());if(!validateB113(r))throw Error('B113_REPORT_FAILED');return r;}
export function writeB113(r,dir){
 if(!validateB113(r))throw Error('B113_UNSAFE_EXPORT');
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'B113_Compatibility_Diagnostics.json'),JSON.stringify(r,null,2)+'\n');
 const columns=['id','typology','levels',...Object.keys(r.cases[0].metrics)];
 fs.writeFileSync(path.join(dir,'B113_15_Building_Matrix.csv'),columns.join(',')+'\n'+r.cases.map(c=>columns.map(k=>c[k]??c.metrics[k]).join(',')).join('\n')+'\n');
 const md=['# B113 オフライン互換性診断','',
  '施工認証ではありません。NOT_PREPARED / 9 BLOCKED / worldContacts=0 / operations=[]。',
  'Windows登録版 1.26.3200.0、実行ファイル版 1.26.32.0を非接続で確認。すべての実BlockStateと実機動作はUNVERIFIED。','',
  '| 建物 | 室数 | 階段接続 | 上端超過 | 下端接続不足 | 上端接続不足 | 代替寸法候補のある接続 | 内装問題 前→後 |',
  '|---|---:|---:|---:|---:|---:|---:|---:|',
  ...r.cases.map(c=>`| ${c.id} | ${c.metrics.rooms} | ${c.metrics.stairLinks} | ${c.metrics.stairOvershoots} | ${c.metrics.lowerLandingGaps} | ${c.metrics.upperLandingGaps} | ${c.metrics.linksWithReplacementFootprints} | ${c.metrics.roomOccupancyProblemsBefore}→${c.metrics.roomOccupancyProblemsAfter} |`),
  '',
  '6個の底面階段をB110のyへ置く仮定では、最終上面が上階床上面より1ブロック高い。3×3コア内のリング全体を通行可能と判定しない。あらゆる3×3らせん階段が不可能という証明ではない。',
  '代替モジュールは2×7、5個の階段と上下踊り場。半ブロック段差と2ブロックの頭上包絡を検査する。床開口、支持柱、既存ギャラリーの変更は未適用。寸法候補が見つかっても建物全体の動線は未解決。',
  '279室の家具アンカーは保存。ベッドは両セル、机は支柱＋天板、本棚は2段、収納は樽の占有と接近セルを検査。階段の椅子は装飾であり着席機能を持つとは扱わない。',
  `元ギャラリーを地上の第1入口/上階のB105主コア接続位置から実セルBFSで検査すると横接続は${r.totals.horizontalRoomConnections}/279。各階の入口/全コアを起点とする和集合でも${r.totals.horizontalConnectionsAnyEntrance}/279。室・コアを動かさず2×2通路セルを追加するオフライン案では${r.totals.repairedHorizontalRoomConnections}/279。追加案${r.totals.proposedGalleryAdditionalCells}セルは元モデルに適用していない。接続位置の変更を含む案であり上下階の階段は引き続き未接続。`,
  '', '## 代表5案の検査',
  ...r.cases.filter(c=>r.representativeIds.includes(c.id)).flatMap(c=>['',`### ${c.id}`,
   `横方向の部屋接続 ${c.metrics.horizontalRoomConnections}→${c.metrics.repairedHorizontalRoomConnections}/${c.metrics.rooms}。上下階の実通行は未認証。`,
   '最初の階段の問題: '+c.stairs[0].issues.join(', '),
   '最初の部屋: '+c.rooms[0].purpose+'。入口から到達する空きセル '+c.rooms[0].reachableCells+'、内装問題 '+c.rooms[0].issues.length+'。']),
  '', '## 次に確認する順序',...r.nextChecks.map(c=>`${c.priority}. ${c.task}（ゲーム操作承認が必要: ${c.requiresGameApproval}）`),
  '', '仕様出典と制約の詳細は docs/B113_IMPLEMENTATION_JA.md。ローカルのワールド、設定、認証、検証ログは取り込まない。'];
 fs.writeFileSync(path.join(dir,'B113_Review_JA.md'),md.join('\n')+'\n');
 return {directory:dir,files:3,worldContacts:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=assembleB113();console.log(JSON.stringify({totals:r.totals,integritySha256:r.integritySha256,
  artifacts:process.argv.includes('--write-review')?writeB113(r,path.resolve('b113-review-output')):null},null,2));
}
