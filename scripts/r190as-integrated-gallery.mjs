/** R190-AS: three matched-camera studies of actual B143 source.
 * Original AR uses retrofit, new AS designs start with supports + envelope + void.
 * Comparison is exploratory, NOT a controlled proof of better architecture.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {R190AS_CO_DESIGNED_CASES} from './r190as-integrated-fixtures.mjs';
import {R190AR_AUTHOR_SUPPORTED_TWIN} from './r190ar-supported-fixtures.mjs';
import {compileR190AQParti} from '../source/ai/r190aq-architectural-parti.mjs';
import {auditR190ARStructuralContinuity} from '../source/ai/r190ar-structure-audit.mjs';
import {reviewR190ASCoDesign} from '../source/ai/r190as-integrated-architecture.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const views=['front','rear','east','west','roof'];
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const write=(f,s)=>fs.writeFileSync(f,s,{flag:'wx'});
const json=(f,x)=>write(f,JSON.stringify(x,null,2)+'\n');

export function writeR190ASIntegratedGallery(out){
 if(!path.isAbsolute(out)||fs.existsSync(out)||
   !fs.existsSync(path.dirname(out))||!fs.statSync(path.dirname(out)).isDirectory())
  throw Error('R190AS_NEW_ABSOLUTE_OUTPUT_REQUIRED');
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 fs.mkdirSync(out);const results=[],links=[];
 const studies=[
  {name:'00-ar-retrofit-reference',kind:'AR_RETROFIT_NOT_CONTROLLED',
   input:R190AR_AUTHOR_SUPPORTED_TWIN},
  ...R190AS_CO_DESIGNED_CASES.map((x,i)=>({
   name:'0'+(i+1)+'-'+x.parti.id,kind:'AS_AUTHOR_INTEGRATED_PARTI',input:x}))
 ];
 for(const c of studies){
  const study=c.kind==='AR_RETROFIT_NOT_CONTROLLED'?
   compileR190AQParti(c.input):reviewR190ASCoDesign(c.input);
  const compiled=study.compiled;
  const design=c.kind==='AR_RETROFIT_NOT_CONTROLLED'?study.design:study.actualB143Design;
  const contact=c.kind==='AR_RETROFIT_NOT_CONTROLLED'?
   auditR190ARStructuralContinuity(study):study.contactAudit;
  const sourceAudit=c.kind==='AR_RETROFIT_NOT_CONTROLLED'?
   study.audit:study.sourceAudit;
  if(!verifyCompiled(design,compiled)||
     contact.status!=='SOURCE_CONTACT_PASS_NOT_ENGINEERING'||
     contact.detachedVoxelCount!==0||
     !sourceAudit.allAnchorsReachable||
     study.worldContacts!==0||study.worldWrites!==0)
   throw Error('R190AS_UNVERIFIED_SOURCE_NOT_ACCEPTABLE');
  json(path.join(out,c.name+'-ORIGINAL-IR.json'),c.input);
  json(path.join(out,c.name+'-B143.json'),design);
  const html=renderB143Html(compileB143Gallery([design]),template);
  if(!html.includes('<body>'))throw Error('R190AS_VIEWER_MISSING');
  write(path.join(out,c.name+'-TRUE-B143.html'),
   html.replace('<body>','<body><aside style="padding:14px;background:#542917;color:white;font:15px system-ui">R190-AS SOURCE / MANUAL SYNTHETIC CONCEPT / TRUE B143 / NO REAL MODEL / ART HOLD / NO CONSTRUCTION</aside>'));
  const elevationSha256={};
  for(const side of views){
   const svg=renderR164Elevation(compiled,design,side);
   write(path.join(out,c.name+'-'+side+'.svg'),svg);
   elevationSha256[side]=sha(svg);
  }
  const data={name:c.name,kind:c.kind,
   originalSourceSha256:compiled.sourceSha256,
   geometrySha256:compiled.geometrySha256,
   elevationSha256,
   trueVoxelCount:compiled.primitives.length,
   verifiedOpenSkyColumns:sourceAudit.openSkyColumns,
   actualTwoWideFloorPads:sourceAudit.doubleSupportedWalkingPads,
   elevatedComponentCount:contact.elevatedComponentCount,
   minGroundContactCells:Math.min(...contact.elevatedComponents.map(x=>x.groundTouchCells)),
   detachedVoxelCount:contact.detachedVoxelCount,
   skyVoidWallCells:contact.skyVoidAdjacentPhysicalFaceCells,
   supportPairs:c.kind==='AS_AUTHOR_INTEGRATED_PARTI'?study.supportedEnvelopePairs:null,
   modelCalls:0,worldContacts:0,worldWrites:0,
   structureEngineering:'NOT_CERTIFIED',art:'ART_HOLD'};
  results.push(data);
  links.push('<li>'+c.name+': <a href="'+c.name+'-TRUE-B143.html">真正3D</a> / '+
    views.map(v=>'<a href="'+c.name+'-'+v+'.svg">'+v+'</a>').join(' / ')+'</li>');
 }
 if(new Set(results.map(r=>r.geometrySha256)).size!==3)throw Error('R190AS_SAME_GEOMETRY');
 const differences=(a,b)=>views.filter(v=>results[a].elevationSha256[v]!==results[b].elevationSha256[v]);
 const report={schema:'minecraftaibuilder-r190as-source-art-comparison-v1',
  author:'HUMAN_AUTHORED_SYNTHETIC_NOT_AI_RESULT',
  runs:results,comparisons:{
   retrofitToCoDesigned:differences(0,1),
   betweenTwoCoDesigned:differences(1,2),
   ARvsAScontrolledAB:false,
   premise:'support mass and roof and public canyon authored simultaneously',
   silhouetteIsNotArtisticValue:true},
  modelCalls:0,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},art:'ART_HOLD',
  officialArtAdoptions:0,fullEngineeringCertification:'NOT_PERFORMED',
  humanAestheticJudgment:'NOT_PERFORMED',minecraftWalking:'NOT_TESTED'};
 json(path.join(out,'SUMMARY.json'),report);
 write(path.join(out,'index.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-AS 支持・殻・大空洞の同時設計</title>'+
  '<h1>R190-AS：構造と空洞を後付けせず同時設計した2案</h1>'+
  '<p>対照は旧ARの後付け支持案。完全統制A/B比較ではありません。'+
  '全て人が記述した合成設計で、実Qwen/Gemmaによる創作を証明しません。</p>'+
  '<p>真正B143の3Dと5方向図はソースの実ボクセルから生成。構造工学の安全、施工、実歩行、美術採用は未認定。</p>'+
  '<ul>'+links.join('')+'</ul><a href="SUMMARY.json">監査・SHA・変化視点</a></html>');
 return {scenes:3,coDesignedCases:2,modelCalls:0,worldWrites:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const a=process.argv.slice(2);if(a.length!==2||a[0]!=='--out')throw Error('R190AS_ARGS');
  console.log(JSON.stringify(writeR190ASIntegratedGallery(a[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
