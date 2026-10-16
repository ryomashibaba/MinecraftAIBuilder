/**
 * B155 category-free BRIDGE REPAIR PROPOSALS (design documents only).
 * Given a precompiled immutable local design and two valid endpoints,
 * recommend only a straight fully bounded structural-floor *candidate*.
 * It never edits a world, certifies structure/collision, nor executes a plan.
 */
import {createHash} from 'node:crypto';
import {analyzeFootprint,verifyFootprint} from './b152-footprint-review.mjs';
export const SCHEMA='minecraftaibuilder-b155-skybridge-proposal-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const ok=(c,s)=>{if(!c)throw Error('B155_'+s);};
const pt=x=>Array.isArray(x)&&x.length===3&&x.every(v=>Number.isSafeInteger(v)&&v>=0&&v<=128);
const K=(x,y,z)=>x+','+y+','+z;
export function proposeSkybridge(scene,{start,goal,footprintWidth=2,footprintDepth=2,
 corridorWidth=8,maxSpan=48}={}){
 ok(pt(start)&&pt(goal)&&Number.isSafeInteger(footprintWidth)&&footprintWidth>=1&&footprintWidth<=6&&
  Number.isSafeInteger(footprintDepth)&&footprintDepth>=1&&footprintDepth<=6&&
  Number.isSafeInteger(corridorWidth)&&corridorWidth>=Math.max(footprintWidth,footprintDepth)+2&&
  corridorWidth<=16&&Number.isSafeInteger(maxSpan)&&maxSpan>=2&&maxSpan<=80,
  'PARAMETERS');
 const routeArgs={start,destinations:[{id:'target',at:goal}],
  width:footprintWidth,depth:footprintDepth,headroom:2};
 const proof=analyzeFootprint(scene,routeArgs);
 ok(verifyFootprint(scene,routeArgs,proof),'INVALID_SOURCE_PROOF');
 const r=proof.targets[0];
 let status='CANDIDATE_PENDING_REVIEW',proposal=null;
 if(r.status==='PASS_FLAT_FOOTPRINT_GEOMETRY')status='ALREADY_CONNECTED';
 else if(r.status==='INVALID_START_FOOTPRINT'||r.status==='INVALID_GOAL_FOOTPRINT')
  status='INVALID_ENDPOINT';
 else if(start[1]!==goal[1])status='DIFFERENT_ELEVATIONS';
 else if(start[0]!==goal[0]&&start[2]!==goal[2])status='NEEDS_L_SHAPE_OR_OTHER_DESIGN';
 else if(start[0]===goal[0]&&start[2]===goal[2])status='SAME_ANCHOR_NO_BRIDGE';
 else if(Math.abs(goal[0]-start[0])+Math.abs(goal[2]-start[2])>maxSpan)
  status='SPAN_BEYOND_LIMIT';
 else if(start[1]<2)status='SUPPORT_BOUNDS_INVALID';
 else{
  const alongX=start[0]!==goal[0];
  // Include enough established floor at BOTH terminals for overlap;
  // a new standalone bridge is never represented as an approved action.
  const from=Math.min(start[alongX?0:2],goal[alongX?0:2]);
  const span=Math.abs(start[alongX?0:2]-goal[alongX?0:2]);
  const center=start[alongX?2:0];
  const transverseOrigin=Math.max(0,center-Math.floor((corridorWidth-1)/2));
  const dims=alongX?
   {origin:[from,start[1]-2,transverseOrigin],
    size:[span+footprintWidth,2,corridorWidth]}:
   {origin:[transverseOrigin,start[1]-2,from],
    size:[corridorWidth,2,span+footprintDepth]};
  const [x,y,z]=dims.origin,[w,h,depth]=dims.size;
  if([x+w,y+h,z+depth].some(v=>v>128))status='LOCAL_BOUNDS_EXCEEDED';
  else{
   const occupied=new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])));
   let block=null;
   // Check body clearance, not just endpoints, across the entire proposed
   // lane. Existing structure at head/body cells requires an architect review.
   for(let zz=z;zz<z+depth&&!block;zz++)
    for(let xx=x;xx<x+w&&!block;xx++)
     for(let yy=start[1];yy<start[1]+2;yy++)
      if(occupied.has(K(xx,yy,zz))){block=[xx,yy,zz];break;}
   if(block)status='OBSTRUCTED_BODY_VOLUME';
   else{
    proposal={id:'b155-unapproved-proposed-bridge',
     shape:'box',mode:'add',material:'concrete',
     origin:dims.origin,size:dims.size};
    status='GEOMETRIC_FLOOR_PROPOSAL_ONLY';
   }
  }
 }
 const payload={schema:SCHEMA,status,sourceSha256:scene.sourceSha256,
  geometrySha256:scene.geometrySha256,routeProofSha256:proof.sha256,
  start,goal,footprintWidth,footprintDepth,corridorWidth,maxSpan,
  beforeRouteStatus:r.status,proposedFloor:proposal,
  warnings:['No automatic authoring or construction','Railings and load paths not certified',
   'Whole-cell approximation is NOT the Minecraft player hitbox',
   'Even a candidate with floor clearance must be compiled and fully rerouted after human design'],
  structuralStrengthCertified:false,stairsCertified:false,playerCollisionCertified:false,
  constructionApproved:false,readiness:'NOT_PREPARED',worldContacts:0,
  worldCoordinates:null,BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')};
 return {...payload,sha256:sha(payload)};
}
export function verifySkybridgeProposal(scene,params,proof){
 try{return JSON.stringify(proposeSkybridge(scene,params))===JSON.stringify(proof)&&
  proof.constructionApproved===false&&proof.gates?.length===9&&
  proof.gates.every(s=>s==='BLOCKED')&&proof.BuildPlan.operations.length===0;}
 catch{return false;}
}
