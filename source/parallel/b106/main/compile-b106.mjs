/** B106: reproducible 15-variant offline review scene + cautious Education registry audit.
 * Does not open a world, translate BlockStates or emit Minecraft commands.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateB100} from '../../b100/main/compile-b100.mjs';
import {validateUniversalCandidate} from '../../b100/main/b100-universal-design.mjs';
import {B101_SCENARIOS} from '../../b101/main/compile-b101.mjs';
import {coDesignB104} from '../../b104/main/b104-joint-layout.mjs';
import {generateB105} from '../../b105/main/b105-building-volume.mjs';
import {makeB106Scene,validateB106Scene,auditB106Registry,EDUCATION_RESEARCH_REGISTRY} from './b106-review-scene.mjs';

export function assembleB106(){
 const b100=JSON.parse(fs.readFileSync(new URL('../../b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 if(!validateB100(b100)||b100.reportSha256?.length!==64)throw Error('B106_FROZEN_SOURCE_TAMPERED');
 const scenes=[],cases=[];
 for(const group of b100.architectureCases){
  const programme=B101_SCENARIOS[group.caseId];
  if(!programme)throw Error('B106_MISSING_PROGRAMME');
  const options=[];
  for(const candidate of group.options){
   if(!validateUniversalCandidate(candidate,group.brief))throw Error('B106_UNSAFE_B100_CANDIDATE');
   const design=coDesignB104(candidate,programme);
   const volume=generateB105(design);
   const scene=makeB106Scene(design,volume);
   if(!validateB106Scene(scene))throw Error('B106_BAD_SCENE');
   const compatibility=auditB106Registry(scene);
   scenes.push(scene);
   options.push({id:scene.id,typology:scene.typology,levels:scene.levels,
    conceptualRooms:scene.stats.conceptRooms,connectedRooms:scene.stats.connectedRooms,
    voxelsFromB105:scene.voxelCount,reviewPrimitives:scene.primitives.length,
    facadeProfile:scene.facadeProfile,roofProfile:scene.roofProfile,
    facadeCells:scene.stats.FACADE_PANEL_PROXY,glazingCells:scene.stats.WINDOW_GLAZING_PROXY,
    roofCells:scene.stats.ROOF_CAP_PROXY,fixtureCells:scene.stats.FURNITURE_PLACEHOLDER,
    exteriorPortalVoidCells:scene.stats.EXTERIOR_PORTAL_VOID_PROXY,
    stairJunctionMarkers:scene.stats.CORE_LANDING_TRACE,
    conceptualExitCandidates:scene.stats.exteriorExitCandidates,
    stairGraphLinks:scene.stats.conceptualVerticalLinks,
    sceneSha256:scene.sceneSha256,
    dataIntegrityVerified:true,conceptualRoofCoverageVerified:scene.stats.allRoofGaps===0,
    humanVisualQualityApproved:false,bedrockBlockStatesVerified:compatibility.versionPinnedVerifiedStates,
    compatibilityStatus:compatibility.status,reviewRequired:true,constructionApproved:false});
  }
  cases.push({caseId:group.caseId,typology:group.brief.typology,options});
 }
 const opts=cases.flatMap(g=>g.options),sum=k=>opts.reduce((n,x)=>n+x[k],0);
 const report={schema:'minecraftaibuilder-b106-education-offline-visual-review-v1',
  parentB100Sha256:b100.reportSha256,readOnlyB100ThroughB105:true,
  targetEdition:'MINECRAFT_EDUCATION',targetRegistryVersion:'26.3',
  viewerTechnology:'SELF_CONTAINED_HTML5_CANVAS_LOCAL_3D_VOXEL_PROJECTION',
  exportedPreviewVariantCount:scenes.length,cases,
  totals:{typologies:cases.length,variants:opts.length,conceptualLevels:sum('levels'),
   conceptualRooms:sum('conceptualRooms'),connectedRooms:sum('connectedRooms'),
   b105VoxelCount:sum('voxelsFromB105'),reviewPrimitives:sum('reviewPrimitives'),
   facadeCells:sum('facadeCells'),glazingCells:sum('glazingCells'),roofCells:sum('roofCells'),
   fixtureCells:sum('fixtureCells'),exteriorPortalVoidCells:sum('exteriorPortalVoidCells'),
   coreJunctionMarkers:sum('stairJunctionMarkers'),stairGraphLinks:sum('stairGraphLinks'),
   distinctFacades:new Set(opts.map(x=>x.facadeProfile)).size,
   distinctRoofs:new Set(opts.map(x=>x.roofProfile)).size,
   versionPinnedVerifiedBlockStates:0,physicallyFinishedRooms:0,
   visualHumanApprovedVariants:0,oldUnapprovedCandidates:296,oldHeldRooms:18,
   worldContacts:0,blockCommands:0},
  paletteAudit:{referenceScope:EDUCATION_RESEARCH_REGISTRY.referenceScope,
   targetVersion:EDUCATION_RESEARCH_REGISTRY.targetVersion,
   versionPinnedVerifiedBlockStates:0,worldContacts:0,
   referenceUrl:EDUCATION_RESEARCH_REGISTRY.referenceUrl,
   unresolved:'REAL_BLOCKSTATE_COMPATIBILITY_NOT_YET_PROVEN'},
  scopeNotes:['RENDERING_IS_3D_VIEW_OF_REAL_B105_CONCEPT_IR_NOT_SCREENSHOT_OF_MINECRAFT_WORLD',
   'REVIEW_PRIMITIVES_FOR_GALLERIES_ROOMS_AND_CORE_JUNCTIONS_ARE VISUAL_ONLY',
   'NO_HUMAN_VISUAL_AESTHETIC_OR_INTERIOR_FINISH_CERTIFICATION',
   'NO_REAL_3D_STAIR_TREAD_BLOCKSTATE_OR_LANDING_CERTIFICATION',
   'BEDROCK_STABLE_NAMES_DO_NOT_VALIDATE_MINECRAFT_EDUCATION_VERSION_26_3',
   'EVERY_BLOCK_OPERATION_REMAINS_FORBIDDEN'],
  readiness:'NOT_PREPARED',gates:b100.gates.map(g=>({...g,status:'BLOCKED'})),
  constructionApproved:false,executionAllowed:false,worldContacts:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB106Report(report))throw Error('B106_BAD_SELF_REPORT');
 return {report,scenes};
}
export function validateB106Report(r){
 if(r?.schema!=='minecraftaibuilder-b106-education-offline-visual-review-v1'||
 r.targetEdition!=='MINECRAFT_EDUCATION'||r.targetRegistryVersion!=='26.3'||
 r.parentB100Sha256?.length!==64||r.readOnlyB100ThroughB105!==true||
 r.exportedPreviewVariantCount!==15||r.readiness!=='NOT_PREPARED'||
 r.constructionApproved!==false||r.executionAllowed!==false||r.worldContacts!==0||
 r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan?.operations?.length!==0||
 r.BuildPlan.commandCount!==0||r.BuildPlan.worldCoordinates!==null||
 r.gates?.length!==9||r.gates.some(x=>x.status!=='BLOCKED')||
 r.cases?.length!==5||r.cases.some(g=>g.options?.length!==3))return false;
 const options=r.cases.flatMap(g=>g.options),t=r.totals,sum=k=>options.reduce((n,x)=>n+x[k],0);
 if(options.length!==15||options.some(x=>x.levels<1||x.conceptualRooms!==x.connectedRooms||
 x.dataIntegrityVerified!==true||x.conceptualRoofCoverageVerified!==true||
 x.humanVisualQualityApproved!==false||x.bedrockBlockStatesVerified!==0||
 x.reviewRequired!==true||x.constructionApproved!==false||
 x.compatibilityStatus!=='NEEDS_VERSION_PINNED_EDUCATION_REGISTRY_AND_REAL_BLOCKSTATE_TEST'||
 x.voxelsFromB105<1||x.reviewPrimitives<x.voxelsFromB105||
 x.sceneSha256?.length!==64))return false;
 const names={conceptualLevels:'levels',conceptualRooms:'conceptualRooms',
  connectedRooms:'connectedRooms',b105VoxelCount:'voxelsFromB105',
  reviewPrimitives:'reviewPrimitives',facadeCells:'facadeCells',glazingCells:'glazingCells',
  roofCells:'roofCells',fixtureCells:'fixtureCells',exteriorPortalVoidCells:'exteriorPortalVoidCells',
  coreJunctionMarkers:'stairJunctionMarkers',stairGraphLinks:'stairGraphLinks'};
 return t.typologies===5&&t.variants===15&&t.conceptualLevels===66&&
 t.conceptualRooms===279&&t.connectedRooms===279&&
 Object.entries(names).every(([a,b])=>t[a]===sum(b))&&
 t.distinctFacades===5&&t.distinctRoofs===5&&
 t.versionPinnedVerifiedBlockStates===0&&t.physicallyFinishedRooms===0&&
 t.visualHumanApprovedVariants===0&&t.oldUnapprovedCandidates===296&&t.oldHeldRooms===18&&
 t.worldContacts===0&&t.blockCommands===0&&
 r.paletteAudit?.versionPinnedVerifiedBlockStates===0&&r.paletteAudit?.worldContacts===0;
}
/** Export a portable HTML review artifact; never a BuildPlan.
 * The payload is all sanitized local-coordinate scene JSON, no service calls.
 */
