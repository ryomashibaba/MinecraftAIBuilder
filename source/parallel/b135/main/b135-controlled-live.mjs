/**
 * B135 live stair response control calibration. Experiments in test worlds are user approved.
 * Runs ONLY six read-only testforblock commands, never block writes, no auto-certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {stdin,stdout} from 'node:process';
import {parseStairPosition} from '../../b133/main/b133-readonly-probe.mjs';
import {preflightB134Live,B134_SERVER_OPTIONS} from '../../b134/main/b134-live-probe.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const LOCATION='source/parallel/b135/main/b135-controlled-live.mjs';
const LIVE_MANIFEST='B135_CONTROLLED_READBACK_MANIFEST.json';
export const MAX_ROUNDS=4;
const EXECUTION_FAILURES=new Set([-2147352576,-2147352575,-2147352574,-2147352573]);
const FAIL_CODES=new Set([-2147483648,-2147483647,-2147483646,-2147483645,
 -2147483644,-2147483643,-2147483642,-2147483641,-2147483640]);

const sha256=x=>createHash('sha256').update(x).digest('hex');

export function b135Preflight(root=ROOT){
 const old=preflightB134Live(root);
 const pin=JSON.parse(fs.readFileSync(path.join(root,LIVE_MANIFEST),'utf8'));
 const code=fs.readFileSync(path.join(root,LOCATION));
 const previous=fs.readFileSync(path.join(root,'source/parallel/b134/main/b134-live-probe.mjs'));
 if(pin.schema!=='minecraftaibuilder-b135-controlled-live-v1'||
    pin.sourceSha256!==sha256(code)||
    pin.b134SourceSha256!==sha256(previous)||
    pin.allowedCommands?.length!==1||pin.allowedCommands[0]!=='testforblock'||
    pin.maxRounds!==MAX_ROUNDS||pin.constructionAllowed!==false||
    pin.operations?.length!==0||old.constructionAllowed!==false)
  throw Error('B135_RUNTIME_PIN_MISMATCH');
 return {readyForLiveProbeOnly:true,constructionAllowed:false};
}

export function b135Commands(raw){
 const {x,y,z}=parseStairPosition(raw);
 const pos=[x,y,z].join(' ');
 const base='testforblock '+pos+' ';
 return [
  base+'minecraft:oak_stairs',
  base+'minecraft:bedrock',
  ...[0,1,2,3].map(value=>base+'minecraft:oak_stairs ["weirdo_direction" = '+value+']')
 ];
}
function readCode(response){
 return Number.isInteger(response?.statusCode)?response.statusCode:null;
}
function dump(response){
 const r=response&&typeof response==='object'?response:{};
 return {
  statusCode:readCode(r),
  successCount:[0,1].includes(r.successCount)?r.successCount:null,
  statusMessage:typeof r.statusMessage==='string'?r.statusMessage.slice(0,350):null,
  transportError:r.transportError===true,
  responseKeys:Object.keys(r).filter(k=>/^[a-zA-Z_]{1,48}$/.test(k)).slice(0,30)
 };
}
function isSuccess(response){
 if(response?.transportError)return false;
 if(readCode(response)!==0)return false;
 return response.successCount===undefined||response.successCount===1;
}
function isKnownNegative(response){
 return !response?.transportError&&EXECUTION_FAILURES.has(readCode(response))&&
  (response.successCount===undefined||response.successCount===0);
}
function classify(response,negative){
 if(response?.transportError===true)return 'UNKNOWN';
 const status=readCode(response);
 if(status===0){
  if(response.successCount===0)return 'UNKNOWN';
  if(response.successCount!==undefined&&response.successCount!==1)return 'UNKNOWN';
  return 'MATCH';
 }
 if(status===readCode(negative)&&isKnownNegative(negative)){
  if(response.successCount===1)return 'UNKNOWN';
  return response.successCount===undefined||response.successCount===0?'NO_MATCH':'UNKNOWN';
 }
 return 'UNKNOWN';
}
export function b135Evaluate(raw,responses){
 const commands=b135Commands(raw);
 if(!Array.isArray(responses)||responses.length!==6)
  throw Error('B135_EXPECTED_SIX_RESULTS');
 const positive=responses[0],negative=responses[1];
 const controlsOk=isSuccess(positive)&&isKnownNegative(negative);
 const classifications=responses.slice(2).map(r=>controlsOk?classify(r,negative):'UNKNOWN');
 const matches=classifications.flatMap((c,i)=>c==='MATCH'?[i]:[]);
 const conclusive=controlsOk&&matches.length===1&&
  classifications.filter(x=>x==='NO_MATCH').length===3;
 return {
  schema:'minecraftaibuilder-b135-live-raw-control-v1',
  position:parseStairPosition(raw),
  controlsValid:controlsOk,
  controls:{
   positive:dump(positive),
   negative:dump(negative),
   negativeExecutionCode:controlsOk?readCode(negative):null
  },
  probes:classifications.map((result,i)=>({
   stateValue:i,classification:result,response:dump(responses[i+2])
  })),
  provisionalStateValue:conclusive?matches[0]:null,
  outcome:conclusive?'ONE_CANDIDATE_NEEDS_VISUAL_AND_REPEAT':'INCONCLUSIVE',
  realGameConnected:false,
  directionVisuallyChecked:false,
  traversabilityVerified:false,
  independentlyCertified:false,
  constructionAllowed:false,readiness:'NOT_PREPARED',operations:[]
 };
}
export async function b135ProbeWorld(world,raw){
 if(!world||typeof world.runCommand!=='function')throw Error('B135_WORLD_UNAVAILABLE');
 const commands=b135Commands(raw);
 const results=[];
 for(const command of commands){
  if(!/^testforblock -?\d+ -?\d+ -?\d+ minecraft:(?:oak_stairs(?: \["weirdo_direction" = [0-3]\])?|bedrock)$/.test(command))
   throw Error('B135_NON_READONLY_QUERY_REJECTED');
  try{
   results.push(await world.runCommand(command,{timeout:8000,noResponse:false}));
  }catch(err){
   results.push({transportError:true,statusMessage:String(err?.message??err).slice(0,350)});
  }
 }
 return b135Evaluate(raw,results);
}
export function b135Save(result,root=ROOT,round=1){
 if(result?.schema!=='minecraftaibuilder-b135-live-raw-control-v1'||
    result.constructionAllowed!==false||result.operations?.length!==0||
    result.independentlyCertified!==false||!Number.isInteger(round)||
    round<1||round>MAX_ROUNDS)throw Error('B135_INVALID_DIAGNOSTIC');
 const dir=path.join(root,'data','B135_Live_Diagnostics');
 fs.mkdirSync(dir,{recursive:true});
 const time=new Date().toISOString();
 const dest=path.join(dir,'B135_R'+round+'_'+time.replace(/[:.]/g,'-')+'.json');
 fs.writeFileSync(dest,JSON.stringify({...result,round,observedAt:time,
  evidenceType:'GAME_RESPONSE_REPORT_OPERATOR_UNREVIEWED',
  note:'No independent walkability or direction certification; do not promote to B130 receipts.'
 },null,2)+'\n',{flag:'wx'});
 return dest;
}
export async function b135Live({root=ROOT}={}){
 b135Preflight(root);
 const rl=readline.createInterface({input:stdin,output:stdout});
 let position;
 try{
  const txt=(await rl.question('テストワールドのオーク階段XYZを入力（例 122 104 -138 / Qで終了）: ')).trim();
  if(txt.toUpperCase()==='Q')return;
  parseStairPosition(txt);
  position=txt;
 }finally{rl.close();}
 let socket;
 try{socket=await import('socket-be');}
 catch{throw Error('B135_SOCKET_BE_INSTALL_REQUIRED');}
 if(typeof socket.Server!=='function'||!socket.ServerEvent?.WorldAdd)
  throw Error('B135_SOCKET_BE_EXPORTS_MISSING');
 const srv=new socket.Server(B134_SERVER_OPTIONS);
 let active=false,count=0,linked=null;
 const exit=()=>process.exit(process.exitCode??0);
 const scan=async world=>{
  if(active||count>=MAX_ROUNDS||world!==linked)return;
  active=true;count++;
  try{
   const report=await b135ProbeWorld(world,position);
   report.realGameConnected=true;
   const dest=b135Save(report,root,count);
   console.log('第'+count+'/'+MAX_ROUNDS+'回: '+report.outcome);
   console.log('状態値候補: '+(report.provisionalStateValue??'不明'));
   console.log('ゲーム実機の生応答を保存しました: '+dest);
   console.log('目視方向・歩行可能性は未検証。方向を変えて !b135 を送れば再測定できます。');
  }catch(err){console.error('B135読み取り失敗: '+err.message);process.exitCode=1;}
  finally{
   active=false;
   if(count===MAX_ROUNDS){console.log('4回の照合完了。');exit();}
  }
 };
 srv.on(socket.ServerEvent.Open,()=>console.log('ローカル待受開始: 127.0.0.1:8000'));
 srv.on(socket.ServerEvent.WorldAdd,evt=>{
  if(!linked&&evt?.world){
   linked=evt.world;
   console.log('Minecraft接続を受信。最初の読み取りを開始します。');
   void scan(linked);
  }
 });
 srv.on(socket.ServerEvent.PlayerChat,evt=>{
  if(evt?.world!==linked||typeof evt?.message!=='string')return;
  if(evt.message==='!b135-stop'){console.log('B135終了');exit();}
  if(evt.message==='!b135')void scan(linked);
 });
 srv.network?.wss?.on('error',err=>{
  console.error('B135 WebSocket待受エラー: '+err.message);process.exitCode=1;
 });
 console.log('Minecraft Education側で /wsserver 127.0.0.1:8000 を1回実行してください。');
 console.log('接続時に自動測定。2～4回目は向きを変えて !b135、終了は !b135-stop。');
 console.log('常にtestforblockのみを送信し、ワールド内のブロック変更はしません。');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const action=process.argv[2]??'--live';
  if(action==='--commands')console.log(b135Commands(process.argv.slice(3).join(' ')).join('\n'));
  else if(action==='--live')await b135Live();
  else throw Error('B135_INVALID_CLI_ACTION');
 }catch(e){console.error('B135安全停止: '+e.message);process.exitCode=1;}
}
