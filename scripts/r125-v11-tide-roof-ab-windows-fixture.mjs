/**
 * Synthetic Windows CI input ONLY. These two fake recovery manifests are NOT
 * genuine Qwen output or independent Minecraft evidence. Never upload them,
 * use them as product metrics, or read the user's PRIVATE studies.
 * Windows CI exercises the REAL PowerShell launcher end-to-end.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {writeArchitecturePlanReplay}
 from './r125-offline-replay.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const target=process.argv[2]&&path.resolve(process.argv[2]);
if(!target||!fs.existsSync(target)||target===root||
 target.startsWith(root+path.sep))throw Error('CI_PRIVATE_ROOT_ONLY');
const p={
 schema:'minecraftaibuilder-r125-architecture-plan-v1',
 id:'tide-observatory',title:'CI synthetic tide observatory',
 brief:'A test observatory with a working laboratory and visitor exhibition',
 footprint:{width:24,depth:24},
 levels:[{splitAxis:'x',splitPercent:50,spaces:[
  {id:'lab-room',purpose:'Sample analysis laboratory'},
  {id:'visitor-room',purpose:'Exhibition and visitor information'}]}],
 materials:{floor:'wood',wall:'concrete',roof:'concrete'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'sawtooth',
  roofAxis:'x',facadeLanguage:'plain',roofVolume:'raised'}
};
const raw=JSON.stringify(p,null,2)+'\n';
const rawFile=path.join(target,'CI_SYNTHETIC_INPUT.txt');
fs.writeFileSync(rawFile,raw,{flag:'wx'});
for(const [suffix,missing] of [['STRICT',false],['ART_ONLY',true]]){
 const folder=path.join(target,'V11_EducationRecovered_CI_SYNTHETIC_'+suffix);
 fs.mkdirSync(folder);
 const recovered=path.join(folder,'RECOVERED_SOURCE');
 const result=writeArchitecturePlanReplay({'--raw':rawFile,'--out':recovered});
 const diag=JSON.parse(fs.readFileSync(path.join(recovered,
  'SOURCE_DIAGNOSIS.json'),'utf8'));
 if(result.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||
  diag.sourceVerified!==true||diag.originalSha256!==hash(raw))
  throw Error('CI_SYNTHETIC_REPLAY_FAILED');
 const report={
  schema:'r125-recovered-source-art-review-v1',
  artifactStatus:'SOURCE_PASS_ART_REVIEW_READY',
  model:'qwen3:14b',originalRequestsIdentical:true,
  sourceOriginalsEdited:false,
  before:{originalSha256:'d71eb74c74fda1d959059f5f1a46ef9e6c41f52a2f538b46116c703a7c2a5688'},
  after:{originalSha256:diag.originalSha256,
   sourceSha256:diag.sourceSha256,geometrySha256:diag.geometrySha256,
   sourceVerified:true,status:diag.status},
  education:{missingInGameAttestation:missing?[{material:'glow'}]:[],
   missingMaterialProbe:null},modelCalls:0,worldWrites:0,
  syntheticFixtureNotRealQwen:true
 };
 fs.writeFileSync(path.join(folder,'RECOVERY_ART_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log('CI_SYNTHETIC_PRIVATE_LAUNCHER_FIXTURES_READY');
