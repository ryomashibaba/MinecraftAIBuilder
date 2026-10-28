/** One-response R190 semantic IR -> existing host B143 compiler.
 * This is NOT model-authored B143, construction, or independent beauty proof.
 * Single level only; never flatten required upstairs into fake geometry.
 */
import {createHash} from 'node:crypto';
import {R190_SCHEMA,compileR190SemanticPlan}
 from './r190-semantic-massing.mjs';
import {verifyCompiled} from './b143-building-dsl.mjs';

const H=s=>createHash('sha256').update(s,'utf8').digest('hex');
const object=(p,required=Object.keys(p))=>({
 type:'object',properties:p,required,additionalProperties:false});
const s=(min=3,max=150)=>({type:'string',minLength:min,maxLength:max});
const n=(low,high)=>({type:'integer',minimum:low,maximum:high});
const slug={type:'string',pattern:'^[a-z][a-z0-9-]{2,39}$'};
const side={enum:['north','south','east','west',null]};
const mat={type:'string',enum:['wood','stone','concrete','metal']};
const privacy={type:'string',enum:['public','shared','private']};
const room=object({
 id:slug,purpose:s(3,150),width:n(7,22),depth:n(7,22),
 height:n(7,30),parentId:{type:['string','null']},
 side,privacy
});
const window=object({
 spaceId:slug,face:{type:'string',enum:['north','south','east','west']},
 offset:n(2,20),baseY:n(5,28),width:n(2,6),height:n(2,4)
});
export const R190AB_SEMANTIC_FORMAT=object({
 schema:{const:R190_SCHEMA},id:slug,title:s(3,100),brief:s(3,400),
 site:object({width:n(24,80),depth:n(24,80),height:n(10,32)}),
 entrySpaceId:slug,
 spaces:{type:'array',items:room,minItems:3,maxItems:6},
 materials:object({floor:mat,wall:mat,roof:mat}),
 roofFormIntent:object({
  spaceId:slug,profile:{type:'string',enum:['ridge','shed']},
  axis:{type:'string',enum:['x','z']},rise:n(2,5)
 }),
 glazedOpenings:{type:'array',items:window,minItems:1,maxItems:5}
});
export const R190AB_SEMANTIC_FORMAT_SHA256=H(JSON.stringify(R190AB_SEMANTIC_FORMAT));
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0});
/** Hold (not retry) invalid provider originals or unplaceable model programs. */
export function inspectR190ABSemanticReply(raw,finishReason='stop'){
 const report={schema:'minecraftaibuilder-r190ab-semantic-result-v1',
  contract:'semantic-space',status:'HOLD_INVALID_SEMANTIC_PROGRAM',
  originalRawSha256:H(raw),bytes:Buffer.byteLength(raw,'utf8'),
  formatSchemaSha256:R190AB_SEMANTIC_FORMAT_SHA256,
  exactModelRawUnmodified:true,
  modelAuthoredB143:false,hostDeterminesExactVoxels:true,
  hostSourceDerived:false,semanticPlanValid:false,real3D:false,
  independentJapaneseCoverage:'NOT_CERTIFIED',
  aestheticMerit:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  sourceRouteAudit:null,error:null,...safe()};
 if(finishReason!=='stop'){
  report.error='PROVIDER_NOT_CONFIRMED_COMPLETE';
  return {report,design:null,compiled:null,plan:null};
 }
 try{
  if(Buffer.byteLength(raw,'utf8')>120000)throw Error('ORIGINAL_TOO_LARGE');
  const plan=JSON.parse(raw);
  if(plan?.schema!==R190_SCHEMA)throw Error('WRONG_SEMANTIC_CONTRACT');
  if(!Array.isArray(plan.spaces)||!Object.hasOwn(plan,'roofFormIntent')||
    !Array.isArray(plan.glazedOpenings)||plan.glazedOpenings.length<1)
    throw Error('MISSING_MODEL_SELECTED_ARCHITECTURE');
  if(plan.spaces.some(x=>x?.spatialRole==='open-court'))
    throw Error('UNSUPPORTED_OPTIONAL_COURT_IN_THIS_PILOT');
  const result=compileR190SemanticPlan(plan);
  if(!verifyCompiled(result.design,result.compiled))
    throw Error('HOST_DERIVED_B143_MISMATCH');
  if(!result.audit?.allProgramSpacesReachable||
     !result.audit?.witnesses?.length||
     result.audit.witnesses.length!==plan.spaces.length)
    throw Error('SOURCE_ROUTES_NOT_CONFIRMED');
  report.semanticPlanValid=true;
  report.status='HOST_DERIVED_SINGLE_LEVEL_SOURCE_PROXIES_PASS_ART_HOLD';
  report.hostSourceDerived=true;
  report.real3D=true;
  report.planSha256=result.inputSha256;
  report.hostDerivedSourceSha256=result.compiled.sourceSha256;
  report.hostDerivedGeometrySha256=result.compiled.geometrySha256;
  report.hostDerivedVoxelCount=result.compiled.primitives.length;
  report.sourceRouteAudit={allProgramSpacesReachable:true,
   reachableRoomCount:result.audit.witnesses.length,
   sourceWalkingPads:result.audit.sourceWalkingPads,
   actualMinecraftWalkingCertified:false};
  report.boundary={numberOfLevels:1,
   twoLevelOrVerticalRoutes:'NOT_SUPPORTED',
   roofWeatherproofing:'NOT_CERTIFIED',
   originalUseCaseCoverage:'NOT_CERTIFIED'};
  return {report,design:result.design,compiled:result.compiled,plan};
 }catch(e){
  report.error=String(e?.message??e).slice(0,180);
  return {report,design:null,compiled:null,plan:null};
 }
}
export const R190AB_SEMANTIC_GUIDANCE=[
 'You are an architect; output one short semantic space plan, NOT B143 elements or block coordinates.',
 'Invent 3 to 6 real functional spaces specifically for the Japanese brief. The output must match the provided JSON Schema exactly.',
 'This pilot is single-level ONLY. Do not pretend to satisfy second floors, staircases, exterior tide proofing or Minecraft construction.',
 'Space IDs, dimensions, purposes, parent relations, privacy and materials are YOUR decisions.',
 'entrySpaceId is the first root room; that root alone has parentId:null and side:null. Other rooms require a parentId and north/south/east/west side. NEVER place an entry-child south.',
 'Propose a physically plausible tree layout with rooms of width and depth 7..22, height 7..site.height-2. A shared boundary is a real 2-wide opening, not merely a declared adjacency.',
 'Select an inhabited roof profile (ridge or shed), section axis x or z, rise 2..5. Place its spaceId on a real enclosed room and keep room height+rise below site height.',
 'Provide at least one real exterior glazing opening. offset/width must fit inside the room facade; baseY must be >=5, baseY+height<=room height-1. Do not place glazing on a wall touching another room.',
 'Keep room sizes and relations as a coherent design. Site width/depth 24..80 and height 10..32; do not pad with a giant empty placeholder.',
 'The host derives exact geometry and validates true voxels. Your narrative and room labels never certify usable rooms, aesthetics, waterproofing, or construction.'
].join('\n');
