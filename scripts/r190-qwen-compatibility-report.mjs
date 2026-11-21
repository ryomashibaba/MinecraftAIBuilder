/** R190-E: reproducible archive verification, no model or world contact. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {auditR190ArchivedQwenR146,compileR190ArchivedQwenWithHost,
 auditR190ArchivedR125Plan} from '../source/ai/r190-saved-qwen-bridge.mjs';
import {R190_R146_EXPLICIT_HOST_COMPLETION as host}
 from './r190-saved-qwen-host-completion.mjs';
const fail=x=>{throw Error('R190_ARCHIVE_REPORT_'+x);};
const srcDir=path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_R146='d67dc624744b4745e8e8c228e20bde00ccd39c7b506d0ad82753f54f1db82591';
const original=path.join(srcDir,'fixtures/r146-user-qwen14b-20261025-raw.json');
const r125Names=['r125-qwen14b-residential-2024a.json',
 'r125-qwen14b-shop-20261024.json',
 'r125-qwen14b-research-20261024.json'];
export function buildR190SavedQwenReport(){
 const raw=fs.readFileSync(original,'utf8');
 if(createHash('sha256').update(raw).digest('hex')!==EXPECTED_R146)
  fail('ARCHIVED_SOURCE_HASH_CHANGED');
 const audit=auditR190ArchivedQwenR146(raw);
 const replay=compileR190ArchivedQwenWithHost(raw,host);
 const legacyR125=r125Names.map(name=>({
  archiveFile:name,
  ...auditR190ArchivedR125Plan(JSON.parse(fs.readFileSync(
   path.join(srcDir,'fixtures',name),'utf8')))
 }));
 return {schema:'minecraftaibuilder-r190-real-qwen-compatibility-report-v1',
  provenance:'PRESERVED_USER_QWEN14B_RESPONSES_REPLAY_NO_NEW_MODEL',
  verifiedR146RawSha256:EXPECTED_R146,
  actualNewModelCalls:0,
  archivedR146Audit:audit,
  hostSupplementedR146Replay:replay,
  archivedR125Programs:legacyR125,
  summary:{realArchivedRepliesInspected:4,
   directlyCompatibleWithoutHost:0,
   hostSupplementedR146Layouts:replay.candidates.length,
   actualNewLLMArchitectures:0,
   allHumanArt:'ART_HOLD',worldWrites:0,worldContacts:0,
   modelAuthoredGeometryVerified:false},
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldWrites:0,worldContacts:0};
}
export function saveR190SavedQwenReport(out){
 if(typeof out!=='string'||!out||fs.existsSync(out))
  fail('NEW_OUTPUT_DIRECTORY_REQUIRED');
 const result=buildR190SavedQwenReport();
 fs.mkdirSync(out,{recursive:false});
 fs.writeFileSync(path.join(out,'R190_E_REAL_QWEN_COMPATIBILITY.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '### R190-E 4 archived actual Qwen14B sources; no new inference\n'+
   '3 B143 sources require explicit HOST geometry, ART HOLD.\n');
 return result.summary;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('USAGE');
  console.log(JSON.stringify(saveR190SavedQwenReport(args[1])));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2;}
}
