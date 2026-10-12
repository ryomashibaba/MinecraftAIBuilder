// Step 8A.2 — deterministic schematic circulation and facade grammar.
// OFFLINE ONLY. Reserves 2D cells; does NOT validate physical stairs, headroom,
// door clearance, structural stability, fire egress, material IDs or commands.
const safe=(x,y,w,d)=>x>=0&&x<w&&y>=0&&y<d;
const at=(x,z,w)=>z*w+x;
const encode=(x,z)=>({x,z});
function footprint(plan){
 const {width:w,depth:d}=plan.EngineCompatibility.parameters;
 const n=plan.BuildingComposition.floorCount;
 const masks=Array.from({length:n},()=>new Uint8Array(w*d));
 for(const r of plan.Massing.rectangles){
  for(let f=r.start;f<r.end;f++)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)masks[f][at(x,z,w)]=1;
 }
 return {w,d,n,masks};
}
function flood(w,d,m,start,stop=null){
 if(!start||!safe(start.x,start.z,w,d)||!m[at(start.x,start.z,w)])return {seen:new Uint8Array(w*d),path:null,count:0};
 const seen=new Uint8Array(w*d),previous=new Int32Array(w*d).fill(-1),q=new Int32Array(w*d);
 const origin=at(start.x,start.z,w);let head=0,tail=1;q[0]=origin;seen[origin]=1;
 const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
 let goal=stop?at(stop.x,stop.z,w):-1;
 while(head<tail){const index=q[head++],x=index%w,z=Math.floor(index/w);
  for(const [dx,dz] of dirs){const xx=x+dx,zz=z+dz;if(!safe(xx,zz,w,d))continue;
   const next=at(xx,zz,w);if(!m[next]||seen[next])continue;seen[next]=1;previous[next]=index;q[tail++]=next;
  }
 }
 let path=null;if(stop&&seen[goal]){path=[];for(let cur=goal;cur!==-1;cur=previous[cur])path.push({x:cur%w,z:Math.floor(cur/w)});path.reverse();}
 return {seen,path,count:tail};
}
function exteriorAir(w,d,occupied){
 const ew=w+2,ed=d+2,air=new Uint8Array(ew*ed).fill(1);
 for(let z=0;z<d;z++)for(let x=0;x<w;x++)if(occupied[at(x,z,w)])air[at(x+1,z+1,ew)]=0;
 return {ew,seen:flood(ew,ed,air,{x:0,z:0}).seen};
}
function entranceCandidates(m,w,d,orientation,required){
 const ext=exteriorAir(w,d,m),visible=(x,z,dx,dz)=>{
  const nx=x+dx,nz=z+dz;
  if(safe(nx,nz,w,d)&&m[at(nx,nz,w)])return false;
  return !!ext.seen[at(nx+1,nz+1,ext.ew)];
 };
 const horizontal=orientation==='north'||orientation==='south',dim=horizontal?d:w,along=horizontal?w:d;
 const runs=[];
 for(let coord=0;coord<dim;coord++){
  let pos=0;while(pos<along){
   const x=horizontal?pos:coord,z=horizontal?coord:pos;
   const [dx,dz]=orientation==='north'?[0,-1]:orientation==='south'?[0,1]:orientation==='west'?[-1,0]:[1,0];
   if(!m[at(x,z,w)]||!visible(x,z,dx,dz)){pos++;continue;}
   const a=pos;while(pos<along){const xx=horizontal?pos:coord,zz=horizontal?coord:pos;
    if(!m[at(xx,zz,w)]||!visible(xx,zz,dx,dz))break;pos++;
   }
   if(pos-a>=required+2){const mid=Math.floor((a+pos-1)/2),xx=horizontal?mid:coord,zz=horizontal?coord:mid;
    runs.push({x:xx,z:zz,widthAvailable:pos-a,axis:orientation,outerDistance:orientation==='north'||orientation==='west'?coord:dim-1-coord,centerOffset:Math.abs(mid-(along-1)/2),external:{x:xx+dx,z:zz+dz}});
   }
  }
 }
 runs.sort((a,b)=>a.outerDistance-b.outerDistance||a.centerOffset-b.centerOffset||b.widthAvailable-a.widthAvailable);
 return runs;
}
function findShafts(masks,w,d,entry){
 const common=new Uint8Array(w*d).fill(1);
 for(const m of masks)for(let i=0;i<common.length;i++)if(!m[i])common[i]=0;
 const candidates=[];
 for(let z=0;z<=d-3;z++)for(let x=0;x<=w-3;x++){
  let valid=true;for(let zz=z;zz<z+3&&valid;zz++)for(let xx=x;xx<x+3;xx++)if(!common[at(xx,zz,w)]){valid=false;break;}
  if(valid)candidates.push({x,z,width:3,depth:3,center:{x:x+1,z:z+1}});
 }
 const entryR=entry?flood(w,d,masks[0],entry):null;
 const reachable=c=>entryR?.seen[at(c.center.x,c.center.z,w)];
 const score=c=>Math.abs(c.center.x-(w-1)/2)+Math.abs(c.center.z-(d-1)/2)*.8+(entry?Math.abs(c.center.x-entry.x)+Math.abs(c.center.z-entry.z):0)*.12;
 candidates.sort((a,b)=>Number(!!reachable(b))-Number(!!reachable(a))||score(a)-score(b)||a.z-b.z||a.x-b.x);
 const primary=candidates[0]??null;
 const second=candidates.filter(c=>primary&&(
    Math.abs(c.center.x-primary.center.x)>=3||Math.abs(c.center.z-primary.center.z)>=3))
  .filter(c=>Math.abs(c.center.x-primary.center.x)+Math.abs(c.center.z-primary.center.z)>=7)
  .sort((a,b)=>{
    const criterion=c=>{
      const dist=Math.abs(c.center.x-primary.center.x)+Math.abs(c.center.z-primary.center.z);
      const edge=Math.min(c.x,c.z,w-(c.x+3),d-(c.z+3));
      return (reachable(c)?0:100)+Math.abs(dist-9)*1.4+Math.max(0,2-edge)*3+score(c)*.12;
    };
    return criterion(a)-criterion(b)||a.z-b.z||a.x-b.x;
  })[0]??null;
 return {primary,second,candidateCount:candidates.length,entryReachable:!!(primary&&reachable(primary))};
}
function facadeGrammar(masks,w,d,bay){
 const count={north:0,south:0,east:0,west:0};let edges=0;
 for(const m of masks)for(let z=0;z<d;z++)for(let x=0;x<w;x++){
  if(!m[at(x,z,w)])continue;
  for(const [face,dx,dz] of [['north',0,-1],['south',0,1],['west',-1,0],['east',1,0]]){
   const nx=x+dx,nz=z+dz;
   if(!safe(nx,nz,w,d)||!m[at(nx,nz,w)]){count[face]++;edges++;}
  }
 }
 return {perimeterFacesByDirection:count,exposedWallCellsAllFloors:edges,nominalBayWidth:bay,
  approximateBayCount:Math.floor(edges/bay),windowCount:'NOT_DETERMINED',materialBlockIds:'UNVERIFIED',facadeOpenings:'DESIGN_INTENT_ONLY'};
}
function supportStudy(masks,w,d){
 const points=[];const top=masks.at(-1),ground=masks[0];
 for(let z=2;z<d;z+=5)for(let x=2;x<w;x+=5)if(top[at(x,z,w)]&&ground[at(x,z,w)]&&masks.every(m=>m[at(x,z,w)]))points.push({x,z});
 return {nominalGridSpacing:5,commonVerticalColumnPoints:points.slice(0,50),structuralAdequacy:'NOT_VERIFIED',columnsPlaced:false,loadPathsVerified:false};
}
function floorPrograms(plan,area,shafts){
 const type=plan.BuildingComposition.program;
 return area.map((floorArea,i)=>{
  const reserved=(shafts.primary?9:0)+(shafts.second?9:0);
  const role=i===0?(type==='office'?'lobby_and_shared':type==='hotel'?'reception_and_shared':'shared_entrance')
   :type==='office'?'workspace':type==='hotel'?'guest_room_zone':'residential_units';
  return {floor:i+1,role,grossFootprintBlocks:floorArea,verticalCoreReservedBlocks:reserved,
   remainingBeforeWallsAndCirculationBlocks:Math.max(0,floorArea-reserved),
   roomsAssigned:false,corridorLayout:'NOT_DESIGNED',fireEgress:'NOT_VERIFIED'};
 });
}
export function planArchitecture(plan){
 const {w,d,n,masks}=footprint(plan),type=plan.BuildingComposition.program;
 const need={office:4,hotel:5,apartment:2}[type];
 const orientation=plan.BuildingComposition.orientation;
 const entrances=entranceCandidates(masks[0],w,d,orientation,need),ent=entrances[0]??null;
 const shafts=findShafts(masks,w,d,ent);
 const routes=masks.map((m,i)=>{
  if(!shafts.primary)return {floor:i+1,reachableCellsFromCore:0,totalCells:plan.Massing.areaByFloor[i],allFootprintCellsAccessible:false,routeFromEntrance:null};
  const res=flood(w,d,m,shafts.primary.center),fromEntry=i===0&&ent?flood(w,d,m,{x:ent.x,z:ent.z},shafts.primary.center).path:null;
  return {floor:i+1,reachableCellsFromCore:res.count,totalCells:plan.Massing.areaByFloor[i],allFootprintCellsAccessible:res.count===plan.Massing.areaByFloor[i],routeFromEntrance:fromEntry};
 });
 const issues=[];
 if(!ent)issues.push(`指定正面(${orientation})の外部からアクセス可能な幅${need+2}以上の入口候補がありません`);
 if(!shafts.primary)issues.push('全階で同一位置の3×3階段コアを確保できません');
 else if(!shafts.entryReachable)issues.push('入口候補から主階段コアへ地上階で接続できません');
 if(!shafts.second)issues.push('階段とエレベーター用の独立した3×3コアを2か所確保できません');
 if(routes.some(x=>!x.allFootprintCellsAccessible))issues.push('一部フロアが主階段コアから平面的に分断されています');
 const gross=plan.Massing.areaByFloor,program=floorPrograms(plan,gross,shafts);
 if(program.some(x=>x.remainingBeforeWallsAndCirculationBlocks<25))issues.push('昇降コア確保後の床面積が小さい階があります');
 const facade=facadeGrammar(masks,w,d,plan.Facade.grid.bay),support=supportStudy(masks,w,d);
 const shaftDescriptor=(slot,kind)=>slot?{...slot,kind,continuousFloors:n,reservationOnly:true,
  detailedVerticalCirculationDesigned:false,headClearanceVerified:false,doorOrLiftMechanismVerified:false}:null;
 return {schema:'minecraftaibuilder-step8a-architecture-v1',status:'SCHEMATIC_ONLY_NOT_PREPARED',
  orientation,entrance:ent?{...ent,openingWidthRequired:need,externalAccessibility:'SITE_ENVELOPE_2D_REACHABLE_ONLY',doorGeometryVerified:false}:null,
  verticalCore:{stair:shaftDescriptor(shafts.primary,'stair'),elevator:shaftDescriptor(shafts.second,'elevator'),candidateCount:shafts.candidateCount},
  floorProgram:program,circulation:{perFloor:routes,internalWallsAssumedAbsent:true,corridorAndRoomAccessVerified:false,physicalVerticalTravelVerified:false},
  facade,support,roof:{strategy:plan.BuildingComposition.roofStrategy,parapetOrRoofGeometry:'UNVERIFIED'},
  materialIntent:{style:plan.BuildingComposition.style,colors:plan.MaterialGrammar.conceptColors,actualBlocks:[],compatibility:'UNKNOWN_NOT_TESTED'},
  issues,limitations:['階段の段数・踊り場・頭上空間は未設計','エレベーター動作未実装','非常出口や建築基準上の避難安全は未検証','実壁・柱・窓・ドア・内装は未配置','現場占有・支持・ブロック互換性は未確認'],
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},safety:{constructionApproved:false,executionAllowed:false,notPrepared:true,noBridge:true,noScan:true,noWorldMutation:true}};
}
