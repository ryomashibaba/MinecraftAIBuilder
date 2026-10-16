/**
 * B136: genuine Education-world traversal telemetry, grounded in 4 B135 live
 * readbacks plus the operator's EAST/SOUTH/WEST/NORTH observations.
 * The optional 2-stair builder writes ONLY to verified-air coordinates in a test world.
 * No mass construction, no teleport, no automatic collision certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {stdin,stdout} from 'node:process';
import {setTimeout as delay} from 'node:timers/promises';
import {parseStairPosition} from '../../b133/main/b133-readonly-probe.mjs';
import {B134_SERVER_OPTIONS} from '../../b134/main/b134-live-probe.mjs';
import {b135Preflight} from '../../b135/main/b135-controlled-live.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const SELF='source/parallel/b136/main/b136-traversal.mjs';
const PRIOR='source/parallel/b135/main/b135-controlled-live.mjs';
const PIN='B136_TRAVERSAL_MANIFEST.json';
const HASH=b=>createHash('sha256').update(b).digest('hex');
const ALLOWED=/^(?:testforblock|querytarget|setblock) /;
const MAX_READINGS=32;
const SAMPLE_INTERVAL_MS=250;
export const B136_DIRECTIONS=Object.freeze({
 EAST:Object.freeze({state:0,dx:1,dz:0,calibrationRound:'R1'}),
 SOUTH:Object.freeze({state:2,dx:0,dz:1,calibrationRound:'R2'}),
 WEST:Object.freeze({state:1,dx:-1,dz:0,calibrationRound:'R3'}),
 NORTH:Object.freeze({state:3,dx:0,dz:-1,calibrationRound:'R4'})
});
const firstWord=cmd=>cmd.split(' ')[0];

export function b136Preflight(root=ROOT){
 const old=b135Preflight(root);
 const pin=JSON.parse(fs.readFileSync(path.join(root,PIN),'utf8'));
 if(!old.readyForLiveProbeOnly||pin.schema!=='minecraftaibuilder-b136-traversal-v1'||
    pin.sourceSha256!==HASH(fs.readFileSync(path.join(root,SELF)))||
    pin.b135SourceSha256!==HASH(fs.readFileSync(path.join(root,PRIOR)))||
    JSON.stringify(pin.readbackMapping)!==JSON.stringify({EAST:0,SOUTH:2,WEST:1,NORTH:3})||
    pin.massConstructionAllowed!==false||pin.maxAddedStairs!==2||
    pin.allowedCommands?.join(',')!=='testforblock,querytarget,setblock')
  throw Error('B136_PREFLIGHT_PIN_OR_POLICY_INVALID');
 return {readyForTestWorldOnly:true,massConstructionAllowed:false};
}
export function b136Layout(raw,direction){
 const d=B136_DIRECTIONS[direction];
 if(!d)throw Error('B136_INVALID_DIRECTION');
 const p=typeof raw==='string'?parseStairPosition(raw):parseStairPosition(
  [raw?.x,raw?.y,raw?.z].join(' '));
 const stairs=[0,1,2].map(i=>{
  const pos={x:p.x+d.dx*i,y:p.y+i,z:p.z+d.dz*i};
  parseStairPosition([pos.x,pos.y,pos.z].join(' '));
  return pos;
 });
 return {direction,state:d.state,axis:{dx:d.dx,dz:d.dz},
  calibrationRound:d.calibrationRound,stairs,
  addOnly:stairs.slice(1),anchor:stairs[0]};
}
const xyz=p=>[p.x,p.y,p.z].join(' ');
const oak=state=>'minecraft:oak_stairs ["upside_down_bit" = 0, "weirdo_direction" = '+state+']';
const dirOnly=state=>'minecraft:oak_stairs ["weirdo_direction" = '+state+']';
const halfOnly=bit=>'minecraft:oak_stairs ["upside_down_bit" = '+bit+']';
const query=(p,block)=>'testforblock '+xyz(p)+' '+block;
function enforce(cmd){
 if(!ALLOWED.test(cmd))throw Error('B136_COMMAND_NOT_ALLOWLISTED');
 if(firstWord(cmd)==='querytarget'){
  if(cmd!=='querytarget @a')throw Error('B136_UNSAFE_ENTITY_QUERY');
  return;
 }
 if(!/^(?:testforblock|setblock) -?\d+ -?\d+ -?\d+ minecraft:(?:air|oak_stairs(?: \[(?:"weirdo_direction" = [0-3]|"upside_down_bit" = [01]|"upside_down_bit" = 0, "weirdo_direction" = [0-3])\])?)$/.test(cmd))
  throw Error('B136_BLOCK_COMMAND_INVALID');
}
async function command(world,cmd){
 enforce(cmd);
 return await world.runCommand(cmd,{timeout:6000,noResponse:false});
}
const isMatch=r=>Number.isInteger(r?.statusCode)&&r.statusCode===0;
function dataDir(root){return path.join(root,'data','B136_Live_Diagnostics');}
function saveJson(name,value,root=ROOT){
 fs.mkdirSync(dataDir(root),{recursive:true});
 const file=path.join(dataDir(root),name);
 fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 return file;
}
const timestamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
export async function b136InspectStair(world,position,state){
 if(!Number.isInteger(state)||state<0||state>3)throw Error('B136_INVALID_STAIR_STATE');
 const probes=[
  ['existence',query(position,'minecraft:oak_stairs')],
  ['direction',query(position,dirOnly(state))],
  ['lowerHalf',query(position,halfOnly(0))],
  ['upperHalf',query(position,halfOnly(1))],
  ['combined',query(position,oak(state))]
 ];
 const outcomes={};
 for(const [name,cmd] of probes){
  try{
   const r=await command(world,cmd);
   outcomes[name]={
    match:isMatch(r),
    statusCode:Number.isInteger(r?.statusCode)?r.statusCode:null,
    message:String(r?.statusMessage??'').slice(0,250)
   };
  }catch(e){
   outcomes[name]={match:false,statusCode:null,message:String(e.message).slice(0,250),
    transportError:true};
  }
 }
 // The R1-R4 calibration only proves direction. Lower half must be validated
 // separately. An unsupported combined-state query must NOT falsely cause MISSING.
 const safe=outcomes.existence.match&&outcomes.direction.match&&
  outcomes.lowerHalf.match&&
  outcomes.upperHalf.statusCode===-2147352576;
 let reason='READY';
 if(!outcomes.existence.match)reason='MISSING_OAK_OR_COMMAND_ERROR';
 else if(!outcomes.direction.match)reason='DIRECTION_DIFFERS_OR_COMMAND_ERROR';
 else if(outcomes.upperHalf.match)reason='UPSIDE_DOWN_STAIR';
 else if(!outcomes.lowerHalf.match)reason='LOWER_HALF_NOT_CONFIRMED';
 else if(outcomes.upperHalf.statusCode!==-2147352576)reason='UPPER_HALF_CONTROL_INCONCLUSIVE';
 return {position,state,matched:safe,reason,outcomes,
  combinedStateQuerySupported:outcomes.combined.match};
}
export async function b136CheckLayout(world,layout){
 const checks=[];
 for(let i=0;i<3;i++){
  const pos=layout.stairs[i];
  const result=await b136InspectStair(world,pos,layout.state);
  checks.push({step:i,...result});
 }
 return {steps:checks,fullLayoutMatches:checks.every(x=>x.matched)};
}
/**
 * To build, the first stair must already be calibrated and both extension
 * coordinates and headroom at each new stair must be AIR. Journal is stored
 * before any writes. Only two explicit stair placements are allowed.
 */
