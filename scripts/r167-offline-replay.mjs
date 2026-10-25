/** R167: replay the user's already-saved genuine local R156 replies, with zero inference.
 * Never edit MODEL_RAW_ORIGINAL.txt or R156/R157/R165 evidence.
 * Only bounded, explicitly disclosed HOST selection of axis='z' is allowed
 * when the model mistakenly copies the exact axis legend into a four-room
 * central-spine layout. Shared-node room graph failures remain HOLD.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {R156_CASES} from './r156-unknown-use-study.mjs';
import {makeR134FreshRequest} from './r134-fresh-model-pilot.mjs';
import {parseR139RelationalFurnishedReply} from './r139-relational-model.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const parseFile=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const fail=s=>{throw Error('R167_'+s);};
const safe=r=>r?.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
 r.executionAllowed===false&&r.worldWrites===0&&r.worldContacts===0&&
 r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
 Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0;
const legend=Object.freeze({x:'west-to-east',z:'entrance-front-to-rear'});

/** The model did NOT choose z when it output this legend. This is a host
 * exploratory derivation constrained to a 4-room central-spine request.
 * Preserve exact original bytes, never infer other axes or remove rooms. */
export function deriveR167AxisForStudy(raw) {
 const original=JSON.parse(raw),copy=structuredClone(original);
 const axis=copy?.layout?.axis;
 if(axis==='z'||axis==='x')
  return {derivedRaw:raw,hostAxisDerivation:null};
 if(!axis||typeof axis!=='object'||Array.isArray(axis)||
  Object.keys(axis).length!==2||axis.x!==legend.x||axis.z!==legend.z||
  copy?.architecture?.schema!=='minecraftaibuilder-r160-topology-ir-v1'||
  copy?.architecture?.spatialTopology!=='central-spine'||
  copy?.layout?.spaces?.length!==4) fail('AMBIGUOUS_AXIS_REQUIRES_HOLD');
 copy.layout.axis='z';
 return {derivedRaw:JSON.stringify(copy),hostAxisDerivation:{
  code:'HOST_CHOSE_Z_FROM_COPIED_AXIS_LEGEND_NOT_MODEL_CHOICE',
  originalAxis:axis,derivedAxis:'z',originalRawSha256:hash(raw),
  derivedReplySha256:hash(JSON.stringify(copy)),modelCalls:0,
  originalRawUntouched:true,sourceOnly:true}};
}
function replayCase(dir,c,manifestCase){
 const originalFile=path.join(dir,c.id,'MODEL_RAW_ORIGINAL.txt');
 const oldReportFile=path.join(dir,c.id,'R134_MODEL_REPORT.json');
 const original=fs.readFileSync(originalFile,'utf8');
 const oldReport=parseFile(oldReportFile);
 const entry={id:c.id,use:c.use,modelCallsDuringReplay:0,
  rawSha256:hash(original),originalStatus:oldReport.status,
  hostAxisDerivation:null,sourceVerified:false,sourceSha256:null,
  geometrySha256:null,actualMinecraftWalking:'NOT_TESTED',
  humanArtReview:'ART_HOLD',permittedConstruction:false};
 if(hash(original)!==manifestCase.rawSha256||
    oldReport.model!==manifestCase.model||
    oldReport.modelCalls!==1||oldReport.testInjectionPresent!==false||
    oldReport.originalModelResponseCaptured!==true||!safe(oldReport)||
    manifestCase.safe!==true) {
  entry.reason='R167_HOLD_ORIGINAL_PROVENANCE_OR_SAFETY';return {entry};
 }
 try {
  const result=deriveR167AxisForStudy(original);
  entry.hostAxisDerivation=result.hostAxisDerivation;
  const req=makeR134FreshRequest({brief:c.brief,siteWidth:32,siteDepth:32});
  const composed=parseR139RelationalFurnishedReply(result.derivedRaw,req,
   {allowTopologyComposition:true,allowHostGridResearch:true});
  entry.hostGridResearchOverride=composed.hostGridResearchOverride;
  entry.sectionScope=composed.architectural?.roomSectionScope??'UNKNOWN';
  const built=composed.architectural?.completed;
  if(!built||!verifyCompiled(built.design,built.compiled)||
    built.sourceSha256!==built.compiled.sourceSha256||
    built.geometrySha256!==built.compiled.geometrySha256||
    built.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')
   fail('DERIVED_REAL_SOURCE_OR_ROUTES_NOT_VERIFIED');
  entry.sourceVerified=true;
  entry.sourceSha256=built.sourceSha256;
  entry.geometrySha256=built.geometrySha256;
  entry.voxels=built.compiled.primitives.length;
  entry.roomCount=built.program[0].zones.length;
  entry.reason='HOLD_HOST_DERIVED_3D_REQUIRES_HUMAN_REVIEW';
  return {entry,design:built.design,compiled:built.compiled};
 } catch(e) {
  entry.reason=String(e?.message??e).slice(0,250);
  return {entry};
 }
}
function reportHtml(report) {
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>R167 保存済みQwen 3用途・オフライン再生</title>'+
 '<style>body{font:15px/1.6 system-ui;max-width:1200px;margin:auto;padding:20px;background:#152033;color:#e9f2fa}'+
 'section{padding:16px;border:1px solid #52647a;border-radius:12px;margin:12px 0}'+
 'a{color:#a9deff}iframe{width:100%;height:380px;border:1px solid #789}'+
 'img{max-width:19%;margin:0 0.3%}</style>'+
 '<h1>R167｜保存済み実モデル原文からのホスト派生3D</h1>'+
 '<p>新規モデル推論0回。axisを補正した場合もモデル自身が選んだとは主張しません。原文は変更なし。ART HOLD、施工BLOCKED。</p>'+
 report.cases.map(c=>'<section><h2>'+esc(c.use)+'</h2>'+
 '<p>'+esc(c.reason)+'</p>'+
 '<p>元回答SHA256 '+esc(c.rawSha256)+' / 由来 '+esc(c.hostAxisDerivation?.code??'変換なし')+'</p>'+
 '<p>ホスト別配置: '+esc(c.hostGridResearchOverride?.modelExplicitTopologyNotImplemented?'モデルの中央通路指定とは異なる4室グリッド研究案':'追加なし')+' / 上部断面: '+esc(c.sectionScope??'未生成')+'</p>'+
 (c.sourceVerified?'<iframe src="'+c.id+'-derived.html"></iframe><div>'+
 ['front','rear','west','east','roof'].map(d=>'<a href="'+c.id+'-'+d+'.svg"><img src="'+c.id+'-'+d+'.svg" alt="'+esc(d)+'"></a>').join('')+'</div>':
 '<p>実3Dは未生成。未対応の部屋関係を黙って削除しません。</p>')+'</section>').join('')+
 '<a href="R167_OFFLINE_REPLAY.json">検証の全データ</a></html>';
}
export function runR167OfflineStudy(studyDir,outDir){
 const root=path.resolve(studyDir),dest=path.resolve(outDir);
 if(!fs.statSync(root).isDirectory()||fs.existsSync(dest))fail('FRESH_OUTPUT_REQUIRED');
 const manifest=parseFile(path.join(root,'R156_STUDY_MANIFEST.json'));
 if(manifest.schema!=='r156-unknown-use-v1'||manifest.injectedFakeHttp!==false||
   manifest.architectureMode!=='topology'||manifest.cases?.length!==3||
   R156_CASES.some((c,i)=>c.id!==manifest.cases[i].id))
  fail('STUDY_NOT_GENUINE_LOCAL_THREE_USE_EVIDENCE');
 const cases=R156_CASES.map((c,i)=>replayCase(root,c,manifest.cases[i]));
 const review={schema:'r167-saved-raw-host-derivation-v1',
  source:'SAVED_LOCAL_HTTP_CLAIM_NOT_EXTERNALLY_AUTHENTICATED',
  sourceStudyManifestSha256:hash(fs.readFileSync(path.join(root,'R156_STUDY_MANIFEST.json'))),
  newModelCalls:0,modelOutputReused:true,
  originalR156R157R165EvidenceChanged:false,
  sourceOnly:true,independentRealWorldTrial:false,
  cases:cases.map(x=>x.entry),geometryEvidenceCases:cases.filter(x=>x.entry.sourceVerified).length,
  status:'ART_HOLD_MINECRAFT_UNTESTED_HOST_DERIVATION_ONLY',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},worldContacts:0,worldWrites:0};
 fs.mkdirSync(dest,{recursive:false});
 const write=(name,v)=>fs.writeFileSync(path.join(dest,name),
  typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
 const template=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),
  '../source/ai/b143-viewer-template.html'),'utf8');
 for(const result of cases){
  if(!result.entry.sourceVerified)continue;
  const id=result.entry.id;
  write(id+'-derived-source.json',result.design);
  write(id+'-derived-voxels.json',result.compiled);
  write(id+'-derived.html',renderB143Html(compileB143Gallery([result.design]),template));
  for(const direction of ['front','rear','west','east','roof'])
   write(id+'-'+direction+'.svg',
    renderR164Elevation(result.compiled,result.design,direction));
 }
 write('R167_OFFLINE_REPLAY.json',review);
 write('R167_COMPARE.html',reportHtml(review));
 return review;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==4||args[0]!=='--study'||args[2]!=='--out')
   fail('EXPECTED_STUDY_AND_NEW_OUTPUT');
  const r=runR167OfflineStudy(args[1],args[3]);
  console.log(JSON.stringify({status:r.status,geometryEvidenceCases:r.geometryEvidenceCases,
   cases:r.cases.map(c=>({id:c.id,reason:c.reason,verified:c.sourceVerified})),
   newModelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
