/**
 * R125 V4I: quantitative appearance TRIAGE on authentic B143 voxels.
 * This is not an ART grade, not style templates, not a claim of real-Qwen
 * diversity. The report explicitly blocks technical SOURCE => human ART.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {compileHeightAuthorIntent} from '../source/ai/r125-v4g-height-author-ir.mjs';
import {compileAuthoredPublicMezzanine}
 from '../source/ai/r125-v4h-authored-mezzanine.mjs';
import {syntheticFiveAuthorMezzanineCases}
 from './r125-v4h-mezzanine-source-study.mjs';
import {auditB143ProjectedVisibility,renderB143ProjectedVisibilityDelta}
 from './r125-v4e-visibility-delta.mjs';
import {actualOrthographicSvg} from './r125-v4e-source-art-review.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FACE=Object.freeze(['roof','north','south','west','east']);
const fail=s=>{throw Error('R125_V4I_ART_SCREENING_'+s);};
const clampRound=(v,n=6)=>Math.round(v*10**n)/10**n;
const key=(u,v)=>u+','+v;
const faceCoords=(p,face)=>{
 const [x,y,z,m]=p;
 const u=face==='east'||face==='west'?z:x;
 const v=face==='roof'?z:-y;
 const depth=face==='roof'?y:
  face==='north'?-z:face==='south'?z:
  face==='west'?-x:x;
 return {u,v,depth,m};
};
function projections(voxels){
 if(!Array.isArray(voxels)||voxels.length<100)fail('ACTUAL_B143_REQUIRED');
 const seen=new Set(),faces=Object.fromEntries(FACE.map(f=>[f,new Map()]));
 for(const p of voxels){
  if(!Array.isArray(p)||p.length!==5||!p.every(Number.isSafeInteger)||
   p[3]<0||p[3]>=MATERIALS.length)fail('INVALID_TRUE_B143_CELL');
  const cell=p.slice(0,3).join(',');
  if(seen.has(cell))fail('DUPLICATE_B143_CELL');
  seen.add(cell);
  for(const face of FACE){
   const c=faceCoords(p,face),id=key(c.u,c.v),old=faces[face].get(id);
   if(!old||c.depth>old.depth)faces[face].set(id,c);
  }
 }
 if(FACE.some(f=>faces[f].size===0))fail('EMPTY_5_DIRECTION_PROJECTION');
 return faces;
}
function normalizedSilhouette(faceMap){
 const p=[...faceMap.values()];
 const minU=Math.min(...p.map(c=>c.u)),maxU=Math.max(...p.map(c=>c.u));
 const minV=Math.min(...p.map(c=>c.v)),maxV=Math.max(...p.map(c=>c.v));
 const du=Math.max(1,maxU-minU),dv=Math.max(1,maxV-minV);
 const silhouette=new Set();
 for(const c of p){
  // Project into common frame, removing translation and absolute scale.
  // This is a proxy for mass silhouette, not a full design assessment.
  silhouette.add(key(Math.round(63*(c.u-minU)/du),
   Math.round(63*(c.v-minV)/dv)));
 }
 return silhouette;
}
function jaccard(a,b){
 const x=a.size<b.size?a:b,other=x===a?b:a;
 let intersection=0;for(const id of x)if(other.has(id))intersection++;
 return {intersection,union:a.size+b.size-intersection,
  similarity:clampRound(intersection/(a.size+b.size-intersection))};
}
function exposure(faces){
 const materialCounts=Object.fromEntries(MATERIALS.map(m=>[m,0]));
 let exposed=0;
 for(const f of FACE)for(const c of faces[f].values()){
  materialCounts[MATERIALS[c.m]]++;
  exposed++;
 }
 const roles=Object.entries(materialCounts).filter(([,v])=>v).sort((a,b)=>b[1]-a[1]);
 return {visiblePixelsOverFiveViews:exposed,
  materialPixelCounts:materialCounts,
  mostExposedMaterial:roles[0][0],
  mostExposedFraction:clampRound(roles[0][1]/exposed),
  uniqueVisibleMaterials:roles.length,
  warning:'Material-color dominance is evidence for manual ART review, not aesthetic certification'};
}
function reportForCase(genre,before,after){
 if(before.worldWrites!==undefined&&before.worldWrites!==0)fail('BASELINE_WORLD_CONTACT');
 if(after.worldContacts!==0||after.worldWrites!==0||
  after.readiness!=='NOT_PREPARED'||after.executionAllowed!==false||
  after.constructionApproved!==false||
  after.gates.length!==9||after.gates.some(g=>g!=='BLOCKED')||
  after.BuildPlan.operations.length!==0||
  after.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  after.sourceWitness.connectedUpperProgram?.reachedFromEntrance!==true||
  after.sourceWitness.connectedPublicService?.reachableFromEntrance!==true)
  fail('UNVERIFIED_SOURCE_OR_MINECRAFT_SAFETY');
 const beforeV=before.b143.compiled.primitives,afterV=after.b143Compiled.primitives;
 const projectionBefore=projections(beforeV),projectionAfter=projections(afterV);
 const delta=auditB143ProjectedVisibility(beforeV,afterV);
 const footprints=Object.fromEntries(FACE.map(f=>[f,normalizedSilhouette(projectionAfter[f])]));
 const material=exposure(projectionAfter);
 return {genre,
  sourcePrelim:'SOURCE_2_WIDE_UPPER_PROGRAM_REACHABLE',
  sourceOnly:true,rawModelCalls:0,architecturalArt:'NOT_REVIEWED',
  originalB143GeometrySha256:before.b143.geometrySha256,
  finalB143GeometrySha256:after.b143Compiled.geometrySha256,
  independentFiveViewChange:delta.views.map(v=>({
   face:v.face,baselineCells:v.baselineCells,finalCells:v.finalCells,
   changedCells:v.changedCells,silhouetteChangedCells:v.silhouetteChangedCells,
   depthChangedCells:v.depthChangedCells,materialChangedCells:v.materialChangedCells,
   changeFraction:v.changeFraction
  })),
  fiveViewMaterialExposure:material,
  projectionPixels:Object.fromEntries(FACE.map(f=>[f,projectionAfter[f].size])),
  actualPhysicalUpperProgram:true,
  noExteriorArtImprovementClaim:true,
  actualB143VoxelCount:afterV.length,
  internalDifferentVoxels:afterV.length-beforeV.length,
  _footprints:footprints};
}
function matrixSvg(cases,pairs){
 const W=1240,H=610,esc=x=>String(x).replace(/[&<>"']/g,'');
 const svg=['<svg xmlns="http://www.w3.org/2000/svg" width="'+W+
  '" height="'+H+'" viewBox="0 0 '+W+' '+H+'">',
 '<rect width="'+W+'" height="'+H+'" fill="#102638"/>',
 '<text x="28" y="37" fill="#eff6fb" font-family="sans-serif" font-size="22">V4I · Real B143 architectural screening (NOT ART PASS)</text>',
 '<text x="28" y="62" fill="#b8cad9" font-family="sans-serif" font-size="12">Source-only, synthetic five authors. Relative silhouette similarity is not human architecture grading.</text>',
 '<text x="28" y="97" fill="#ecf3f7" font-family="sans-serif" font-size="15">Pairwise normalized 5-view silhouette Jaccard · [0,1]</text>'];
 const labels=cases.map(x=>x.genre);
 const lookup=new Map(pairs.map(p=>[[p.genreA,p.genreB].sort().join('|'),p]));
 const X=220,Y=130,tile=72;
 for(let i=0;i<labels.length;i++){
  svg.push('<text x="22" y="'+(Y+i*tile+38)+
   '" fill="#fff" font-family="sans-serif" font-size="15">'+esc(labels[i])+'</text>',
   '<text x="'+(X+i*tile+8)+'" y="'+(Y-14)+
   '" fill="#fff" font-family="sans-serif" font-size="12">'+esc(labels[i])+'</text>');
  for(let j=0;j<labels.length;j++){
   const p=lookup.get([labels[i],labels[j]].sort().join('|'));
   const v=i===j?1:p.meanFiveViewSimilarity;
   const shade=Math.round(44+v*100);
   svg.push('<rect x="'+(X+j*tile)+'" y="'+(Y+i*tile)+
    '" width="66" height="66" fill="rgb('+Math.round(shade*.38)+','+
    Math.round(shade*.69)+','+shade+')" stroke="#56798a" stroke-width="1"/>',
    '<text x="'+(X+j*tile+10)+'" y="'+(Y+i*tile+38)+
    '" fill="#fff" font-family="sans-serif" font-size="14">'+v.toFixed(3)+'</text>');
  }
 }
 const bx=670;
 svg.push('<text x="'+bx+'" y="100" fill="#eff5f8" font-family="sans-serif" font-size="15">Technical visibility and material diagnostics</text>');
 for(let i=0;i<cases.length;i++){
  const c=cases[i],v=c.independentFiveViewChange;
  const changes=v.reduce((n,z)=>n+z.changedCells,0);
  svg.push('<text x="'+bx+'" y="'+(140+i*64)+
   '" fill="#f4f7f8" font-family="sans-serif" font-size="15">'+esc(c.genre)+'</text>',
   '<text x="'+bx+'" y="'+(163+i*64)+
   '" fill="#b8cad9" font-family="sans-serif" font-size="11">Exterior changed pixels: '+
    changes+' · Dominant visible: '+esc(c.fiveViewMaterialExposure.mostExposedMaterial)+
    ' '+Math.round(c.fiveViewMaterialExposure.mostExposedFraction*100)+'%</text>');
 }
 svg.push('<text x="28" y="536" fill="#eacb9b" font-family="sans-serif" font-size="13">No preselected pass threshold. Scores describe surface evidence only; human ART remains NOT_REVIEWED.</text>',
 '<text x="28" y="561" fill="#b8cad9" font-family="sans-serif" font-size="12">A change fully hidden behind walls can be structurally meaningful while adding ZERO exterior artistic improvement.</text>',
 '<text x="28" y="582" fill="#b8cad9" font-family="sans-serif" font-size="12">Local Qwen: NOT_TESTED. Real Minecraft walking: NOT_TESTED. World writes: 0. All 9 gates: BLOCKED.</text>',
 '</svg>');
 return svg.join('\n')+'\n';
}
export function assessV4IActualB143ArtEvidence(input){
 if(!Array.isArray(input)||input.length!==5||
  new Set(input.map(c=>c.genre)).size!==5||
  input.some(c=>!['housing','shop','research','gallery','station'].includes(c.genre)))
  fail('FIVE_DISTINCT_SYNTHETIC_GENRES_REQUIRED');
 const cases=input.map(c=>reportForCase(c.genre,c.before,c.after));
 const pairs=[];
 for(let i=0;i<cases.length;i++)for(let j=i+1;j<cases.length;j++){
  const a=cases[i],b=cases[j];
  const perFace=Object.fromEntries(FACE.map(f=>[f,jaccard(a._footprints[f],b._footprints[f]).similarity]));
  pairs.push({genreA:a.genre,genreB:b.genre,perFaceSilhouetteSimilarity:perFace,
   meanFiveViewSimilarity:clampRound(FACE.reduce((s,f)=>s+perFace[f],0)/FACE.length)});
 }
 const safeCases=cases.map(({_footprints,...c})=>c);
 const report={schema:'r125-v4i-independent-architectural-visibility-triage-v1',
  provenance:'REAL_B143_VOXELS_OF_EXPLICIT_SYNTHETIC_AUTHORS_NOT_A_LOCAL_MODEL',
  modelRuns:0,minecraftWalking:'NOT_TESTED',worldContacts:0,worldWrites:0,
  previewStatus:'ART_HOLD_NO_HUMAN_ART_APPROVAL',
  visualMetricPassThresholds:'UNDEFINED_DO_NOT_INVENT',
  technicalSourceIsNotArchitecturalArt:true,canAutomateHumanArtJudgment:false,
  geometryComparisonsCannotMeasure:'beauty, architectural coherence, contextual identity, palette suitability, visual detail, meaning or user taste',
  volumeProof:"Real compiled voxels and verified SOURCE 2-wide upper route; does NOT prove structural engineering.",
  cases:safeCases,
  pairwise: pairs,
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,worldContacts:0,worldWrites:0,
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}},
  nextArtReview:'Compare five real B143 views, eye-level entrance elevations, outdoor public zone, detailed materials and internal 3D in a separate explicit human visual ART review.'
 };
 return {report,svg:matrixSvg(safeCases,pairs)};
}

/**
 * Compare real compiled B143 exterior geometry from separate *private* model
 * studies without exporting designs or voxel coordinates. Existing V4I
 * normalization is shared by synthetic and real model source observations.
 * Source integrity must be checked by the caller before invoking this.
 */
