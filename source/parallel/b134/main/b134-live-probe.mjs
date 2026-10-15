/**
 * B134 live-readonly bridge. NEVER places, clears or modifies game blocks.
 * Real connection is explicit: only run after /wsserver and !b134 in a test world.
 * Observations are NOT independent certification; no B130 receipts auto-created.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline/promises';
import {fileURLToPath} from 'node:url';
import {stdin,stdout} from 'node:process';
import {parseStairPosition,renderReadOnlyStairProbes,checkB133Sources} from '../../b133/main/b133-readonly-probe.mjs';

const DIR=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(DIR,'../../../..');
export const LIVE_PORT=8000;
const COUNTABLE=new Set([0,1]);
export function preflightB134Live(root=ROOT){
 // Fail closed if the local B133 inherited runtime or B134 bridge was modified.
 const old=checkB133Sources(root);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B134_LIVE_READONLY_MANIFEST.json'),'utf8'));
 const digest=createHash('sha256').update(fs.readFileSync(path.join(root,
  'source/parallel/b134/main/b134-live-probe.mjs'))).digest('hex');
 if(manifest.schema!=='minecraftaibuilder-b134-live-readonly-bundle-v1'||
    manifest.b134SourceSha256!==digest||manifest.blockWritesAllowed!==false||
    manifest.constructionAllowed!==false||manifest.operations?.length!==0||
    old.realEducationReadbacksCertified!==0||old.physicalWalkabilityCertified!==0)
  throw Error('B134_LIVE_PREFLIGHT_SOURCE_CHANGED_OR_UNSAFE');
 return {readyForDiagnosticOnly:true,constructionAllowed:false};
}

export function createB134Commands(position){
 const p=parseStairPosition(position);
 const coords=[p.x,p.y,p.z].join(' ');
 return [
  'testforblock '+coords+' minecraft:oak_stairs',
  ...renderReadOnlyStairProbes(coords).map(x=>x.slice(1))
 ];
}
export function classifyB134Response(result){
 if(result?.transportError===true)return 'UNKNOWN';
 if(typeof result?.statusCode!=='number'||result.statusCode<0)return 'UNKNOWN';
 // A 0 successCount is not inferred from statusMessage or a negative statusCode.
 // Some Education versions may omit successCount entirely; refuse to guess.
 if(!COUNTABLE.has(result.successCount))return 'UNKNOWN';
 return result.successCount===1?'MATCH':'NO_MATCH';
}
function minimizedResponse(value){
 const r=value&&typeof value==='object'?value:{};
 return {
  statusCode:Number.isFinite(r.statusCode)?r.statusCode:null,
  successCount:COUNTABLE.has(r.successCount)?r.successCount:null,
  statusMessage:typeof r.statusMessage==='string'?r.statusMessage.slice(0,512):null,
  transportError:r.transportError===true
 };
}
export function evaluateB134Results(position,results){
 const commands=createB134Commands(position);
 if(!Array.isArray(results)||results.length!==5)
  throw Error('B134_REQUIRE_EXACTLY_FIVE_QUERY_RESULTS');
 const inspections=commands.map((command,index)=>({
  command,classification:classifyB134Response(results[index]),
  response:minimizedResponse(results[index])
 }));
 const baselineOk=inspections[0].classification==='MATCH';
 const probes=inspections.slice(1);
 const hits=probes.flatMap((x,index)=>x.classification==='MATCH'?[index]:[]);
 const complete=baselineOk&&hits.length===1&&
  probes.every(x=>x.classification!=='UNKNOWN')&&
  probes.filter(x=>x.classification==='NO_MATCH').length===3;
 return {
  schema:'minecraftaibuilder-b134-live-readonly-diagnostic-v1',
  coords:parseStairPosition(position),
  results:inspections,
  provisionalStateValue:complete?hits[0]:null,
  outcome:complete?'UNIQUE_FOUR_STATE_RESPONSE_NEEDS_VISUAL_REVIEW':
   'INCONCLUSIVE_NEEDS_GAME_INSPECTION',
  transportReported:true,
  independentImageReview:false,walkabilityVerified:false,
  authenticatedStairCertification:false,constructionAllowed:false,
  readiness:'NOT_PREPARED',operations:[]
 };
}
export async function queryB134World(world,position){
 if(!world||typeof world.runCommand!=='function')
  throw Error('B134_NO_WORLD_RUNCOMMAND_INTERFACE');
 const commands=createB134Commands(position),results=[];
 for(const command of commands){
  if(!command.startsWith('testforblock ')||command.includes('\n')||
     /(^|\s)(setblock|fill|clone|execute|tp|summon)(\s|$)/i.test(command))
   throw Error('B134_READONLY_ALLOWLIST_REJECTED');
  try{
   const result=await world.runCommand(command,{timeout:8000,noResponse:false});
   results.push(result);
  }catch(error){
   results.push({
    transportError:true,
    statusMessage:String(error?.message??'unknown error').slice(0,512)
   });
  }
 }
 return evaluateB134Results(position,results);
}
export function saveB134Diagnostic(report,root=ROOT){
 if(report?.schema!=='minecraftaibuilder-b134-live-readonly-diagnostic-v1'||
    report.constructionAllowed!==false||report.operations?.length!==0||
    report.authenticatedStairCertification!==false)
  throw Error('B134_INVALID_REPORT_REFUSED');
 const folder=path.join(root,'data','B134_Live_Diagnostics');
 fs.mkdirSync(folder,{recursive:true});
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const filename='B134_'+stamp+'_'+process.pid+'.json';
 const final=path.join(folder,filename);
 fs.writeFileSync(final,JSON.stringify({...report,
  observedAt:new Date().toISOString(),unreviewedHumanEvidence:true,
  note:'Diagnostic transport responses only; not authenticated Education calibration'
 },null,2)+'\n',{flag:'wx'});
 return final;
}
export async function runB134Live({root=ROOT,inputPosition=null}={}){
 preflightB134Live(root);
 const rl=readline.createInterface({input:stdin,output:stdout});
 let position;
 try{
  const raw=inputPosition??await rl.question(
   '既存テストワールドのオーク階段XYZ（整数3個）を入力、Qで中止: ');
  if(raw.trim().toUpperCase()==='Q')return;
  position=parseStairPosition(raw);
 }finally{rl.close();}
 console.log('B134 開始：テストワールドへの接続のみ許可。ブロック変更はしません。');
 console.log('Minecraft Educationで /wsserver localhost:8000 を実行してください。');
 console.log('接続後、ゲームのチャットに !b134 を送ってください。5つの読み取りコマンドだけ送信します。');
 console.log('結果はローカルの data/B134_Live_Diagnostics/ に保存します。');
 let socket;
 try{socket=await import('socket-be');}
 catch{
  throw Error('B134_SOCKET_BE_NOT_INSTALLED: npm.cmd install --ignore-scripts --no-audit --no-fund');
 }
 const {Server,ServerEvent}=socket;
 let started=false;
 const server=new Server({port:LIVE_PORT,ip:'127.0.0.1',host:'127.0.0.1'});
 server.on(ServerEvent.Open,()=>console.log('WebSocketリスナー開始: localhost:8000'));
 server.on(ServerEvent.PlayerChat,async ev=>{
  if(started||ev?.message!=='!b134'||!ev.world)return;
  started=true;
  try{
   const result=await queryB134World(ev.world,position);
   const file=saveB134Diagnostic(result,root);
   console.log('B134 結果: '+result.outcome);
   console.log('状態値候補: '+(result.provisionalStateValue??'不明'));
   console.log('ログ: '+file);
   console.log('方向の目視・歩行・証拠認証はまだ未実施です。');
  }catch(e){console.error('B134安全停止: '+e.message);process.exitCode=1;}
  finally{setTimeout(()=>process.exit(process.exitCode??0),250);}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const action=process.argv[2]??'--live';
  if(action==='--dry-run'){
   console.log(createB134Commands(process.argv.slice(3).join(' ')).join('\n'));
  }else if(action==='--live')await runB134Live({
   inputPosition:process.argv.length>3?process.argv.slice(3).join(' '):null
  });
  else throw Error('B134_ONLY_LIVE_OR_DRY_RUN');
 }catch(e){console.error('B134停止: '+e.message);process.exitCode=1;}
}
