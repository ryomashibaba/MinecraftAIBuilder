/** Eight original model-in-chat authored B143 source-accurate 3D scenes:
 * c01/r01, c03/r02, c05/r03, c08/r04. Actual source JSON unchanged.
 * Not an unattended production LLM run or human aesthetic approval.
 */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getB198EChatAuthoredPilot} from '../source/ai/b198e-chat-authored-pilot.mjs';
import {inspectB198EChatPilot} from '../source/ai/b198e-source-evidence.mjs';
import {compileB143Gallery,renderB143Html,verifyB143Payload}
 from './build-b143-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('B198E_'+s)};
export function buildB198EPreview({dir=path.join(root,'b198e-evidence')}={}){
 if(fs.existsSync(dir))fail('REFUSE_EXISTING_OUTPUT');
 const p=getB198EChatAuthoredPilot(),proof=inspectB198EChatPilot();
 if(proof.objectiveSourceSampleFailures.length>0)
  fail('SOURCE_ANCHOR_FAILURE_'+proof.objectiveSourceSampleFailures.join('_'));
 if(proof.revisionProtectionFailures.length>0)
  fail('REVISION_SOURCE_HOLD_'+proof.revisionProtectionFailures.join('_'));
 if(proof.objectiveSourcePassingCount!==4)fail('SOURCE_GOALS_HOLD');
 const pairs=[['c01','r01'],['c03','r02'],['c05','r03'],['c08','r04']];
 const documents=[];
 for(const [id,rev] of pairs){
  documents.push({...p.created[id],id:'b198e-preview-before-'+id,
   title:'BEFORE '+id.toUpperCase()+' / '+p.created[id].title.slice(0,55)});
  documents.push({...p.revised[rev],id:'b198e-preview-after-'+rev,
   title:'PROPOSED '+rev.toUpperCase()+' / '+p.revised[rev].title.slice(0,51)});
 }
 const gallery=compileB143Gallery(documents);
 if(!verifyB143Payload(gallery)||gallery.scenes.length!==8)
  fail('SOURCE_ACCURATE_GALLERY_FAILED');
 const template=fs.readFileSync(path.join(root,'source/ai/b143-viewer-template.html'),'utf8');
 const warnings='<section id="b198e-source-provenance" class="info warn">'+
  '<strong>B198E GPT-6 Chat著作の実ソース建築</strong>'+
  '<p>このChatで日本語課題を読み、個別に設計した4つの新規建築と4件の修正案です。'+
  '過去の固定テスト建築の使い回しではありません。'+
  'ただし自動AI APIへの自然言語依頼は未実行、12課題中8件は未実施、'+
  '美観・意図理解の第三者評価とMinecraft実歩行は未認証です。</p>'+
  '<p>NOT_PREPARED / 9 BLOCKED / ワールド書き込み0</p></section>';
 const choices='<section id="b198e-navigation" class="info">'+
  '<strong>4つの実設計案と修正案の比較</strong>'+
  '<div class="controls">'+
  '<button type="button" data-b198e="c01">図書館</button>'+
  '<button type="button" data-b198e="c03">大型港</button>'+
  '<button type="button" data-b198e="c05">和風寺院</button>'+
  '<button type="button" data-b198e="c08">空中駅</button></div>'+
  '<div class="controls">'+
  '<button type="button" id="b198e-select-original">元の設計</button>'+
  '<button type="button" id="b198e-select-revised">修正案</button></div>'+
  '<p id="b198e-current-criteria" style="white-space:pre-wrap"></p>'+
  '<p>設計形状の検証と美観・日本語指示の充足評価は独立しています。</p>'+
  '</section>';
 const criteria=Object.fromEntries(proof.creations.map(c=>[
  c.caseId,[c.naturalLanguageRequest,
   'ソース形状基礎検査: '+c.sourceObjectiveGoals.status,
   '計画した座標サンプル: '+c.fixedCoordinateSamplesPassed+'/'+c.fixedCoordinateArchitecturalSamples.length,
   '美観・依頼への意味一致: UNREVIEWED / 人間による3D確認が必要']
 ]));
 const browserJs=[
 '<script id="b198e-review-navigator">',
 '"use strict";',
 '(function(){',
 'const paired=["c01","c03","c05","c08"];',
 'const caseCriteria='+JSON.stringify(criteria).replaceAll('<','\\u003c')+';',
 'let current="c01";',
 'function pick(slot){const i=paired.indexOf(current)*2+slot;index=i;select.value=String(i);setScene();drawSoon();sync();}',
 'function sync(){current=paired[Math.floor(Number(select.value)/2)];',
 'document.getElementById("b198e-current-criteria").textContent=caseCriteria[current].join("\\n");}',
 'document.querySelectorAll("[data-b198e]").forEach(b=>b.addEventListener("click",()=>{current=b.dataset.b198e;pick(0);}));',
 'document.getElementById("b198e-select-original").addEventListener("click",()=>pick(0));',
 'document.getElementById("b198e-select-revised").addEventListener("click",()=>pick(1));',
 'select.addEventListener("change",sync);sync();',
 '})();',
 '</script>'
 ].join('\n');
 const html=renderB143Html(gallery,template)
  .replace('<h2>ChatGPTが設計した新規建築</h2>',
   warnings+choices+'<h2>元のB143コンパイラで検証した3D設計</h2>')
  .replace('</body>',browserJs+'</body>');
 fs.mkdirSync(dir,{recursive:true});
 const write=(name,value)=>fs.writeFileSync(path.join(dir,name),
  typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',
  {flag:'wx'});
 write('index.html',html);
 write('B198E_SOURCE_QUALITY_REPORT.json',proof);
 write('B198E_GALLERY_MANIFEST.json',{
  schema:'b198e-four-by-four-source-gallery-v1',
  modelAuthoringProvenance:p.provenance,viewerSceneCount:8,
  originalCaseIds:Object.keys(p.created),
  revisedCaseIds:Object.keys(p.revised),
  notRunCreationCases:p.unattemptedCreationCases,
  actualModelAPIResponses:0,semanticHumanReview:'UNREVIEWED',
  sourceGeometryHashes:gallery.geometryHashes,
  full12GenreBenchmarkCompleted:false,
  originalB197ArchitectureUntouched:true,
  worldWrites:0,readiness:'NOT_PREPARED'
 });
 for(const [id,d] of [...Object.entries(p.created),...Object.entries(p.revised)])
  write('SOURCE_'+id.toUpperCase()+'.json',d);
 const summary={schema:'b198e-chat-authored-pilot-v1',
  originalDesignCases:4,focusedRevisionCases:4,
  actual3DScenes:8,
  compiledGeometryVoxels:proof.creations.map(c=>c.exactSourceVoxels),
  sourceTargetsPassed:proof.objectiveSourcePassingCount,
  sourceAnchorIssues:proof.objectiveSourceSampleFailures,
  oldBuildingProtectionHolds:proof.revisionProtectionFailures,
  humanSemanticReviewCasesCompleted:0,
  liveProductionModelAPIRuns:0,worldWrites:0,
  readiness:'NOT_PREPARED'};
 write('B198E_SUMMARY.json',summary);
 console.log('B198E_CHAT_AUTHORED_FOUR_ARCHITECTURE_SOURCE_PREVIEW_PASS',
  JSON.stringify(summary));
 return {dir,summary,proof};
}
if(process.argv[1]===fileURLToPath(import.meta.url))buildB198EPreview();
