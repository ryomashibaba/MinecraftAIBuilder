/** V4D true B143 scene and SOURCE-only fixed projections, not fake art. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileSculptedSpineV4D} from '../source/ai/r125-sculpted-spine-v4d.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {makeV4DSyntheticCivicStudy} from './r125-v4d-synthetic-fixture.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('R125_V4D_PREVIEW_'+s)};
const palette={stone:'#b9c7d0',concrete:'#dfd9cf',metal:'#778998',
 glass:'#55e0e4',wood:'#b49b7b',glow:'#eace7e',accent:'#bc9672'};
export function renderV4DTrueSourceSvg(result){
 if(result?.provenance!=='SYNTHETIC_AUTHOR_SUPPLIED_NOT_REAL_QWEN'||
  result.worldWrites!==0||result.architecturalArt!=='NOT_REVIEWED'||
  !result.compiled?.primitives?.length)fail('PROVENANCE');
 const top=new Map(),front=new Map();
 for(const [x,y,z,mat] of result.compiled.primitives){
  const k=x+','+z,a=top.get(k);
  if(!a||a.y<y)top.set(k,{x,y,z,mat});
  const k2=x+','+y,f=front.get(k2);
  if(!f||f.z>z)front.set(k2,{x,y,z,mat});
 }
 const w=1060,h=670,s=6,parts=[
  '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">',
  '<rect width="'+w+'" height="'+h+'" fill="#0c1b2b"/>',
  '<text x="22" y="30" font-size="22" font-family="sans-serif" fill="#f3f6f7">V4D / ACTUAL B143 — STAGGERED PUBLIC SPINE</text>',
  '<text x="22" y="51" font-size="12" font-family="sans-serif" fill="#bfd1d9">One SYNTHETIC AUTHOR fixture / SOURCE-only / ART NOT REVIEWED / not real Qwen / no world writes</text>',
  '<rect x="16" y="70" width="510" height="590" rx="8" fill="#183149"/>',
  '<rect x="534" y="70" width="510" height="590" rx="8" fill="#183149"/>',
  '<text x="30" y="93" font-size="16" font-family="sans-serif" fill="#fff">True topmost voxel plan / north at top</text>',
  '<text x="548" y="93" font-size="16" font-family="sans-serif" fill="#fff">True north elevation / material and silhouette</text>'
 ];
 for(const cell of top.values()){
  const x=30+cell.x*s,y=105+cell.z*s;
  if(x+s>526||y+s>660)fail('TOP_PROJECTION_CLIP');
  parts.push('<rect x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+
   '" fill="'+(palette[MATERIALS[cell.mat]]||'#f0a9ae')+'"/>');
 }
 for(const cell of front.values()){
  const x=548+cell.x*s,y=300-cell.y*s;
  if(x+s>1044||y<100)fail('ELEVATION_PROJECTION_CLIP');
  parts.push('<rect x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+
   '" fill="'+(palette[MATERIALS[cell.mat]]||'#f0a9ae')+'"/>');
 }
 const p=result.sourceProof;
 parts.push('<text x="548" y="335" font-size="13" font-family="sans-serif" fill="#e5edf3">Roof levels: '+
  p.roofDatums.join(' / ')+'   |   transparent glass: '+
  p.actualGlassVoxels+' voxels</text>',
  '<text x="548" y="358" font-size="13" font-family="sans-serif" fill="#e5edf3">Public side bays: '+
  p.openLoggiaBays+'   |   supported exterior pads: '+p.twoWideReachableApronPads+'</text>',
  '<text x="548" y="382" font-size="12" font-family="sans-serif" fill="#a9becb">No construction or actual walking is certified</text>',
  '</svg>');
 return parts.join('\n');
}
export function createV4DReview({outDir}={}){
 if(typeof outDir!=='string'||!path.isAbsolute(outDir)||
  fs.existsSync(outDir)||!fs.existsSync(path.dirname(outDir)))
  fail('OUTPUT_PATH');
 const r=compileSculptedSpineV4D(makeV4DSyntheticCivicStudy());
 if(r.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  r.worldWrites!==0||r.constructionApproved!==false||
  r.architecturalArt!=='NOT_REVIEWED'||r.authorIsRealModel!=='NOT_ATTESTED')
  fail('PROVENANCE_HOLD');
 const gallery=compileB143Gallery([r.design]);
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const html=renderB143Html(gallery,template);
 const svg=renderV4DTrueSourceSvg(r);
 const report={schema:'r125-v4d-single-authored-source-review-v1',
  status:'SOURCE_ONLY_ART_HOLD',syntheticCases:1,modelCalls:0,
  realQwenDesignCount:0,humanArt:'NOT_REVIEWED',
  sourceSha256:r.sourceSha256,geometrySha256:r.geometrySha256,
  originalPlanSha256:r.originalPlanSha256,
  b143VoxelCount:r.compiled.primitives.length,
  sourceProof:r.sourceProof,routeStatus:r.sourceRoutes.status,
  provenance:r.provenance,
  independentModelDesignsCertified:0,artisticSuccesses:0,
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED'),worldContacts:0,worldWrites:0};
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'index.html'),html,{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'ACTUAL_B143_SOURCE_VIEWS.svg'),svg,{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'V4D_SOURCE_REVIEW.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('ARGS');
  console.log(JSON.stringify(createV4DReview({outDir:path.resolve(args[1])}),null,2));
 }catch(e){console.error('R125_V4D_PREVIEW_HOLD',String(e?.message??e));process.exitCode=2}
}
