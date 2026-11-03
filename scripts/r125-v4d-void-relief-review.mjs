/** V4D old rejected geometry versus separate opt-in alternative; no fake image. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeV4DSyntheticCivicStudy} from './r125-v4d-synthetic-fixture.mjs';
import {makeV4DVoidReliefFixture} from './r125-v4d-void-relief-fixture.mjs';
import {compileSculptedSpineV4D} from '../source/ai/r125-sculpted-spine-v4d.mjs';
import {compileV4DVoidRelief} from '../source/ai/r125-v4d-void-relief.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stop=s=>{throw Error('R125_V4D_RELIEF_GALLERY_'+s)};
const color={stone:'#b9c7d0',concrete:'#dfd9cf',metal:'#778998',
 glass:'#55e0e4',wood:'#b49b7b',glow:'#eace7e',accent:'#bc9672'};
function topVoxelSvg(a,b){
 const W=1100,H=680,scale=5;
 const parts=[
  '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">',
  '<rect width="'+W+'" height="'+H+'" fill="#122235"/>',
  '<text x="25" y="32" font-size="21" fill="#fff" font-family="sans-serif">V4D — actual B143 voxel geometry / common-scale TOP view</text>',
  '<text x="25" y="56" font-size="12" fill="#cde0ee" font-family="sans-serif">LEFT: frozen rejected first V4D / RIGHT: new synthetic AUTHOR candidate (ART NOT REVIEWED)</text>'
 ];
 for(const [index,r] of [a,b].entries()){
  const startX=24+index*546,topY=100,top=new Map();
  for(const [x,y,z,mat] of r.compiled.primitives){
   const k=x+','+z,old=top.get(k);
   if(!old||y>old.y)top.set(k,{x,y,z,mat});
  }
  parts.push('<rect x="'+(startX-6)+'" y="78" width="530" height="584" fill="#1c3549"/>',
   '<text x="'+startX+'" y="94" font-family="sans-serif" fill="#fff" font-size="13">'+
   (index?'NEW VOID / NONRECTANGULAR PROFILE':'FROZEN REJECTED SPINE')+'</text>');
  for(const p of top.values()){
   const x=startX+p.x*scale,y=topY+p.z*scale;
   if(x+scale>startX+525||y+scale>660)stop('PROJECTION_CLIP');
   parts.push('<rect x="'+x+'" y="'+y+'" width="'+scale+'" height="'+scale+
    '" fill="'+(color[MATERIALS[p.mat]]||'#ff9ba1')+'"/>');
  }
 }
 parts.push('</svg>');return parts.join('\n');
}
export function createV4DVoidReliefReview(out){
 if(typeof out!=='string'||!path.isAbsolute(out)||fs.existsSync(out)||
  !fs.existsSync(path.dirname(out)))stop('OUTPUT_PATH');
 const old=compileSculptedSpineV4D(makeV4DSyntheticCivicStudy());
 const candidate=compileV4DVoidRelief(makeV4DVoidReliefFixture());
 if(candidate.worldWrites!==0||candidate.readiness!=='NOT_PREPARED'||
  candidate.architecturalArt!=='NOT_REVIEWED'||old.worldWrites!==0)
  stop('EVIDENCE_BOUNDARY');
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const html=renderB143Html(compileB143Gallery([old.design,candidate.design]),template);
 const report={
  schema:'r125-v4d-opt-in-void-relief-actual-b143-review-v1',
  syntheticAuthorCases:1,realModelCalls:0,worldWrites:0,
  firstV4DArt:'REJECT',candidateArt:'NOT_REVIEWED',
  originalFirstGeometrySha256:old.geometrySha256,
  candidateBaseGeometrySha256:candidate.baselineGeometrySha256,
  candidateGeometrySha256:candidate.geometrySha256,
  candidateSourceSha256:candidate.sourceSha256,
  candidateOriginalPlanSha256:candidate.originalPlanSha256,
  firstV4DVoxels:old.compiled.primitives.length,
  newV4DVoxels:candidate.compiled.primitives.length,
  sourceProof:candidate.sourceProof,
  sourceRouteStatus:candidate.sourceRoutes.status,
  modelProvenance:'SYNTHETIC_AUTHOR_SUPPLIED_NOT_REAL_QWEN',
  humanArtCertifications:0,
  minecraft:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0
 };
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'index.html'),html,{flag:'wx'});
 fs.writeFileSync(path.join(out,'ACTUAL_B143_TOP_COMPARISON.svg'),
  topVoxelSvg(old,candidate),{flag:'wx'});
 fs.writeFileSync(path.join(out,'V4D_RELIEF_SOURCE_REVIEW.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')stop('ARGS');
  console.log(JSON.stringify(createV4DVoidReliefReview(path.resolve(process.argv[3])),null,2));
 }catch(e){console.error('V4D_RELIEF_SOURCE_HOLD',String(e));process.exitCode=2;}
}