export function compareV4IPrivateRealB143Silhouettes(input){
 const genres=['housing','shop','research','gallery','station'];
 if(!Array.isArray(input)||input.length<2||input.length>5||
  new Set(input.map(c=>c.genre)).size!==input.length||
  input.some(c=>!genres.includes(c.genre)))
  fail('PRIVATE_CROSS_GENRE_INPUT');
 const snapshots=input.map(c=>{
  const projectionsByFace=projections(c.primitives);
  return {genre:c.genre,realB143VoxelCount:c.primitives.length,
   projectionPixels:Object.fromEntries(FACE.map(f=>[f,projectionsByFace[f].size])),
   normalized:Object.fromEntries(FACE.map(f=>[
    f,normalizedSilhouette(projectionsByFace[f])]))};
 });
 const pairs=[];
 for(let i=0;i<snapshots.length;i++)for(let j=i+1;j<snapshots.length;j++){
  const a=snapshots[i],b=snapshots[j];
  const perFace=Object.fromEntries(FACE.map(f=>[
   f,jaccard(a.normalized[f],b.normalized[f]).similarity]));
  pairs.push({genreA:a.genre,genreB:b.genre,
   perFaceSilhouetteSimilarity:perFace,
   meanFiveViewSimilarity:clampRound(
    FACE.reduce((sum,f)=>sum+perFace[f],0)/FACE.length)});
 }
 return {
  schema:'r125-v4j-private-model-b143-five-view-diversity-triage-v1',
  status:'SOURCE_GEOMETRY_COMPARISON_ONLY',
  caseCount:snapshots.length,pairCount:pairs.length,
  cases:snapshots.map(({genre,realB143VoxelCount,projectionPixels})=>({
   genre,realB143VoxelCount,projectionPixels})),
  pairwise:pairs,
  noUntrustedModelTextOrCoordinatesIncluded:true,
  visualMetricPassThresholds:'UNDEFINED_DO_NOT_INVENT',
  humanArchitecturalArt:'NOT_REVIEWED',
  originalModelAuthenticity:'UNVERIFIED',
  realMinecraftWalking:'NOT_TESTED',
  constructionApproved:false,worldWrites:0
 };
}

