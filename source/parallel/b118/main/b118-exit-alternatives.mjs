/** B118 — protect the original stair and source footprint; do not write Minecraft commands. */
const K=p=>p.x+','+p.z;
const cardinal=[{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}];
const patch=p=>[p,{x:p.x+1,z:p.z},{x:p.x,z:p.z+1},{x:p.x+1,z:p.z+1}];
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const legalFloor=f=>{if(!Array.isArray(f?.footprintRows)||f.footprintRows.length===0||f.footprintRows.some(row=>!/^[01]+$/.test(row)))throw Error("B118_BAD_FLOOR");};

export function searchB118Exit({floor,rooms=[],cores=[],stairCells,apertures=new Set(),landing,walk,maxPaths=2}){
 legalFloor(floor);
 if(!Array.isArray(landing)||landing.length!==2||landing.some(p=>!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.z))||
 Math.abs(landing[0].x-landing[1].x)+Math.abs(landing[0].z-landing[1].z)!==1||
 !(stairCells instanceof Set)||!(apertures instanceof Set)||!(walk instanceof Set)||
 !Array.isArray(rooms)||!Array.isArray(cores)||!Number.isInteger(maxPaths)||maxPaths<1||maxPaths>4)
 throw Error("B118_INVALID_INTERFACE");
 const statusFor=p=>{
  if(floor.footprintRows[p.z]?.[p.x]!=="1")return "SOURCE_FLOOR_ABSENT";
  if(rooms.some(r=>inside(r,p)))return "ROOM_PROTECTED";
  if(cores.some(r=>inside(r,p)))return "CORE_PROTECTED";
  if(stairCells.has(K(p)))return "ACTIVE_STAIR_FOOTPRINT";
  if(apertures.has(K(p)))return "PROPOSED_STAIR_FLOOR_APERTURE";
  return null;
 };
 const allowed=new Set();
 for(let z=0;z<floor.footprintRows.length;z++)for(let x=0;x<floor.footprintRows[z].length;x++){
  const p={x,z};if(!statusFor(p))allowed.add(K(p));
 }
 const squareOK=p=>patch(p).every(q=>allowed.has(K(q)));
 const directions=landing[0].x===landing[1].x?cardinal.filter(d=>d.dz===0):cardinal.filter(d=>d.dx===0);
 const examinations=[],found=[];
 for(const dir of directions){
  const row1=landing.map(p=>({x:p.x+dir.dx,z:p.z+dir.dz}));
  const row2=landing.map(p=>({x:p.x+2*dir.dx,z:p.z+2*dir.dz}));
  const start={x:Math.min(...row1.map(p=>p.x),...row2.map(p=>p.x)),
   z:Math.min(...row1.map(p=>p.z),...row2.map(p=>p.z))};
  const protectedFailures=patch(start).map(cell=>({cell,reason:statusFor(cell)})).filter(x=>x.reason);
  if(protectedFailures.length){examinations.push({direction:dir,start,reason:"FIRST_TWO_ROWS_PROTECTED",protectedFailures});continue;}
  const queue=[start],seen=new Set([K(start)]),parents=new Map();let goal=null;
  for(let i=0;i<queue.length;i++){
   const cur=queue[i],target=patch(cur).filter(q=>walk.has(K(q)));
   if(target.some((a,j)=>target.slice(j+1).some(b=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1))){goal=cur;break;}
   for(const d of cardinal){
    const next={x:cur.x+d.dx,z:cur.z+d.dz},n=K(next);
    if(seen.has(n)||!squareOK(next))continue;
    seen.add(n);parents.set(n,K(cur));queue.push(next);
   }
  }
  if(!goal){examinations.push({direction:dir,start,reason:"TWO_WIDE_GALLERY_UNREACHABLE",protectedFailures:[],reachableAnchors:seen.size});continue;}
  const anchors=[];
  for(let n=K(goal);n;){const [x,z]=n.split(",").map(Number);anchors.push({x,z});n=parents.get(n);}
  anchors.reverse();
  const footprint=new Map();for(const a of anchors)for(const q of patch(a))footprint.set(K(q),q);
  const additional=[...footprint].filter(([id])=>!walk.has(id)).map(([,q])=>q).sort((a,b)=>a.z-b.z||a.x-b.x);
  if(additional.some(x=>statusFor(x)))throw Error("B118_INCORRECT_ALLOWED_PATH");
  const result={direction:dir,start,goal,twoWideSquareAnchors:anchors,
   addedCells:additional,routeFootprint:[...footprint.values()],steps:anchors.length-1,
   fromExactUnmovedLanding:true,noRoomCoreFloorStairOrApertureEdits:true,
   sourceGalleryEndLocalOnly:true,headroomAndSupportNotCertified:true,realBedrockWalkingCertified:false};
  found.push(result);examinations.push({direction:dir,start,reason:"CONDITIONAL_2D_SIDE_EXIT",protectedFailures:[],additionalCells:additional.length});
 }
 found.sort((a,b)=>a.addedCells.length-b.addedCells.length||a.steps-b.steps||
 a.direction.dx-b.direction.dx||a.direction.dz-b.direction.dz);
 return {status:found.length?"CONDITIONAL_SIDE_EXIT_IDEAS":"NO_FIXED_LANDING_TWO_WIDE_EXIT",
  originalLanding:landing,fixedLanding:landing,probedNormals:directions.length,
  candidates:found.slice(0,maxPaths),candidateCount:found.length,
  examinations,originalBuildingUnmodified:true,worldContacts:0,
  sourceFloorMaskRetained:true,physicalTraversalCertified:false,
  installationApproved:false};
}

export function shiftedLandingHints({floor,rooms=[],cores=[],stairCells,apertures=new Set(),landing,walk,maxRadius=2}){
 if(![1,2,3].includes(maxRadius))throw Error("B118_UNBOUNDED_SHIFT");
 const probe=[];
 for(let radius=1;radius<=maxRadius;radius++)
  for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
   if(Math.abs(dx)+Math.abs(dz)!==radius)continue;
   const suggested=landing.map(p=>({x:p.x+dx,z:p.z+dz}));
   const outcome=searchB118Exit({floor,rooms,cores,stairCells,apertures,landing:suggested,walk,maxPaths:1});
   if(outcome.candidateCount)probe.push({shift:{dx,dz},offset:radius,
    hypotheticalLanding:suggested,referenceCandidate:outcome.candidates[0],
    requiresWholeStairGeometryRedesign:true,preservesOldLandingUntilApproval:true,
    notAnAvailableReplacementStair:true,physicalTraversalCertified:false});
  }
 probe.sort((a,b)=>a.offset-b.offset||a.referenceCandidate.addedCells.length-b.referenceCandidate.addedCells.length||
 a.shift.dz-b.shift.dz||a.shift.dx-b.shift.dx);
 return {hints:probe.slice(0,3),totalGeometryFreeShiftHints:probe.length,
  noSourceLandingMoved:true,noStairBodyOrSupportRemodelled:true};
}
