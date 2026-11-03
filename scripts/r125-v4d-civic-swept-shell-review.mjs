/** True final B143 visual comparison, with provenance and no false ART claim. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeV4DVoidReliefFixture} from './r125-v4d-void-relief-fixture.mjs';
import {makeV4DCivicSweptShellFixture} from './r125-v4d-civic-swept-shell-fixture.mjs';
import {compileV4DVoidRelief} from '../source/ai/r125-v4d-void-relief.mjs';
import {compileV4DSweptShell} from '../source/ai/r125-v4d-civic-swept-shell.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('R125_V4D_SHELL_REVIEW_'+s)};
const colors={stone:'#b9c7d0',concrete:'#d9d8d0',metal:'#738b9f',
 glass:'#5bdbf4',wood:'#c3ad81',glow:'#e5c679',accent:'#b59476'};
function trueTopSvg(results){
 const parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="700" viewBox="0 0 1120 700">',
  '<rect width="1120" height="700" fill="#0f2337"/>',
  '<text x="22" y="32" fill="white" font-family="sans-serif" font-size="20">V4D true B143 / TOP-MOST source voxels / equal scale</text>',
  '<text x="22" y="55" fill="#c8dae5" font-family="sans-serif" font-size="12">LEFT rejected second relief / RIGHT new third swept shell — SOURCE ONLY, ART NOT REVIEWED, no model or world writes</text>'];
 const scale=5;
 results.forEach((r,i)=>{
  const x0=22+i*548,y0=112,top=new Map();
  parts.push('<rect x="'+(x0-8)+'" y="75" width="534" height="612" rx="9" fill="#1d374a"/>',
   '<text x="'+x0+'" y="98" fill="#fff" font-family="sans-serif" font-size="14">'+
   (i?'Third: two tilted swept roof wings + open spine':'Second: interrupted box spine (ART REJECT)')+'</text>');
  for(const [x,y,z,mat] of r.compiled.primitives){
   const key=x+','+z,v=top.get(key);
   if(!v||y>v.y)top.set(key,{x,y,z,mat});
  }
  for(const cell of top.values()){
   const x=x0+cell.x*scale,y=y0+cell.z*scale;
   if(x+scale>x0+526||y+scale>689)fail('TOP_CLIP');
   parts.push('<rect x="'+x+'" y="'+y+'" width="'+scale+'" height="'+scale+
    '" fill="'+(colors[MATERIALS[cell.mat]]||'#ffb1b1')+'"/>');
  }
 });
 parts.push('</svg>');return parts.join('\n');
}
export function createV4DCivicShellReview(dir){
 if(typeof dir!=='string'||!path.isAbsolute(dir)||fs.existsSync(dir)||
  !fs.existsSync(path.dirname(dir)))fail('OUTPUT_PATH');
 const previous=compileV4DVoidRelief(makeV4DVoidReliefFixture());
 const candidate=compileV4DSweptShell(makeV4DCivicSweptShellFixture());
 if(candidate.worldWrites!==0||candidate.architecturalArt!=='NOT_REVIEWED'||
  candidate.readiness!=='NOT_PREPARED'||previous.worldWrites!==0)fail('SAFETY');
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const html=renderB143Html(compileB143Gallery([previous.design,candidate.design]),template);
 const report={
  schema:'r125-v4d-third-swept-shell-actual-b143-source-review-v1',
  syntheticAuthorCandidates:1,realModelCalls:0,
  previousArt:'REJECT',candidateHumanArt:'NOT_REVIEWED',artCertifications:0,
  previousGeometrySha256:previous.geometrySha256,
  candidateGeometrySha256:candidate.geometrySha256,
  candidateSourceSha256:candidate.sourceSha256,
  candidateOriginalPlanSha256:candidate.originalPlanSha256,
  previousVoxelCount:previous.compiled.primitives.length,
  candidateVoxelCount:candidate.compiled.primitives.length,
  sourceProof:candidate.sourceProof,
  sourceRoutesStatus:candidate.sourceRoutes.status,
  provenance:candidate.provenance,minecraftWalking:'NOT_TESTED',
  constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED'),worldContacts:0,worldWrites:0
 };
 fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'index.html'),html,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'ACTUAL_B143_TOP_SHELL_VS_REJECTED.svg'),
  trueTopSvg([previous,candidate]),{flag:'wx'});
 fs.writeFileSync(path.join(dir,'V4D_CIVIC_SHELL_SOURCE_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv.length!==2||argv[0]!=='--out')fail('ARGS');
  console.log(JSON.stringify(createV4DCivicShellReview(path.resolve(argv[1])),null,2));
 }catch(e){console.error('V4D_CIVIC_SHELL_HOLD',String(e));process.exitCode=2;}
}
