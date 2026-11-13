/**
 * Research-only, non-default: select among EXPLICIT author-permitted V6 shifts
 * and massing corners. Never silently repair a single-choice V6 JSON.
 * True frozen V6->B143->SOURCE recompilation is authoritative. No model,
 * world, network, CI, production-path or ART interaction in this module.
 */
import {materializeV4JParentIndexAuthor,
 V4J_PARENT_INDEX_CIVIC_SCHEMA,V4J_PARENT_INDEX_SYSTEM_PROMPT}
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

// Only known, sanitized compiler SOURCE rejection codes may advance to
// another explicitly authored candidate. Internal exceptions must stop.
export const recognizedV6ResearchSourceReject=message=>
 classifyPrivateCompilerRejection(message)!==UNKNOWN_COMPILER_REJECT;

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
   if(result?.b143?.sourceRoutes?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    result.b143.sourceRoutes.zones.some(z=>!z.reachedFromEntrance)||
    result.b143.sourceRoutes.featureAccess.some(f=>!f.reachableFromEntrance)||
    result.worldContacts!==0||result.worldWrites!==0||
    result.constructionApproved!==false||result.executionAllowed!==false||
    result.BuildPlan?.operations?.length!==0||
    result.gates?.length!==9||result.gates.some(g=>g!=='BLOCKED'))
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
 V4J_PARENT_INDEX_SYSTEM_PROMPT,
 'RESEARCH OUTPUT OVERRIDE: return ONE complete JSON object with EXACT root keys schema,v6Author,allowedShifts,allowedCorners. Set root schema to mab-v6-explicit-placement-choices-research-v1. Put your COMPLETE original V6 building JSON inside v6Author with its unchanged V6 schema and keys. Do not output a bare V6 JSON.',
 'AUTHOR YOUR OWN OPTIONS IN THE SAME ORIGINAL RESPONSE: allowedShifts has one preference-ordered array for each otherSpaces element. Each contains 1..3 DISTINCT shifts -3..3. FIRST shift MUST be the original v6Author.otherSpaces[i].attach.shift. allowedCorners has 1..2 DISTINCT corners NW|NE|SW|SE in preference order. FIRST MUST be v6Author.massing.corner.',
 'The product of all list lengths MUST be 16 or fewer. Alternatives may vary ONLY the expressly listed shifts and massing corner. Parent indices, attachment sides, dimensions, rooms, purposes, roof/window preferences, other massing fields, wing, floorplate, atrium, mezzanine and arcade remain unchanged. No implicit host reposition or generation of new choices.',
 'Every option is YOUR original architectural decision in this ONE JSON. The unchanged SOURCE may reject every option, without retry or repair. Never imply model identity, ART approval or Minecraft safety. This is a non-default research contract.'
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
