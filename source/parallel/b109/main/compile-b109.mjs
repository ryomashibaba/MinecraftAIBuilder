/** B109: generate coherent facade, roof and glazing display without source mutation.
 * Consumes the B108 read-only report and adds only layer-toggleable visual data.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileB108,writeB108,validateB108Report} from '../../b108/main/compile-b108.mjs';
import {buildB109Scene,validateB109Scene,B109_COLORS,B109_LAYERS} from './b109-surface-model.mjs';
const change=(s,from,to)=>{
 if(!s.includes(from))throw Error('B109_RENDERER_PATCH_MISMATCH:'+from.slice(0,65));
 return s.replace(from,to);
};
export function compileB109(){
 const parent=compileB108();
 if(!validateB108Report(parent.report))throw Error('B109_BAD_PARENT');
 const surfaces=parent.bundle.baseScenes.map((base,i)=>
  buildB109Scene(base,parent.bundle.polishScenes[i],parent.refined[i]));
 for(let i=0;i<15;i++)if(!validateB109Scene(surfaces[i],
  parent.bundle.baseScenes[i],parent.bundle.polishScenes[i],parent.refined[i]))
  throw Error('B109_BAD_SURFACE_PROVENANCE');
 const sum=k=>surfaces.reduce((n,s)=>n+s.metrics[k],0);
 const totals={variants:15,typologies:5,conceptFloors:66,rooms:279,
  originalFacadeCells:sum('originalFacadeCells'),
  originalSpandrelCells:sum('originalSpandrelCells'),
  originalRoofCells:sum('originalRoofCells'),
  originalGlazingCells:sum('originalGlazingCells'),
  mergedFacadePanels:sum('mergedFacadePanels'),
  mergedSpandrelPanels:sum('mergedSpandrelPanels'),
  mergedRoofSurfaces:sum('mergedRoofSurfaces'),
  mergedGlazingPanels:sum('mergedGlassPanels'),
  decorativeFrames:sum('decorativeFrames'),
  savedPrimaryDrawingPrimitives:sum('visualPrimitiveReductionVsOriginal'),
  sourceProvenanceFailures:0,approvedPhysicalRooms:0,
  physicallyValidMinecraftWindows:0,verifiedEducationBlockStates:0,
  worldContacts:0,legacyUnapproved:296,legacyHeld:18};
 const report={schema:'minecraftaibuilder-b109-merged-surfaces-offline-report-v1',
  inheritedB108:true,sourceSha256:surfaces.map(s=>s.digest),
  byBuilding:surfaces.map(s=>({id:s.candidateId,style:s.typology,...s.metrics})),totals,
  browserQA:'REQUIRES_REAL_CHROMIUM_CI',
  roofWeatherproofCertified:false,realWindowOperationCertified:false,
  humanAestheticsApproved:false,constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',worldContacts:0,worldCoordinates:null,
  gates:parent.report.nineGates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB109Report(report))throw Error('B109_INVALID_REPORT');
 return {parent,surfaces,report};
}
export function validateB109Report(r){
 if(r?.schema!=='minecraftaibuilder-b109-merged-surfaces-offline-report-v1'||
 r.inheritedB108!==true||r.sourceSha256?.length!==15||
 r.byBuilding?.length!==15||r.totals?.variants!==15||
 r.totals.typologies!==5||r.totals.conceptFloors!==66||
 r.totals.rooms!==279||r.totals.originalRoofCells!==9203||
 r.totals.originalGlazingCells!==3134||
 r.totals.savedPrimaryDrawingPrimitives<=0||
 r.totals.mergedRoofSurfaces>=9203||
 r.totals.sourceProvenanceFailures!==0||
 r.totals.approvedPhysicalRooms!==0||
 r.totals.physicallyValidMinecraftWindows!==0||
 r.totals.verifiedEducationBlockStates!==0||
 r.totals.worldContacts!==0||
 r.totals.legacyUnapproved!==296||r.totals.legacyHeld!==18||
 r.roofWeatherproofCertified!==false||r.realWindowOperationCertified!==false||
 r.humanAestheticsApproved!==false||
 r.constructionApproved!==false||r.executionAllowed!==false||
 r.readiness!=='NOT_PREPARED'||r.worldContacts!==0||
 r.worldCoordinates!==null||r.gates?.length!==9||
 r.gates.some(g=>g.status!=='BLOCKED')||
 r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan.operations?.length!==0||
 r.BuildPlan.commandCount!==0||r.BuildPlan.worldCoordinates!==null)return false;
 const sum=k=>r.byBuilding.reduce((n,b)=>n+b[k],0);
 const fields=['originalFacadeCells','originalSpandrelCells','originalRoofCells','originalGlazingCells',
  'mergedFacadePanels','mergedSpandrelPanels','mergedRoofSurfaces','mergedGlassPanels',
  'decorativeFrames','visualPrimitiveReductionVsOriginal'];
 const dest=['originalFacadeCells','originalSpandrelCells','originalRoofCells','originalGlazingCells',
  'mergedFacadePanels','mergedSpandrelPanels','mergedRoofSurfaces','mergedGlazingPanels',
  'decorativeFrames','savedPrimaryDrawingPrimitives'];
 return fields.every((f,i)=>r.totals[dest[i]]===sum(f))&&
 r.byBuilding.every(b=>b.geometricSourceAlterations===0&&
 b.roofPreservationErrors===0&&b.facadePreservationErrors===0&&
 b.windowPreservationErrors===0&&b.humanVisualApproval===false);
}
/** Never patches parent source on disk; modifies only generated standalone HTML. */
export function improveB109HTML(html,bundle){
 if(!validateB109Report(bundle?.report))throw Error('B109_UNSAFE_HTML_EXPORT');
 const prefix='const payload=',start=html.indexOf(prefix);
 const end=html.indexOf(';\nconst scenes=payload.scenes;',start);
 if(start<0||end<0)throw Error('B109_PARENT_HTML_MISSING_PAYLOAD');
 const payload=JSON.parse(html.slice(start+prefix.length,end));
 if(payload.scenes?.length!==15||payload.polish?.length!==15||
 payload.refinements?.length!==15)throw Error('B109_PARENT_HTML_SCENES_MISSING');
 for(let i=0;i<15;i++)if(
  payload.scenes[i].sceneSha256!==bundle.parent.bundle.baseScenes[i].sceneSha256||
  payload.refinements[i].digest!==bundle.parent.refined[i].digest)
  throw Error('B109_PARENT_INTEGRITY_MISMATCH');
 payload.b109Surfaces=bundle.surfaces;
 payload.b109Colors=B109_COLORS;
 html=html.slice(0,start)+prefix+JSON.stringify(payload).replaceAll('<','\\u003c')+html.slice(end);
 html=change(html,'B108 Browser-Reviewed Architecture','B109 Cohesive Building Review');
 html=change(html,'B108 建物全体の外観・内部レビュー','B109 一体感のある屋根・外壁・窓のレビュー');
 html=change(html,'ソース位置を保った外壁・屋根の表示補正と実ブラウザーQA。',
  'B105の元形状は不変。連続する外壁・屋根と見やすい窓を表示し、描画数を削減。');
 const anchor='<label class="toggle"><input type="checkbox" data-layer="SCULPTED_ROOF" checked> 立体的な屋根輪郭</label>';
 const labels={COHESIVE_FACADE:'一体化した外壁',COHESIVE_SPANDREL:'一体化した階間外壁',
  COHESIVE_ROOF:'連続した屋根面',LARGE_GLAZING:'大きく見えるガラス面',
  WINDOW_ACCENT:'窓枠のアクセント'};
 const widgets=B109_LAYERS.map(k=>
  '<label class="toggle"><input type="checkbox" data-layer="'+k+'" checked> '+labels[k]+'</label>').join('\n');
 html=change(html,anchor,anchor+'\n'+widgets);
 html=change(html,'const refinementColors=payload.refinementColors;',
  'const refinementColors=payload.refinementColors;\n'+
  'const b109Surfaces=payload.b109Surfaces;\nconst b109Colors=payload.b109Colors;');
 html=change(html,' const extent=scene.bounds;',
  ' for(const b of b109Surfaces[idx].surfaces){if(b.level>cutoff||!options[b.kind]?.checked)continue;\n'+
  ' active.push({p:[b.x,b.y,b.z,-1,b.level],kind:b.kind,shape:b});}\n const extent=scene.bounds;');
 html=change(html,'if(v.shape)color=refinementColors[v.shape.material]||polishColors[v.shape.material]||color;',
  'if(v.shape)color=b109Colors[v.shape.material]||refinementColors[v.shape.material]||polishColors[v.shape.material]||color;');
 html=change(html,'(scene.primitives.length+upgrade.visualShapes.length+refined[idx].shapes.length)',
  '(scene.primitives.length+upgrade.visualShapes.length+refined[idx].shapes.length+b109Surfaces[idx].surfaces.length)');
 // Presentation mode defaults to only consolidated B109 outside surfaces.
 const endOfStartup='setScene();\n</script>';
 const startup='for(const k of ["FACADE_PANEL_PROXY","FACADE_LOWER_BAND","FACADE_UPPER_BAND",'+
  '"ROOF_FORM","ROOF_TRIM","SCULPTED_ROOF","WINDOW_FRAME","WINDOW_GLASS",'+
  '"WINDOW_GLAZING_PROXY","FACADE_RHYTHM","BALCONY_BAND"])options[k].checked=false;\n'+
  'window.__B109_QA={snapshot:()=>({building:current().id,index:idx,frameMs:b108LastFrameMs,'+
  'allFloors:allLevels.checked,cutoff:Number(floor.value),yaw,pitch,zoom,'+
  'layers:Object.keys(options).filter(k=>options[k].checked),'+
  'source:b109Surfaces[idx].metrics,rendered:el("renderInfo").textContent}),'+
  'data:()=>({buildings:b109Surfaces.length,constructionApproved:false,worldContacts:0})};\n'+
  endOfStartup;
 html=change(html,endOfStartup,startup);
 const switchMarker='el("exterior").addEventListener("click",()=>{';
 html=change(html,switchMarker,switchMarker+
  '\n for(const k of ["FACADE_PANEL_PROXY","FACADE_LOWER_BAND","FACADE_UPPER_BAND",'+
  '"ROOF_FORM","ROOF_TRIM","SCULPTED_ROOF","WINDOW_FRAME","WINDOW_GLASS",'+
  '"WINDOW_GLAZING_PROXY","FACADE_RHYTHM","BALCONY_BAND"])options[k].checked=false;\n'+
  'for(const k of ["COHESIVE_FACADE","COHESIVE_SPANDREL","COHESIVE_ROOF",'+
  '"LARGE_GLAZING","WINDOW_ACCENT"])options[k].checked=true;');
 // Old exterior handler later re-enables the old layered geometry: re-disable
 // them after its old assignments before render.
 html=change(html,' options.ROOM_FLOOR_TRACE.checked=false;options.GALLERY_FLOOR_TRACE.checked=false;\n updateFloor();requestDraw();',
  ' for(const k of ["FACADE_PANEL_PROXY","FACADE_LOWER_BAND","FACADE_UPPER_BAND",'+
  '"ROOF_FORM","ROOF_TRIM","SCULPTED_ROOF","WINDOW_FRAME","WINDOW_GLASS"])options[k].checked=false;\n'+
  ' options.ROOM_FLOOR_TRACE.checked=false;options.GALLERY_FLOOR_TRACE.checked=false;\n updateFloor();requestDraw();');
 // Interior cut avoids blocking interior gallery/furniture with merged exterior walls.
 html=change(html,'el("interior").addEventListener("click",()=>{',
  'el("interior").addEventListener("click",()=>{\n'+
  'for(const k of ["COHESIVE_FACADE","COHESIVE_SPANDREL","COHESIVE_ROOF",'+
  '"LARGE_GLAZING","WINDOW_ACCENT"])options[k].checked=false;');
 // GPU independent flat-canvas 3D; no browser network or remote third party code.
 if(html.includes('fetch(')||html.includes('<script src=')||
  html.includes('__B106_SCENE_PAYLOAD__'))throw Error('B109_NOT_OFFLINE');
 return html;
}
export function writeB109(bundle,outDir){
 if(!validateB109Report(bundle?.report))throw Error('B109_UNSAFE_EXPORT');
 const scratch=path.join(outDir,'b108-scratch'),old=writeB108(bundle.parent,scratch);
 const html=improveB109HTML(fs.readFileSync(old.htmlPath,'utf8'),bundle);
 fs.mkdirSync(outDir,{recursive:true});
 const htmlPath=path.join(outDir,'B109_Cohesive_Architecture_15_Buildings.html');
 const reportPath=path.join(outDir,'B109_Cohesive_Source_Coverage_Report.json');
 fs.writeFileSync(htmlPath,html);
 fs.writeFileSync(reportPath,JSON.stringify(bundle.report,null,2)+'\n');
 fs.rmSync(scratch,{recursive:true,force:true});
 return {htmlPath,reportPath,bytes:Buffer.byteLength(html),buildings:15};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const b=compileB109(),output=process.argv.includes('--write-preview')?
  writeB109(b,path.resolve('b109-preview-output')):null;
 console.log(JSON.stringify({totals:b.report.totals,output},null,2));
}
