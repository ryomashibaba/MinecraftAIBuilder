/** One chat-authored architecture candidate, never local Qwen/Gemma or a reusable template. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {deriveBO} from './r190bo-spatial-local.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const BRIEF_SHA='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
export function studyR190BS({out}){
 const brief=fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt'));
 const raw=fs.readFileSync(path.join(ROOT,'evidence/r190bs/CHAT_GPT_DESIGN.json'));
 if(sha(brief)!==BRIEF_SHA)throw Error('R190BS_ORIGINAL_BRIEF_MISMATCH');
 const source=JSON.parse(raw.toString('utf8'));
 if(source.originalBriefSha256!==BRIEF_SHA||source.levels.length!==9||
  !source.assumptions.some(x=>x.includes('CHAT_GPT_6_AUTHORED_NOT_QWEN_GEMMA_OR_LOCAL_PROVIDER')))
  throw Error('R190BS_SOURCE_PROVENANCE');
 const dir=path.resolve(out);
 if(fs.existsSync(dir))throw Error('R190BS_OUTPUT_EXISTS');
 fs.mkdirSync(dir);
 const receipt=deriveBO({dir,raw,brief,origin:'CHAT_GPT_6_AUTHORED_NON_PROVIDER'});
 const geometryExists=fs.existsSync(path.join(dir,'DERIVED_3D.html'));
 const bq=fs.existsSync(path.join(dir,'PHYSICAL_PROGRAM_REVIEW.json'))?
  JSON.parse(fs.readFileSync(path.join(dir,'PHYSICAL_PROGRAM_REVIEW.json'))):null;
 const report={schema:'minecraftaibuilder-r190bs-source-study-v1',
  authorship:'CHAT_GPT_6_AUTHORED_NON_PROVIDER_NOT_QWEN_GEMMA',
  designName:source.title,originalBriefSha256:sha(brief),rawSha256:sha(raw),
  modelCalls:0,networkRequests:0,actualQwenOrGemmaInference:false,
  geometryExists,geometrySha256:receipt.geometrySha256??null,geometryStatus:receipt.status,
  sourceTechnicalStatus:receipt.sourceTechnicalStatus??null,
  failure:receipt.failure??null,authorStandingLevels:source.levels.map(l=>l.standingY),
  measuredStandingLevels:bq?.physicalLevels??null,
  physicalSpaces:bq?.spaces.map(s=>({id:s.id,y:s.standingY,
   unsupportedFloorCells:s.missingSupportCells,obstructedAirCells:s.obstructedAirCells}))??null,
  independentFidelity:'NOT_CERTIFIED',art:'ART_HOLD',officialArtAdoptions:0,
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},worldContacts:0,worldWrites:0};
 fs.writeFileSync(path.join(dir,'STUDY.json'),json(report),{flag:'wx'});
 const files=fs.readdirSync(dir).filter(n=>n!=='INVENTORY.json').sort().map(file=>{
  const bytes=fs.readFileSync(path.join(dir,file));return {file,bytes:bytes.length,sha256:sha(bytes)};
 });
 fs.writeFileSync(path.join(dir,'INVENTORY.json'),json({files,originalSourceUnmodified:true}));
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190BS_CLI');
  const r=studyR190BS({out:process.argv[3]});
  console.log(json(r));
  if(r.geometryStatus!=='SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD')process.exitCode=2;
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
