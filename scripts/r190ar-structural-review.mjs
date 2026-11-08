/** R190-AR: inspect real B143 elevated mass support against actual voxel floor.
 * Original AQ vs intentionally revised, author-controlled geometry.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {R190AQ_AUTHOR_CASES} from './r190aq-parti-fixtures.mjs';
import {R190AR_AUTHOR_SUPPORTED_TWIN} from './r190ar-supported-fixtures.mjs';
import {compileR190AQParti} from '../source/ai/r190aq-architectural-parti.mjs';
import {auditR190ARStructuralContinuity} from '../source/ai/r190ar-structure-audit.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const views=['front','rear','east','west','roof'];
const sha=s=>createHash('sha256').update(s).digest('hex');
const json=(file,data)=>fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const write=(file,text)=>fs.writeFileSync(file,text,{flag:'wx'});
const cases=[...R190AQ_AUTHOR_CASES,R190AR_AUTHOR_SUPPORTED_TWIN];
export function writeR190ARReview(out){
 if(!path.isAbsolute(out)||fs.existsSync(out)||
  !fs.existsSync(path.dirname(out))||!fs.statSync(path.dirname(out)).isDirectory())
  throw Error('R190AR_NEW_ABSOLUTE_OUTPUT_REQUIRED');
 fs.mkdirSync(out);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const records=[],links=[];
 for(const p of cases){
  const study=compileR190AQParti(p);
  const support=auditR190ARStructuralContinuity(study);
  if(!verifyCompiled(study.design,study.compiled)||!study.audit.allAnchorsReachable||
   study.worldWrites!==0||study.worldContacts!==0||study.audit.openSkyColumns<100)
   throw Error('R190AR_TRUE_B143_REQUIREMENT');
  if(p.id===R190AR_AUTHOR_SUPPORTED_TWIN.id &&
   (support.status!=='SOURCE_CONTACT_PASS_NOT_ENGINEERING'||
    support.detachedVoxelCount!==0||
    support.elevatedComponentCount!==1))
   throw Error('R190AR_REVISED_STRUCTURE_NOT_CONTACT_SUPPORTED');
  if(p.id!==R190AR_AUTHOR_SUPPORTED_TWIN.id&&
   support.status!=='HOLD_DETACHED_ELEVATED_GEOMETRY')
   throw Error('R190AR_MUST_EXPOSE_ORIGINAL_UNSUPPORTED_MASS');
  json(path.join(out,p.id+'-IR.json'),p);
  json(path.join(out,p.id+'-B143.json'),study.design);
  const html=renderB143Html(compileB143Gallery([study.design]),template);
  if(!html.includes('<body>'))throw Error('R190AR_VIEWER_MISSING');
  write(path.join(out,p.id+'-TRUE-B143.html'),
   html.replace('<body>','<body><aside style="padding:14px;background:#542917;color:white;font:16px system-ui">R190-AR SOURCE-ONLY / MANUALLY AUTHORED / 3D B143 / PHYSICAL CONTACT NOT LOAD CERTIFICATION / ART HOLD</aside>'));
  const faces={};
  for(const v of views){
   const svg=renderR164Elevation(study.compiled,study.design,v);
   write(path.join(out,p.id+'-'+v+'.svg'),svg);
   faces[v]=sha(svg);
  }
  records.push({id:p.id,provenance:'MANUALLY_AUTHORED_NOT_REAL_MODEL',
   geometrySha256:study.compiled.geometrySha256,
   sourceSha256:study.compiled.sourceSha256,
   voxels:study.compiled.primitives.length,
   sky:study.audit.openSkyColumns,
   sourceWalkingPads:study.audit.doubleSupportedWalkingPads,
   audit:support,elevationsSha256:faces,
   modelCalls:0,worldWrites:0,art:'ART_HOLD'});
  links.push('<li>'+p.id+': <a href="'+p.id+'-TRUE-B143.html">真正3D</a> '+
   views.map(v=>'<a href="'+p.id+'-'+v+'.svg">'+v+'</a>').join(' / ')+'</li>');
 }
 const [original,other,revised]=records;
 const contrast=views.filter(v=>original.elevationsSha256[v]!==revised.elevationsSha256[v]);
 if(contrast.length<2||original.sky!==revised.sky||
    original.audit.detachedVoxelCount===0||
    other.audit.detachedVoxelCount===0||revised.audit.detachedVoxelCount!==0)
  throw Error('R190AR_CONTRAST_NOT_SUPPORTED');
 const report={schema:'minecraftaibuilder-r190ar-structural-mass-study-v1',
  provenance:'SYNTHETIC_NOT_REAL_MODEL',cases:records,
  comparisons:{originalToRevisedChangedViews:contrast,
   originalSkyColumnCountUnchanged:true,
   samePedestrianPassageAndAnchors:true,
   addsSixHumanSpecifiedBraces:true,notControlledArtImprovement:true},
  modelCalls:0,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},officialArtAdoptions:0,
  art:'ART_HOLD',actualMinecraftWalking:'NOT_TESTED',
  loadBearingEngineering:'NOT_CERTIFIED',humanAesthetics:'NOT_APPROVED'};
 json(path.join(out,'SUMMARY.json'),report);
 write(path.join(out,'index.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-AR 質量の地盤接続と空洞</title>'+
  '<h1>R190-AR：元の浮遊状態と支持リブ追加案の比較</h1>'+
  '<p>3案とも人が指定した合成IR。B143で物理接触を確認しても、耐荷重・構造安全・美しさは証明されない。施工禁止。</p>'+
  '<ul>'+links.join('')+'</ul><a href="SUMMARY.json">原案HOLD/修正版の接続レシート</a></html>');
 return {cases:3,sourceGeometryVerified:true,worldWrites:0,modelCalls:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')throw Error('R190AR_ARGS');
  console.log(JSON.stringify(writeR190ARReview(a[1]),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
