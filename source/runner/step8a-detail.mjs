// Step 8A.3: deterministic voxel-coordinate *design intent*, not Minecraft blocks.
// No I/O, world tools, Bridge calls, execution plans, or construction approvals.
const key=(x,z)=>`${x},${z}`;
const pos=k=>k.split(',').map(Number);
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const near=(x,z)=>dirs.map(([a,b])=>key(x+a,z+b));
const inside=(x,z,w,d)=>x>=0&&x<w&&z>=0&&z<d;
const boxCells=(b)=>{const out=[];if(b)for(let z=b.z;z<b.z+b.depth;z++)for(let x=b.x;x<b.x+b.width;x++)out.push(key(x,z));return out;};
const intersects=(b,c)=>!!b&&!!c&&b.x<c.x+c.width&&c.x<b.x+b.width&&b.z<c.z+c.depth&&c.z<b.z+b.depth;
function footprint(concept){const {width:w,depth:d}=concept.BuildingComposition.dimensions;return Array.from({length:concept.BuildingComposition.floorCount},(_,floor)=>{
 const mask=new Set();for(const r of concept.Massing.rectangles)if(r.start<=floor&&floor<r.end){for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)mask.add(key(x,z));}return mask;
});}
function bfsPath(allowed,sources,target){const todo=[],seen=new Set(),prev=new Map();for(const p of sources){if(!allowed.has(p)||seen.has(p))continue;seen.add(p);todo.push(p);}let end=null;
 for(let i=0;i<todo.length;i++){const p=todo[i];if(target(p)){end=p;break;}const [x,z]=pos(p);for(const t of near(x,z))if(allowed.has(t)&&!seen.has(t)){seen.add(t);prev.set(t,p);todo.push(t);}}
 if(end===null)return null;const path=[];for(let p=end;p!==undefined;p=prev.get(p))path.push(p);return path.reverse();}
