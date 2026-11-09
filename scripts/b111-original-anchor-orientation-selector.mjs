/**
 * B111 opt-in research: prefer a 2x2 source path by choosing ONLY an already
 * legal B111 two-cell bed orientation. B110 anchors and B111 originals frozen.
 * No World API, no B143 placement, no bedrock block-state claim.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditRoomTwoWide} from './b111-independent-two-wide-room-audit.mjs';
const INPUT_SHA='eb55fdeccdc2751081ea1f9ab22ec5f6074012c8bd3bb26e04c9b659aaaf28f0';
const D=[[1,0],[-1,0],[0,1],[0,-1]];
const k=p=>p.x+','+p.z;
const reject=x=>{throw Error('B111_ORIENTATION_ONLY_'+x)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const inside=(p,r)=>p.x>r.x&&p.x<r.x+r.width-1&&p.z>r.z&&p.z<r.z+r.depth-1;
function options(room,f){
 const door=room.doorInterior,r=room.roomRectangle;
 if(!inside(f.anchor,r)||!f.footprint.some(p=>same(p,f.anchor)))reject('ANCHOR_OR_FOOTPRINT_INVALID');
 if(f.role!=='bed')return [structuredClone(f)];
 if(f.footprint.length!==2)reject('BED_NOT_TWO_CELL');
 // Exactly the admissible adjacent second-cell directions in B111 source.
 const anchors=new Set(room.furniture.map(q=>k(q.anchor)));
 return D.map(([dx,dz])=>({x:f.anchor.x+dx,z:f.anchor.z+dz}))
  .filter(p=>inside(p,r)&&k(p)!==k(door)&&!anchors.has(k(p)))
  .map(second=>({...structuredClone(f),footprint:[structuredClone(f.anchor),second],
   secondaryCell:second,plannedBedPair:true}));
}
function score(room,candidate){
 let changed=0;
 for(let i=0;i<candidate.length;i++){
  if(!same(candidate[i].anchor,room.furniture[i].anchor))reject('B110_ANCHOR_MOVED');
  if(candidate[i].role!==room.furniture[i].role)reject('FIXTURE_ROLE_CHANGED');
  if(!same(candidate[i].footprint,room.furniture[i].footprint))changed++;
 }
 return [changed,...candidate.flatMap(f=>f.footprint.map(p=>k(p)))].join('|');
}
export function selectB111LegalBedOrientation(room){
 if(!room?.roomRectangle||!room?.doorInterior||!Array.isArray(room.furniture)||
  room.furniture.length===0||!Array.isArray(room.sourceFixtureAnchors)||
  room.sourceFixtureAnchors.length!==room.furniture.length)
  reject('SOURCE_ROOM_CONTRACT');
 for(let i=0;i<room.furniture.length;i++){
  const f=room.furniture[i],a=room.sourceFixtureAnchors[i];
  if(a.x!==f.anchor.x||a.z!==f.anchor.z||
   a.y!==room.level*5+1||!Number.isSafeInteger(f.fixtureIndex))reject('B110_SOURCE_ANCHOR_MISMATCH');
 }
 const before=JSON.stringify(room),base=auditRoomTwoWide(room);
 if(!base.originalOneWideReachable)reject('ORIGINAL_ONE_WIDE_NOT_CLEAR');
 if(base.status==='2W_PROXY_CLEAR')return {status:'ALREADY_2W_PROXY_CLEAR',alternative:null,choiceCount:0};
 const choices=room.furniture.map(f=>options(room,f));
 let best=null,bestScore=null,count=0;
 const walk=(i,selected)=>{
  if(i===choices.length){
   count++;
   const candidate=selected.map(f=>structuredClone(f));
   if(new Set(candidate.flatMap(f=>f.footprint.map(k))).size!==
      candidate.reduce((n,f)=>n+f.footprint.length,0))return;
   const proof=auditRoomTwoWide({...room,furniture:candidate});
   if(proof.status!=='2W_PROXY_CLEAR'||!proof.originalOneWideReachable)return;
   const rank=score(room,candidate);
   if(best===null||rank<bestScore){best=candidate;bestScore=rank;}
   return;
  }
  for(const f of choices[i])walk(i+1,[...selected,f]);
 };
 walk(0,[]);
 if(JSON.stringify(room)!==before)reject('SOURCE_MUTATED');
 if(best===null)return {status:'HOLD_REQUIRES_B110_ANCHOR_OR_ROOM',alternative:null,choiceCount:count};
 const changes=best.map((f,i)=>({fixtureIndex:f.fixtureIndex,role:f.role,
  originalAnchor:structuredClone(room.furniture[i].anchor),
  newAnchor:structuredClone(f.anchor),
  originalFootprint:structuredClone(room.furniture[i].footprint),
  suggestedFootprint:structuredClone(f.footprint)}));
 return {status:'UNADOPTED_B111_LEGAL_BED_ORIENTATION',choiceCount:count,
  alternative:{changes,source2DOnly:true,sourceGeometryAndAnchorsUnchanged:true}};
}
export function auditB111OrientationOnly(buildings,bytes){
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(digest!==INPUT_SHA||!Array.isArray(buildings)||buildings.length!==15)
  reject('PINNED_PUBLIC_ARCHIVE_MISMATCH');
 const snapshot=JSON.stringify(buildings),records=[];
 for(const building of buildings){
  if(building?.reviewOnly!==true||building.worldContacts!==0||
   building.constructionApproved!==false||building.executionAllowed!==false||
   building.BuildPlan?.operations?.length!==0)reject('PARENT_SAFETY');
  for(const room of building.rooms){
   const outcome=selectB111LegalBedOrientation(room);
   records.push({buildingId:building.id,typology:building.typology,
    level:room.level,roomId:room.roomId,...outcome});
  }
 }
 if(snapshot!==JSON.stringify(buildings))reject('ARCHIVED_SOURCE_CHANGED');
 const tally=status=>records.filter(r=>r.status===status).length;
 const summary={rooms:records.length,unchanged2DClear:tally('ALREADY_2W_PROXY_CLEAR'),
  fixedAnchorsB111OrientationCandidates:tally('UNADOPTED_B111_LEGAL_BED_ORIENTATION'),
  requiresB110AnchorOrRoomReview:tally('HOLD_REQUIRES_B110_ANCHOR_OR_ROOM'),
  adoptedLayoutChanges:0,modelCalls:0,worldContacts:0,worldWrites:0};
 if(summary.rooms!==279||summary.unchanged2DClear!==230||
  summary.fixedAnchorsB111OrientationCandidates!==40||
  summary.requiresB110AnchorOrRoomReview!==9)reject('RECORDED_BASELINE_DRIFT');
 return {schema:'mab-b111-optin-fixed-anchor-bed-direction-v1',
  sourceSha256:digest,summary,
  methodology:'Only original B111 cardinal second-cell grammar; fixed B110 anchors; independent connected 2x2 interior floor-pad proxy',
  certifications:{minecraftWalking:false,realBedrockBedPlacement:false,
   threeDimensionalFurnitureClearance:false,constructionApproved:false},
  safety:{readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]},worldWrites:0,worldContacts:0},
  unadoptedResearch:records.filter(r=>r.status!=='ALREADY_2W_PROXY_CLEAR')};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==6||process.argv[2]!=='--input'||process.argv[4]!=='--out')
   reject('USAGE_INPUT_OUTPUT');
  const bytes=fs.readFileSync(process.argv[3]);
  const report=auditB111OrientationOnly(JSON.parse(bytes),bytes);
  const output=path.resolve(process.argv[5]);
  if(!path.isAbsolute(process.argv[5])||fs.existsSync(output)||
   output.startsWith(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')+path.sep))
   reject('OUTPUT_NEEDS_FRESH_OUTSIDE_REPO');
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report.summary));
 }catch(e){console.error(String(e));process.exitCode=2;}
}
