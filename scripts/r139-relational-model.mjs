/**
 * R139 future LOCAL model reply boundary: one response jointly chooses
 * functional zones, furnished objects and their actual spatial relationship.
 * An added "relations" field is NEW model output; old saved R136 captures
 * have no such field and must never be labelled model-authored relations.
 */
import {validateR135SemanticObjects}
 from './r135-furnished-program.mjs';
import {compileR134MultiZonePlan,SCHEMA as R134_SCHEMA}
 from '../source/ai/r134-multi-zone-plan.mjs';
import {SCHEMA,deriveR139RelationalTopology}
 from '../source/ai/r139-room-relations.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
import {createHash} from 'node:crypto';
import {recoverR146RoofProfileAsMaterial}
 from '../source/ai/r146-roof-material-boundary.mjs';
import {deriveR149EnvelopeExpression,validateR151EnvelopeIntent,
 validateR152EnvelopeIntent}
 from '../source/ai/r149-architectural-expression.mjs';
import {deriveR150FurnitureArticulation}
 from '../source/ai/r150-furniture-articulation.mjs';
import {deriveR154VolumeComposition,validateR154VolumeIntent,R154_VOLUME_SCHEMA}
 from '../source/ai/r154-volume-composition.mjs';
import {deriveR155Roofline,validateR155RooflineIntent}
 from '../source/ai/r155-roofline.mjs';
import {validateR158SpatialBalanceIntent,toR155RoofIntent}
 from '../source/ai/r158-spatial-balance.mjs';
import {validateR159FloorplanIntent,toR155FromR159}
 from '../source/ai/r159-floorplan-intent.mjs';
import {deriveR160SideGalleryTopology}
 from '../source/ai/r160-side-gallery.mjs';
import {deriveR162RoomSectionMassing}
 from '../source/ai/r162-room-section-massing.mjs';
import {validateR160TopologyIntent,r160ToR151}
 from '../source/ai/r160-topology-intent.mjs';

const fail=x=>{throw Error('R139_MODEL_'+x);};
const only=(v,fields)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===fields.length&&fields.every(k=>Object.hasOwn(v,k));
const sha=x=>createHash('sha256').update(x).digest('hex');

// Re-export public API without importing any runtime parser into prompt builders.
export {RELATIONAL_INSTRUCTIONS} from './r139-relational-instructions.mjs';

