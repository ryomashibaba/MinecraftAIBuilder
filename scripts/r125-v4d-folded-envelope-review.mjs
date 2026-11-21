/** Actual verified B143, not an impressionistic invented architecture render. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeV4DFoldedEnvelopeFixture} from './r125-v4d-folded-envelope-fixture.mjs';
import {makeV4DCivicSweptShellFixture} from './r125-v4d-civic-swept-shell-fixture.mjs';
import {compileV4DFoldedEnvelope} from '../source/ai/r125-v4d-folded-envelope.mjs';
import {compileV4DSweptShell} from '../source/ai/r125-v4d-civic-swept-shell.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('R125_V4D_FOLDED_PREVIEW_'+s)};
const color={stone:'#b8c7ce',concrete:'#d4d4cf',metal:'#66879c',
 glass:'#4dcae0',wood:'#c9aa7d',glow:'#ead88d',accent:'#bd9272'};
function elevationSvg(a,b){
 const parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1170" height="730" viewBox="0 0 1170 730">',
  '<rect width="1170" height="730" fill="#0b1e30"/>',
  '<text x="20" y="30" font-family="sans-serif" font-size="21" fill="#fff">V4D SOURCE-ONLY / ACTUAL FINAL B143</text>',
  '<text x="20" y="51" font-family="sans-serif" font-size="12" fill="#b9d8e8">LEFT: frozen third beam-tilted ART REJECT; RIGHT: fourth authored continuous folded roof (ART NOT REVIEWED)</text>'];
 const w=5;
 for(const [i,r] of [a,b].entries()){
  const x0=16+i*576,z0=104,plan=new Map(),front=new Map();
  for(const [x,y,z,mat] of r.compiled.primitives){
   const k=x+','+z,u=plan.get(k);
   if(!u||y>u.y)plan.set(k,{x,y,z,mat});
   const f=front.get(x+','+y);
   if(!f||z<f.z)front.set(x+','+y,{x,y,z,mat});
  }
  parts.push('<rect x="'+x0+'" y="76" width="566" height="638" rx="8" fill="#1c3549"/>',
  '<text x="'+(x0+8)+'" y="92" fill="#fff" font-family="sans-serif" font-size="13">'+
  (i?'FOURTH — CONTINUOUS SHELL':'THIRD — REPETITIVE BEAMS')+'</text>');
  for(const cell of plan.values()){
   const x=x0+8+cell.x*w,y=z0+cell.z*w;
   if(x+w>x0+566||y+w>570)fail('TOP_CLIPPED');
   parts.push('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+w+
   '" fill="'+(color[MATERIALS[cell.mat]]||'#ffabab')+'"/>');
  }
  for(const cell of front.values()){
   const x=x0+8+cell.x*w,y=704-cell.y*4;
   if(x+w>x0+566||y<570)fail('ELEVATION_CLIPPED');
   parts.push('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+w+
   '" fill="'+(color[MATERIALS[cell.mat]]||'#ffabab')+'"/>');
  }
 }
 parts.push('</svg>');return parts.join('\n');
}
export function createV4DFoldedReview(dir){
 if(typeof dir!=='string'||!path.isAbsolute(dir)||fs.existsSync(dir)||
  !fs.existsSync(path.dirname(dir)))fail('OUTPUT_PATH');
 const old=compileV4DSweptShell(makeV4DCivicSweptShellFixture());
 const candidate=compileV4DFoldedEnvelope(makeV4DFoldedEnvelopeFixture());
 if(candidate.worldWrites!==0||candidate.readiness!=='NOT_PREPARED'||
  candidate.humanArchitecturalArt!=='NOT_REVIEWED'||old.worldWrites!==0)
  fail('GATE');
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const html=renderB143Html(compileB143Gallery([old.design,candidate.design]),template);
 const report={
  schema:'r125-v4d-fourth-continuous-shell-true-b143-source-audit-v1',
  syntheticAuthorCases:1,realModelCalls:0,
  priorThirdArt:'REJECT',fourthHumanArt:'NOT_REVIEWED',
  previousGeometrySha256:old.geometrySha256,
  candidateGeometrySha256:candidate.geometrySha256,
  candidateSourceSha256:candidate.sourceSha256,
  candidateOriginalPlanSha256:candidate.originalPlanSha256,
  thirdVoxelCount:old.compiled.primitives.length,
  fourthVoxelCount:candidate.compiled.primitives.length,
  sourceProof:candidate.sourceProof,
  twoWideRoutesStatus:candidate.sourceRoutes.status,
  provenance:candidate.provenance,
  artisticApprovals:0,minecraftWalking:'NOT_TESTED',
  constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED'),worldContacts:0,worldWrites:0
 };
 fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'index.html'),html,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'TRUE_B143_TOP_AND_FRONT.svg'),
  elevationSvg(old,candidate),{flag:'wx'});
 fs.writeFileSync(path.join(dir,'V4D_FOLDED_SOURCE_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('ARGS');
  console.log(JSON.stringify(createV4DFoldedReview(path.resolve(args[1])),null,2));
 }catch(e){console.error('V4D_FOLDED_SOURCE_HOLD',String(e));process.exitCode=2;}
}
