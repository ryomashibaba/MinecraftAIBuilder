/**
 * OFFLINE R125 private model evidence -> independent entrance-to-every-zone
 * SOURCE route verification -> strict v26.33 material palette -> MakeCode
 * *candidate* in a NEW private directory.
 *
 * Zero Ollama calls, zero world contacts/writes. Never runs any generated code.
 * Existing saved source/raw evidence is read-only and cannot be modified.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';
import {reviewSavedR125} from './r125-saved-semantic-review.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DEFAULT_PALETTE=path.join(ROOT,'configs/r125-education-verified-palette-v26.33.json');
const fail=s=>{throw Error('R125_EDUCATION_PREFLIGHT_'+s);};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
 worldContacts:0,worldWrites:0,actualMinecraftWalking:'NOT_TESTED',
 humanArt:'NOT_REVIEWED'});
function readJsonFile(file,maxBytes=50000){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>maxBytes)fail('UNSAFE_FILE');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function writeNew(file,data){
 fs.writeFileSync(file,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});
}
/** Pure SOURCE candidate; never elevates the safety boundary or model provenance. */
export function reviewEducationCandidate(product,palette,{provenance='UNVERIFIED_DESIGN'}={}){
 const routes=auditR125SourceRoutes(product);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    routes.zones.length!==product.program.flatMap(l=>l.zones).length||
    routes.zones.some(z=>!z.reachedFromEntrance||z.reachedTwoWidePadCount<1))
  return {status:'HOLD_SOURCE_ENTRANCE_TO_ALL_ZONES',
   sourceRoutes:routes,exported:null};
 const exported=exportB143EducationMakeCode({
  design:product.design,scene:product.compiled,
  provenance,verifiedPalette:palette,
  groundLowestLayer:true,tightVoxelEnvelope:true
 });
 if(exported.materialMode!=='STRICT_USER_ATTESTED'||
    exported.sourceSha256!==product.sourceSha256||
    exported.geometrySha256!==product.geometrySha256||
    exported.plannedVoxelCount!==product.compiled.primitives.length||
    exported.usedMaterials.some(m=>m.material!== 'stone'&&
      m.material!=='glass'&&!Object.hasOwn(palette.blocks,m.material))||
    exported.worldWrites!==0||exported.constructionApproved!==false||
    exported.BuildPlan?.operations?.length!==0)
  fail('EXPORT_CONTRACT');
 return {status:'SOURCE_ROUTES_AND_STRICT_MATERIAL_EXPORT_READY',
  sourceRoutes:routes,exported};
}
/**
 * Actual saved-model entry: fail closed without creating an output on
 * test-double, tampering, missing routes, unknown material, or parent paths.
 */
