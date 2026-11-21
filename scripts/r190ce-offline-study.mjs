/** Real BO prepare/replay -> BN/B143 -> CD -> CE eight views.
 * Both cases are SYNTHETIC_TEST_FIXTURE, never a Qwen/Gemma inference.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareBO,replayBO} from './r190bo-spatial-local.mjs';
import {reviewR190CDBOCapture} from './r190cd-bo-capture-review.mjs';
import {renderR190CE} from './r190ce-offline-visual-evidence.mjs';
import {twoLevelReadingProbe,longConcourseProbe} from './fixtures/r190bn-spatial-assemblies.mjs';
const J=x=>JSON.stringify(x,null,2)+'\n';
export function studyR190CE(out){
 if(typeof out!=='string'||!out||fs.existsSync(out))
  throw Error('R190CE_FRESH_OUTPUT_REQUIRED');
 const root=path.resolve(out);
 if(!fs.statSync(path.dirname(root)).isDirectory())throw Error('R190CE_OUTPUT_PARENT');
 fs.mkdirSync(root);
 const cases=[];
 for(const [name,fixture,model] of [
  ['READING_TWO_LEVELS',twoLevelReadingProbe(),'qwen3:14b'],
  ['PUBLIC_CONCOURSE',longConcourseProbe(),'gemma4:26b']]){
  const dir=path.join(root,name);fs.mkdirSync(dir);
  const brief=path.join(dir,'BRIEF.txt'),source=path.join(dir,'ORIGINAL_SYNTHETIC.json');
  fs.writeFileSync(brief,fixture.brief,{flag:'wx'});
  fs.writeFileSync(source,fixture.original,{flag:'wx'});
  const pre=path.join(dir,'prepared'),capture=path.join(dir,'capture'),
   cd=path.join(dir,'cd'),visual=path.join(dir,'visual');
  prepareBO({briefFile:brief,model,out:pre});
  const bo=replayBO({prepared:pre,original:source,out:capture,origin:'SYNTHETIC_TEST_FIXTURE'});
  const cdReport=reviewR190CDBOCapture({capture,out:cd});
  const evidence=renderR190CE({reviewDir:cd,out:visual});
  if(bo.geometrySha256!==cdReport.geometrySha256||
    bo.geometrySha256!==evidence.geometrySha256||
    evidence.artDecision!=='ART_HOLD'||evidence.images.length!==8)
   throw Error('R190CE_GEOMETRY_OR_ART_INCONSISTENT');
  cases.push({name,modelTagOnly:model,origin:'SYNTHETIC_TEST_FIXTURE',
   originalSourceSHA:evidence.sourceRawSha256,briefSHA:evidence.briefSha256,
   geometrySHA:evidence.geometrySha256,voxels:evidence.voxelCount,
   views:8,art:'ART_HOLD',gallery:name+'/visual/REVIEW.html'});
 }
 const summary={schema:'minecraftaibuilder-r190ce-offline-gallery-v1',
  cases,notARealModelSuccess:true,modelCalls:0,networkRequests:0,
  worldContacts:0,worldWrites:0,officialArtAdoptions:0,
  humanArtDecision:'ART_HOLD',readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  constructionApproved:false,executionAllowed:false};
 fs.writeFileSync(path.join(root,'STUDY.json'),J(summary),{flag:'wx'});
 fs.writeFileSync(path.join(root,'INDEX.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-CE ART HOLD evidence</title>'+
  '<body><h1>R190-CE 8視点研究 (合成設計・未承認)</h1><p>モデル推論0、美術合格0、施工0。</p>'+
  cases.map(c=>'<p><a href="'+c.gallery+'">'+c.name+'</a>：'+c.voxels+
   '真voxel、8視点、ART HOLD</p>').join('')+'</body></html>',{flag:'wx'});
 return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190CE_CLI');
  const r=studyR190CE(process.argv[3]);
  console.log(J({cases:r.cases.map(c=>({name:c.name,voxels:c.voxels})),
    modelCalls:0,art:r.humanArtDecision,worldWrites:0}));
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
