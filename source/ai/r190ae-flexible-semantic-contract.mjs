/** R190-AE optional semantic architecture: opt-in Qwen choices, not host templates.
 * R190-AB/AD schemas and their original hashes remain immutable.
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
export const R190AE_FORMAT=obj({
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
 'materials']);
export const R190AE_FORMAT_SHA256=H(JSON.stringify(R190AE_FORMAT));
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
export const R190AE_GUIDANCE=[
 'Design an original architectural plan for the EXACT Japanese request, not a pre-selected building template. JSON semantic spaces only, no block coordinates or world commands.',
 'This pilot is SINGLE-LEVEL research only. Do not claim to solve stairs, hillside supports, climate engineering, tide proofing, Minecraft walking, or actual construction.',
 'Choose 3 to 6 functional spaces, their dimensions, privacy, and relations. Each must have an explicit spatialRole enclosed or open-court.',
 'Choose the site dimensions FIRST: width/depth 24..80 and height 10..32. Then choose each room height <= site.height - 2. Every room width/depth 7..22.',
 'A roofFormIntent is OPTIONAL: only choose ridge, shed or sawtooth when relevant. If selected, room.height + roof rise must be STRICTLY LESS than site.height.',
 'A formIntent is OPTIONAL: choose a faceted enclosed wing only when this shape matters. A faceted room cannot also receive roofFormIntent or glazing.',
 'An open-court is OPTIONAL (at most one). Never put windows, a roof section or faceted enclosed envelope on an open-court. The remaining rooms must be enclosed.',
 'glazedOpenings is OPTIONAL and must be omitted when not selected. Windows must be on real exterior walls; keep them out of any entry doorway and shared wall.',
 'crossConnections is OPTIONAL and must be omitted when not selected. The parentId relationship ALREADY makes a direct link. Never duplicate tree edges.',
 'The entry root needs parentId:null and side:null. Other rooms need valid parent IDs and cardinal sides. Never attach a direct child south of the root because it needs an outside approach.',
 'Plan the entire north/south/east/west footprint including shared-wall overlaps, the exterior approach, and a one-cell perimeter. Do not make the solver guess impossible site constraints.',
 'Choose features based on the FUNCTIONAL Japanese requirement, not for a checklist. A plain box may compile but still FAIL quality or brief coverage.',
 'The host does only deterministic source geometry, validates voxels and source routes, and never silently changes your dimensions or selected features. No art, weather or construction claims.'
].join('\n');
/** Validation and compilation of untouched original text. Zero model calls. */
export function inspectR190AEReply(raw,reason='stop'){
 const report={schema:'minecraftaibuilder-r190ae-flexible-result-v1',
  contract:'semantic-space-flexible',status:'HOLD_INVALID_FLEXIBLE_PROGRAM',
  originalRawSha256:H(raw),bytes:Buffer.byteLength(raw,'utf8'),
  formatSchemaSha256:R190AE_FORMAT_SHA256,exactModelRawUnmodified:true,
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
  // Absence of a feature is itself an authored decision, not a host fix.
  // Optional fields must never be silently populated after model output.
  if(plan.glazedOpenings!==undefined&&
     (!Array.isArray(plan.glazedOpenings)||plan.glazedOpenings.length>5))
   throw Error('INVALID_OPTIONAL_GLAZING');
  if(plan.crossConnections!==undefined&&
     (!Array.isArray(plan.crossConnections)||plan.crossConnections.length>3))
   throw Error('INVALID_OPTIONAL_CROSS_LINKS');
  const result=compileR190SemanticPlan(plan);
  if(!verifyCompiled(result.design,result.compiled))
   throw Error('HOST_DERIVED_B143_MISMATCH');
  const a=result.audit;
  if(!a?.allProgramSpacesReachable||a.witnesses?.length!==plan.spaces.length||
     Boolean(a.facetedEnvelope)!==Object.hasOwn(plan,'formIntent')||
     Boolean(a.roofForm)!==Object.hasOwn(plan,'roofFormIntent')||
     a.glazedOpenings?.length!==(plan.glazedOpenings?.length??0)||
     a.outdoorCourtCount!==plan.spaces.filter(s=>s.spatialRole==='open-court').length||
     a.nonTreePortalCount!==(plan.crossConnections?.length??0))
   throw Error('FLEXIBLE_PHYSICAL_AUDIT_INCOMPLETE');
  report.semanticPlanValid=true;
  report.status='HOST_DERIVED_FLEXIBLE_SOURCE_PROXIES_PASS_ART_HOLD';
  report.hostSourceDerived=true;report.real3D=true;
  report.planSha256=result.inputSha256;
  report.hostDerivedSourceSha256=result.compiled.sourceSha256;
  report.hostDerivedGeometrySha256=result.compiled.geometrySha256;
  report.hostDerivedVoxelCount=result.compiled.primitives.length;
  report.featureAudit={
   modelAuthoredFacetedWing:plan.formIntent?.spaceId??null,
   trueFacetedMissingRoofCorners:a.facetedEnvelope?.missingRoofCornerColumns??0,
   modelAuthoredRoofSpace:plan.roofFormIntent?.spaceId??null,
   modelAuthoredRoofProfile:plan.roofFormIntent?.profile??null,
   realProfileSliceCount:a.roofForm?.roofSliceCount??0,
   exteriorGlassCells:a.realGlazingCells,
   realOpenSkyCourtColumns:a.verifiedOpenSkyColumns,
   optionalCrossPortals:a.nonTreePortalCount,
   selectedFeatureFields:{
    formIntent:Object.hasOwn(plan,'formIntent'),
    roofFormIntent:Object.hasOwn(plan,'roofFormIntent'),
    glazingCount:plan.glazedOpenings?.length??0,
    crossConnectionCount:plan.crossConnections?.length??0,
    openCourtCount:plan.spaces.filter(s=>s.spatialRole==='open-court').length
   },
   omittedFeaturesNotGeneratedByHost:true,
   independentUseCaseCoverage:'NOT_CERTIFIED',
   architectureQuality:'ART_HOLD'
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