export function writeB106Preview(bundle,outDir){
 if(!validateB106Report(bundle?.report)||bundle.scenes?.length!==15||
 bundle.scenes.some(s=>!validateB106Scene(s)))throw Error('B106_BAD_PREVIEW_DATA');
 const template=fs.readFileSync(new URL('./review-template.html',import.meta.url),'utf8');
 const token='__B106_SCENE_PAYLOAD__';
 if(template.split(token).length!==2)throw Error('B106_MISSING_VIEWER_SLOT');
 const payload=JSON.stringify({scenes:bundle.scenes}).replaceAll('<','\\u003c');
 const html=template.replace(token,payload);
 if(/https?:\/\/[^ "'\n]+\.js/.test(html)||html.includes('fetch('))
  throw Error('B106_NETWORK_DEPENDENCY_IN_OFFLINE_PREVIEW');
 fs.mkdirSync(outDir,{recursive:true});
 const htmlPath=path.join(outDir,'B106_Offline_3D_Review_15_Buildings.html');
 const reportPath=path.join(outDir,'B106_Architectural_QA_Report.json');
 fs.writeFileSync(htmlPath,html);
 fs.writeFileSync(reportPath,JSON.stringify(bundle.report,null,2)+'\n');
 return {htmlPath,reportPath,htmlBytes:Buffer.byteLength(html),variantCount:bundle.scenes.length};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const bundle=assembleB106();
 const output=process.argv.includes('--write-preview')?
  writeB106Preview(bundle,path.resolve('b106-preview-output')):null;
 console.log(JSON.stringify({totals:bundle.report.totals,output},null,2));
}
