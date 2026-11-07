/** R190-AD expressive semantic envelope: opt-in Qwen choices, not host templates.
 * R190-AB schema and its original hashes are immutable and remain readable.
 * B143 and exact voxels remain HOST-DERIVED, not model-authored.
 */
import {createHash} from 'node:crypto';
import {R190_SCHEMA,compileR190SemanticPlan}
 from './r190-semantic-massing.mjs';
import {verifyCompiled} from './b143-building-dsl.mjs';

const H=x=>createHash('sha256').update(x,'utf8').digest('hex');
const obj=(properties,required=Object.keys(properties))=>({
 type:'object',properties,required,additionalProperties:false});
const str=(min,max)=>({type:'string',minLength:min,maxLength:max});
const num=(minimum,maximum)=>({type:'integer',minimum,maximum});
const slug={type:'string',pattern:'^[a-z][a-z0-9-]{2,39}$'};
const directions={type:'string',enum:['north','south','east','west']};
const room=obj({
 id:slug,purpose:str(3,150),width:num(7,22),depth:num(7,22),
 height:num(7,30),parentId:{type:['string','null']},
 side:{enum:['north','south','east','west',null]},
 privacy:{type:'string',enum:['public','shared','private']},
 spatialRole:{type:'string',enum:['enclosed','open-court']}
});
const roofBase={spaceId:slug,axis:{type:'string',enum:['x','z']},
 rise:num(2,5)};
const glazing=obj({
 spaceId:slug,face:directions,offset:num(2,20),
 baseY:num(5,28),width:num(2,6),height:num(2,4)
});
export const R190AD_FORMAT=obj({
 schema:{const:R190_SCHEMA},id:slug,title:str(3,100),brief:str(3,400),
 site:obj({width:num(24,80),depth:num(24,80),height:num(10,32)}),
 entrySpaceId:slug,
 spaces:{type:'array',items:room,minItems:3,maxItems:6},
 materials:obj({
  floor:{enum:['wood','stone','concrete','metal']},
  wall:{enum:['wood','stone','concrete','metal']},
  roof:{enum:['wood','stone','concrete','metal']}
 }),
 formIntent:obj({spaceId:slug,face:directions,cornerInset:num(2,3)}),
 roofFormIntent:{oneOf:[
  obj({...roofBase,profile:{const:'ridge'}}),
  obj({...roofBase,profile:{const:'shed'}}),
  obj({...roofBase,profile:{const:'sawtooth'},toothWidth:num(3,8)})
 ]},
 glazedOpenings:{type:'array',items:glazing,minItems:1,maxItems:5},
 crossConnections:{type:'array',items:{
  type:'array',items:slug,minItems:2,maxItems:2
 },minItems:1,maxItems:3}
 },['schema','id','title','brief','site','entrySpaceId','spaces',
 'materials','formIntent','roofFormIntent','glazedOpenings']);