export function prepareSavedR125Education({studyDir,outDir,paletteFile=DEFAULT_PALETTE}={}){
 if(!path.isAbsolute(studyDir??'')||!path.isAbsolute(outDir??'')||
    !path.isAbsolute(paletteFile??''))fail('ABSOLUTE_PATHS_REQUIRED');
 const source=fs.realpathSync(studyDir);
 const output=path.resolve(outDir);
 if(fs.existsSync(output)||source===output||output.startsWith(source+path.sep))
  fail('OUTPUT_EXISTS_OR_OVERLAPS_SOURCE');
 const sourceParent=path.dirname(source);
 const outputParent=fs.realpathSync(path.dirname(output));
 if(outputParent!==sourceParent)
  fail('OUTPUT_MUST_BE_PRIVATE_SIBLING_OF_STUDY');
 const verified=reviewSavedR125(source);
 if(verified.status!=='SOURCE_REPLAY_MATCHED_ART_AND_WORLD_PENDING'||
    verified.provenance!=='LOCAL_MODEL_RUN_REPORTED_NOT_INDEPENDENTLY_ATTESTED')
  fail('SAVED_MODEL_SOURCE_REVIEW_NOT_ELIGIBLE');
 const plan=readJsonFile(path.join(source,'ARCHITECTURE_PLAN.json'));
 const product=compileArchitecturePlan(plan);
 if(product.planSha256!==verified.planSha256||
    product.sourceSha256!==verified.sourceSha256||
    product.geometrySha256!==verified.geometrySha256)
  fail('SOURCE_CHANGED_SINCE_REVIEW');
 const palette=readJsonFile(paletteFile);
 const candidate=reviewEducationCandidate(product,palette,{provenance:'LOCAL_MODEL_CAPTURE'});
 if(candidate.status!=='SOURCE_ROUTES_AND_STRICT_MATERIAL_EXPORT_READY')
  return {schema:'r125-private-education-source-preflight-v1',
   status:candidate.status,sourceRoutes:candidate.sourceRoutes,
   writtenFiles:0,...safety()};
 const {code,...metadata}=candidate.exported;
 const route=candidate.sourceRoutes;
 const receipt={
  schema:'r125-private-education-source-preflight-v1',
  status:'OFFLINE_MAKECODE_CANDIDATE_WORLD_GATE_BLOCKED',
  sourceStudyPath:source,
  modelSourceProvenance:verified.provenance,
  modelOriginalSha256:verified.originalRawSha256,
  sourceSha256:product.sourceSha256,geometrySha256:product.geometrySha256,
  entranceRoutes:route.status,zoneAccess:route.zones,
  materialMode:metadata.materialMode,usedMaterials:metadata.usedMaterials,
  plannedVoxels:metadata.plannedVoxelCount,
  plannedCuboids:metadata.plannedCuboids,
  makecodeSourceSha256:metadata.makecodeSourceSha256,
  exactMaterialCounts:metadata.plannedMaterialCounts,
  externalTerrainNotChecked:true,worldIdentity:'UNVERIFIED',
  backupAndRestore:'UNVERIFIED',worldPermission:'UNVERIFIED',
  manualGameExecutionRequired:true,noAutomaticExecution:true,
  noExistingStudyModified:true,modelCallsByPreflight:0,
  ...safety()
 };
 const instructions=[
  'R125 実Qwen研究施設 — Minecraft Education 施工候補 (安全ゲート未準備)',
  'このフォルダはオフラインで作成した SOURCE / MakeCode データのみ。',
  'Minecraft Educationには一切接続していません。ワールドへの実施工は未実施です。',
  '',
  '実行前の必須ゲート (不足なら貼付・mabbuild 禁止):',
  '1. Minecraft Education v26.33 の隔離試験ワールドを同定する。',
  '2. 元の試験ワールドをコピーし、別名・復元方法を記録する。',
  '3. 既存建築を避けた平坦・空の施工範囲と周辺安全を確認する。',
  '4. 使用材・ブロック名称と使用個数を EXPORT_REPORT.json で確認する。',
  '5. 建物入口と2室・内部空間の通行を、事前に SOURCE_REPORT.json の',
  '   zoneAccess と本物の3Dレビューで確認する。',
  '6. MakeCodeプログラムは、事前の空気/床材検査とFillOperation.Keepを行うが、',
  '   ワールドID・バックアップの真偽・復元可能性は検証できない。',
  '',
  'すべての条件が実際に整ってから、保護された試験ワールドでのみ',
  'MAKECODE_EDUCATION.tsをCode Builderへ手動貼付し、mabset → mabbuild。',
  '完了のチャット表示後にmabverify。失敗したら再実行せずバックアップから復元。',
  '実施工と実歩行は別の証拠が必要。SOURCE PASS はゲーム内PASSではない。',
  '原モデル回答・旧証拠・凍結原本・mainは変更禁止。',
  ''
 ].join('\n');
 // All validation and MakeCode generation happens BEFORE output creation.
 fs.mkdirSync(output);
 try{
  writeNew(path.join(output,'SOURCE_REPORT.json'),receipt);
  writeNew(path.join(output,'R125_SOURCE_ROUTES.json'),route);
  writeNew(path.join(output,'EXPORT_REPORT.json'),metadata);
  writeNew(path.join(output,'MAKECODE_EDUCATION.ts'),code);
  writeNew(path.join(output,'RUN_FIRST_JA.txt'),instructions);
 }catch(e){fail('OUTPUT_INCOMPLETE_PRESERVED_'+String(e.message).slice(0,180));}
 return {...receipt,outputFolder:output,writtenFiles:5};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv.length!==4||argv[0]!=='--study'||argv[2]!=='--out')
   fail('USAGE_--study_ABSOLUTE_PRIVATE_STUDY_--out_FRESH_SIBLING');
  const result=prepareSavedR125Education({
   studyDir:argv[1],outDir:argv[3]});
  console.log(JSON.stringify(result,null,2));
  if(result.status!=='OFFLINE_MAKECODE_CANDIDATE_WORLD_GATE_BLOCKED')
   process.exitCode=2;
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
