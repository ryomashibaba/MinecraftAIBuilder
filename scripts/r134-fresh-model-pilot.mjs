/**
 * R134 genuinely NEW compact program from one local 2B-class model response.
 * Not a derivative of the frozen Qwen fixture; no genre template routing.
 * Source-only review, no Minecraft writes, no paid or remote API.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {compileR134MultiZonePlan,SCHEMA}
 from '../source/ai/r134-multi-zone-plan.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {parseR135FreshFurnishedReply} from './r135-furnished-program.mjs';
import {recoverR137Furnished} from './r137-bounded-recovery.mjs';
import {RELATIONAL_INSTRUCTIONS}
 from './r139-relational-instructions.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const fail=s=>{throw Error('R134_MODEL_'+s);};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const range=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const text=s=>typeof s==='string'&&s.length>=12&&s.length<=800&&
 !/[\u0000-\u001f<>]/.test(s);
const write=(dir,name,v)=>fs.writeFileSync(path.join(dir,name),
 typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const SYSTEM=[
 'You are an architect. Independently invent a small NEW multi-room building.',
 'Return ONLY JSON with EXACT keys: id,title,footprint,materials,layout,form.',
 'id and every space id: lowercase slug with letters, numbers or hyphens.',
 'title: readable building name with at least 3 characters.',
 'footprint EXACT width and depth, whole numbers between 18 and site limits.',
 'materials EXACT floor,wall,roof. floor wood/stone/concrete.',
 'wall and roof wood/stone/concrete/metal.',
 'Important: materials.roof MUST be a material such as metal, NEVER sawtooth/ridge/flat.',
 'form.roofProfile is a shape (flat/ridge/sawtooth), and is NOT materials.roof.',
 'layout EXACT axis and spaces. axis x=west-east, z=entrance-front-to-rear.',
 'spaces must have 3 or 4 distinct rooms; each EXACT id,purpose,weight.',
 'Every purpose is a meaningful description of 3-180 characters.',
 'weight is relative allocation weight 1 to 4; no voxel coordinates.',
 'For 4 zones on the layout axis, footprint along that axis MUST be >=23.',
 'For 3 zones on the layout axis, footprint along that axis MUST be >=18.',
 'form EXACT roofProfile and facadeLanguage.',
 'roofProfile flat/ridge/sawtooth; facadeLanguage plain/fins/screen.',
 'Design spatial relationships, meaningful uses and size priorities yourself.',
 'Avoid hardcoded house, shop, library category templates.',
 'The host builds exact solids, supported floors, doors and continuous paths.',
 'Do not output any code, Minecraft commands, extra keys or approval claims.'
].join('\n');
const FURNISHED_SYSTEM=[
 'In addition to the architecture keys, output EXACTLY one more key: objects.',
 'objects MUST be 3-8 records, one or more for EVERY functional room.',
 'Every object has EXACTLY id,zoneId,role,corner. zoneId matches a space id.',
 'Select roles from work-surface, equipment-bank, display-stand, storage-rack, seating.',
 'Select corner from near-left, near-right, far-left, far-right.',
 'Do not invent coordinates, materials for equipment, or Minecraft commands.',
 'Choose equipment based on room activity; preserve clear physical walkways.',
 'The host makes real assembled furniture and rejects unreachable rooms.'
].join('\n');
// Graph mode is an OPT-IN new model instruction, not an inferred
// attribute of any archived raw reply.  A small IR, not model coordinates.
const RELATIONAL_SYSTEM=SYSTEM.replace(
 'Return ONLY JSON with EXACT keys: id,title,footprint,materials,layout,form.',
 'Return ONLY JSON with EXACT keys: id,title,footprint,materials,layout,form,objects,relations.'
).replace('For 4 zones on the layout axis, footprint along that axis MUST be >=23.',
 'For 4 zones use layout axis z and a footprint at least 24 by 24.'
).replace('For 3 zones on the layout axis, footprint along that axis MUST be >=18.',
 'For 3 zones use layout axis z and a footprint at least 24 by 24.')+
 '\n'+FURNISHED_SYSTEM.replace(
 'In addition to the architecture keys, output EXACTLY one more key: objects.',
 'The objects key is required.'
 )+'\n'+RELATIONAL_INSTRUCTIONS.replace(
 'Also output exactly one extra top-level key: relations.',
 'The relations key is required.'
 );
// This is OPT-IN. Existing archived eight-key Qwen replies and the
// default one-response graph parser remain byte-for-byte compatible.
const R151_SYSTEM=RELATIONAL_SYSTEM.replace(
 'Return ONLY JSON with EXACT keys: id,title,footprint,materials,layout,form,objects,relations.',
 'Return ONLY JSON with EXACT keys: id,title,footprint,materials,layout,form,objects,relations,architecture.'
)+'\n'+[
 'architecture is exactly one small object with schema,entryHierarchy,daylightStrategy,roofEdge.',
 'architecture.schema must be minecraftaibuilder-r151-envelope-intent-v1.',
 'entryHierarchy quiet or emphasized; daylightStrategy even or focused;',
 'roofEdge fine or parapet. Choose by the purpose and spatial program,',
 'not by a building-category template. Do not emit coordinates.',
 'A failed or infeasible choice is a HOLD; the host never silently replaces it.'
].join('\n');
const R152_SYSTEM=R151_SYSTEM.replace(
 'architecture is exactly one small object with schema,entryHierarchy,daylightStrategy,roofEdge.',
 'architecture is exactly one small object with schema,entryHierarchy,daylightStrategy,roofEdge,section.'
).replace('minecraftaibuilder-r151-envelope-intent-v1',
 'minecraftaibuilder-r152-envelope-intent-v1')+'\n'+[
 'section MUST be continuous or raised-entry.',
 'raised-entry means an actual higher ceiling and roof over the model-selected entry room,',
 'not a decorative false upper floor or building-specific template.',
 'Select by building use and desired section. The host rejects invalid geometry.'
].join('\n');
// R154 extends semantic architecture by 2 choices; it still requests ONE
// genuine local model response and never serializes voxel coordinates.
const R154_SYSTEM=R151_SYSTEM.replace(
 'architecture is exactly one small object with schema,entryHierarchy,daylightStrategy,roofEdge.',
 'architecture is exactly one small object with schema,entryHierarchy,daylightStrategy,roofEdge,volumeHierarchy,arrivalSpace.'
).replace('minecraftaibuilder-r151-envelope-intent-v1',
 'minecraftaibuilder-r154-volume-ir-v1')+'\n'+[
 'volumeHierarchy is single or paired: one selected entry room wing or two',
 'different-height REAL room roof sections of opposing wings.',
 'arrivalSpace is flush or covered: covered means a supported 1-cell',
 'entrance threshold portico inside the existing building site bounds.',
 'Do not invent Minecraft commands, positions, room IDs or any extra field.',
 'Select independently of the project genre and building title.',
 'If this choice cannot fit, the compiler returns HOLD, not silent fallback.'
].join('\n');
const R155_SYSTEM=R154_SYSTEM.replace(
 'architecture is exactly one small object with schema,entryHierarchy,daylightStrategy,roofEdge,volumeHierarchy,arrivalSpace.',
 'architecture is exactly one small object with schema,entryHierarchy,daylightStrategy,roofEdge,volumeHierarchy,arrivalSpace,roofSilhouette.'
).replace('minecraftaibuilder-r154-volume-ir-v1',
 'minecraftaibuilder-r155-roofline-ir-v1')+'\n'+[
 'roofSilhouette MUST be ridge or shed.',
 'ridge means two pitched roof facets meeting above the room; shed a one-sided pitch.',
 'The host removes the flat upper caps and compiles REAL stepped roof surfaces.',
 'Preserve all functional room locations and equipment choices.',
 'Never emit voxel coordinates, extra fields, or unverifiable building categories.'
].join('\n');
const R158_SYSTEM=R155_SYSTEM.replace(
 'roofEdge,volumeHierarchy,arrivalSpace,roofSilhouette.',
 'roofEdge,volumeHierarchy,arrivalSpace,roofSilhouette,spatialBalance.'
).replace('minecraftaibuilder-r155-roofline-ir-v1',
 'minecraftaibuilder-r158-spatial-balance-ir-v1')+'\n'+[
 'spatialBalance MUST be balanced, left-wide or right-wide.',
 'This choice actually moves the common spine and changes inhabited room widths.',
 'left-wide makes left rooms wider; right-wide makes right rooms wider.',
 'Nonbalanced choices need footprint width 28 to 32 inclusive.',
 'The host returns HOLD if a chosen layout cannot fit; no automatic fallback.'
].join('\n');
const R159_SYSTEM=R158_SYSTEM.replace(
 'roofSilhouette,spatialBalance.',
 'roofSilhouette,spatialBalance,depthBalance.'
).replace('minecraftaibuilder-r158-spatial-balance-ir-v1',
 'minecraftaibuilder-r159-floorplan-ir-v1')+'\n'+[
 'depthBalance MUST be balanced, front-deep or rear-deep.',
 'front-deep provides more real floor area to front-side rooms.',
 'rear-deep provides more real floor area to rear-side rooms.',
 'Choose spatialBalance and depthBalance for functional room priorities.',
 'These choices move real B143 internal partition walls and connecting doorways.',
 'Do not emit voxel coordinates; infeasible room sizes return HOLD.'
].join('\n');
const R160_SYSTEM=R151_SYSTEM.replace(
 'schema,entryHierarchy,daylightStrategy,roofEdge.',
 'schema,entryHierarchy,daylightStrategy,roofEdge,spatialTopology.'
).replace('minecraftaibuilder-r151-envelope-intent-v1',
 'minecraftaibuilder-r160-topology-ir-v1')+'\n'+[
 'spatialTopology MUST be central-spine, west-gallery or east-gallery.',
 'A side gallery is a REAL shared corridor along one exterior side, not a center spine.',
 'When spatialTopology is west-gallery/east-gallery, layout.spaces MUST contain EXACTLY 3 rooms.',
 'For side galleries choose EXACTLY ONE directAdjacencies pair of room ids.',
 'A 4-room layout MUST choose central-spine; no silently dropped fourth room.',
 'layout.axis MUST be the SINGLE STRING "z" (not an object, not the layoutAxisMeaning legend).',
 'The meaning legend describes coordinate directions; copy NEITHER its keys nor its object into layout.axis.',
 'The host compiles real B143 walls, doors and circulation without model voxel coordinates.',
 'Host compiler derives actual usable tall rooms and stepped roofs from the room weights and locations.',
 'Upper exterior-facing room walls receive genuine glazed clerestory daylight; enclosed walls do not.',
 'Do not request roof silhouette, volumeHierarchy, spatialBalance or depthBalance.',
 'Make topology selection from functional room needs, not building genre labels.',
 'Unrealizable layouts return HOLD, never silent fallback.'
].join('\n');
export function makeR134FreshRequest({brief,siteWidth=32,siteDepth=32}={}){



 if(!text(brief)||!range(siteWidth,18,32)||!range(siteDepth,18,32))
  fail('BRIEF_OR_SITE');
 return {naturalLanguageBrief:brief,site:{maxWidth:siteWidth,maxDepth:siteDepth},
  requiredDistinctFunctionalZones:{minimum:3,maximum:4},
  layoutAxisMeaning:{x:'west-to-east',z:'entrance-front-to-rear'},
  goal:'Make a genuinely original small functional building, not renamed rooms'};
}
export function parseR134FreshModelReply(raw,request){
 if(typeof raw!=='string'||raw.length<20||raw.length>22000)
  fail('RAW_MISSING_OR_OVERSIZE');
 let p;
 try{p=JSON.parse(raw);}catch{fail('RAW_NOT_JSON');}
 if(!exact(p,['id','title','footprint','materials','layout','form']))
  fail('MODEL_FIELDS');
 const plan={schema:SCHEMA,id:p.id,title:p.title,
  brief:request.naturalLanguageBrief,
  footprint:p.footprint,materials:p.materials,layout:p.layout,form:p.form};
 if(!plan.footprint||plan.footprint.width>request.site.maxWidth||
  plan.footprint.depth>request.site.maxDepth)
  fail('FOOTPRINT_EXCEEDS_SITE');
 // Both validation and REAL 3D run through the shared B143 compiler;
 // a plausible JSON string or room label alone cannot pass.
 return compileR134MultiZonePlan(plan);
}
export function parseR134FreshArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const allowed=new Set(['--model','--brief','--out','--site-width',
  '--site-depth','--endpoint','--equipment','--recovery','--topology',
  '--architecture']);
 const args={};
 for(let i=0;i<argv.length;i+=2){
  const name=argv[i],value=argv[i+1];
  if(!allowed.has(name)||Object.hasOwn(args,name)||!value||
   value.startsWith('--'))fail('CLI_'+name);
  args[name]=value;
 }
 const endpoint=args['--endpoint']??
  'http://127.0.0.1:11434/v1/chat/completions',port=ENDPOINT.exec(endpoint);
 if(!MODEL.test(args['--model']??'')||!args['--out']||
  !port||!range(Number(port[1]),1,65535))fail('CLI_LOCAL_MODEL_REQUIRED');
 const siteWidth=args['--site-width']?Number(args['--site-width']):32,
  siteDepth=args['--site-depth']?Number(args['--site-depth']):32;
 makeR134FreshRequest({brief:args['--brief'],siteWidth,siteDepth});
 const recoveryMode=args['--recovery']??'none';
 if(!['none','bounded','roof-material-only'].includes(recoveryMode))fail('INVALID_RECOVERY_MODE');
 const equipmentMode=args['--equipment']??'none';
 if(!['none','assembled'].includes(equipmentMode))fail('INVALID_EQUIPMENT_MODE');
 const topologyMode=args['--topology']??'linear';
 const architectureMode=args['--architecture']??'none';
 if(!['none','intent','massing','volumes','roofline','spatial','floorplan','topology'].includes(architectureMode)||
  (architectureMode!=='none'&&topologyMode!=='graph'))
  fail('ARCHITECTURE_REQUIRES_GRAPH_TOPOLOGY');
 if(!['linear','graph'].includes(topologyMode)||
  (topologyMode==='graph'&&(equipmentMode!=='assembled'||
   !['none','roof-material-only'].includes(recoveryMode)||
   siteWidth<24||siteDepth<24))||
  (recoveryMode==='roof-material-only'&&topologyMode!=='graph'))
  fail('GRAPH_REQUIRES_ASSEMBLED_NO_RECOVERY_AND_SITE_24');
 return {model:args['--model'],brief:args['--brief'],equipmentMode,recoveryMode,topologyMode,
  architectureMode,outDir:path.resolve(args['--out']),siteWidth,siteDepth,endpoint};
}
export async function runR134FreshModel({
 model,brief,outDir,siteWidth=32,siteDepth=32,equipmentMode='none',recoveryMode='none',topologyMode='linear',
 architectureMode='none',
 endpoint='http://127.0.0.1:11434/v1/chat/completions'
}={}, {fetcher=fetch,timeoutMs=120000}={}){
 const p=ENDPOINT.exec(endpoint??'');
 if(!['none','intent','massing','volumes','roofline','spatial','floorplan','topology'].includes(architectureMode)||
  (architectureMode!=='none'&&topologyMode!=='graph')||
  !['none','bounded','roof-material-only'].includes(recoveryMode)||
  (recoveryMode==='bounded'&&equipmentMode!=='assembled')||
  !['none','assembled'].includes(equipmentMode)||
  !['linear','graph'].includes(topologyMode)||
  (topologyMode==='graph'&&(equipmentMode!=='assembled'||
   !['none','roof-material-only'].includes(recoveryMode)||
   siteWidth<24||siteDepth<24))||
  (recoveryMode==='roof-material-only'&&topologyMode!=='graph')||
  !MODEL.test(model??'')||!p||!range(Number(p[1]),1,65535)||
  typeof outDir!=='string'||!outDir.trim()||
  typeof fetcher!=='function'||!range(timeoutMs,1000,300000))
  fail('INVALID_MODEL_OR_ENDPOINT');
 const request=makeR134FreshRequest({brief,siteWidth,siteDepth});
 if(fs.existsSync(outDir))fail('OUTPUT_ALREADY_EXISTS');
 const dir=path.resolve(outDir),injected=fetcher!==fetch,start=Date.now();
 const sourceRequest=equipmentMode==='assembled'?{...request,
  semanticEquipment:{perRoomAtLeastOne:true,maxObjects:8,
   allowedRoles:['work-surface','equipment-bank','display-stand',
    'storage-rack','seating']}}:request;
 const maxTokens=architectureMode==='topology'?2200:
  architectureMode==='floorplan'?2800:
  architectureMode==='spatial'?2600:
  architectureMode==='roofline'?2400:
  architectureMode==='volumes'?2300:
  architectureMode==='massing'?2050:
  architectureMode==='intent'?1900:
  topologyMode==='graph'?1750:
  equipmentMode==='assembled'?1450:900;
 fs.mkdirSync(dir,{recursive:false});
 const report={
  schema:'r134-fresh-one-model-to-real-multizone-v1',
  status:'HOLD_NOT_STARTED',model,modelCalls:0,
  testInjectionPresent:injected,
  originalModelResponseCaptured:false,equipmentMode,recoveryMode,topologyMode,
  architectureMode,architectureIntentFromModel:false,architecture3DSourceOnly:false,
  relationalIntentFromModel:false,realRoomGraph3D:false,
  boundedHostRepairRequired:false,hostRepairActions:[],
  equipmentCount:0,addedEquipmentVoxels:0,
  eachRoomHasModelChosenEquipment:false,
  modelProvenance:injected?'TEST_DOUBLE':'LOCAL_RESPONSE_NOT_AUTHENTICATED',
  modelAuthoredProgram:false,
  newRealB143Source:false,sourceSha256:null,geometrySha256:null,
  voxels:null,zoneCount:null,sourceRoutes:'NOT_CHECKED',
  inGameWalking:'NOT_TESTED',artReview:'NOT_REVIEWED',
  readiness:'NOT_PREPARED',worldWrites:0,worldContacts:0,
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 write(dir,'MODEL_REQUEST_NO_HIDDEN_GOALS.json',{model,endpoint,
  request:sourceRequest,maxTokens,protocol:'ONE_LOCAL_RESPONSE_NO_RETRY'});
 try{
  const p=await preflightR125Ollama({model,endpoint,fetcher});
  if(p.status!=='LOCAL_MODEL_LISTED'){
   report.status='HOLD_MODEL_NOT_INSTALLED';return report;
  }
  const controller=new AbortController(),timer=setTimeout(()=>
   controller.abort(),timeoutMs);
  try{
   report.modelCalls=1;
   const response=await fetcher(endpoint,{method:'POST',redirect:'error',
    signal:controller.signal,headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.65,
     max_tokens:maxTokens,reasoning_effort:'none',
     response_format:{type:'json_object'},messages:[
      {role:'system',content:architectureMode==='topology'?R160_SYSTEM:
       architectureMode==='floorplan'?R159_SYSTEM:
       architectureMode==='spatial'?R158_SYSTEM:
       architectureMode==='roofline'?R155_SYSTEM:
       architectureMode==='volumes'?R154_SYSTEM:
       architectureMode==='massing'?R152_SYSTEM:
       architectureMode==='intent'?R151_SYSTEM:
       topologyMode==='graph'?RELATIONAL_SYSTEM:
       equipmentMode==='assembled'?SYSTEM+'\n'+FURNISHED_SYSTEM:SYSTEM},
      {role:'user',content:JSON.stringify(sourceRequest)}]})});
   if(!response||response.ok!==true)
    fail('MODEL_HTTP_'+String(response?.status??'UNKNOWN'));
   const http=await response.text();
   if(http.length>100000)fail('RESPONSE_OVERSIZE');
   let reply;
   try{reply=JSON.parse(http);}catch{fail('RESPONSE_INVALID_JSON');}
   if(reply?.choices?.length!==1||
    reply.choices[0]?.finish_reason==='length')fail('INCOMPLETE_OUTPUT');
   const raw=reply.choices[0]?.message?.content;
   if(typeof raw!=='string'||raw.length<20||raw.length>22000)
    fail('NO_MODEL_CONTENT');
   write(dir,'MODEL_RAW_ORIGINAL.txt',raw);
   report.originalModelResponseCaptured=true;
   const recovered=recoveryMode==='bounded'?
    recoverR137Furnished({raw,request,build:parseR135FreshFurnishedReply}):null;
   // Dynamic parser loading prevents the model PROMPT from constructing
   // a static R134 -> R139 -> R135 -> R134 initialization cycle.
   // This import reads only local code; it neither invokes the model again
   // nor changes the original response or any Minecraft safety gate.
   const relationalParser=topologyMode==='graph'?
    (await import('./r139-relational-model.mjs')).parseR139RelationalFurnishedReply:null;
   const composed=topologyMode==='graph'?
    relationalParser(raw,request,{
     allowRoofMaterialCorrection:recoveryMode==='roof-material-only',
     allowArchitecturalExpression:architectureMode==='intent',
     allowArchitecturalMassing:architectureMode==='massing',
     allowVolumeComposition:architectureMode==='volumes',
     allowRooflineComposition:architectureMode==='roofline',
     allowSpatialBalanceComposition:architectureMode==='spatial',
     allowFloorplanComposition:architectureMode==='floorplan',
     allowTopologyComposition:architectureMode==='topology'
    }):
    recovered?.result??(equipmentMode==='assembled'?
     parseR135FreshFurnishedReply(raw,request):null);
   if(composed?.roofMaterialBoundaryEvidence){
    write(dir,'R146_ROOF_MATERIAL_BOUNDARY_EVIDENCE.json',
     composed.roofMaterialBoundaryEvidence);
    if(composed.boundedHostRepairRequired){
     write(dir,'R146_DERIVED_MODEL_REPLY_NOT_ORIGINAL.json',
      composed.derivedModelReply);
     report.boundedHostRepairRequired=true;
     report.hostRepairActions=composed.hostRepairActions;
    }
   }
   if(recovered){
    write(dir,'R137_BOUNDED_RECOVERY_EVIDENCE.json',recovered.evidence);
    write(dir,'R137_DERIVED_MODEL_IR_NOT_ORIGINAL.json',recovered.derivedReply);
    report.boundedHostRepairRequired=recovered.evidence.boundedHostRepairRequired;
    report.hostRepairActions=recovered.evidence.repairActions;
   }
   const base=composed?.originalSequentialBase??composed?.base??
    parseR134FreshModelReply(raw,request);
   const result=composed?.architectural?.completed??composed?.featured??base;
   write(dir,'MODEL_PROGRAM_IR.json',base.plan);
   if(composed){
    write(dir,'MODEL_CHOSEN_FUNCTIONAL_EQUIPMENT.json',
     composed.objectRolesChosenByModel??
      composed.featured.featurePlan.objects.map(
       ({id,zoneId,role,corner})=>({id,zoneId,role,corner})));
    write(dir,'ASSEMBLED_FEATURE_INTENT.json',
     composed.intent??composed.featured.featurePlan);
    if(topologyMode==='graph'){
     write(dir,'R139_MODEL_SPATIAL_RELATIONS.json',composed.semanticIntent);
     if(composed.architectural){
      const archTag=architectureMode==='topology'?'R160':
       architectureMode==='floorplan'?'R159':
       architectureMode==='spatial'?'R158':
       architectureMode==='roofline'?'R155':
       architectureMode==='volumes'?'R154':
       architectureMode==='massing'?'R152':'R151';
      write(dir,archTag+'_MODEL_ARCHITECTURE_IR.json',
       composed.architectural.intent);
      write(dir,archTag+'_HOST_EXTERIOR_B143_SOURCE.json',
       composed.architectural.envelope.design);
      write(dir,archTag+'_HOST_ARCHITECTURE_EVIDENCE.json',{
       originalRawSha256:composed.originalRawSha256,
       intentAuthorship:composed.architectural.intentAuthorship,
       geometryAuthorship:composed.architectural.geometryAuthorship,
       architecturalSourceSha256:result.sourceSha256,
       volumeProof:composed.architectural.volume?.r154VolumeEvidence??null,
       rooflineProof:composed.architectural.roofline?.r155RooflineEvidence??null,
       spatialBalanceProof:composed.relationalBase?.r158SpatialBalanceEvidence??null,
       depthBalanceProof:composed.relationalBase?.r159DepthBalanceEvidence??null,
       independentSideGalleryProof:composed.relationalBase?.r160TopologyEvidence??null,
       realUsableRoomSectionProof:composed.architectural?.integrated?.r162RoomSectionEvidence??null,
       actualExteriorClerestoryProof:composed.architectural?.completed?.r163DaylightAndRoofEvidence??null,
       humanArtReview:'NOT_REVIEWED',
       minecraftWalking:'NOT_TESTED',worldWrites:0});
     }
     write(dir,'R139_HOST_GRAPH_B143_SOURCE.json',
      composed.relationalBase.design);
     write(dir,'R139_HOST_ROOM_SECTOR_PROGRAM.json',
      composed.relationalBase.program);
     write(dir,'R139_HOST_GRAPH_EQUIPMENT_PLACEMENTS.json',
      composed.featured.placements);
     write(dir,'R139_GRAPH_SOURCE_AUDIT.json',{
      directDoors:composed.relationalBase.directAdjacencyDoorEvidence,
      entryFacing:composed.relationalBase.entryFacingZoneEvidence,
      sourceSha256:composed.relationalBase.sourceSha256,
      geometrySha256:composed.relationalBase.geometrySha256,
      sourceRoutes:composed.relationalBase.sourceRouteAudit.status,
      sourceOnly:true,actualMinecraftWalking:'NOT_TESTED'
     });
    }
    write(dir,'ORIGINAL_B143_SHELL_SOURCE.json',base.design);
    write(dir,'ORIGINAL_SHELL_VOXEL_EVIDENCE.json',{
     sourceSha256:base.sourceSha256,geometrySha256:base.geometrySha256,
     voxelCount:base.compiled.primitives.length,
     sourceRoutes:base.sourceRouteAudit.status});
   }
   write(dir,'DERIVED_B143_SOURCE.json',result.design);
   write(dir,'DERIVED_REAL_VOXELS.json',result.compiled);
   write(dir,'SOURCE_ROUTES.json',result.sourceRouteAudit);
   const tpl=fs.readFileSync(path.join(ROOT,
    'source/ai/b143-viewer-template.html'),'utf8');
   write(dir,'index.html',renderB143Html(
    compileB143Gallery([result.design]),tpl));
   if(composed)write(dir,'shell.html',renderB143Html(
    compileB143Gallery([base.design]),tpl));
   report.modelAuthoredProgram=!injected;
   report.relationalIntentFromModel=topologyMode==='graph'&&!injected;
   report.architectureIntentFromModel=Boolean(composed?.architectural)&&!injected;
   report.architecture3DSourceOnly=Boolean(composed?.architectural);
   report.genuineVolumeCompositionSourceOnly=
    Boolean(composed?.architectural?.volume);
   report.genuineRooflineSourceOnly=
    Boolean(composed?.architectural?.roofline);
   report.genuineTopologyDrivenDaylightSourceOnly=architectureMode==='topology'&&
    Boolean(composed?.architectural?.completed?.r163DaylightAndRoofEvidence);
   report.genuineTopologyDrivenHighRoomsSourceOnly=architectureMode==='topology'&&
    Boolean(composed?.architectural?.integrated?.r162RoomSectionEvidence);
   report.genuineNonCentralTopologySourceOnly=architectureMode==='topology'&&
    Boolean(composed?.relationalBase?.r160TopologyEvidence);
   report.genuineDepthBalanceSourceOnly=architectureMode==='floorplan'&&
    Boolean(composed?.relationalBase?.r159DepthBalanceEvidence);
   report.genuineSpatialBalanceSourceOnly=['spatial','floorplan','topology'].includes(architectureMode)&&
    Boolean(composed?.relationalBase?.r158SpatialBalanceEvidence);
   report.realRoomGraph3D=topologyMode==='graph';
   report.newRealB143Source=true;
   report.sourceSha256=result.sourceSha256;
   report.geometrySha256=result.geometrySha256;
   report.voxels=result.compiled.primitives.length;
   report.zoneCount=base.program[0].zones.length;
   if(composed){
    report.equipmentCount=composed.featured.placements.length;
    report.addedEquipmentVoxels=composed.addedTrueB143Voxels??
     composed.featured.addedVoxelCount;
    report.eachRoomHasModelChosenEquipment=
     (composed.physicallyRepresentedZoneCount??
      new Set(composed.featured.placements.map(x=>x.zoneId)).size)
       ===report.zoneCount;
    report.shellSourceSha256=base.sourceSha256;
   }
   report.sourceRoutes=result.sourceRouteAudit.status;
   report.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE':
    report.boundedHostRepairRequired?
     'SOURCE_CANDIDATE_REAL_LOCAL_WITH_HOST_RECOVERY_HUMAN_REVIEW_REQUIRED':
     'SOURCE_CANDIDATE_REAL_LOCAL_RESPONSE_HUMAN_REVIEW_REQUIRED';
   return report;
  }finally{clearTimeout(timer);}
 }catch(e){
  report.status='HOLD_MODEL_OUTPUT_OR_GEOMETRY';
  report.reason=String(e?.message??e).slice(0,450);
  return report;
 }finally{
  report.elapsedMs=Date.now()-start;
  write(dir,'R134_MODEL_REPORT.json',report);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const opts=parseR134FreshArgs(process.argv.slice(2));
  if(opts.help)console.log('node scripts/r134-fresh-model-pilot.mjs --model qwen3:14b --brief "Invent a compact workshop with four distinct rooms" --equipment assembled --topology graph --out NEW_DIR (local Ollama only, no world writes)');
  else{
   const report=await runR134FreshModel(opts);
   console.log(JSON.stringify({status:report.status,modelCalls:report.modelCalls,
    zoneCount:report.zoneCount,voxels:report.voxels,
    reason:report.reason??null,worldWrites:0}));
   if(report.status.startsWith('HOLD'))process.exitCode=2;
  }
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
