/**
 * R165: HONEST local three-use B143 architectural evidence inspector.
 *
 * Offline READ ONLY on existing R156 outputs; no new Ollama call, no model
 * rescue, no voxels invented, no Minecraft/world operations.
 * Strictly distinguish model-http claims from verifiable B143 bytes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {R156_CASES} from './r156-unknown-use-study.mjs';
import {verifyCompiled,MATERIALS}
 from '../source/ai/b143-building-dsl.mjs';
import {renderR164Elevation}
 from './r164-exterior-audit.mjs';
const fail=x=>{throw Error('R165_'+x);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=(p)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}};
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const directions=['front','rear','west','east','roof'];
const safe=x=>x?.readiness==='NOT_PREPARED'&&
 x.constructionApproved===false&&x.executionAllowed===false&&
 x.worldWrites===0&&x.worldContacts===0&&
 x.gates?.length===9&&x.gates.every(t=>t==='BLOCKED')&&
 Array.isArray(x.BuildPlan?.operations)&&x.BuildPlan.operations.length===0;
function exteriorSignatures(scene,design){
 const {width:w,depth:d,height:h}=design.bounds;
 const occupied=new Set(scene.primitives.map(p=>p[0]+','+p[1]+','+p[2]));
 const has=(x,y,z)=>occupied.has(x+','+y+','+z);
 const mask={};
 for(const side of directions){
  const width=side==='roof'||side==='front'||side==='rear'?w:d;
  const height=side==='roof'?d:h;
  const rows=[];
  for(let yy=0;yy<height;yy++){
   let bits='';
   for(let xx=0;xx<width;xx++){
    let filled=false;
    if(side==='roof'){
     for(let y=0;y<h;y++)if(has(xx,y,yy)){filled=true;break}
    }else if(side==='front'||side==='rear'){
     for(let z=0;z<d;z++)if(has(xx,h-1-yy,z)){filled=true;break}
    }else{
     for(let x=0;x<w;x++)if(has(x,h-1-yy,xx)){filled=true;break}
    }
    bits+=filled?'1':'0';
   }
   rows.push(bits);
  }
  mask[side]={width,height,hash:sha(width+','+height+':'+rows.join('/')),
   filledCells:rows.join('').replaceAll('0','').length};
 }
 return mask;
}
function inspectCase(dir,reference,caseSpec,manifest){
 const base=path.join(dir,caseSpec.id);
 const rawFile=path.join(base,'MODEL_RAW_ORIGINAL.txt');
 const original=fs.existsSync(rawFile)?fs.readFileSync(rawFile,'utf8'):null;
 const report=read(path.join(base,'R134_MODEL_REPORT.json'));
 const design=read(path.join(base,'DERIVED_B143_SOURCE.json'));
 const compiled=read(path.join(base,'DERIVED_REAL_VOXELS.json'));
 const routes=read(path.join(base,'SOURCE_ROUTES.json'));
 const issues=[];
 const rawSha=original===null?null:sha(original);
 if(original===null)issues.push('NO_ORIGINAL_MODEL_REPLY');
 if(!rawSha||rawSha!==reference.rawSha256)
  issues.push('ORIGINAL_RAW_SHA_DOES_NOT_MATCH_STUDY');
 let parsed;
 try{if(original!==null)parsed=JSON.parse(original)}
 catch{issues.push('ORIGINAL_MODEL_RESPONSE_NOT_JSON')}
 if(!report)issues.push('MODEL_REPORT_MISSING');
 if(!safe(report)||reference.safe!==true)issues.push('SOURCE_SAFETY_NOT_CONFIRMED');
 if(report?.testInjectionPresent!==false||manifest.injectedFakeHttp!==false)
  issues.push('LOCAL_MODEL_HTTP_NOT_INDEPENDENTLY_RECORDED');
 if(!report?.status?.startsWith('SOURCE_CANDIDATE_REAL_LOCAL_')||
  reference.newLocalResponseCandidate!==true||
  report?.modelCalls!==1||report?.originalModelResponseCaptured!==true||
  report?.modelAuthoredProgram!==true||report?.architectureIntentFromModel!==true)
  issues.push('GENUINE_SINGLE_LOCAL_RESPONSE_NOT_ESTABLISHED');
 if(report?.architectureMode!=='topology'||
  parsed?.architecture?.schema!=='minecraftaibuilder-r160-topology-ir-v1')
  issues.push('TOPOLOGY_IR_FROM_ORIGINAL_NOT_ESTABLISHED');
 if(report?.model!==reference.model||report?.sourceSha256!==reference.sourceSha256||
  report?.geometrySha256!==reference.geometrySha256)
  issues.push('MODEL_REPORT_STUDY_PROVENANCE_MISMATCH');
 const sourceVerified=Boolean(design&&compiled&&
  verifyCompiled(design,compiled)&&
  report?.sourceSha256===compiled.sourceSha256&&
  report?.geometrySha256===compiled.geometrySha256&&
  reference.sourceSha256===compiled.sourceSha256&&
  reference.geometrySha256===compiled.geometrySha256);
 if(!sourceVerified)issues.push('B143_SOURCE_BYTES_NOT_VERIFIED');
 if(!routes||routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !Array.isArray(routes.zones)||!routes.zones.every(x=>x.reachedFromEntrance&&
   x.reachedTwoWidePadCount>0)||
  !Array.isArray(routes.featureAccess)||
  !routes.featureAccess.every(x=>x.reachableFromEntrance)||
  routes.zones.length!==report?.zoneCount||
  routes.featureAccess.length!==report?.equipmentCount)
  issues.push('MODEL_PROGRAM_ROOMS_OR_EQUIPMENT_ROUTES_NOT_CONFIRMED');
 if(parsed?.layout?.spaces?.length!==report?.zoneCount||
  !Array.isArray(parsed?.objects)||parsed.objects.length<report?.zoneCount)
  issues.push('RAW_PROGRAM_NOT_CONSISTENT_WITH_DERIVED_ROOMS');
 const masks=sourceVerified?exteriorSignatures(compiled,design):null;
 const materialCounts=sourceVerified?Object.fromEntries(MATERIALS.map((m,i)=>
  [m,compiled.primitives.filter(p=>p[3]===i).length])):null;
 return {
  id:caseSpec.id,use:caseSpec.use,
  originalBrief:caseSpec.brief,
  claimedModel:report?.model??null,
  rawSha256:rawSha,
  sourceSha256:sourceVerified?compiled.sourceSha256:null,
  geometrySha256:sourceVerified?compiled.geometrySha256:null,
  originalRoomCount:parsed?.layout?.spaces?.length??null,
  architectureTopologyFromRaw:parsed?.architecture?.spatialTopology??null,
  equipmentCount:report?.equipmentCount??null,
  sourceRouteStatus:routes?.status??'MISSING',
  sourceOnlyB143ByteVerified:sourceVerified,
  sourceSafetyBlocked:safe(report)&&reference.safe===true,
  locallyReportedLLMSourceIsNotExternallyAuthenticated:true,
  integrityAndEvidenceCandidate:issues.length===0,
  issues,materialVoxelCounts:materialCounts,
  upperRoofAndExteriorMasks:masks,
  actualMinecraftWalking:'NOT_TESTED',
  humanArchitecturalQuality:'ART_HOLD',
  permittedConstruction:false
 };
}
function comparisons(cases){
 const result=[];
 for(let i=0;i<cases.length;i++)for(let j=i+1;j<cases.length;j++){
  const a=cases[i],b=cases[j];
  const matched=Boolean(a.upperRoofAndExteriorMasks&&b.upperRoofAndExteriorMasks);
  const same=matched&&directions.every(d=>
   a.upperRoofAndExteriorMasks[d].hash===b.upperRoofAndExteriorMasks[d].hash);
  result.push({pair:[a.id,b.id],actualBothB143Verified:matched,
   sameUncoloredExteriorSilhouette:matched?same:null,
   identicalDirections:matched?directions.filter(d=>
    a.upperRoofAndExteriorMasks[d].hash===b.upperRoofAndExteriorMasks[d].hash):[],
   humanArchitecturalWinner:'UNDETERMINED'});
 }
 return result;
}
export function evaluateR165Directory(dir){
 if(typeof dir!=='string'||!fs.existsSync(dir)||!fs.statSync(dir).isDirectory())
  fail('STUDY_FOLDER_NOT_FOUND');
 const manifest=read(path.join(dir,'R156_STUDY_MANIFEST.json'));
 if(manifest?.schema!=='r156-unknown-use-v1'||!Array.isArray(manifest.cases)||
  manifest.cases.length!==R156_CASES.length||
  manifest.cases.some((c,i)=>c.id!==R156_CASES[i].id))
  fail('R156_STUDY_PROVENANCE_MISSING_OR_INVALID');
 const candidates=R156_CASES.map((c,i)=>inspectCase(dir,manifest.cases[i],c,manifest));
 const pairs=comparisons(candidates);
 const candidateCount=candidates.filter(c=>c.integrityAndEvidenceCandidate).length;
 const allMeasured=candidates.every(c=>c.sourceOnlyB143ByteVerified);
 const sameSilhouette=pairs.some(x=>x.sameUncoloredExteriorSilhouette===true);
 const status=candidateCount!==3?
  'HOLD_GENUINE_MODEL_OR_SOURCE_INTEGRITY_INCOMPLETE':
  !allMeasured?'HOLD_B143_GEOMETRY_EVIDENCE_INCOMPLETE':
  sameSilhouette?'HOLD_EXTERIOR_SILHOUETTE_CONVERGENCE':
  'HOLD_HUMAN_ART_AND_REAL_MINECRAFT_REVIEW_REQUIRED';
 return {schema:'r165-real-model-source-architecture-audit-v1',
  status,source:'READ_ONLY_FROM_R156_LOCAL_MODEL_OUTPUT_DIRECTORY',
  architectureMode:manifest.architectureMode??null,
  casesWithCompleteLocalEvidence:candidateCount,
  genuineModelProviderExternallyAuthenticated:false,
  newInferenceDuringAudit:0,
  geometryEvidenceCases:candidates.filter(c=>c.sourceOnlyB143ByteVerified).length,
  sourceOnly:true,
  materialsIgnoredForSilhouetteIdentity:true,
  colorMaterialAndDifferentShaCannotProveArchitecturalDiversity:true,
  automaticAestheticRanking:'NEVER',
  comparisonDirections:directions,
  cases:candidates,pairs,
  humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0
 };
}
function view(report){
 const cols=report.cases.map(c=>{
  const validated=c.sourceOnlyB143ByteVerified;
  const figs=validated?directions.map(d=>
   '<figure><img src="R165-'+c.id+'-'+d+'.svg" alt="'+esc(c.id+' '+d)+
   '"/><figcaption>'+esc(d)+'</figcaption></figure>').join(''):'';
  return '<section><h2>'+esc(c.use)+'</h2><p>Local evidence candidate: '+
   (c.integrityAndEvidenceCandidate?'YES, provider unauthenticated':'HOLD')+
   ' ／ 実B143バイト検証：'+(validated?'PASS':'未成立')+'</p>'+
   '<p>Model topology: '+esc(c.architectureTopologyFromRaw)+
   ' ／ 実室 '+esc(c.originalRoomCount)+'</p>'+
   (validated?'<iframe title="'+esc(c.use)+' real B143" loading="lazy" src="'+
     c.id+'/index.html"></iframe><div class="images">'+figs+'</div>':
    '<p class="warn">実ボクセルの正当性を確認できないため3Dの合格表示なし。</p>')+
   '<p><strong>保留理由</strong>：'+esc(c.issues.join(', ')||'美術・実Minecraft試験は未実施')+'</p>'+
   '</section>';
 }).join('');
 const pairs=report.pairs.map(x=>
  '<tr><td>'+esc(x.pair.join(' × '))+'</td><td>'+
  esc(x.sameUncoloredExteriorSilhouette===null?'比較不能':
   x.sameUncoloredExteriorSilhouette?'同一':'異なる')+
  '</td><td>'+esc(x.identicalDirections.join(', '))+'</td></tr>').join('');
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<title>R165：実ローカルモデル未知用途外観の独立比較</title>'+
  '<style>body{margin:0;padding:18px;background:#111b28;color:#e9f2fa;font:14px/1.65 system-ui}'+
  'section{background:#1e2d40;border-radius:12px;min-width:0;padding:14px}'+
  '.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'+
  '.images{display:grid;grid-template-columns:1fr 1fr;gap:7px}figure{margin:0;padding:8px;background:#172637}'+
  'img{max-width:100%;height:auto}iframe{width:100%;height:400px;border:1px solid #72859e;background:white}'+
  '.warn{background:#423629;border-left:3px solid #dfa757;padding:11px}'+
  'table{border-collapse:collapse;width:100%}td,th{text-align:left;border-bottom:1px solid #3c5571;padding:8px}'+
  'a{color:#9dd9ff}@media(max-width:980px){.grid{grid-template-columns:1fr}}</style>'+
  '<h1>R165｜住宅・店舗・研究施設｜実B143を比較</h1>'+
  '<p class="warn"><strong>'+esc(report.status)+'</strong>。'+
  'ローカルHTTP由来のモデル名だけでは提供者を独立認証できません。'+
  'CIの模擬応答を実モデル成功とは扱いません。ART HOLD／施工禁止。</p>'+
  '<div class="grid">'+cols+'</div>'+
  '<h2>色・材質・ラベルを無視した外観シルエット</h2>'+
  '<table><thead><tr><th>ペア</th><th>外観</th><th>一致方向</th></tr></thead><tbody>'+
  pairs+'</tbody></table>'+
  '<p>比較図は実際の保存済みB143から投影したものです。'+
  '部屋の機能、美しさ、雨仕舞い、Minecraft実歩行は人間と実機の審査待ち。</p>'+
  '<p><a href="R165_INDEPENDENT_AUDIT.json">監査の全データ</a></p></html>';
}
export function saveR165Review(dir){
 const r=evaluateR165Directory(dir);
 const files=[['R165_INDEPENDENT_AUDIT.json',JSON.stringify(r,null,2)+'\n'],
  ['R165_COMPARE.html',view(r)]];
 for(const c of r.cases){
  if(!c.sourceOnlyB143ByteVerified)continue;
  const base=path.join(dir,c.id);
  const design=read(path.join(base,'DERIVED_B143_SOURCE.json'));
  const compiled=read(path.join(base,'DERIVED_REAL_VOXELS.json'));
  for(const side of directions){
   files.push(['R165-'+c.id+'-'+side+'.svg',
    renderR164Elevation(compiled,design,side)]);
  }
 }
 // Refuse all collisions BEFORE any write. Original responses, existing
 // viewers, R156/R157 manifest, source arrays are never modified.
 if(files.some(([name])=>fs.existsSync(path.join(dir,name))))
  fail('EVIDENCE_ALREADY_EXISTS_NO_OVERWRITE');
 for(const [name,contents] of files)
  fs.writeFileSync(path.join(dir,name),contents,{flag:'wx'});
 return {report:r,files:files.map(x=>x[0])};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv.length!==2||argv[0]!=='--study')fail('CLI_EXPECTED_STUDY');
  const output=saveR165Review(path.resolve(argv[1]));
  console.log(JSON.stringify({status:output.report.status,
   localEvidenceCandidates:output.report.casesWithCompleteLocalEvidence,
   verifiedB143:output.report.geometryEvidenceCases,
   generatedReviewFiles:output.files.length,
   modelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
