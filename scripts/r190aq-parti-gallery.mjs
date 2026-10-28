/** R190-AQ true voxel source gallery. No model calls or world IO. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {R190AQ_AUTHOR_CASES} from './r190aq-parti-fixtures.mjs';
import {compileR190AQParti} from '../source/ai/r190aq-architectural-parti.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const views=['front','rear','east','west','roof'];
const sha=s=>createHash('sha256').update(s).digest('hex');
const write=(f,s)=>fs.writeFileSync(f,s,{flag:'wx'});
const json=(f,v)=>write(f,JSON.stringify(v,null,2)+'\n');
export function writeR190AQPartiGallery(out){
 if(!path.isAbsolute(out)||fs.existsSync(out)||
    !fs.existsSync(path.dirname(out))||!fs.statSync(path.dirname(out)).isDirectory())
  throw Error('R190AQ_NEW_ABSOLUTE_OUTPUT_REQUIRED');
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const results=[],links=[];fs.mkdirSync(out);
 for(const p of R190AQ_AUTHOR_CASES){
  const built=compileR190AQParti(p);
  if(!verifyCompiled(built.design,built.compiled)||
   !built.audit.allAnchorsReachable||built.audit.openSkyColumns<100||
   built.worldContacts!==0||built.worldWrites!==0||
   built.audit.physicalVoidProof.some(v=>v.removedPhysicalB143Cells<4))
   throw Error('R190AQ_SOURCE_PROOF_HOLD');
  const name=p.id;
  json(path.join(out,name+'-AUTHORED-IR.json'),p);
  json(path.join(out,name+'-B143-SOURCE.json'),built.design);
  const html=renderB143Html(compileB143Gallery([built.design]),template);
  if(!html.includes('<body>'))throw Error('R190AQ_VIEWER_NO_BODY');
  write(path.join(out,name+'-TRUE-B143.html'),
   html.replace('<body>','<body><aside style="padding:14px;background:#542917;color:white;font:16px system-ui">R190-AQ SYNTHETIC ARCHITECT PARTI - TRUE B143 - NOT AI RESPONSE - NO WORLD WRITES - ART HOLD</aside>'));
  const fingerprints={};
  for(const side of views){
   const svg=renderR164Elevation(built.compiled,built.design,side);
   write(path.join(out,name+'-'+side+'.svg'),svg);
   fingerprints[side]=sha(svg);
  }
  results.push({name,sourceProvenance:'MANUALLY_AUTHORED_SYNTHETIC_NOT_MODEL',
   inputSha256:built.inputSha256,
   geometrySha256:built.compiled.geometrySha256,
   sourceSha256:built.compiled.sourceSha256,
   b143VoxelCount:built.compiled.primitives.length,
   elevationSha256:fingerprints,audit:built.audit,
   safety:{readiness:built.readiness,constructionApproved:built.constructionApproved,
    executionAllowed:built.executionAllowed,gates:built.gates,
    BuildPlan:built.BuildPlan,worldContacts:built.worldContacts,
    worldWrites:built.worldWrites},art:'ART_HOLD'});
  links.push('<li>'+p.title+' / <a href="'+name+'-TRUE-B143.html">TRUE B143 3D</a> / '+
    views.map(v=>'<a href="'+name+'-'+v+'.svg">'+v+'</a>').join(' / ')+'</li>');
 }
 if(new Set(results.map(x=>x.geometrySha256)).size!==results.length||
    results.length!==2)throw Error('R190AQ_DISTINCT_MACRO_GEOMETRY_HOLD');
 const changed=views.filter(k=>results[0].elevationSha256[k]!==results[1].elevationSha256[k]);
 json(path.join(out,'SUMMARY.json'),{
  schema:'minecraftaibuilder-r190aq-parti-gallery-v1',
  studyType:'AUTHOR_PROVIDED_VOLUMETRIC_PARTI_NOT_FIXED_TYPOLOGY',
  modelCalls:0,worldContacts:0,worldWrites:0,
  comparison:{changedViews:changed,notAnABControl:true,
    sourceSilhouetteDifferenceIsNotVisualQualityProof:true},
  results,readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},art:'ART_HOLD',
  officialArtAdoptions:0,humanArtReview:'NOT_PERFORMED',
  userBriefCompliance:'NOT_TESTED',
  actualMinecraftWalking:'NOT_TESTED',
  statement:'This validates possible geometry expressivity only; no real model generation or design admission.'});
 write(path.join(out,'index.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-AQ 非テンプレート立体構想</title>'+
  '<h1>R190-AQ 建築構想→質量・大空洞・主要動線</h1>'+
  '<p>固定類型を使わず、形状と空洞を独立に書いた2件の架空研究。真正B143。' +
  'AIが生成した成果ではなく、目的は表現能力の技術検証。正式美術採用0、Minecraft施工0。</p>'+
  '<ul>'+links.join('')+'</ul><p><a href="SUMMARY.json">物理監査・正確なSHA</a></p></html>');
 return {scenes:2,modelCalls:0,worldWrites:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const a=process.argv.slice(2);if(a.length!==2||a[0]!=='--out')throw Error('R190AQ_ARGS');
  console.log(JSON.stringify(writeR190AQPartiGallery(a[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