export function exportV4IArchitecturalEvidence(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||fs.existsSync(folder)||
  !fs.existsSync(path.dirname(folder))||
  folder===ROOT||folder.startsWith(ROOT+path.sep))
  fail('NEW_ISOLATED_OUTSIDE_REPO_OUTPUT_REQUIRED');
 const input=syntheticFiveAuthorMezzanineCases().map(c=>({
  genre:c.genre,before:compileHeightAuthorIntent(c.heightAuthor),
  after:compileAuthoredPublicMezzanine(c.heightAuthor,c.mezzanine)}));
 const {report,svg}=assessV4IActualB143ArtEvidence(input);
 fs.mkdirSync(folder);
 fs.writeFileSync(path.join(folder,'V4I_ART_HOLD_VISIBLE_GEOMETRY_AND_DIVERSITY.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(folder,'V4I_ACTUAL_B143_DIVERSITY_MATRIX.svg'),svg,{flag:'wx'});
 for(const c of input){
  fs.writeFileSync(path.join(folder,'V4I_'+c.genre+'_TRUE_FIVE_VIEWS.svg'),
   actualOrthographicSvg(c.after.b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'V4I_'+c.genre+'_EXTERIOR_DELTA.svg'),
   renderB143ProjectedVisibilityDelta(c.before.b143.compiled.primitives,
    c.after.b143Compiled.primitives),{flag:'wx'});
 }
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===
 path.resolve(fileURLToPath(import.meta.url))){
 const dir=process.argv[2];
 if(!dir)throw Error('V4I_NEW_ART_OUTPUT_FOLDER_REQUIRED');
 const report=exportV4IArchitecturalEvidence(path.resolve(dir));
 console.log(JSON.stringify({provenance:report.provenance,cases:report.cases.length,
  comparisons:report.pairwise.length,art:report.previewStatus,worldWrites:0}));
}