export async function b136BuildExtension(world,layout,root=ROOT){
 if(!world?.runCommand)throw Error('B136_WORLD_REQUIRED');
 const journalPath=path.join(dataDir(root),'B136_STAGE_JOURNAL.json');
 if(fs.existsSync(journalPath))throw Error('B136_JOURNAL_EXISTS_REVIEW_OR_CLEAN_FIRST');
 const anchor=await b136InspectStair(world,layout.anchor,layout.state);
 if(!anchor.matched)throw Error('B136_ORIGINAL_STAIR_NOT_MATCHING_CALIBRATION: '+anchor.reason+
  ' | existence='+anchor.outcomes.existence.statusCode+
  ' direction='+anchor.outcomes.direction.statusCode+
  ' lower='+anchor.outcomes.lowerHalf.statusCode+
  ' upper='+anchor.outcomes.upperHalf.statusCode+
  ' combined='+anchor.outcomes.combined.statusCode);
 const airPositions=[];
 for(const p of layout.addOnly){
  for(let height=0;height<=2;height++){
   const t={...p,y:p.y+height};
   parseStairPosition(xyz(t));
   airPositions.push(t);
  }
 }
 for(const pos of airPositions){
  const air=await command(world,query(pos,'minecraft:air'));
  if(!isMatch(air))throw Error('B136_STAGE_NOT_EMPTY '+xyz(pos));
 }
 const journal={
  schema:'minecraftaibuilder-b136-stage-journal-v1',
  direction:layout.direction,anchor:layout.anchor,
  added:layout.addOnly,attempted:0,installed:0,cleanupComplete:false,
  existingAirVerified:true,
  note:'Only two added stair blocks were originally air. Original anchor never modified.'
 };
 fs.mkdirSync(dataDir(root),{recursive:true});
 fs.writeFileSync(journalPath,JSON.stringify(journal,null,2)+'\n',{flag:'wx'});
 try{
  for(const p of layout.addOnly){
   // Pre-journal before sending world-mutating command (crash-safe).
   journal.attempted++;
   fs.writeFileSync(journalPath,JSON.stringify(journal,null,2)+'\n');
   const response=await command(world,'setblock '+xyz(p)+' '+oak(layout.state));
   if(!isMatch(response))throw Error('B136_SETBLOCK_FAILED '+xyz(p));
   const readback=await b136InspectStair(world,p,layout.state);
   if(!readback.matched)throw Error('B136_NEW_STAIR_READBACK_FAILED '+xyz(p)+' '+readback.reason);
   journal.installed++;
   fs.writeFileSync(journalPath,JSON.stringify(journal,null,2)+'\n');
  }
  return {success:true,added:journal.installed,journalPath,layout};
 }catch(e){
  return {success:false,added:journal.installed,
   error:String(e.message),journalPath,
   requireCleanupBeforeRetry:true};
 }
}
export async function b136Cleanup(world,root=ROOT){
 const file=path.join(dataDir(root),'B136_STAGE_JOURNAL.json');
 if(!fs.existsSync(file))return {cleaned:0,skipped:0,status:'NO_STAGE_JOURNAL'};
 const journal=JSON.parse(fs.readFileSync(file,'utf8'));
 if(journal.schema!=='minecraftaibuilder-b136-stage-journal-v1'||journal.added?.length!==2||
    !B136_DIRECTIONS[journal.direction]||
    journal.attempted<0||journal.attempted>2)throw Error('B136_INVALID_STAGE_JOURNAL');
 const state=B136_DIRECTIONS[journal.direction].state;
 let cleaned=0,skipped=0;
 for(const p of journal.added.slice(0,journal.attempted)){
  parseStairPosition(xyz(p));
  const current=await b136InspectStair(world,p,state);
  if(!current.matched){
   const air=await command(world,query(p,'minecraft:air'));
   if(!isMatch(air))skipped++;
   continue;
  }
  const removed=await command(world,'setblock '+xyz(p)+' minecraft:air');
  if(isMatch(removed))cleaned++;else skipped++;
 }
 journal.cleanupComplete=skipped===0;
 journal.cleaned=cleaned;
 journal.skipped=skipped;
 fs.writeFileSync(file,JSON.stringify(journal,null,2)+'\n');
 if(skipped===0)fs.renameSync(file,path.join(dataDir(root),
  'B136_STAGE_CLEANED_'+timestamp()+'.json'));
 return {cleaned,skipped,status:skipped===0?'CLEAN':'MANUAL_REVIEW_REQUIRED'};
}
export function b136ParseEntityResult(res){
 if(!isMatch(res)||typeof res.details!=='string')return null;
 let v;
 try{v=JSON.parse(res.details);}
 catch{return null;}
 if(!Array.isArray(v)||v.length!==1)return null;
 const p=v[0]?.position;
 if(!p||![p.x,p.y,p.z].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<30000001))
  return null;
 return {x:p.x,y:p.y,z:p.z};
}
export function b136EvaluateWalk(layout,mode,samples){
 if(!['UP','DOWN'].includes(mode))throw Error('B136_WALK_MODE_INVALID');
 const valid=samples.filter(s=>s.position&&Number.isFinite(s.elapsedMs));
 const first=valid[0]?.position,last=valid.at(-1)?.position;
 const dx=last&&first?last.x-first.x:null;
 const dy=last&&first?last.y-first.y:null;
 const dz=last&&first?last.z-first.z:null;
 const axisProgress=dx===null?null:dx*layout.axis.dx+dz*layout.axis.dz;
 const lateral=dx===null?null:Math.abs(dx*layout.axis.dz-dz*layout.axis.dx);
 const signed=mode==='UP'?1:-1;
 let discontinuities=0;
 for(let i=1;i<valid.length;i++){
  const a=valid[i-1],b=valid[i],dt=(b.elapsedMs-a.elapsedMs)/1000;
  if(dt>0&&dt<1&&Math.hypot(b.position.x-a.position.x,
   b.position.y-a.position.y,b.position.z-a.position.z)>4)discontinuities++;
 }
 const enough=valid.length>=12&&valid.length>=samples.length*0.7;
 const candidate=enough&&discontinuities===0&&
  axisProgress!==null&&axisProgress*signed>=1.5&&
  dy*signed>=1.25&&lateral<=2;
 return {
  mode,recordedSamples:samples.length,validSamples:valid.length,
  delta:{x:dx,y:dy,z:dz},
  axisProgress,lateralDrift:lateral,teleportLikeJumps:discontinuities,
  outcome:candidate?'MOTION_COMPATIBLE_WITH_STAIR_TRAVERSAL_NEEDS_VISUAL_CONFIRM':
   'INCONCLUSIVE_OR_NOT_COMPLETED',
  observedMotionCompatible:candidate,
  actualCollisionVerified:false,independentlyCertified:false,
  constructionReady:false,readiness:'NOT_PREPARED'
 };
}
export async function b136Capture(world,layout,mode,{samples=MAX_READINGS,intervalMs=SAMPLE_INTERVAL_MS}={}){
 if(samples<4||samples>MAX_READINGS||intervalMs<50||intervalMs>1500)
  throw Error('B136_SAMPLE_PARAMETERS_INVALID');
 const records=[],start=Date.now();
 for(let i=0;i<samples;i++){
  let response;
  try{response=await command(world,'querytarget @a');}
  catch(err){response={transportError:true,statusMessage:String(err.message)};}
  const position=b136ParseEntityResult(response);
  records.push({elapsedMs:Date.now()-start,position,
   transportStatusCode:Number.isInteger(response?.statusCode)?response.statusCode:null,
   valid:position!==null});
  if(i!==samples-1)await delay(intervalMs);
 }
 return {schema:'minecraftaibuilder-b136-walk-telemetry-v1',
  direction:layout.direction,calibratedState:layout.state,
  anchor:layout.anchor,mode,observedAt:new Date().toISOString(),
  samples:records,evaluation:b136EvaluateWalk(layout,mode,records),
  operatorVisualWalkConfirmed:false,
  actualCollisionVerified:false,independentlyCertified:false,
  constructionReady:false,readiness:'NOT_PREPARED'};
}
export function b136SaveCapture(report,root=ROOT){
 if(report?.schema!=='minecraftaibuilder-b136-walk-telemetry-v1'||
    report.constructionReady!==false||report.independentlyCertified!==false)
  throw Error('B136_INVALID_WALK_REPORT');
 return saveJson('B136_'+report.mode+'_'+timestamp()+'.json',report,root);
}
export async function b136Live(root=ROOT){
 b136Preflight(root);
 const rl=readline.createInterface({input:stdin,output:stdout});
 let layout;
 try{
  const raw=(await rl.question('既存オーク階段XYZ（例 123 -60 -18 / Qで中止）: ')).trim();
  if(raw.toUpperCase()==='Q')return;
  const direction=(await rl.question('階段の高い側の方向 EAST/SOUTH/WEST/NORTH: ')).trim().toUpperCase();
  layout=b136Layout(raw,direction);
 }finally{rl.close();}
 const {Server,ServerEvent}=await import('socket-be');
 const server=new Server(B134_SERVER_OPTIONS);
 let linked=null,busy=false;
 const handle=async(action,world)=>{
  if(busy||world!==linked)return;
  busy=true;
  try{
   if(action==='!b136-check'){
    const info=await b136CheckLayout(world,layout);
    console.log('3段の方向・高さ照合: '+(info.fullLayoutMatches?'ALL_MATCH':'INCOMPLETE'));
    info.steps.forEach(x=>{
     console.log('STEP'+x.step+' '+xyz(x.position)+' '+(x.matched?'MATCH':x.reason)+
      ' (base='+x.outcomes.existence.statusCode+
      ',dir='+x.outcomes.direction.statusCode+
      ',lower='+x.outcomes.lowerHalf.statusCode+
      ',upper='+x.outcomes.upperHalf.statusCode+
      ',combined='+x.outcomes.combined.statusCode+')');
    });
   }else if(action==='!b136-build'){
    const result=await b136BuildExtension(world,layout,root);
    console.log('テスト階段の2段追加: '+JSON.stringify(result));
   }else if(action==='!b136-clean'){
    console.log('追加した階段の後片付け: '+JSON.stringify(await b136Cleanup(world,root)));
   }else if(action==='!b136-up'||action==='!b136-down'){
    const info=await b136CheckLayout(world,layout);
    if(!info.fullLayoutMatches){
     console.log('3段そろっていません。!b136-build または手動設置後 !b136-check してください。');
     return;
    }
    const mode=action.endsWith('-up')?'UP':'DOWN';
    console.log(mode+'の座標記録を開始。階段を歩いて移動してください（約8秒）。');
    const report=await b136Capture(world,layout,mode);
    const file=b136SaveCapture(report,root);
    console.log(mode+' 結果: '+report.evaluation.outcome);
    console.log('高度変化 '+report.evaluation.delta.y+'、進行 '+report.evaluation.axisProgress+
     '、有効測定 '+report.evaluation.validSamples+'/'+report.evaluation.recordedSamples);
    console.log('実機記録: '+file);
   }
  }catch(err){console.error('B136安全停止: '+err.message);}
  finally{busy=false;}
 };
 server.on(ServerEvent.Open,()=>console.log('B136 ローカル待受: 127.0.0.1:8000'));
 server.on(ServerEvent.WorldAdd,ev=>{
  if(ev?.world&&!linked){
   linked=ev.world;
   console.log('Minecraft接続成功。最初の3段階段照合を開始します。');
   void handle('!b136-check',linked);
  }
 });
 server.on(ServerEvent.PlayerChat,ev=>{
  if(ev?.world!==linked||typeof ev?.message!=='string')return;
  if(ev.message==='!b136-exit'){console.log('B136終了。残存テスト階段は必要なら !b136-clean で撤去してください。');process.exit(0);}
  if(['!b136-check','!b136-build','!b136-clean','!b136-up','!b136-down'].includes(ev.message))
   void handle(ev.message,linked);
 });
 server.network?.wss?.on('error',err=>console.error('B136 WebSocket待受エラー: '+err.message));
 console.log('Minecraft Educationで /wsserver 127.0.0.1:8000 を入力してください。');
 console.log('!b136-build（不足2段を安全に追加）、!b136-up、!b136-down、!b136-clean、!b136-exit');
 console.log('B136は最大2段のみ空き位置に設置できます。既存の最初の階段は変更しません。');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const action=process.argv[2]??'--live';
  if(action==='--layout')console.log(JSON.stringify(b136Layout(process.argv.slice(3,-1).join(' '),process.argv.at(-1)),null,2));
  else if(action==='--live')await b136Live();
  else throw Error('B136_INVALID_ACTION');
 }catch(e){console.error('B136実行失敗: '+e.message);process.exitCode=1;}
}
