/**
 * Research-only, non-default: select among EXPLICIT author-permitted V6 shifts
 * and massing corners. Never silently repair a single-choice V6 JSON.
 * True frozen V6->B143->SOURCE recompilation is authoritative. No model,
 * world, network, CI, production-path or ART interaction in this module.
 */
import {materializeV4JParentIndexAuthor,
 V4J_PARENT_INDEX_CIVIC_SCHEMA}
 from './r125-v4j-feasible-envelope.mjs';
import {createHash} from 'node:crypto';
import {compileCivicArcadeAuthorIntent}
 from './r125-v4j-civic-author-ir.mjs';
import {classifyPrivateCompilerRejection,UNKNOWN_COMPILER_REJECT}
 from '../../scripts/r125-v4d-compiler-reject-codes.mjs';

// Non-default V6 research. This never repairs a single-shift V6 answer.
// All alternatives must be explicitly supplied by an external author envelope.
export const V6_BOUNDED_CHOICES_SCHEMA='mab-v6-explicit-placement-choices-research-v1';
const choiceFail=reason=>{throw Error('MAB_V6_BOUNDED_CHOICES_'+reason);};
const choiceRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fixedKeys=(x,keys)=>choiceRecord(x)&&
 Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
const shift=x=>Number.isSafeInteger(x)&&x>=-3&&x<=3;
const corners=['NW','NE','SW','SE'];
const uniqueOptions=(xs,predicate,max)=>Array.isArray(xs)&&xs.length>=1&&
 xs.length<=max&&xs.every(predicate)&&new Set(xs).size===xs.length;

// Only these known, specifically PLACEMENT-related SOURCE refusals permit
// another author-listed candidate. A known safety/contract/identity/QA error
// is NOT evidence that a different arrangement may safely be tried.
const V6_RETRYABLE_PLACEMENT_CODES=new Set([
 'RANKED_NO_EXTERIOR_OPTION',
 'MASSING_MASSING_VOID_INTERSECTS_SHARED_WALL'
]);
export const recognizedV6ResearchSourceReject=message=>{
 const code=classifyPrivateCompilerRejection(message);
 return code!==UNKNOWN_COMPILER_REJECT&&
  V6_RETRYABLE_PLACEMENT_CODES.has(code);
};
// An inconsistent construction gate, world write or execution flag is a
// safety-contract failure, never a reason to continue to another candidate.
export const v6ResearchFrozenSafetyDrift=result=>
 result?.worldContacts!==0||result?.worldWrites!==0||
 result?.readiness!=='NOT_PREPARED'||
 result?.constructionApproved!==false||result?.executionAllowed!==false||
 result?.BuildPlan?.operations?.length!==0||
 result?.gates?.length!==9||result.gates.some(g=>g!=='BLOCKED');

// Does not compile or certify SOURCE. Caller must run the frozen compiler for
// EACH derived candidate before treating any geometry as valid.
export function enumerateV6ExplicitPlacementChoices(packet){
 if(!fixedKeys(packet,['schema','v6Author','allowedShifts','allowedCorners'])||
  packet.schema!==V6_BOUNDED_CHOICES_SCHEMA||
  !choiceRecord(packet.v6Author)||
  !Array.isArray(packet.v6Author.otherSpaces)||
  packet.v6Author.otherSpaces.length<2||packet.v6Author.otherSpaces.length>4||
  !choiceRecord(packet.v6Author.massing)||
  !uniqueOptions(packet.allowedCorners,x=>corners.includes(x),2)||
  packet.allowedCorners[0]!==packet.v6Author.massing.corner||
  !Array.isArray(packet.allowedShifts)||
  packet.allowedShifts.length!==packet.v6Author.otherSpaces.length)
  choiceFail('ENVELOPE_CONTRACT');
 const original=structuredClone(packet.v6Author);
 for(let i=0;i<original.otherSpaces.length;i++){
  const a=original.otherSpaces[i]?.attach,options=packet.allowedShifts[i];
  if(!fixedKeys(a,['parentIndex','side','shift'])||
   !shift(a.shift)||!uniqueOptions(options,shift,3)||
   options[0]!==a.shift)
   choiceFail('AUTHOR_SHIFT_OPTIONS');
 }
 const count=packet.allowedShifts.reduce((n,arr)=>n*arr.length,
  packet.allowedCorners.length);
 if(count>16)choiceFail('TOO_MANY_EXPLICIT_COMBINATIONS');
 const out=[];
 // Author order is preference order. First candidate is exactly original V6.
 for(const corner of packet.allowedCorners){
  let vectors=[[]];
  for(const options of packet.allowedShifts)
   vectors=vectors.flatMap(v=>options.map(x=>[...v,x]));
  for(const vector of vectors){
   const author=structuredClone(original);
   author.massing.corner=corner;
   author.otherSpaces.forEach((s,i)=>{s.attach.shift=vector[i];});
   out.push({author,selectedCorner:corner,selectedShifts:vector});
  }
 }
 return out;
}

