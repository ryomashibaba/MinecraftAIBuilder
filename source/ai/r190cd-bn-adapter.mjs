/** R190-CD conservative BN/BO adapter. Read-only: host does not infer
 * program, levels, enclosure, entrances, paths, stairs, art, or fix model output.
 * Uses ORIGINAL author Spatial Assembly + derived B143 final voxel cells.
 */
import {createHash} from 'node:crypto';
import {R190BN_SCHEMA} from './r190bn-spatial-assembly.mjs';
import {verifyCompiled} from './b143-building-dsl.mjs';
import {auditR190CD} from './r190cd-integrated-quality-gate.mjs';
const H=b=>createHash('sha256').update(b).digest('hex');
const fail=m=>{throw Error('R190CD_BN_'+m);};
const proper=(b,a,n)=>Number.isSafeInteger(b)&&b>=a&&b<=n;
export function auditR190CDFromBN({original,originalBrief,derived,
 origin='BO_DERIVED_FROM_UNVERIFIED_MODEL_OR_SYNTHETIC_SOURCE'}={}){
 if(!(original instanceof Uint8Array)||!(originalBrief instanceof Uint8Array)||
 !derived?.compiled?.designOnly||!Array.isArray(derived?.programSpaces)||
 !Array.isArray(derived?.levels)||!derived?.geometrySha256)fail('INPUT');
 let author;
 try{author=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(original))}
 catch{fail('ORIGINAL_JSON')}
 if(author.schema!==R190BN_SCHEMA||author.originalBriefSha256!==H(originalBrief)||
   derived.originalInputSha256!==H(original)||
   derived.originalBriefSha256!==H(originalBrief)||
   derived.geometrySha256!==derived.compiled.geometrySha256)fail('ORIGIN_BINDING');
 // Preserve order and numbers from model original, not a repair of derived data.
 if(JSON.stringify(author.levels)!==JSON.stringify(derived.levels)||
   JSON.stringify(author.spaces)!==JSON.stringify(derived.programSpaces)||
   JSON.stringify(author.bounds)!==JSON.stringify(derived.proposal?.design?.bounds)||
   !verifyCompiled(derived.proposal.design,derived.compiled))fail('DERIVATION_CHANGED');
 const {width:w,height:h,depth:d}=author.bounds;
 const levels=new Map();
 for(const q of author.levels){
  if(levels.has(q.id)||!proper(q.standingY,1,h-3))fail('LEVEL');
  levels.set(q.id,q.standingY);
 }
 if(!Array.isArray(author.spaces)||author.spaces.length<1||author.spaces.length>32)fail('SPACES');
 const programs=author.spaces.map(s=>{
  const y=levels.get(s.levelId);
  if(!proper(y,1,h-3)||!Array.isArray(s.origin)||s.origin.length!==2||
   !Array.isArray(s.size)||s.size.length!==2||
   !proper(s.origin[0],0,w-1)||!proper(s.origin[1],0,d-1)||
   !proper(s.size[0],2,w-s.origin[0])||!proper(s.size[1],2,d-s.origin[1]))fail('SPACE');
  const [x,z]=s.origin,[sx,sz]=s.size;
  return {id:s.id,purpose:s.purpose,floorY:y-1,
   polygon:[[x,z],[x+sx,z],[x+sx,z+sz],[x,z+sz]]};
 });
 if(!Array.isArray(author.entrance)||author.entrance.length!==3||
  author.entrance.some((q,i)=>!proper(q,0,[w-1,h-1,d-1][i])))fail('ENTRANCE');
 // Flight endpoints (not each footstep) are model-provided, but there is no
 // authored sampled path graph. Do not invent routeNodes or grant stair credit.
 const compiled={...derived.compiled,bounds:author.bounds,
  b143Design:derived.proposal.design,geometryHashKind:'B143_DESIGN_AND_VOXELS'};
 const diagnostic=auditR190CD({sourceRaw:original,compiled,
  bounds:author.bounds,programs,entrances:[author.entrance],routeNodes:[],origin});
 return {...diagnostic,originalBriefSha256:H(originalBrief),
  sourceSchema:R190BN_SCHEMA,sourceOriginalAuthorship:derived.authorship,
  originalAuthorEntrance:author.entrance,
  actualDeclaredFlights:author.operations.filter(x=>x.kind==='flight').length,
  originalDestinationPoints:author.destinations.map(x=>({id:x.id,point:x.point})),
  arrivalAndDestinationInterpretation:'MODEL_DECLARED_POINTS_ONLY_NOT_REAL_GAME_WALKING',
  authorFlightCoverage:'NO_IMPLICIT_FLIGHT_TO_ROUTE_ANCHORS_CONVERSION',
  derivedGeometryNotRepaired:true};
}
