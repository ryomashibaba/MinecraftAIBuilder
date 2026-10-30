/** Reproducible zero-network evidence. All successful designs are SYNTHETIC. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareBO,replayBO,verifyBM} from './r190bo-spatial-local.mjs';
import {buildSpatialRequest,hashBO} from '../source/ai/r190bo-spatial-model-contract.mjs';
import {twoLevelReadingProbe,longConcourseProbe} from './fixtures/r190bn-spatial-assemblies.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
export function offlineStudyBO(out){
 const dir=path.resolve(out);
 if(fs.existsSync(dir))throw Error('Fresh output required');fs.mkdirSync(dir);
 const before=verifyBM(),preparations=[];
 for(const model of ['qwen3:14b','gemma4:26b']){
  const name=model.startsWith('qwen')?'qwen-bm-preflight':'gemma-bm-preflight';
  const p=prepareBO({model,out:path.join(dir,name)});
  preparations.push({directory:name,model,briefSha256:p.briefSha256,requestSha256:p.requestSha256,
   schemaSha256:p.schemaSha256,requestBytes:p.requestBytes,status:p.status,
   approvalGranted:false,networkRequests:0});
 }
 const baselines=[];
 for(const side of ['A','B']){
  const r=replayBO({prepared:path.join(dir,'qwen-bm-preflight'),
   original:path.join(ROOT,'evidence/r190bm',side,'model-original/R190_I_ORIGINAL_RESPONSE.txt'),
   out:path.join(dir,'unchanged-bm-'+side)});
  baselines.push({side,status:r.status,originalRawSha256:r.originalRawSha256,failure:r.failure,
   unchanged:true,repaired:false,new3D:false});
 }
 const synthetic=[];
 for(const [name,make] of [['reading',twoLevelReadingProbe],['concourse',longConcourseProbe]]){
  const q=make(),work=path.join(dir,'synthetic-'+name);fs.mkdirSync(work);
  const brief=path.join(work,'FIXTURE_BRIEF.txt'),original=path.join(work,'SYNTHETIC_ASSEMBLY.json');
  fs.writeFileSync(brief,q.brief,{flag:'wx'});fs.writeFileSync(original,q.original,{flag:'wx'});
  prepareBO({briefFile:brief,model:'qwen3:14b',out:path.join(work,'prepared')});
  const r=replayBO({prepared:path.join(work,'prepared'),original,out:path.join(work,'derived'),origin:'SYNTHETIC_TEST_FIXTURE'});
  synthetic.push({directory:'synthetic-'+name+'/derived',status:r.status,origin:r.origin,
   originalRawSha256:r.originalRawSha256,geometrySha256:r.geometrySha256,
   art:r.art,requestFidelity:r.independentRequestFidelity});
 }
 const r190brComparison=['qwen3:14b','gemma4:26b'].map(model=>{
  const old=buildSpatialRequest({brief:before.brief,model,schemaPrompt:'repeated'});
  const compact=buildSpatialRequest({brief:before.brief,model,schemaPrompt:'native-only'});
  const sameNativeFormat=JSON.stringify(old.schema)===JSON.stringify(compact.schema);
  const exactBriefPreserved=[old,compact].every(x=>x.body.messages[1].content.endsWith(before.brief.toString('utf8')));
  if(!sameNativeFormat||!exactBriefPreserved||old.briefSha256!==compact.briefSha256)
   throw Error('R190BR_COMPARISON_INTEGRITY');
  return {model,briefSha256:old.briefSha256,schemaSha256:hashBO(JSON.stringify(old.schema)),
   repeatedRequestSha256:hashBO(old.bytes),nativeOnlyRequestSha256:hashBO(compact.bytes),
   repeatedWireBytes:old.bytes.length,nativeOnlyWireBytes:compact.bytes.length,
   repeatedUserMessageBytes:Buffer.byteLength(old.body.messages[1].content),
   nativeOnlyUserMessageBytes:Buffer.byteLength(compact.body.messages[1].content),
   savedWireBytes:old.bytes.length-compact.bytes.length,
   savedUserMessageBytes:Buffer.byteLength(old.body.messages[1].content)-
    Buffer.byteLength(compact.body.messages[1].content),
   sameNativeFormat,exactBriefPreserved,modelCalls:0,realModelOutcome:'NOT_TESTED'};
 });
 const after=verifyBM();if(before.inventorySha256!==after.inventorySha256)throw Error('BM changed');
 const report={schema:'minecraftaibuilder-r190bo-offline-study-v1',
  newRealModelCalls:0,ollamaContacts:0,networkRequests:0,metadataReads:0,
  technicalResult:'OFFLINE_PATH_VALIDATED_WITH_SYNTHETIC_FIXTURES_ONLY',
  realModelSpatialAssemblySuccess:'NOT_TESTED_AWAITING_SEPARATE_APPROVAL',
  bmInventoryUnchanged:before.inventorySha256===after.inventorySha256,preparations,baselines,synthetic,
  r190brNativeSchemaDeduplication:r190brComparison,
  sameBriefCausalImprovement:'NOT_ESTABLISHED',art:'ART_HOLD',officialArtAdoptions:0,
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},constructionApproved:false,executionAllowed:false};
 fs.writeFileSync(path.join(dir,'STUDY.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(dir,'REVIEW.html'),'<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1"><title>R190-BO 通信0の接続検証</title>'+
  '<style>body{font:16px/1.7 system-ui;max-width:1000px;margin:32px auto;padding:20px;background:#101a2b;color:#f0f4fa}a{color:#9ce}iframe{width:100%;height:600px}article{margin:32px 0}</style>'+
  '<h1>R190-BO｜Spatial Assembly 接続・通信0の検証</h1><p>実Qwen/Gemma推論0。ART HOLD。Minecraft接触・施工0。</p>'+
  '<p>BMの高層ビル原依頼を両モデルの実行前確認へ固定。個別承認待ちで、送信していません。旧A/B原文は無改変でHOLDです。</p>'+
  '<p>下の真正3DはBNの合成検証入力から機械変換したものです。高層ビル依頼に対する実モデル作品ではありません。</p>'+
  synthetic.map(s=>'<article><h2>'+s.directory+' — SYNTHETIC</h2><p>'+s.status+'</p><iframe title="合成・派生3D" src="'+s.directory+'/DERIVED_3D.html"></iframe><p>'+['front','rear','west','east','roof'].map(side=>'<a href="'+s.directory+'/DERIVED_'+side+'.svg">'+side+'</a>').join(' / ')+
   ' / <a href="'+s.directory+'/DERIVED_SECTION.svg">旧BC入口面断面</a> / <a href="'+s.directory+'/DERIVED_SPACE_SECTIONS.json">空間中央の実断面</a> / <a href="'+s.directory+'/FUNCTIONAL_REVIEW.json">機能検査</a> / <a href="'+s.directory+'/MODEL_ORIGINAL.txt">合成入力原文</a> / <a href="'+s.directory+'/DERIVATION.json">対応表</a></p></article>').join('')+
  '<p>技術成立は美術・原文忠実性・用途適合のPASSではありません。<a href="STUDY.json">全記録</a></p></html>',{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('--out FRESH_DIR required');
 console.log(JSON.stringify(offlineStudyBO(process.argv[3]),null,2));
}