export const R190AD_FORMAT_SHA256=H(JSON.stringify(R190AD_FORMAT));
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
export const R190AD_GUIDANCE=[
 'Design independent, original architecture for the exact Japanese request. Output one JSON semantic plan only, no B143, no block coordinates.',
 'This is SINGLE-LEVEL source research only. Never pretend to solve hillside foundations, upstairs, stairways, tide resistance or construction.',
 'You choose the site, room purposes, room sizes, relations, room privacy, spaceRole, faceted form, inhabited roof form and glazing. The host only derives their voxels.',
 'Create 3 to 6 rooms. Give EVERY room spatialRole enclosed or open-court. At most ONE real open-court. At least three enclosed rooms. An open court has a physical floor and open sky.',
 'Choose ONE faceted occupied wing via formIntent, selecting a face and 2-3 cell cornerInset. It is a real clipped footprint, not decoration. It must have enough width/depth.',
 'Choose a DIFFERENT enclosed room for the raised inhabited roof. Select ridge, shed or sawtooth. Sawtooth requires toothWidth between 3 and 8, and room span >= twice toothWidth.',
 'Every roof rise is 2..5 blocks. Keep room height + rise < site.height. Each room must fit and stay linked by actual 2-wide openings.',
 'Root entrySpaceId must have null parentId and side; all other spaces require a parentId and cardinal side. Do not attach a child south of the entry.',
 'If a non-tree direct shortcut is needed, set crossConnections to pairs of existing non-parent, non-child IDs. Such rooms MUST share a true wall for a 2-wide opening. Omit the property if not needed.',
 'Supply 1..5 exterior glazing openings in non-faceted, enclosed walls; offset>=2, offset+width<=wall span-2, baseY>=5, baseY+height<=room height-1.',
 'Prioritize use-specific real spaces and meaningful spatial form, NOT named decorative claims. Do not claim weatherproofing, engineering, Minecraft walking, beauty, or user approval.',
 'The host will reject impossible geometry, never resize your rooms or silently repair your authored source. This is NOT a building construction request.'
].join('\n');
/** Validation and compilation of untouched original text. Zero model calls. */
export function inspectR190ADReply(raw,reason='stop'){
 const report={schema:'minecraftaibuilder-r190ad-expressive-result-v1',
  contract:'semantic-space-expressive',status:'HOLD_INVALID_EXPRESSIVE_PROGRAM',
  originalRawSha256:H(raw),bytes:Buffer.byteLength(raw,'utf8'),
  formatSchemaSha256:R190AD_FORMAT_SHA256,exactModelRawUnmodified:true,
  modelAuthoredB143:false,hostDeterminesExactVoxels:true,
  hostSourceDerived:false,semanticPlanValid:false,real3D:false,
  independentJapaneseCoverage:'NOT_CERTIFIED',
  aestheticMerit:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  sourceRouteAudit:null,featureAudit:null,error:null,...safe()};
 if(reason!=='stop'){report.error='PROVIDER_NOT_CONFIRMED_COMPLETE';return {report,design:null,compiled:null,plan:null};}
 try{
  if(Buffer.byteLength(raw,'utf8')>120000)throw Error('ORIGINAL_TOO_LARGE');
  const plan=JSON.parse(raw);
  if(plan?.schema!==R190_SCHEMA)throw Error('WRONG_SEMANTIC_SCHEMA');
  if(!Array.isArray(plan.spaces)||plan.spaces.some(s=>!Object.hasOwn(s,'spatialRole')))
   throw Error('MISSING_MODEL_SELECTED_SPATIAL_ROLES');
  if(!Object.hasOwn(plan,'formIntent')||
     !Object.hasOwn(plan,'roofFormIntent')||
     !Array.isArray(plan.glazedOpenings)||plan.glazedOpenings.length<1)
   throw Error('MISSING_MODEL_SELECTED_ARCHITECTURE');
  if(plan.spaces.filter(s=>s.spatialRole==='enclosed').length<3)
   throw Error('NOT_ENOUGH_ENCLOSED_SPACES');
  const result=compileR190SemanticPlan(plan);
  if(!verifyCompiled(result.design,result.compiled))
   throw Error('HOST_DERIVED_B143_MISMATCH');
  const a=result.audit;
  if(!a?.allProgramSpacesReachable||a.witnesses?.length!==plan.spaces.length||
     !a.facetedEnvelope||!a.roofForm||a.glazedOpenings?.length<1||
     a.outdoorCourtCount!==plan.spaces.filter(s=>s.spatialRole==='open-court').length||
     a.nonTreePortalCount!==(plan.crossConnections?.length??0))
   throw Error('EXPRESSIVE_PHYSICAL_AUDIT_INCOMPLETE');
  report.semanticPlanValid=true;
  report.status='HOST_DERIVED_EXPRESSIVE_SOURCE_PROXIES_PASS_ART_HOLD';
  report.hostSourceDerived=true;report.real3D=true;
  report.planSha256=result.inputSha256;
  report.hostDerivedSourceSha256=result.compiled.sourceSha256;
  report.hostDerivedGeometrySha256=result.compiled.geometrySha256;
  report.hostDerivedVoxelCount=result.compiled.primitives.length;
  report.featureAudit={
   modelAuthoredFacetedWing:plan.formIntent.spaceId,
   trueFacetedMissingRoofCorners:a.facetedEnvelope.missingRoofCornerColumns,
   modelAuthoredRoofSpace:plan.roofFormIntent.spaceId,
   modelAuthoredRoofProfile:plan.roofFormIntent.profile,
   realProfileSliceCount:a.roofForm.roofSliceCount,
   exteriorGlassCells:a.realGlazingCells,
   realOpenSkyCourtColumns:a.verifiedOpenSkyColumns,
   optionalCrossPortals:a.nonTreePortalCount
  };
  report.sourceRouteAudit={allProgramSpacesReachable:true,
   reachableRoomCount:a.witnesses.length,sourceWalkingPads:a.sourceWalkingPads,
   actualMinecraftWalkingCertified:false};
  report.boundary={numberOfLevels:1,
   twoLevelOrVerticalRoutes:'NOT_SUPPORTED',
   climateAndTideProtection:'NOT_CERTIFIED',
   originalUseCaseCoverage:'NOT_CERTIFIED'};
  return {report,design:result.design,compiled:result.compiled,plan};
 }catch(e){report.error=String(e?.message??e).slice(0,180);
  return {report,design:null,compiled:null,plan:null};}
}
