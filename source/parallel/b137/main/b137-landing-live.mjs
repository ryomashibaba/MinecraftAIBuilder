/**
 * B137 real test-world path: existing lower stair -> 3-stair flight ->
 * two-block level landing -> 3-stair upper flight.
 * Preserves existing calibrated stairs, creates at most seven air-only blocks,
 * and journals changes before writing. No mass construction authorization.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {stdin,stdout} from 'node:process';
import {setTimeout as delay} from 'node:timers/promises';
import {B134_SERVER_OPTIONS} from '../../b134/main/b134-live-probe.mjs';
import {b136Preflight,b136Layout,b136InspectStair,b136ParseEntityResult} from '../../b136/main/b136-traversal.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const SOURCE='source/parallel/b137/main/b137-landing-live.mjs';
const PARENT='source/parallel/b136/main/b136-traversal.mjs';
const PIN='B137_LANDING_MANIFEST.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
const xyz=p=>[p.x,p.y,p.z].join(' ');
const stairs=state=>'minecraft:oak_stairs ["upside_down_bit" = false, "weirdo_direction" = '+state+']';
const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
const sleep=ms=>delay(ms);
const REPORT_SCHEMA='minecraftaibuilder-b137-route-v1';
const JOURNAL_SCHEMA='minecraftaibuilder-b137-stage-v1';
export const MAX_NEW_BLOCKS=7;
export const WALK_SAMPLES=68;
export const WALK_INTERVAL=250;
export const COUNTDOWN_SECONDS=3;

export function b137Preflight(root=ROOT){
 const old=b136Preflight(root);
 const m=JSON.parse(fs.readFileSync(path.join(root,PIN),'utf8'));
 if(!old.readyForTestWorldOnly||m.schema!=='minecraftaibuilder-b137-landing-v1'||
    m.sourceSha256!==hash(fs.readFileSync(path.join(root,SOURCE)))||
    m.b136SourceSha256!==hash(fs.readFileSync(path.join(root,PARENT)))||
    m.maxNewBlocks!==MAX_NEW_BLOCKS||m.massConstructionAllowed!==false||
    m.constructionAllowed!==false||m.operations?.length!==0||
    m.allowedCommands?.join(',')!=='testforblock,setblock,querytarget')
  throw Error('B137_MANIFEST_OR_PARENT_INVALID');
 return {safeForIsolatedTestWorld:true,constructionAllowed:false};
}

export function b137Layout(raw,direction){
 const base=b136Layout(raw,direction);
 const loc=(i,yOffset)=>({
  x:base.anchor.x+i*base.axis.dx,
  y:base.anchor.y+yOffset,
  z:base.anchor.z+i*base.axis.dz
 });
 const parts=[
  ...[0,1,2].map(i=>({step:i,kind:'stair',position:loc(i,i),block:stairs(base.state)})),
  ...[3,4].map(i=>({step:i,kind:'landing',position:loc(i,2),block:'minecraft:oak_planks'})),
  ...[5,6,7].map(i=>({step:i,kind:'stair',position:loc(i,i-2),block:stairs(base.state)}))
 ];
 if(parts.length!==8||new Set(parts.map(p=>xyz(p.position))).size!==8||
    parts.some(p=>p.position.y<-64||p.position.y>318))
  throw Error('B137_LAYOUT_OUT_OF_BOUNDS');
 return {schema:'minecraftaibuilder-b137-layout-v1',direction,state:base.state,
  axis:base.axis,anchor:base.anchor,parts,
  sourceB136OperatorWalk:{upJumpFree:true,downJumpFree:true,
    upRise:3,downRise:-3,upProgress:3.858457565307619,
    downProgress:-4.239984512329098,evidence:'USER_REPORTED_CONSOLE_AND_OBSERVATION_NOT_RAW_JSON'}};
}
export function b137Allow(command){
 if(command==='querytarget @a')return true;
 if(!/^(testforblock|setblock) -?\d+ -?\d+ -?\d+ minecraft:(?:air|oak_planks|oak_stairs \["upside_down_bit" = false, "weirdo_direction" = [0-3]\])$/.test(command))
  throw Error('B137_COMMAND_NOT_ALLOWED');
 return true;
}
export async function b137Command(world,cmd){
 b137Allow(cmd);
 if(!world||typeof world.runCommand!=='function')throw Error('B137_WORLD_MISSING');
 return world.runCommand(cmd,{timeout:6000,noResponse:false});
}
const ok=r=>r?.statusCode===0&&!r.transportError;
const test=(p,block)=>'testforblock '+xyz(p)+' '+block;
const store=root=>path.join(root,'data','B137_Live_Diagnostics');
const journalPath=root=>path.join(store(root),'B137_STAGE_JOURNAL.json');
function saveReport(root,prefix,payload){
 fs.mkdirSync(store(root),{recursive:true});
 const f=path.join(store(root),prefix+'_'+stamp()+'.json');
 fs.writeFileSync(f,JSON.stringify(payload,null,2)+'\n',{flag:'wx'});
 return f;
}
async function inspect(world,part){
 if(part.kind==='stair'){
  const d=Number(/"weirdo_direction" = (\d)/.exec(part.block)[1]);
  const r=await b136InspectStair(world,part.position,d);
  return {present:r.matched,reason:r.reason,position:part.position,step:part.step};
 }
 const r=await b137Command(world,test(part.position,part.block));
 return {present:ok(r),reason:ok(r)?'READY':'PLANK_NOT_PRESENT',
  position:part.position,step:part.step};
}
export async function b137Survey(world,layout){
 const results=[];
 for(const part of layout.parts){
  const status=await inspect(world,part);
  if(status.present){
   results.push({...status,mode:'KEEP'});
   continue;
  }
  const a=await b137Command(world,test(part.position,'minecraft:air'));
  const air=ok(a);
  if(part.step===0)throw Error('B137_ANCHOR_MUST_ALREADY_EXIST: '+status.reason);
  results.push({...status,mode:air?'ADD':'BLOCKED',
   reason:air?'AIR_AVAILABLE':'OCCUPIED_OR_UNKNOWN: '+status.reason});
 }
 return {parts:results,allReady:results.every(r=>r.mode==='KEEP'),
  canBuild:results.every(r=>r.mode!=='BLOCKED'),
  existing:results.filter(r=>r.mode==='KEEP').length,
  missing:results.filter(r=>r.mode==='ADD').length};
}
async function verifyHeadroom(world,layout){
 const coords=new Map();
 // Require two empty blocks above all walkway surfaces, including existing
 // blocks. This bounds the test route without modifying any adjacent block.
 for(const part of layout.parts){
  for(let dy=1;dy<=2;dy++){
   const p={...part.position,y:part.position.y+dy};
   if(p.y>319)throw Error('B137_HEADROOM_OUT_OF_BOUNDS');
   coords.set(xyz(p),p);
  }
 }
 const occupied=new Set(layout.parts.map(x=>xyz(x.position)));
 for(const [key,pos] of coords){
  // Higher blocks of stair flights can occupy a predecessor's headroom
  // in a stepped path; those coordinates are not empty.
  if(occupied.has(key))continue;
  const r=await b137Command(world,test(pos,'minecraft:air'));
  if(!ok(r))throw Error('B137_HEADROOM_OCCUPIED_OR_UNCERTAIN '+key);
 }
}
export async function b137Build(world,layout,root=ROOT){
 const journal=journalPath(root);
 if(fs.existsSync(journal))throw Error('B137_UNFINISHED_STAGE_JOURNAL_USE_CLEAN_FIRST');
 const survey=await b137Survey(world,layout);
 if(!survey.canBuild)throw Error('B137_PATH_BLOCKED');
 await verifyHeadroom(world,layout);
 if(!survey.missing)return {success:true,added:0,kept:8,journalPath:null};
 if(survey.missing>MAX_NEW_BLOCKS)throw Error('B137_OVER_MAX_BLOCK_LIMIT');
 const add=survey.parts.filter(p=>p.mode==='ADD').map(p=>layout.parts[p.step]);
 const j={schema:JOURNAL_SCHEMA,direction:layout.direction,anchor:layout.anchor,
  additions:add,attempted:0,created:0,cleaned:false,
  originalB136StairsPreserved:true,hadPriorB136StageJournal:false,
  status:'STARTED',operations:[],constructionAllowed:false};
 fs.mkdirSync(store(root),{recursive:true});
 fs.writeFileSync(journal,JSON.stringify(j,null,2)+'\n',{flag:'wx'});
 try{
  for(const part of add){
   // Revalidate each target immediately before mutation; other blocks are
   // preserved and no world-wide fill is ever used.
   const before=await b137Command(world,test(part.position,'minecraft:air'));
   if(!ok(before))throw Error('B137_TARGET_CHANGED '+xyz(part.position));
   j.attempted++;
   fs.writeFileSync(journal,JSON.stringify(j,null,2)+'\n');
   const write=await b137Command(world,'setblock '+xyz(part.position)+' '+part.block);
   if(!ok(write))throw Error('B137_WRITE_FAILED '+xyz(part.position));
   const check=await inspect(world,part);
   if(!check.present)throw Error('B137_READBACK_FAILED '+xyz(part.position));
   j.created++;
   fs.writeFileSync(journal,JSON.stringify(j,null,2)+'\n');
  }
  j.status='COMPLETE';
  fs.writeFileSync(journal,JSON.stringify(j,null,2)+'\n');
  return {success:true,added:j.created,kept:8-j.created,journalPath:journal};
 }catch(e){
  j.status='HOLD_NEEDS_CLEANUP';
  j.error=String(e?.message??e);
  fs.writeFileSync(journal,JSON.stringify(j,null,2)+'\n');
  return {success:false,added:j.created,attempted:j.attempted,
   error:j.error,journalPath:journal};
 }
}
export async function b137Clean(world,root=ROOT){
 const f=journalPath(root);
 if(!fs.existsSync(f))return {status:'NO_B137_STAGE_JOURNAL',removed:0};
 const j=JSON.parse(fs.readFileSync(f,'utf8'));
 if(j.schema!==JOURNAL_SCHEMA||!Array.isArray(j.additions)||
    j.additions.length>MAX_NEW_BLOCKS||!Number.isInteger(j.attempted)||
    j.attempted<0||j.attempted>j.additions.length)
  throw Error('B137_UNSAFE_OR_CORRUPTED_JOURNAL');
 // A damaged/local-edited journal must NEVER authorize removing arbitrary blocks.
 const plan=b137Layout(xyz(j.anchor??{}),j.direction);
 const allowed=new Map(plan.parts.slice(1).map(p=>[p.step,p]));
 const used=new Set();
 for(const item of j.additions){
  const expected=allowed.get(item?.step);
  if(!expected||used.has(item.step)||
    JSON.stringify(item)!==JSON.stringify(expected))
   throw Error('B137_JOURNAL_POSITION_NOT_IN_FROZEN_TEST_PLAN');
  used.add(item.step);
 }
 let removed=0,unresolved=0;
 for(const part of j.additions.slice(0,j.attempted)){
  const state=await inspect(world,part);
  if(state.present){
   const del=await b137Command(world,'setblock '+xyz(part.position)+' minecraft:air');
   if(ok(del))removed++;else unresolved++;
  }else{
   const air=await b137Command(world,test(part.position,'minecraft:air'));
   if(!ok(air))unresolved++;
  }
 }
 j.removed=removed;j.unresolved=unresolved;j.cleaned=unresolved===0;
 j.status=j.cleaned?'CLEAN':'HOLD_BLOCK_CHANGED';
 fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');
 if(!unresolved)fs.renameSync(f,path.join(store(root),'B137_STAGE_CLEANED_'+stamp()+'.json'));
 return {status:j.status,removed,unresolved,
  preservedExistingB136Steps:true};
}
export function b137Evaluate(layout,mode,records){
 if(!['UP','DOWN'].includes(mode))throw Error('B137_MODE_INVALID');
 const valid=records.filter(x=>x.position&&Number.isFinite(x.elapsedMs));
 const first=valid[0]?.position,last=valid.at(-1)?.position;
 const factor=mode==='UP'?1:-1;
 const dx=last&&first?last.x-first.x:null,
  dz=last&&first?last.z-first.z:null,
  dy=last&&first?last.y-first.y:null;
 const axis=dx===null?null:dx*layout.axis.dx+dz*layout.axis.dz;
 const lateral=dx===null?null:Math.abs(dx*layout.axis.dz-dz*layout.axis.dx);
 let teleports=0;
 for(let i=1;i<valid.length;i++){
  const dt=(valid[i].elapsedMs-valid[i-1].elapsedMs)/1000;
  if(dt>0&&dt<1&&Math.hypot(...['x','y','z'].map(k=>valid[i].position[k]-valid[i-1].position[k]))>4)teleports++;
 }
 const firstRelative=valid.map(x=>({
  axis:(x.position.x-first.x)*layout.axis.dx+(x.position.z-first.z)*layout.axis.dz,
  rise:x.position.y-first.y
 }));
 const landingCandidates=firstRelative.filter(p=>mode==='UP'
  ?p.axis>=2.5&&p.axis<=6.0&&p.rise>=2.0&&p.rise<=4.0
  :p.axis<=-1.5&&p.axis>=-5.0&&p.rise<=-2.0&&p.rise>=-4.0).length;
 const sufficient=valid.length>=35&&valid.length>=records.length*.7;
 const motion=sufficient&&teleports===0&&
  dy!==null&&dy*factor>=4.5&&axis*factor>=5.5&&lateral<=2.5;
 return {mode,totalSamples:records.length,validSamples:valid.length,
  delta:{x:dx,y:dy,z:dz},routeAxisProgress:axis,
  lateralDrift:lateral,teleportLikeJumps:teleports,
  landingProximitySamples:landingCandidates,
  outcome:motion?'MOTION_COMPATIBLE_WITH_TWO_FLIGHTS_NEEDS_VISUAL_CONFIRM':
   'INCONCLUSIVE_OR_NOT_COMPLETED',motionCompatible:motion,
  landingPhysicallyWalkedVerified:false,operatorJumpFreeConfirmed:false,
  independentCollisionPass:false,constructionReady:false,readiness:'NOT_PREPARED'};
}
export async function b137Capture(world,layout,mode,{samples=WALK_SAMPLES,intervalMs=WALK_INTERVAL,countdown=COUNTDOWN_SECONDS,announce=()=>{}}={}){
 if(samples<4||samples>WALK_SAMPLES||intervalMs<20||intervalMs>1500||
    countdown<0||countdown>10)throw Error('B137_CAPTURE_PARAMS');
 for(let left=countdown;left>0;left--){announce('開始まで '+left+' 秒');await sleep(1000);}
 announce('記録開始。ジャンプせずにルートを歩いて、最後に停止してください。');
 const start=Date.now(),records=[];
 for(let i=0;i<samples;i++){
  let res;
  try{res=await b137Command(world,'querytarget @a');}
  catch(e){res={transportError:true,statusMessage:String(e?.message??e)};}
  const position=b136ParseEntityResult(res);
  records.push({elapsedMs:Date.now()-start,position,valid:position!==null,
   statusCode:Number.isInteger(res?.statusCode)?res.statusCode:null});
  if(i<samples-1)await sleep(intervalMs);
 }
 return {schema:REPORT_SCHEMA,mode,direction:layout.direction,
  startingStair:layout.anchor,flightCount:2,landingLength:2,
  observedAt:new Date().toISOString(),records,
  evaluation:b137Evaluate(layout,mode,records),
  operatorJumpFreeConfirmed:false,landingActuallyTraversedConfirmed:false,
  independentCollisionPass:false,constructionAllowed:false,readiness:'NOT_PREPARED'};
}
export function b137SaveCapture(root,report){
 if(report?.schema!==REPORT_SCHEMA||report?.constructionAllowed!==false||
    report?.independentCollisionPass!==false)throw Error('B137_REPORT_UNSAFE');
 return saveReport(root,'B137_'+report.mode,report);
}
export async function b137Live(root=ROOT){
 b137Preflight(root);
 const rl=readline.createInterface({input:stdin,output:stdout});
 let layout;
 try{
  const raw=(await rl.question('1段目のオーク階段XYZ（前回 123 -60 -18 / Qで終了）: ')).trim();
  if(raw.toUpperCase()==='Q')return;
  const direction=(await rl.question('高い側 EAST/SOUTH/WEST/NORTH（前回 NORTH）: ')).trim().toUpperCase();
  layout=b137Layout(raw,direction);
 }finally{rl.close();}
 const {Server,ServerEvent}=await import('socket-be');
 const server=new Server(B134_SERVER_OPTIONS);
 let linked=null,busy=false;
 const actions=new Set(['!b137-check','!b137-build','!b137-up','!b137-down','!b137-clean']);
 const run=async(action,world)=>{
  if(busy||world!==linked)return;
  busy=true;
  try{
   if(action==='!b137-check'){
    const r=await b137Survey(world,layout);
    console.log('8ブロックの階段＋踊り場: 既存='+r.existing+'、追加可能='+r.missing+'、施工可能='+r.canBuild);
    r.parts.forEach(s=>console.log('STEP'+s.step+' '+s.mode+' '+s.reason));
   }else if(action==='!b137-build'){
    console.log('既存階段を保持し、最大7個の新しい階段・床だけ設置します。');
    const r=await b137Build(world,layout,root);
    console.log('B137 BUILD '+JSON.stringify(r));
   }else if(action==='!b137-clean'){
    console.log('B137 CLEAN '+JSON.stringify(await b137Clean(world,root)));
   }else if(action==='!b137-up'||action==='!b137-down'){
    const r=await b137Survey(world,layout);
    if(!r.allReady){console.log('未完成です。!b137-build を実行してから測定してください。');return;}
    const mode=action.endsWith('-up')?'UP':'DOWN';
    const report=await b137Capture(world,layout,mode,{announce:msg=>console.log(msg)});
    const file=b137SaveCapture(root,report);
    console.log(mode+' 結果: '+report.evaluation.outcome);
    console.log('高度変化 '+report.evaluation.delta.y+
     '、進行 '+report.evaluation.routeAxisProgress+
     '、有効 '+report.evaluation.validSamples+'/'+report.evaluation.totalSamples);
    console.log('実機記録: '+file);
   }
  }catch(e){console.error('B137安全停止: '+e.message);}
  finally{busy=false;}
 };
 server.on(ServerEvent.Open,()=>console.log('B137 WebSocket待受開始: 127.0.0.1:8000'));
 server.on(ServerEvent.WorldAdd,evt=>{
  if(evt?.world&&!linked){
   linked=evt.world;
   console.log('Minecraft接続成功。既存の3段＋踊り場＋次の3段を検査します。');
   void run('!b137-check',linked);
  }
 });
 server.on(ServerEvent.PlayerChat,evt=>{
  if(evt?.world!==linked||typeof evt?.message!=='string')return;
  if(evt.message==='!b137-exit'){
   if(fs.existsSync(journalPath(root)))
    console.warn('警告：B137追加ブロックは残っています。先に !b137-clean を実行してください。');
   console.log('B137終了');process.exit(0);
  }
  if(actions.has(evt.message))void run(evt.message,linked);
 });
 server.network?.wss?.on('error',e=>console.error('B137 WebSocket待受エラー: '+e.message));
 console.log('Minecraft Educationで /wsserver 127.0.0.1:8000 を実行。');
 console.log('!b137-build → !b137-up / !b137-down → !b137-clean → !b137-exit');
 console.log('上り下りはチャット開始後3秒のカウントダウン。移動中の文字入力は不要です。');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const mode=process.argv[2]??'--live';
  if(mode==='--layout')console.log(JSON.stringify(b137Layout(process.argv.slice(3,-1).join(' '),process.argv.at(-1)),null,2));
  else if(mode==='--live')await b137Live();
  else throw Error('B137_INVALID_CLI_MODE');
 }catch(e){console.error('B137起動停止: '+e.message);process.exitCode=1;}
}