// Only this entry point may label a candidate SOURCE-valid, and only after
// running the unchanged real author/geometry/route compiler. The packet does
// not establish who authored its alternatives; real model authorship is HOLD.
export function compileV6ExplicitPlacementResearch(packet){
 const candidates=enumerateV6ExplicitPlacementChoices(packet);
 // An original invalid V6 response must never be silently normalized.
 try{materializeV4JParentIndexAuthor(packet.v6Author);}
 catch{return {status:'HOLD_INVALID_ORIGINAL_V6',checked:0,
   sourceVerified:false,modelAuthorshipVerified:false};}
 let checked=0;
 for(const c of candidates){
  checked++;
  try{
   const originalModel=materializeV4JParentIndexAuthor(c.author);
   const result=compileCivicArcadeAuthorIntent(originalModel);
   if(v6ResearchFrozenSafetyDrift(result))
    return {status:'HOLD_FROZEN_SAFETY_CONTRACT_DRIFT',checked,
     sourceVerified:false,modelAuthorshipVerified:false,
     worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
     constructionApproved:false,executionAllowed:false,
     gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
   if(result?.b143?.sourceRoutes?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    !Array.isArray(result.b143.sourceRoutes.zones)||
    result.b143.sourceRoutes.zones.some(z=>!z.reachedFromEntrance)||
    !Array.isArray(result.b143.sourceRoutes.featureAccess)||
    result.b143.sourceRoutes.featureAccess.some(f=>!f.reachableFromEntrance))
    continue;
   return {
    status:'RESEARCH_AUTHOR_OPTIONS_SOURCE_PASS_NOT_GATE_CLEARANCE',
    checked,selectedCorner:c.selectedCorner,
    selectedShifts:c.selectedShifts,
    sourceSha256:result.b143.sourceSha256,
    geometrySha256:result.b143.geometrySha256,
    // Private data for offline provenance/independent review; never publish.
    privateSelectedV6:c.author,privateCompiledResult:result,
    sourceVerified:true,modelAuthorshipVerified:false,
    humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
    worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
    constructionApproved:false,executionAllowed:false,
    gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
   };
  }catch(error){
   // Expected strict SOURCE rejection: inspect next explicitly offered option.
   // Unexpected runtime failures are NOT geometry rejections; fail closed.
   const message=String(error?.message??'');
   if(!recognizedV6ResearchSourceReject(message))
    return {status:'HOLD_UNCLASSIFIED_SOURCE_EXCEPTION',checked,
     sourceVerified:false,modelAuthorshipVerified:false,
     worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
     constructionApproved:false,executionAllowed:false,
     gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
   // No raw PRIVATE compiler text or authored identifiers are exported.
  }
 }
 return {status:'HOLD_ALL_EXPLICIT_CHOICES_SOURCE_REJECTED',
  checked,sourceVerified:false,modelAuthorshipVerified:false,
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
}


// Opt-in, one-original-response model author contract. Does NOT alter default V6.
const singleAuthorResponse={
 type:'object',
 properties:{
  schema:{type:'string',enum:[V6_BOUNDED_CHOICES_SCHEMA]},
  v6Author:structuredClone(V4J_PARENT_INDEX_CIVIC_SCHEMA),
  allowedShifts:{type:'array',minItems:2,maxItems:4,items:{
   type:'array',minItems:1,maxItems:3,items:{
    type:'integer',minimum:-3,maximum:3}}},
  allowedCorners:{type:'array',minItems:1,maxItems:2,items:{
   type:'string',enum:['NW','NE','SW','SE']}}
 },
 required:['schema','v6Author','allowedShifts','allowedCorners'],
 additionalProperties:false
};
export const V6_EXPLICIT_CHOICES_AUTHOR_JSON_SCHEMA=singleAuthorResponse;
export const V6_EXPLICIT_CHOICES_AUTHOR_RESPONSE_FORMAT={
 type:'json_schema',json_schema:{
  name:'v6_one_original_building_with_placement_choices_research',
  strict:true,schema:singleAuthorResponse}
};
export const V6_EXPLICIT_CHOICES_AUTHOR_SYSTEM_PROMPT=[
 'You are the original designer of ONE genuinely useful, distinctive building for the user brief. Return ONE ORIGINAL JSON object only, following the attached strict JSON schema. No markdown, no second model reply, no template topology or host-side artistic choices.',
 'CURRENT ROOT CONTRACT: EXACT top-level keys {schema,v6Author,allowedShifts,allowedCorners}, with outer schema mab-v6-explicit-placement-choices-research-v1. Nest the COMPLETE unchanged V6 civic-building contract inside v6Author. Its fields are {schema,id,title,brief,materials,entrySpace,otherSpaces,massing,wing,floorplate,atrium,mezzanine,arcade}; v6Author.schema must be minecraftaibuilder-r125-v4j-civic-arcade-author-v1. Do NOT output a root spaces array, an attach.to reference, or a bare V6 building.',
 'V6 ROOMS: entrySpace is the FIRST covered reception, with attach:null. otherSpaces contains 2..4 subsequent rooms (at least two covered rooms total and one open sky space). Each later room attach is EXACT {parentIndex,side,shift}; parentIndex references an EARLIER entrySpace/otherSpaces index, counting entrySpace as 0. A parentIndex 0 child MUST use east, south, or west because north of the entrySpace is reserved for its real public doorway. Other parents may use north if geometry permits. Each unique room id is a lowercase-hyphen slug of length 3..25.',
 'SOURCE GEOMETRY: covered room widths/depths 22..30, massing cutWidth/cutDepth 7..8, and a valid massing target must satisfy width>=2*cutWidth+6 and depth>=2*cutDepth+6. The HOST places the root at local x=48,z=42, attaches east/west/south/north children along actual common walls and centers child on the perpendicular axis plus authored shift -3..3. Avoid pairwise room footprint overlap exceeding one cell along BOTH x and z. Preserve an accessible north entry, 2-wide supported clear walking routes and service equipment.',
 'EXTERIOR: every covered room must have at least one ENTIRE unshared exterior window face after all children and nonlinked neighbors are considered. Even a corner-only neighbor or immediately adjacent exterior-air contact disqualifies that entire face in the unchanged default SOURCE. The root north face is never a window. Your ranked four-direction windowPriority list does not override these geometry constraints.',
 'MASSING: select a covered target room and a true open-sky exterior corner NW|NE|SW|SE with BOTH touching corner sides unshared by any parent or child links. The frozen SOURCE may reject conflicts with entrances, floorplates, physical windows, upper rooms, wing, stair, arcade, road, equipment or other protected geometry. Never expect a model or HOST to relocate or silently repair any room.',
 'FULL BUILDING: author meaningful room purposes, roof geometry, facade and material decisions, usable public outdoor wing, covered floorplate setback, tall accessible atrium, real mezzanine stair and upper public function, and functional three-bay arcade with two usable public workpoints. Follow every nested field and value limit of the strict schema. Do not claim that a plausible JSON alone proves B143, ART or actual Minecraft walking.',
 'AUTHOR YOUR OWN OPTIONS IN THE SAME ORIGINAL RESPONSE: allowedShifts has exactly one preference-ordered list for each otherSpaces room, containing 1..3 DISTINCT integer shifts -3..3. The FIRST shift MUST equal its corresponding v6Author.otherSpaces[i].attach.shift. allowedCorners is a preference-ordered list of 1..2 DISTINCT NW|NE|SW|SE corners; the FIRST MUST equal v6Author.massing.corner.',
 'CARTESIAN AUTHOR PERMISSION: every combination in the product of all allowedShifts lists and allowedCorners is a permitted placement authored by YOU, including cross-pairs you did not separately list. Include an option ONLY if you consent to EVERY combination it creates. The total product of list lengths MUST be 16 or fewer. All other authored fields (parent, sides, room sizes/functions, wing, roof, floorplate, atrium, mezzanine and arcade) remain unchanged for every combination. No hidden HOST repair or invention of alternatives.',
 'This is non-default research, not a production safety clearance. The unchanged frozen SOURCE compiler may reject ALL choices. Emit one unaltered JSON response; no model retry, model identity assertion, world access, Minecraft construction, paid API, ART approval or claims of real walking.'
].join('\n');
// The parsed packet is private and must NEVER be published. This only proves
// textual provenance inside a provided raw response, not actual model identity.
export function parseV6ExplicitChoicesOriginalRaw(raw){
 if(typeof raw!=='string'||raw.length<2||raw.length>250000)
  choiceFail('ORIGINAL_RAW_BOUNDS');
 let packet;
 try{packet=JSON.parse(raw);}
 catch{choiceFail('ORIGINAL_RAW_INVALID_JSON');}
 const candidates=enumerateV6ExplicitPlacementChoices(packet);
 try{materializeV4JParentIndexAuthor(packet.v6Author);}
 catch{choiceFail('ORIGINAL_V6_CONTRACT');}
 return {
  schema:'mab-v6-choice-raw-evidence-research-v1',
  originalRawSha256:createHash('sha256').update(raw).digest('hex'),
  privatePacket:structuredClone(packet),
  explicitCandidateCount:candidates.length,
  choicesPresentInSameRawJson:true,
  modelAuthorshipVerified:false,modelHttpIdentityVerified:false,
  sourceVerified:false,humanArt:'NOT_REVIEWED',
  readiness:'NOT_PREPARED',constructionApproved:false,worldWrites:0,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
}