function reach(allowed,seeds){const q=[],visited=new Set();for(const s of seeds){if(!allowed.has(s)||visited.has(s))continue;visited.add(s);q.push(s);}for(let i=0;i<q.length;i++){const [x,z]=pos(q[i]);for(const p of near(x,z))if(allowed.has(p)&&!visited.has(p)){visited.add(p);q.push(p);}}return visited;}
function stairIntent(concept,architecture,allMasks){const core=architecture.verticalCore.stair,ev=architecture.verticalCore.elevator;
 const h=concept.BuildingComposition.floorHeight,n=allMasks.length,entrance=architecture.entrance;
 if(!core)return {status:'BLOCKED_NO_STAIR_RESERVATION',reason:'全階共通の主階段予約空間なし',shaft:null,flights:[],landingPaths:[],headroomVerified:false};
 const length=Math.ceil(h/2)+1,boxes=[];
 // Align near existing 3x3 anchor, but require all 2D cells on EVERY floor.
 for(const [bw,bd] of [[3,length],[length,3]])for(let z=core.z-2;z<=core.z+2;z++)for(let x=core.x-2;x<=core.x+2;x++){
  const b={x,z,width:bw,depth:bd};if(x<0||z<0||intersects(b,ev))continue;
  const area=boxCells(b);if(!allMasks.every(m=>area.every(k=>m.has(k))))continue;
  boxes.push({b,area,score:Math.abs(x-core.x)+Math.abs(z-core.z)+Math.abs((x+bw/2)-(core.x+1.5))*.1+Math.abs((z+bd/2)-(core.z+1.5))*.1+(entrance&&area.includes(key(entrance.x,entrance.z))?1000:0)});
 }
 boxes.sort((a,b)=>a.score-b.score||a.b.z-b.b.z||a.b.x-b.b.x);
 if(!boxes.length)return {status:'BLOCKED_SHAFT_DIMENSION_OR_FOOTPRINT',reason:`階高${h}に対して必要な3×${length}（または${length}×3）空間を全階に確保できません`,shaft:null,flights:[],landingPaths:[],headroomVerified:false};
 const shaft=boxes[0].b,rotated=shaft.width!==3,local=(u,v)=>rotated?{x:shaft.x+v,z:shaft.z+u}:{x:shaft.x+u,z:shaft.z+v};
 const a=Math.ceil(h/2),b=Math.floor(h/2),flights=[],landingPaths=[];
 for(let floor=0;floor<n-1;floor++){
  const y0=floor*h,stairs=[];
  const push=(u,v,rise,element)=>{const p=local(u,v);stairs.push({...p,y:y0+rise,element});};
  push(0,0,0,'lower_arrival');for(let k=1;k<=a;k++)push(0,k,k,'riser');push(1,a,a,'turn_landing');
  for(let k=1;k<=b;k++)push(1,a-k,a+k,'riser');
  const top=stairs.at(-1),end=local(0,0),path=[{x:top.x,z:top.z,y:y0+h,element:'upper_arrival'}];
  // Upper-deck connection between this flight's arrival and next flight's start.
  let x=top.x,z=top.z;while(x!==end.x||z!==end.z){if(rotated){if(x!==end.x)x+=Math.sign(end.x-x);else z+=Math.sign(end.z-z);}else{if(z!==end.z)z+=Math.sign(end.z-z);else x+=Math.sign(end.x-x);}path.push({x,z,y:y0+h,element:'upper_deck_connector'});}
  flights.push({fromFloor:floor+1,toFloor:floor+2,fromY:y0,toY:y0+h,walkSurfacePath:stairs,stepCount:h});landingPaths.push({floor:floor+2,cells:path});
 }
 const allPoints=[...flights.flatMap(f=>f.walkSurfacePath),...landingPaths.flatMap(f=>f.cells)];
 const duplicates=new Set();let collision=false;const surface=new Map();for(const p of allPoints){const k=`${p.x},${p.z},${p.y}`;if(surface.has(k)&&!(p.element==='upper_deck_connector'||p.element==='upper_arrival'||(p.element==='lower_arrival'&&surface.get(k)==='upper_deck_connector')))collision=true;surface.set(k,p.element);duplicates.add(k);}
 // Check that within the proposed shaft no independent walk-surface exists directly
 // one block above a different surface. This is a minimum *schematic* clearance check,
 // not a Minecraft stairs/wall/headroom safety certification.
 let clearance=true;for(const p of allPoints)for(const dy of [1,2])if(surface.has(`${p.x},${p.z},${p.y+dy}`))clearance=false;
 return {status:collision||!clearance?'REVIEW_REQUIRED_SCHEDULED_VOXEL_OVERLAP':'SCHEMATIC_VOXEL_PATH_CHECKED',shaft,
  coordinateConvention:'x=east,z=south,y=height; floor 1 starts y=0; all coordinates local to proposed building envelope',
  turn:'two one-cell-wide switchback flights, not a code-compliant staircase',flights,landingPaths,
  voxelPathChecked:!collision,schematicSurfaceClearance2:clearance,headroomVerified:false,minecraftStairBlocksVerified:false,
  wholeWorldCollisionVerified:false,lifeSafetyVerified:false,stairWidthBlocks:1};
}
function layoutFloor(concept,architecture,stair,mask,f,options={}){
 const {width:w,depth:d}=concept.BuildingComposition.dimensions;
 const ev=architecture.verticalCore.elevator,st=stair.shaft??architecture.verticalCore.stair;
 const stairCells=new Set(boxCells(st)),evCells=new Set(boxCells(ev));
 const blocked=new Set([...stairCells,...evCells]),walkable=new Set([...mask].filter(k=>!blocked.has(k)));
 const edgeAnchors=(box)=>box?[...new Set(boxCells(box).flatMap(k=>{const [x,z]=pos(k);return near(x,z);} ))].filter(k=>walkable.has(k)).sort():[];
 const stairAnchors=edgeAnchors(st),evAnchors=edgeAnchors(ev),ent=architecture.entrance;
 const corridor=new Set(),routeIssues=[];
 const addPath=(sources,destination,label)=>{const path=bfsPath(walkable,sources,k=>destination.includes(k));if(!path){routeIssues.push(label);return null;}for(const p of path)corridor.add(p);return path;};
 if(stairAnchors.length)corridor.add(stairAnchors[0]);else routeIssues.push('主階段に隣接する通路起点なし');
 if(ev){addPath(stairAnchors,evAnchors,'階段からEV前までの通路未接続');}
 if(f===0&&ent){const origin=key(ent.x,ent.z);if(walkable.has(origin))addPath([origin],stairAnchors,'入口から階段前までの通路未接続');else routeIssues.push('入口が予約コアと重なっています');}
 // Perimeter-free nominal access grid. It is *not* a legal required hallway width.
 for(const p of walkable){const [x,z]=pos(p);if(options.corridorVariant){
   const spacing=options.corridorVariant.spacing??6,ox=options.corridorVariant.offsetX??0,oz=options.corridorVariant.offsetZ??0;
   const edgeInset=options.corridorVariant.edgeInset??0;
   if((x-ox+spacing*100)%spacing===0||(z-oz+spacing*100)%spacing===0){
    if(edgeInset===0||[...near(x,z)].every(n=>mask.has(n)))corridor.add(p);
   }
  }else if(x%6===0||z%6===0)corridor.add(p);}
 // Connect each separated corridor component to the reachable stair component by
 // tunneling through unreserved footprint only, without touching room allocations.
 let connected=reach(corridor,stairAnchors);
 for(let pass=0;pass<Math.min(corridor.size,120);pass++){
  const pending=[...corridor].filter(k=>!connected.has(k));if(!pending.length)break;
  const path=bfsPath(walkable,[...connected],k=>pending.includes(k));
  if(!path)break;for(const k of path)corridor.add(k);connected=reach(corridor,stairAnchors);
 }
 const isolated=[...corridor].filter(k=>!connected.has(k));
 // Never imply disconnected corridor cells are valid routes.
 for(const k of isolated)corridor.delete(k);
 if(isolated.length)routeIssues.push(`${isolated.length}セルの通路は主階段から未接続（利用可能動線として不採用）`);
 // Rooms: select bounded rectangles within the remaining footprint, and accept a
 // room ONLY when one wall meets the reachable corridor. Unassigned cells retained.
 const remaining=new Set([...walkable].filter(k=>!corridor.has(k)));
 const rooms=[],occupancy=new Set(),role=architecture.floorProgram[f].role;
 const desired=concept.BuildingComposition.program==='hotel'?[4,5]:concept.BuildingComposition.program==='apartment'?[5,5]:[5,6];
 for(let z=0;z<d;z++)for(let x=0;x<w;x++){
  if(!remaining.has(key(x,z)))continue;
  let chosen=null;
  for(let dz=desired[1];dz>=3&&!chosen;dz--)for(let dx=desired[0];dx>=3;dx--){
   if(x+dx>w||z+dz>d)continue;
   const cells=boxCells({x,z,width:dx,depth:dz});if(!cells.every(k=>remaining.has(k)))continue;
   const borders=[];for(const p of cells){const [xx,zz]=pos(p);for(const k of near(xx,zz))if(corridor.has(k))borders.push({cell:p,fromCorridor:k});}
   if(!borders.length)continue;
   // Stable deterministic door candidate: prefer center of one border.
   borders.sort((a,b)=>a.cell.localeCompare(b.cell));chosen={x,z,width:dx,depth:dz,cells,border:borders[Math.floor(borders.length/2)]};break;
  }
  if(!chosen)continue;
  for(const p of chosen.cells){remaining.delete(p);occupancy.add(p);}
  const [doorX,doorZ]=pos(chosen.border.cell),[hallX,hallZ]=pos(chosen.border.fromCorridor);
  rooms.push({id:`F${f+1}-R${String(rooms.length+1).padStart(3,'0')}`,level:f+1,role,x:chosen.x,z:chosen.z,width:chosen.width,depth:chosen.depth,
   door:{x:doorX,z:doorZ,hallX,hallZ,y:f*concept.BuildingComposition.floorHeight},doorInterfaceGeometricallyAdjacent:true,
   interiorAndFurnitureDesigned:false,wallThicknessUnverified:true,accessibilityNotVerified:true});
 }
 let roomDoorConnectivity=rooms.every(r=>corridor.has(key(r.door.hallX,r.door.hallZ)));
 const circulationToEntrance=!!ent&&f===0?corridor.has(key(ent.x,ent.z)):null;
 if(!stairAnchors.some(k=>connected.has(k)))routeIssues.push('主階段の通路接続を証明できません');
 const area=mask.size,assigned=stairCells.size+evCells.size+corridor.size+rooms.reduce((n,r)=>n+r.width*r.depth,0);
 // Shaft expansion can overlap other reservation: conservatively report.
 const partitionDisjoint=[...stairCells].every(k=>!evCells.has(k))&&[...corridor].every(k=>!blocked.has(k))&&rooms.every(r=>boxCells(r).every(k=>!blocked.has(k)&&!corridor.has(k)));
 const allReserved=[...stairCells,...evCells,...corridor,...rooms.flatMap(boxCells)];
 const unique=new Set(allReserved),conservation=assigned===unique.size&&[...unique].every(k=>mask.has(k));
 if(!partitionDisjoint||!conservation)routeIssues.push('割当セルの重複または敷地外予約を検出');
 if(!roomDoorConnectivity)routeIssues.push('部屋ドアから連続通路に接続できません');
 return {level:f+1,footprintArea:area,coreStairCells:[...stairCells].map(pos).map(([x,z])=>({x,z})),
  elevatorCells:[...evCells].map(pos).map(([x,z])=>({x,z})),
  corridorCells:[...corridor].map(pos).map(([x,z])=>({x,z})),rooms,
  unassignedCells:area-unique.size,roomCount:rooms.length,corridorArea:corridor.size,roomArea:rooms.reduce((n,r)=>n+r.width*r.depth,0),
  roomsReachableFromStairOnSchematic:roomDoorConnectivity&&routeIssues.length===0,
  entranceConnectedToStairOnSchematic:circulationToEntrance,partitionDisjoint,areaConserved:conservation,
  issues:routeIssues,requiredEgressWidthVerified:false,accessibleRouteVerified:false};
}
function facadeIntent(concept,architecture,masks,fl){
 const orientation=concept.BuildingComposition.orientation,kind=concept.BuildingComposition.facadeStrategy,
  fh=concept.BuildingComposition.floorHeight,bay=concept.Facade.grid.bay;
 const modules=[];const faces=[['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]];
 for(let f=0;f<fl.length;f++)for(const k of masks[f]){
  const [x,z]=pos(k);for(const [face,dx,dz] of faces){if(masks[f].has(key(x+dx,z+dz)))continue;
   const along=face==='north'||face==='south'?x:z;
   const isEntrance=f===0&&architecture.entrance&&architecture.entrance.axis===face&&architecture.entrance.x===x&&architecture.entrance.z===z;
   const windowWanted= !isEntrance&&(kind==='curtain_wall'||kind==='horizontal_bands'||
    (kind==='vertical_bays'?along%bay<Math.max(1,bay-1):along%bay===1));
   const base=f*fh,top=base+fh;
   modules.push({floor:f+1,face,x,z,y0:base,y1:top,kind:isEntrance?'ENTRANCE_INTENT':windowWanted?'GLAZING_INTENT':'SOLID_FACADE_INTENT',
    openingHeight:windowWanted?Math.max(1,fh-2):0,actualBlockId:null,doorClearanceVerified:false,windowBlockSupported:false});
  }
 }
 return {strategy:kind,nominalBay:bay,modules,moduleCount:modules.length,
  glazingIntentCells:modules.filter(m=>m.kind==='GLAZING_INTENT').length,
  doorIntentCells:modules.filter(m=>m.kind==='ENTRANCE_INTENT').length,
  verticalBaysGeometricallyAligned:true,actualMaterialsVerified:false,physicalFacadePlacementVerified:false};
}
export function planDetailedCoordinates(concept,architecture,options={}){
 if(concept.BuildPlan?.status!=='NOT_PREPARED'||architecture.BuildPlan?.status!=='NOT_PREPARED'||concept.safety.executionAllowed||architecture.safety.executionAllowed)throw Object.assign(new Error('Unsafe input plan was not NOT_PREPARED'),{code:'UNSAFE_INPUT'});
 const masks=footprint(concept),stair=stairIntent(concept,architecture,masks);
 const floors=masks.map((m,i)=>layoutFloor(concept,architecture,stair,m,i,options));
 const facade=facadeIntent(concept,architecture,masks,floors);
 const issues=[...(stair.status!=='SCHEMATIC_VOXEL_PATH_CHECKED'?[stair.reason??stair.status]:[]),...floors.flatMap(f=>f.issues.map(x=>`${f.level}階: ${x}`))];
 if(floors.some(f=>f.rooms.length===0))issues.push('部屋モジュールを配置できない階があります');
 const status=issues.length?'REVIEW_REQUIRED_NOT_BUILDABLE':'COORDINATE_SCHEMATIC_ONLY_NOT_BUILDABLE';
 return {schema:'minecraftaibuilder-step8a-detail-v1',status,coordinateSystem:{origin:'concept envelope minX/minZ',yFloor:0,xEast:true,zSouth:true},
  stair,roomsAndCorridors:{floors,roomDoorsAreConceptOnly:true,coreHeadroomVerified:false,stairsAreNotMinecraftCommands:true},
  facade,issues,
  verifiedOnly:['矩形境界内に座標が収まるか','概念平面上のコア/通路/部屋セルの重複検査','概念通路に接した仮ドアの存在','全階の階段候補寸法と段数の計算'],
  unverified:['実階段の形状/頭上空間/手すり','EV駆動機構','扉の開閉と実幅','複数出口と法令上の避難安全','照明/家具/配管/設備','実材料IDとEducation対応','実敷地状態・World/Bridge同一性','地形/支持強度','Minecraftエンジン内のコマンド実行'],
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,buildCandidateGenerated:false},
  safety:{constructionApproved:false,executionAllowed:false,notPrepared:true,noBridge:true,noScan:true,noPackGeneration:true,noWorldMutation:true}};
}