export function parseR139RelationalFurnishedReply(raw,request,
 {allowRoofMaterialCorrection=false,allowArchitecturalExpression=false,
  allowArchitecturalMassing=false,allowVolumeComposition=false,
  allowRooflineComposition=false,allowSpatialBalanceComposition=false,
  allowFloorplanComposition=false,allowTopologyComposition=false}={}){
 if(typeof raw!=='string'||raw.length<20||raw.length>22000)
  fail('MISSING_OR_OVERSIZED_MODEL_REPLY');
 let reply;
 try{reply=JSON.parse(raw);}catch{fail('NOT_JSON');}
 const keys=['id','title','footprint','materials','layout','form',
  'objects','relations'];
 const expressive=allowArchitecturalExpression===true||
  allowArchitecturalMassing===true||allowVolumeComposition===true||
  allowRooflineComposition===true||allowSpatialBalanceComposition===true||
  allowFloorplanComposition===true||allowTopologyComposition===true;
 if(!only(reply,expressive?[...keys,'architecture']:keys)||
  !only(reply.relations,['entryFacingZoneId','directAdjacencies']))
  fail('FULL_REPLY_CONTRACT');
 if(allowTopologyComposition)validateR160TopologyIntent(reply.architecture);
 else if(allowFloorplanComposition)validateR159FloorplanIntent(reply.architecture);
 else if(allowSpatialBalanceComposition)validateR158SpatialBalanceIntent(reply.architecture);
 else if(allowRooflineComposition)validateR155RooflineIntent(reply.architecture);
 else if(allowVolumeComposition)validateR154VolumeIntent(reply.architecture);
 else if(allowArchitecturalMassing)validateR152EnvelopeIntent(reply.architecture);
 else if(expressive)validateR151EnvelopeIntent(reply.architecture);
 const repaired=allowRoofMaterialCorrection?
  recoverR146RoofProfileAsMaterial(raw,reply):{
   derivedReply:structuredClone(reply),evidence:{
    schema:'r146-exact-roof-material-boundary-v1',
    rawSha256:sha(raw),originalRawPreserved:true,
    hostRepairRequired:false,repairActions:[],modelCalls:0,worldWrites:0
   }
  };
 const {relations,architecture,...originalReply}=repaired.derivedReply;
 // Validate semantic room program FIRST, without furnishing the obsolete
 // strip. A valid spatial graph can have more usable equipment clearance
 // than a narrow linear strip; premature strip fitting gave false HOLDs.
 const {objects,...programReply}=originalReply;
 if(!only(programReply,['id','title','footprint','materials','layout','form'])||
  !request?.site||!programReply.footprint||
  programReply.footprint.width>request.site.maxWidth||
  programReply.footprint.depth>request.site.maxDepth)
  fail('PROGRAM_OR_SITE_CONTRACT');
 const base=compileR134MultiZonePlan({
  schema:R134_SCHEMA,...programReply,brief:request.naturalLanguageBrief
 });
 const semantics=validateR135SemanticObjects(objects,
  base.program[0].zones.map(z=>z.id));
 const semanticIntent={
  schema:SCHEMA,basePlanSha256:base.planSha256,
  entryFacingZoneId:relations.entryFacingZoneId,
  directAdjacencies:relations.directAdjacencies
 };
 const relational=allowTopologyComposition&&
  architecture.spatialTopology!=='central-spine'?
  deriveR160SideGalleryTopology(base,semanticIntent,{
   gallerySide:architecture.spatialTopology}):
  deriveR139RelationalTopology(base,semanticIntent,{
   spatialBalance:(allowSpatialBalanceComposition||allowFloorplanComposition)?
    architecture.spatialBalance:'balanced',
   depthBalance:allowFloorplanComposition?architecture.depthBalance:'balanced'
  });
 const featured=applyR125FeatureIntent({base:relational,intent:{
  schema:ASSEMBLED_SCHEMA,basePlanSha256:relational.planSha256,
  objects:semantics.objects.map(x=>({...x,detail:'assembled'}))
 }});
 if(featured.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !featured.everyFeatureSourceAccessible)
  fail('FURNISHED_SOURCE_ROUTES');
 const architectural=expressive?(()=>{
  const envelope=deriveR149EnvelopeExpression(featured,{
   plan:relational.plan,expressionIntent:
    (allowVolumeComposition||allowRooflineComposition||allowSpatialBalanceComposition||allowFloorplanComposition)?{
    schema:'minecraftaibuilder-r151-envelope-intent-v1',
    entryHierarchy:architecture.entryHierarchy,
    daylightStrategy:architecture.daylightStrategy,
    roofEdge:architecture.roofEdge
   }:allowTopologyComposition?r160ToR151(architecture):architecture});
  const volume=(allowVolumeComposition||allowRooflineComposition||allowSpatialBalanceComposition||allowFloorplanComposition)?
   deriveR154VolumeComposition(envelope,{intent:(allowRooflineComposition||allowSpatialBalanceComposition||allowFloorplanComposition)?{
    schema:R154_VOLUME_SCHEMA,
    entryHierarchy:architecture.entryHierarchy,
    daylightStrategy:architecture.daylightStrategy,
    roofEdge:architecture.roofEdge,
    volumeHierarchy:architecture.volumeHierarchy,
    arrivalSpace:architecture.arrivalSpace
   }:architecture,authorship:'CALLER_ARCHITECTURE_IR_NOT_AUTHENTICATED'
   }):null;
  const roofline=(allowRooflineComposition||allowSpatialBalanceComposition||allowFloorplanComposition)?
   deriveR155Roofline(volume,{
    intent:allowFloorplanComposition?toR155FromR159(architecture):
     allowSpatialBalanceComposition?toR155RoofIntent(architecture):architecture,
    authorship:'CALLER_ARCHITECTURE_IR_NOT_AUTHENTICATED'
   }):null;
  const integrated=allowTopologyComposition?
   deriveR162RoomSectionMassing(envelope,{
    topologyIntent:architecture.spatialTopology}):null;
  const completed=deriveR150FurnitureArticulation(
   integrated??roofline??volume??envelope);
  return {intent:structuredClone(architecture),envelope,volume,roofline,
   integrated,completed,
   intentAuthorship:'IN_THIS_SAME_MODEL_REPLY_NOT_HOST_INFERRED',
   geometryAuthorship:'HOST_DERIVED_FROM_BOUNDED_MODEL_SEMANTIC_IR',
   aestheticApproval:'NOT_REVIEWED'};
 })():null;
 return {
  schema:'r139-one-reply-room-graph-and-furniture-v1',
  originalRawSha256:sha(raw),sourceModelReplyRaw:raw,
  modelReplyAuthenticity:'CALLER_PROVIDED_UNVERIFIED',
  authoredFields:expressive?['layout.spaces','objects','relations','architecture']:
   ['layout.spaces','objects','relations'],
  architectural,
  derivedModelReply:repaired.derivedReply,
  boundedHostRepairRequired:repaired.evidence.hostRepairRequired,
  hostRepairActions:repaired.evidence.repairActions,
  roofMaterialBoundaryEvidence:repaired.evidence,
  semanticIntent,
  originalSequentialBase:base,
  relationalBase:relational,featured,
  derivedSourceSha256:featured.sourceSha256,
  derivedGeometrySha256:featured.geometrySha256,
  modelCallsDuringParsing:0,
  legacyStripFurnitureNotRequired:true,
  semanticEquipmentZoneCount:semantics.physicallyRepresentedZoneCount,
  hostGeneratedGeometry:true,
  aestheticStatus:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldWrites:0,worldContacts:0
 };
}
