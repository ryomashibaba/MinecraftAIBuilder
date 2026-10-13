/** Imaginary design coordinates and conservative collision envelopes. No block placements. */
export const K=p=>p.x+','+p.z;
export const neighbors=p=>[[1,0],[-1,0],[0,1],[0,-1]].map(([x,z])=>({x:p.x+x,z:p.z+z}));
export const manhattan=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
export function reachable(seed,allowed){
 const seen=new Set(),q=[];
 if(allowed.has(K(seed))){seen.add(K(seed));q.push(seed);}
 for(let i=0;i<q.length;i++)for(const p of neighbors(q[i]))if(allowed.has(K(p))&&!seen.has(K(p))){seen.add(K(p));q.push(p);}
 return seen;
}
export const intersects=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&
 a.y<b.y+b.height&&b.y<a.y+a.height&&a.z<b.z+b.depth&&b.z<a.z+a.depth;
export const cellBox=(p,height=1)=>({...p,width:1,height,depth:1});
export function straightFlight({rise=5,width=2}={}){
 if(!Number.isInteger(rise)||rise<1||rise>32||!Number.isInteger(width)||width<1||width>4)throw Error('B113_INVALID_FLIGHT');
 const solids=[],samples=[],supports=[];
 // Local surface height starts at zero. Each block gives two half-block rises.
 for(let i=0;i<rise;i++){
  solids.push({x:i+1,y:i,z:0,width:1,height:0.5,depth:width},
   {x:i+1.5,y:i+0.5,z:0,width:0.5,height:0.5,depth:width});
  samples.push({x:i+1.25,y:i+0.5,z:width/2},{x:i+1.75,y:i+1,z:width/2});
  supports.push({x:i+1,y:-1,z:0,width:1,height:i+1,depth:width});
 }
 solids.push({x:0,y:-1,z:0,width:1,height:1,depth:width},
  {x:rise+1,y:rise-1,z:0,width:1,height:1,depth:width});
 samples.unshift({x:0.75,y:0,z:width/2});samples.push({x:rise+1.25,y:rise,z:width/2});
 const envelopes=bodyEnvelopes(samples);
 const apertureAt=y=>Array.from({length:rise},(_,x)=>x+1).filter(x=>envelopes.some(b=>
  intersects(b,{x,y,z:0,width:1,height:1,depth:width})));
 const upperAperture=apertureAt(rise-1),lowerCeilingAperture=apertureAt(3);
 return {kind:'STRAIGHT_HALF_STEP_OFFLINE_MODULE',rise,width,length:rise+2,
  solids,supports,samples,upperAperture,lowerCeilingAperture,assumedHeadroom:2,
  assumptions:['BOTTOM_STAIR_TWO_HALF_RISES','FULL_SUPPORT_UNDER_STEPS','TWO_BLOCK_BODY_ENVELOPE'],
  stateOrientationMapping:'UNVERIFIED',educationCollision:'UNVERIFIED',executable:false};
}
function bodyEnvelopes(samples){
 return samples.flatMap((p,i)=>{
  const b={x:p.x-0.3,y:p.y,z:p.z-0.3,width:0.6,height:2,depth:0.6};
  if(!i)return [b];const a=samples[i-1];
  return [b,{x:Math.min(a.x,p.x)-0.3,y:Math.min(a.y,p.y),z:Math.min(a.z,p.z)-0.3,
   width:Math.abs(a.x-p.x)+0.6,height:Math.abs(a.y-p.y)+2,depth:Math.abs(a.z-p.z)+0.6}];
 });
}
export function auditFlight(flight,obstacles=[]){
 const issues=[];
 // The two prescribed landings are walking support, not headroom obstacles.
 // Entry/exit transitions rely on the explicitly assumed half-block step behavior.
 const landingSupports=flight.solids.slice(-2);
 const foreign=obstacles.filter(o=>!landingSupports.some(s=>['x','y','z','width','height','depth'].every(k=>o[k]===s[k])));
 for(let i=1;i<flight.samples.length;i++){
  const a=flight.samples[i-1],b=flight.samples[i];
  if(b.y-a.y>0.5||b.y<a.y)issues.push({code:'STEP_RISE_DISCONTINUITY',sample:i});
 }
 for(const [i,body] of bodyEnvelopes(flight.samples).entries()){
  if(foreign.some(o=>intersects(body,o)))issues.push({code:'HEADROOM_OR_BODY_COLLISION',sample:i});
 }
 return {offlineGeometryClear:issues.length===0,issues,physicalTraversalCertified:false};
}
export function inspectLegacyStair(stair,volume){
 const lower=volume.junctions.find(j=>j.level===stair.fromLevel&&j.coreIndex===stair.coreIndex);
 const upper=volume.junctions.find(j=>j.level===stair.toLevel&&j.coreIndex===stair.coreIndex);
 if(!lower||!upper||!stair.steps.length)throw Error('B113_STAIR_SOURCE_MISSING');
 const first=stair.steps[0],last=stair.steps.at(-1),rise=(stair.toLevel-stair.fromLevel)*5;
 // A bottom stair occupying local y ends at surface y+1; floor cube at 5*L ends at 5*L+1.
 const upperSurface=stair.toLevel*5+1,top=last.y+1,issues=[];
 if(top!==upperSurface)issues.push('SIX_STAIRS_OVERSHOOT_FIVE_BLOCK_FLOOR_RISE');
 if(manhattan(lower.coreLanding,first)>1)issues.push('LOWER_LANDING_NOT_ADJACENT_TO_FIRST_STEP');
 if(manhattan(upper.coreLanding,last)>1)issues.push('UPPER_LANDING_NOT_ADJACENT_TO_LAST_STEP');
 for(let i=1;i<stair.steps.length;i++)if(manhattan(stair.steps[i-1],stair.steps[i])!==1)issues.push('TREAD_HORIZONTAL_GAP');
 issues.push('TURNING_TREAD_COLLISION_AND_ASCENT_UNASSIGNED','LANDING_SUPPORT_NOT_MODELED');
 return {coreIndex:stair.coreIndex,fromLevel:stair.fromLevel,toLevel:stair.toLevel,
  floorRise:rise,conceptTreads:stair.steps.length,lastStairTop:top,upperSurface,
  upperOvershoot:top-upperSurface,lowerLandingDistance:manhattan(lower.coreLanding,first),
  upperLandingDistance:manhattan(upper.coreLanding,last),
  currentCore:{...stair.stairCoreFootprint},issues,
  decision:'REQUIRES_STAIR_REDESIGN',physicalTraversalCertified:false,
  replacement:{module:'STRAIGHT_HALF_STEP_OFFLINE_MODULE',footprint:{width:2,length:rise+2},
   fitsExisting3x3:false,requiresFloorAperture:true,
   note:'This rejects the inherited ring as a literal staircase, not every possible 3x3 spiral.'}};
}
/** Inspect all four rotations without altering rooms/cores. Candidate apertures are design constraints only. */
export function findFlightReservations(stair,design){
 const f=design.plan.floors[stair.fromLevel],g=design.plan.floors[stair.toLevel];
 const core=stair.stairCoreFootprint,fl=straightFlight(),candidates=[];
 const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(let oz=-6;oz<=2;oz++)for(let ox=-6;ox<=2;ox++){
  const origin={x:core.x+ox,z:core.z+oz},cells=[];
  for(let i=0;i<fl.length;i++)for(let w=0;w<fl.width;w++)cells.push({x:origin.x+dx*i-dz*w,z:origin.z+dz*i+dx*w});
  if(!cells.some(p=>inside(core,p)))continue;
  if([f,g].some(floor=>cells.some(p=>floor.footprintRows[p.z]?.[p.x]!=='1'||floor.rooms.some(r=>inside(r,p))||
   design.plan.cores.some((r,i)=>i!==stair.coreIndex&&inside(r,p)))))continue;
  const start=cells.slice(0,2),end=cells.slice(-2),fg=new Set(f.gallery.map(K)),gg=new Set(g.gallery.map(K));
  if(!start.every(p=>neighbors(p).some(n=>fg.has(K(n))))||!end.every(p=>neighbors(p).some(n=>gg.has(K(n)))))continue;
  candidates.push({origin,ascent:{dx,dz},footprintCells:cells,
   lowerLanding:start,upperLanding:end,apertureCells:cells.filter((_,i)=>fl.upperAperture.includes(Math.floor(i/2))),
   lowerCeilingApertureCells:cells.filter((_,i)=>fl.lowerCeilingAperture.includes(Math.floor(i/2))),
   status:'FOOTPRINT_ONLY_NEEDS_GALLERY_AND_APERTURE_REDESIGN',executable:false});
 }
 return {evaluatedRotations:4,eligibleFootprints:candidates.length,sample:candidates[0]??null,
  applied:false,fullBuildingIntegrationCertified:false};
}
