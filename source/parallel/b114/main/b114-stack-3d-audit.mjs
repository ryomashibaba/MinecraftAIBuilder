/**
 * B114 vertical-stack hazard audit, OFFLINE only.
 * Compares independent B113 provisional stair flights in local design coordinates.
 * A collision here is a modelled design conflict; an absence is NOT physical certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {straightFlight,intersects} from '../../b113/main/b113-geometry.mjs';
import {transformStairBox,STAIR_GRID_FRAME_VERSION} from './b114-stair-grid-frame.mjs';
import {validateB114} from './compile-b114.mjs';

function lift(box,link) {
 return transformStairBox(box,{...link.selected,fromLevel:link.fromLevel});
}
function sweptBodies(flight) {
  return flight.samples.flatMap((p,i)=>{
    const here={x:p.x-0.3,y:p.y,z:p.z-0.3,width:0.6,height:2,depth:0.6};
    if(i===0)return [here];
    const prev=flight.samples[i-1];
    return [here,{
      x:Math.min(prev.x,p.x)-0.3,y:Math.min(prev.y,p.y),
      z:Math.min(prev.z,p.z)-0.3,
      width:Math.abs(prev.x-p.x)+0.6,
      height:Math.abs(prev.y-p.y)+2,
      depth:Math.abs(prev.z-p.z)+0.6
    }];
  });
}
const collides=(a,b)=>a.some(x=>b.some(y=>intersects(x,y)));
function stackModel(link,flight,body) {
  return {body:body.map(b=>lift(b,link)),
    support:flight.supports.map(b=>lift(b,link)),
    solid:flight.solids.map(b=>lift(b,link))};
}
export function auditB114Stack(input) {
  if(!validateB114(input))throw Error('B114_STACK_REQUIRES_VALID_UNAPPROVED_SOURCE');
  const flight=straightFlight(),body=sweptBodies(flight);
  if(flight.rise!==5||flight.length!==7||flight.width!==2||
     flight.executable!==false||flight.educationCollision!=='UNVERIFIED')
    throw Error('B114_STACK_MODEL_CHANGED');
  const cases=input.cases.map(c=>{
    const model=c.stairs.map(s=>s.selected?stackModel(s,flight,body):null);
    const collisions=[];
    for(let i=0;i<c.stairs.length;i++)for(let j=i+1;j<c.stairs.length;j++){
      const a=c.stairs[i],b=c.stairs[j];
      if(!model[i]||!model[j]||a.fromLevel===b.fromLevel||
        Math.abs(a.fromLevel-b.fromLevel)>1)continue;
      const A=model[i],B=model[j];
      const supportBody=collides(A.support,B.body)||collides(B.support,A.body);
      const solidBody=collides(A.solid,B.body)||collides(B.solid,A.body);
      if(supportBody||solidBody)collisions.push({
        first:{index:i,fromLevel:a.fromLevel,coreIndex:a.coreIndex},
        second:{index:j,fromLevel:b.fromLevel,coreIndex:b.coreIndex},
        proposedSupportVsBody:supportBody,stairSolidVsBody:solidBody,
        classification:'MODELLED_3D_INTERFERENCE_NOT_AN_INSTALLED_BLOCK_OBSERVATION'
      });
    }
    const openInterfaces=c.stairs.filter(s=>s.selected?.hypotheticalInterfloorLink).length;
    return {id:c.id,levels:c.levels,conceptualRooms:c.metrics.conceptualRooms,
      conditionalGroundToRooms:c.conditionalRoutes.hypotheticalGroundToRoomPaths,
      stairLinks:c.stairs.length,unconnectedGalleryInterfaces:c.stairs.length-openInterfaces,
      modelledCrossFlightCollisionPairs:collisions.length,
      modelledSolidBodyCollisionPairs:collisions.filter(x=>x.stairSolidVsBody).length,
      collisionPairs:collisions,
      upperApertureCellsPerSelectedStair:flight.upperAperture.length*flight.width,
      lowerCeilingApertureCellsPerSelectedStair:flight.lowerCeilingAperture.length*flight.width,
      floorOpeningsAndSupportsActuallyIntegrated:false,
      everyFloorPhysicallyReachable:false,
      appliedToOriginal:false};
  });
  const sum=k=>cases.reduce((n,c)=>n+c[k],0);
  const totals={
    buildings:cases.length,stairLinks:sum('stairLinks'),
    provisionalGalleryInterfaces:input.totals.hypotheticalGalleryStairLinks,
    galleryInterfacesNeedingRedesign:sum('unconnectedGalleryInterfaces'),
    buildingsWithModelledInterference:cases.filter(c=>c.modelledCrossFlightCollisionPairs>0).length,
    modelledCrossFlightCollisionPairs:sum('modelledCrossFlightCollisionPairs'),
    modelledSolidBodyCollisionPairs:sum('modelledSolidBodyCollisionPairs'),
    physicalStairCertifications:0,physicalFinishedBuildings:0,worldContacts:0,commands:0
  };
  const representative=cases.find(c=>c.id==='HOTEL_V1');
  if(!representative)throw Error('B114_STACK_NO_REPRESENTATIVE');
  return {
    schema:'minecraftaibuilder-b114-vertical-stack-audit-v1',
    sourceB114IntegritySha256:input.integritySha256,sourceBaseCommit:input.frozenB112BaseCommit,
    geometryModel:'B113_5_RISE_STRAIGHT_HALF_STEP_WITH_PROVISIONAL_FULL_SUPPORT',
    gridFrameVersion:STAIR_GRID_FRAME_VERSION,
    interpretation:'STATIC_AABB_WARNING_ON_UNBUILT_DESIGN; NOT ACTUAL EDUCATION COLLISION',
    fullFloorAndCeilingVoxelSource:'NOT_AVAILABLE_FOR_COMPLETE_3D_CERTIFICATION',
    issuePriorities:[
      'REDESIGN_CROSS_STOREY_SUPPORT_AND_STAIR_SWEEP_CLASHES',
      'REDESIGN_17_UNLINKED_STAIR_GALLERY_INTERFACES',
      'INTEGRATE_REAL_FLOOR_CEILING_APERTURES_AND_LANDING_SUPPORTS_OFFLINE',
      'REVIEW_FOUR_UNAPPROVED_BED_ANCHOR_RELOCATIONS'
    ],
    representative:{...representative,reason:'ALL_8_GALLERY_INTERFACES_CONDITIONAL_BUT_MULTI_STOREY_SUPPORT_CONFLICTS'},
    cases,totals,
    physicalWalkabilityCertified:false,constructionApproved:false,executionAllowed:false,
    readiness:'NOT_PREPARED',gates:input.gates.map(g=>({...g})),
    worldContacts:0,worldCoordinates:null,commandCount:0,
    BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}
  };
}
export function writeB114Stack(result,dir) {
  if(result.readiness!=='NOT_PREPARED'||result.constructionApproved!==false||
    result.executionAllowed!==false||result.worldContacts!==0||
    result.worldCoordinates!==null||result.commandCount!==0||
    result.BuildPlan?.operations?.length!==0||
    result.gates.length!==9||result.gates.some(g=>g.status!=='BLOCKED'))
    throw Error('B114_STACK_UNSAFE_REPORT');
  fs.mkdirSync(dir,{recursive:true});
  const json=path.join(dir,'B114_3D_Stack_Audit.json');
  const md=path.join(dir,'B114_3D_Stack_Review_JA.md');
  fs.writeFileSync(json,JSON.stringify(result,null,2)+'\n');
  const t=result.totals,h=result.representative;
  fs.writeFileSync(md,[
    '# B114 — 複数階の階段支持・通行空間の干渉監査（非施工）','',
    '建物の完成や実際の移動を認証する資料ではありません。Minecraft接続・施工・既存データ変更はありません。','',
    '|項目|モデル上の結果|','|---|---:|',
    '|2×7の階段平面候補|'+t.stairLinks+'|',
    '|廊下の条件付き階段接続|'+t.provisionalGalleryInterfaces+'|',
    '|廊下端の再設計が必要|'+t.galleryInterfacesNeedingRedesign+'|',
    '|別階の仮設支持体と身体包絡などが交差する階段組|'+t.modelledCrossFlightCollisionPairs+'|',
    '|うち踏み面・身体包絡の交差を含む組|'+t.modelledSolidBodyCollisionPairs+'|',
    '|交差候補のある建物|'+t.buildingsWithModelledInterference+' / '+t.buildings+'|',
    '|物理的に登れると認証済みの階段|0|','',
    '## 代表棟 '+h.id,'',
    '概念上は玄関から'+h.conditionalGroundToRooms+'/'+h.conceptualRooms+'室に条件付き到達。',
    'しかし'+h.modelledCrossFlightCollisionPairs+'組の階段間の干渉候補があり、上下階の歩行経路は成立を確認できません。','',
    '重要: これはB113の直線階段・全支持体・保守的な身体包絡を仮配置した静的なAABB交差です。',
    '実際のブロック配置、階段当たり判定、既存の床・天井の全体ボクセル、外装を調査した結果ではありません。',
    '支持体形状の再設計で解決できる可能性があるため、交差＝永久に通行不可能とは断定しません。',
    '床の穴や踊り場支持は未適用です。経路279/279は物理認証ではなく仮定付きのグラフ上限です。','',
    '## 次工程',...result.issuePriorities.map((a,i)=>(i+1)+'. '+a),'',
    'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / commandCount=0 / BuildPlan.operations=[]'
  ].join('\n')+'\n');
  return {json,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const input=JSON.parse(fs.readFileSync(path.resolve(
    'b114-review-output/B114_Conditional_Circulation_15_Buildings.json'),'utf8'));
  const result=auditB114Stack(input);
  if(process.argv.includes('--write-review'))writeB114Stack(result,path.resolve('b114-review-output'));
  console.log(JSON.stringify({totals:result.totals,representative:result.representative.id},null,2));
}