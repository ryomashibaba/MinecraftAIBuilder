/** B107: generate a portable 15-variant 3D facade/roof/interior concept review.
 * One B104 + B105 + B106 evaluation per variant to avoid duplicate expensive geometry work.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateB100} from '../../b100/main/compile-b100.mjs';
import {validateUniversalCandidate} from '../../b100/main/b100-universal-design.mjs';
import {B101_SCENARIOS} from '../../b101/main/compile-b101.mjs';
import {coDesignB104} from '../../b104/main/b104-joint-layout.mjs';
import {generateB105} from '../../b105/main/b105-building-volume.mjs';
import {makeB106Scene,validateB106Scene} from '../../b106/main/b106-review-scene.mjs';
import {polishB107,validateB107Polish,B107_MATERIALS,B107_LAYERS} from './b107-visual-architecture.mjs';
export function assembleB107(){
 const b100=JSON.parse(fs.readFileSync(new URL('../../b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 if(!validateB100(b100)||b100.reportSha256?.length!==64)throw Error('B107_BAD_PARENT_B100');
 const baseScenes=[],polishScenes=[],cases=[];
 for(const g of b100.architectureCases){
  const programme=B101_SCENARIOS[g.caseId];if(!programme)throw Error('B107_UNKNOWN_USE');
  const variants=[];
  for(const c of g.options){
   if(!validateUniversalCandidate(c,g.brief))throw Error('B107_FROZEN_CANDIDATE_CHANGED');
   const design=coDesignB104(c,programme),volume=generateB105(design);
   const base=makeB106Scene(design,volume),polished=polishB107(design,volume,base);
   if(!validateB106Scene(base)||!validateB107Polish(polished,base))throw Error('B107_INVALID_POLISH');
   baseScenes.push(base);polishScenes.push(polished);
   variants.push({id:c.id,levels:volume.levels,rooms:volume.summary.conceptRooms,
    allRoomsConnected:design.result.connected===volume.summary.conceptRooms,
    b105RoofCaps:volume.summary.roofCaps,b105WindowCells:volume.summary.windowProxies,
    b105FurnitureCells:volume.summary.conceptualFixtures,
    b106StairLinks:volume.summary.conceptualVerticalLinks,
    newRoofFormBoxes:polished.stats.roofForms,newWindowGroups:polished.stats.framedWindows,
    newFurnishingGroups:polished.stats.visualFurnitureGroups,
    newStairTreadDiagramBoxes:polished.stats.staircaseTreadDiagrams,
    roofProfile:polished.stats.profile.roof,facadeProfile:polished.stats.profile.facade,
    windowProfile:polished.stats.profile.windows,fixtureProfile:polished.stats.profile.furniture,
    graphicBoxes:polished.visualShapes.length,reviewIntegritySha256:polished.integritySha256,
    humanVisualQualityApproved:false,realArchitectureCompleted:false,
    physicalBlockStatesVerified:0,constructionApproved:false});
  }
  cases.push({caseId:g.caseId,typology:g.brief.typology,variants});
 }
 const all=cases.flatMap(g=>g.variants),sum=k=>all.reduce((n,x)=>n+x[k],0);
 const report={schema:'minecraftaibuilder-b107-whole-building-visual-improvement-v1',
  targetEdition:'MINECRAFT_EDUCATION',referenceBlockStateVersion:'26.3_UNVERIFIED',
  parentB100Sha256:b100.reportSha256,B100ThroughB106Immutable:true,
  cases,totals:{typologies:cases.length,variants:all.length,conceptFloors:sum('levels'),
   rooms:sum('rooms'),roofFormBoxes:sum('newRoofFormBoxes'),framedWindowGroups:sum('newWindowGroups'),
   furnitureConceptGroups:sum('newFurnishingGroups'),stairTreadDiagrams:sum('newStairTreadDiagramBoxes'),
   addedVisualBoxes:sum('graphicBoxes'),sourceRoofCaps:sum('b105RoofCaps'),
   sourceWindowCells:sum('b105WindowCells'),sourceFurnitureCells:sum('b105FurnitureCells'),
   sourceStairLinks:sum('b106StairLinks'),distinctRoofStyles:new Set(all.map(x=>x.roofProfile)).size,
   distinctFacades:new Set(all.map(x=>x.facadeProfile)).size,
   oldUnapprovedCandidates:296,oldHeldRooms:18,visuallyApprovedVariants:0,
   installedMinecraftBlocks:0,certifiedEducationBlockStates:0,worldContacts:0},
  qualityGates:{sourceAnchorConservation:true,roofCoverageConceptOnly:true,
   windowSourceConservation:true,furnitureSourceConservation:true,
   stairDiagramSourceConservation:true,allParentRoomsAccessible:true,
   handReviewedAesthetics:false,certifiedPhysicalCompletion:false},
  knownLimitations:['VISUAL_BOXES_ARE_OUTLINE_SHAPES_NOT_MINECRAFT_EDUCATION_BLOCK_STATES',
   'ROOF_FORM_RENDERING_NOT_RAIN_SHEAR_LOAD_OR_ROOF_GABLE_CONSTRUCTION_CERTIFICATION',
   'FURNITURE_CONCEPTS_NOT_ACTUAL_FURNITURE_OR_FINISHED_ROOM_COMPLETION',
   'STAIR_DIAGRAMS_NOT_MINECRAFT_PHYSICAL_STAIRS_HEADROOM_OR_EGRESS_CERTIFICATION',
   'CANVAS_RENDERING_REQUIRES_HUMAN_VISUAL_REVIEW_FOR_AESTHETIC_QUALITY',
   'HUMAN_SCORES_AND_WORLD_VALIDATION_NOT_COLLECTED'],
  gates:b100.gates.map(g=>({...g,status:'BLOCKED'})),
  readiness:'NOT_PREPARED',worldContacts:0,constructionApproved:false,executionAllowed:false,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB107Report(report))throw Error('B107_INVALID_REPORT');
 return {report,baseScenes,polishScenes};
}
export function validateB107Report(r){
 if(r?.schema!=='minecraftaibuilder-b107-whole-building-visual-improvement-v1'||
 r.targetEdition!=='MINECRAFT_EDUCATION'||r.referenceBlockStateVersion!=='26.3_UNVERIFIED'||
 r.parentB100Sha256?.length!==64||r.B100ThroughB106Immutable!==true||
 r.readiness!=='NOT_PREPARED'||r.worldContacts!==0||r.constructionApproved!==false||
 r.executionAllowed!==false||r.BuildPlan?.status!=='NOT_PREPARED'||
 r.BuildPlan.operations?.length!==0||r.BuildPlan.commandCount!==0||
 r.BuildPlan.worldCoordinates!==null||r.gates?.length!==9||
 r.gates.some(g=>g.status!=='BLOCKED')||r.cases?.length!==5||
 r.cases.some(g=>g.variants?.length!==3))return false;
 const a=r.cases.flatMap(g=>g.variants),t=r.totals,sum=k=>a.reduce((n,x)=>n+x[k],0);
 if(a.length!==15||a.some(x=>x.rooms<=0||x.allRoomsConnected!==true||
 x.newRoofFormBoxes!==x.b105RoofCaps||x.newWindowGroups!==x.b105WindowCells||
 x.newFurnishingGroups!==x.b105FurnitureCells||
 x.newStairTreadDiagramBoxes!==x.b106StairLinks*6||
 x.humanVisualQualityApproved!==false||x.realArchitectureCompleted!==false||
 x.physicalBlockStatesVerified!==0||x.constructionApproved!==false||
 x.reviewIntegritySha256?.length!==64))return false;
 const mapping={conceptFloors:'levels',rooms:'rooms',roofFormBoxes:'newRoofFormBoxes',
  framedWindowGroups:'newWindowGroups',furnitureConceptGroups:'newFurnishingGroups',
  stairTreadDiagrams:'newStairTreadDiagramBoxes',addedVisualBoxes:'graphicBoxes',
  sourceRoofCaps:'b105RoofCaps',sourceWindowCells:'b105WindowCells',
  sourceFurnitureCells:'b105FurnitureCells',sourceStairLinks:'b106StairLinks'};
 return t.typologies===5&&t.variants===15&&t.conceptFloors===66&&t.rooms===279&&
 Object.entries(mapping).every(([k,v])=>t[k]===sum(v))&&
 t.distinctRoofStyles===5&&t.distinctFacades===5&&
 t.oldUnapprovedCandidates===296&&t.oldHeldRooms===18&&
 t.visuallyApprovedVariants===0&&t.installedMinecraftBlocks===0&&
 t.certifiedEducationBlockStates===0&&t.worldContacts===0&&
 Object.values(r.qualityGates).slice(0,6).every(v=>v===true)&&
 r.qualityGates.handReviewedAesthetics===false&&
 r.qualityGates.certifiedPhysicalCompletion===false;
}
/** Patch only an exported B106 HTML template in memory; old B106 original unchanged. */
export function writeB107Review(bundle,outputDir){
 if(!validateB107Report(bundle?.report)||bundle.baseScenes?.length!==15||
 bundle.polishScenes?.length!==15)throw Error('B107_UNSAFE_EXPORT');
 for(let i=0;i<15;i++)if(!validateB107Polish(bundle.polishScenes[i],bundle.baseScenes[i]))
  throw Error('B107_TAMPERED_SCENE');
 let html=fs.readFileSync(new URL('../../b106/main/review-template.html',import.meta.url),'utf8');
 const token='__B106_SCENE_PAYLOAD__';
 if(html.split(token).length!==2)throw Error('B107_MISSING_TEMPLATE_TOKEN');
 // Existing B106 viewer becomes a polished viewer: both datasets remain faithfully visible.
 html=html.replace('B106 3D Design Review','B107 3D Architecture Review')
 .replace('B106 建物全体3Dレビュー','B107 建物全体3Dレビュー・外装/内装造形')
 .replace('B105の実測ローカルボクセルを描画。','B105/B106の実測ローカル形状とB107の追加設計形状を描画。')
 .replace('Minecraft Education 3D conceptual review','Minecraft Education B107 conceptual review');
 const toggles=B107_LAYERS.map(k=>
  '<label class="toggle"><input type="checkbox" data-layer="'+k+'" checked> '+({
   ROOF_FORM:'新しい立体屋根',ROOF_TRIM:'屋根の縁飾り',FACADE_RHYTHM:'外壁の立体リズム',
   WINDOW_FRAME:'窓枠',WINDOW_GLASS:'新しいガラス面',BALCONY_BAND:'バルコニー帯',
   INTERIOR_FURNITURE:'用途別の家具造形',INTERIOR_DETAIL:'家具の細部',
   STAIR_DIAGRAM:'階段形状の概念図',CORE_RAILING:'概念的な手すり'
  }[k])+'</label>').join('\n');
 const fixtureLine='<label class="toggle"><input type="checkbox" data-layer="FURNITURE_PLACEHOLDER" checked> 家具の仮配置</label>';
 if(!html.includes(fixtureLine))throw Error('B107_B106_VIEWER_CHANGED');
 html=html.replace(fixtureLine,fixtureLine+'\n'+toggles);
 html=html.replace('const scenes=payload.scenes;','const scenes=payload.scenes;\nconst polished=payload.polish;\nconst polishColors=payload.colors;');
 html=html.replace(' const extent=scene.bounds;',' const upgrade=polished[idx];\n for(const b of upgrade.visualShapes){if(b.level>cutoff||!options[b.kind]?.checked)continue;\n active.push({p:[b.x,b.y,b.z,-1,b.level],kind:b.kind,shape:b});}\n const extent=scene.bounds;');
 html=html.replace('const thickness=p[3]>=5?0.09:1,baseY=p[1],topY=baseY+thickness;',
  'const thickness=v.shape?v.shape.h:(p[3]>=5?0.09:1),baseY=p[1],topY=baseY+thickness;');
 html=html.replace('if(v.kind==="FACADE_PANEL_PROXY")color=facadePalettes[scene.typology]||color;',
  'if(v.kind==="FACADE_PANEL_PROXY")color=facadePalettes[scene.typology]||color;\n if(v.shape)color=polishColors[v.shape.material]||color;');
 // Base box has 1x1 plan; overlay boxes can use floating sizes.
 html=html.replace('const verts=[','const bw=v.shape?v.shape.w:1,bd=v.shape?v.shape.d:1;\n  const verts=[');
 html=html.replaceAll('p[0]+1','p[0]+bw').replaceAll('p[2]+1','p[2]+bd');
 html=html.replace('for(const v of active){','for(const v of active){');
 // Prevent the flat older roof and primitive furniture boxes from obscuring the added shapes.
 html=html.replace('setScene();\n</script>','options.ROOF_CAP_PROXY.checked=false;\noptions.FURNITURE_PLACEHOLDER.checked=false;\noptions.WINDOW_GLAZING_PROXY.checked=false;\nsetScene();\n</script>');
 if(!html.includes('const bw=v.shape?v.shape.w:1')||
 !html.includes('const upgrade=polished[idx]'))throw Error('B107_VIEWER_PATCH_FAILED');
 const payload=JSON.stringify({scenes:bundle.baseScenes,polish:bundle.polishScenes,colors:B107_MATERIALS})
  .replaceAll('<','\\u003c');
 html=html.replace(token,payload);
 if(html.includes(token)||html.includes('fetch(')||html.includes('<script src='))
  throw Error('B107_VIEWER_NOT_OFFLINE');
 fs.mkdirSync(outputDir,{recursive:true});
 const htmlPath=path.join(outputDir,'B107_Visual_Architecture_15_Buildings.html');
 const reportPath=path.join(outputDir,'B107_Visual_Quality_Report.json');
 fs.writeFileSync(htmlPath,html);
 fs.writeFileSync(reportPath,JSON.stringify(bundle.report,null,2)+'\n');
 return {htmlPath,reportPath,htmlBytes:Buffer.byteLength(html),variants:15};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const bundle=assembleB107();
 const output=process.argv.includes('--write-preview')?
  writeB107Review(bundle,path.resolve('b107-preview-output')):null;
 console.log(JSON.stringify({totals:bundle.report.totals,output},null,2));
}
