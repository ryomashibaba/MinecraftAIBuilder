/**
 * ARK-LITE-P0: limited, consent-gated Education TEST WORLD builder.
 * Reuses B134 socket-be Server event contract and B136/B137 live observations.
 * Does NOT modify or unlock the B100-B175 nine construction gates.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {fileURLToPath} from 'node:url';
import {stdin,stdout} from 'node:process';
import {createHash} from 'node:crypto';
import {makeArkLite,validateOrigin,absolute,MATERIALS} from './ark-lite.mjs';

const DIR=path.dirname(fileURLToPath(import.meta.url));
const DATA=path.resolve(process.env.ARK_LITE_DATA_DIR??path.join(DIR,'data'));
const JOURNAL=path.join(DATA,'ARK_LITE_STAGE_JOURNAL.json');
const REPORT=path.join(DATA,'ARK_LITE_LAST_REPORT.json');
const PORT=8000;
export const MAX_BLOCK_WRITES=12000;
export const MAX_RUNS=3000;
export const CONCURRENCY=4;
const PLAN=makeArkLite();
const hash=s=>createHash('sha256').update(s).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const xyz=p=>[p.x,p.y,p.z].join(' ');
const success=r=>r&&r.transportError!==true&&r.statusCode===0&&
 (r.successCount===undefined||r.successCount===1);
const failCode=r=>r&&r.transportError!==true&&
 Number.isInteger(r.statusCode)&&r.statusCode<0&&
 (r.successCount===undefined||r.successCount===0);
const now=()=>new Date().toISOString();
const save=(file,obj)=>{fs.mkdirSync(DATA,{recursive:true});
 const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(obj,null,2)+'\n');
 fs.renameSync(temp,file);};
const saved=()=>fs.existsSync(JOURNAL)?JSON.parse(fs.readFileSync(JOURNAL,'utf8')):null;

export function sitePlan(origin,label){
  validateOrigin(origin);
  if(typeof label!=='string'||label.length<4||label.length>96||
     !/^[\p{L}\p{N} _-]+$/u.test(label))
    throw Error('P0_TEST_WORLD_LABEL_REQUIRED');
  const site={origin,label,planSha256:PLAN.sha256,
    identityProof:'OPERATOR_ATTESTED_NOT_VERIFIED_BY_GAME_API'};
  return {...site,siteSha256:hash(JSON.stringify(site)),
    extent:{x:[origin.x,origin.x+47],y:[origin.y,origin.y+29],
      z:[origin.z-4,origin.z+39]}};
}
export function validatePlan(){
  if(PLAN.placementCount>MAX_BLOCK_WRITES||PLAN.runs.length>MAX_RUNS||
     PLAN.placementCount===0||!PLAN.runs.length)throw Error('P0_PLAN_EXCEEDS_CAP');
  const seen=new Set();
  for(const p of PLAN.voxels){
    const key=xyz(p);
    if(seen.has(key)||!MATERIALS.includes(p.block))throw Error('P0_BAD_VOXELS');
    seen.add(key);
  }
  let n=0;
  for(const r of PLAN.runs){
    if(r.x2<r.x1||r.x2-r.x1>64||!MATERIALS.includes(r.block))
      throw Error('P0_BAD_RUN');
    for(let x=r.x1;x<=r.x2;x++){
      if(!seen.has(x+' '+r.y+' '+r.z))throw Error('P0_RUN_MISMATCH');
      n++;
    }
  }
  if(n!==PLAN.placementCount)throw Error('P0_BAD_RUN_TOTAL');
  return {sha256:PLAN.sha256,blocks:PLAN.placementCount,runs:PLAN.runs.length,
    footprint:PLAN.footprint,materials:PLAN.counts};
}
export function commandFor(run,origin,kind='build'){
  validateOrigin(origin);
  const p=absolute({x:run.x1,y:run.y,z:run.z},origin);
  const q=absolute({x:run.x2,y:run.y,z:run.z},origin);
  if(!MATERIALS.includes(run.block))throw Error('P0_BLOCK_NOT_ALLOWED');
  if(kind==='build'){
    // "keep" is fail-safe against a new occupant between survey and placement.
    return run.x1===run.x2
      ? 'setblock '+xyz(p)+' '+run.block+' keep'
      : 'fill '+xyz(p)+' '+xyz(q)+' '+run.block+' keep';
  }
  throw Error('P0_DISALLOWED_COMMAND_KIND');
}
const query=(p,b)=>'testforblock '+xyz(p)+' '+b;
const remove=(p,b)=>'fill '+xyz(p)+' '+xyz(p)+' minecraft:air replace '+b;
const fullPos=(run,x,origin)=>absolute({x,y:run.y,z:run.z},origin);
const cells=(run,origin)=>Array.from({length:run.x2-run.x1+1},
  (_,i)=>fullPos(run,run.x1+i,origin));
const testCommand=cmd=>
 /^(?:testforblock|setblock|fill) [-\d ]+ minecraft:(?:air|quartz_block|iron_block|glass|glowstone|stone)(?: (?:keep|replace minecraft:(?:quartz_block|iron_block|glass|glowstone|stone)))?$/.test(cmd)||
 /^fill [-\d ]+ minecraft:(?:quartz_block|iron_block|glass|glowstone|stone) keep$/.test(cmd);

export async function run(world,cmd){
  if(!testCommand(cmd))throw Error('P0_COMMAND_REJECTED '+cmd.slice(0,120));
  if(typeof world?.runCommand!=='function')throw Error('P0_GAME_WORLD_MISSING');
  try{return await world.runCommand(cmd,{timeout:12000,noResponse:false});}
  catch(e){return {transportError:true,statusMessage:String(e?.message??e).slice(0,160)};}
}
async function asMatch(world,p,block){return success(await run(world,query(p,block)));}
async function parallelChecks(items,work){
  let next=0,count=0,failed=null;
  const workers=Array.from({length:CONCURRENCY},async()=>{
    while(!failed&&next<items.length){
      const i=next++;
      try{await work(items[i],i);count++;
        if(count%500===0)console.log('Read-only preflight '+count+'/'+items.length);}
      catch(e){failed=e;}
    }
  });
  await Promise.all(workers);
  if(failed)throw failed;
  return count;
}
function ensureJournal(site,journal){
  if(!journal)return;
  if(journal.schema!=='minecraftaibuilder-ark-lite-journal-p0'||
     journal.siteSha256!==site.siteSha256||
     journal.planSha256!==PLAN.sha256||
     !Array.isArray(journal.attemptedRuns)||
     !Array.isArray(journal.completedRuns)||
     journal.attemptedRuns.some(i=>!Number.isInteger(i)||i<0||i>=PLAN.runs.length)||
     journal.completedRuns.some(i=>!journal.attemptedRuns.includes(i)))
    throw Error('P0_EXISTING_JOURNAL_CONFLICT: do not overwrite or delete');
}
export async function survey(world,site,journal=null){
  validatePlan();ensureJournal(site,journal);
  // Calibrate against the same known-air location; failures never authorize writes.
  const first=absolute(PLAN.voxels[0],site.origin);
  const controlType=journal?.attemptedRuns?.includes(0)?PLAN.voxels[0].block:'minecraft:air';
  const positive=await run(world,query(first,controlType));
  const negative=await run(world,query(first,'minecraft:stone'));
  if(!success(positive)||!failCode(negative))
    throw Error('P0_LIVE_AIR_CONTROL_FAILED (site must be air and responses conclusive)');
  // A few unplanned interior cells must also be air: fail on an occupied lobby.
  for(const x of [5,15,25,35])for(const z of [5,15,25,35]){
    for(const y of [5,12]){
      const p=absolute({x,y,z},site.origin);
      if(!await asMatch(world,p,'minecraft:air'))
        throw Error('P0_INTERIOR_OBSTRUCTED '+xyz(p));
    }
  }
  const owned=new Set(journal?.attemptedRuns??[]);
  const items=[];
  for(let i=0;i<PLAN.runs.length;i++)
    for(const p of cells(PLAN.runs[i],site.origin))
      items.push({i,p,block:PLAN.runs[i].block});
  let preexisting=0;
  await parallelChecks(items,async item=>{
    if(await asMatch(world,item.p,'minecraft:air'))return;
    if(owned.has(item.i)&&await asMatch(world,item.p,item.block)){
      preexisting++;return;
    }
    throw Error('P0_SITE_OCCUPIED_OR_UNKNOWN '+xyz(item.p));
  });
  return {checked:items.length,verifiedAir:items.length-preexisting,
    journalOwnedMatching:preexisting,interiorSampled:32,
    airControlPass:true};
}
async function verifyRun(world,run,site){
  for(const p of cells(run,site.origin))
    if(!await asMatch(world,p,run.block))
      throw Error('P0_READBACK_MISMATCH '+xyz(p));
}
async function beforeRun(world,run,site,alreadyAttempted){
  let missing=0;
  for(const p of cells(run,site.origin)){
    if(await asMatch(world,p,'minecraft:air')){missing++;continue;}
    if(alreadyAttempted&&await asMatch(world,p,run.block))continue;
    throw Error('P0_OCCUPIED_DURING_PLACEMENT '+xyz(p));
  }
  return missing;
}
export async function build(world,site,confirm){
  const old=saved();ensureJournal(site,old);
  if(old?.cleanupAt)throw Error('P0_CLEANED_JOURNAL_CANNOT_BE_REBUILT');
  const check=await survey(world,site,old);
  const phrase='BUILD '+PLAN.sha256.slice(0,12)+' '+site.label;
  if(confirm!==phrase)throw Error('P0_EXPLICIT_BUILD_CONFIRMATION_REQUIRED: '+phrase);
  const journal=old??{schema:'minecraftaibuilder-ark-lite-journal-p0',
    siteSha256:site.siteSha256,planSha256:PLAN.sha256,
    origin:site.origin,label:site.label,startedAt:now(),
    attemptedRuns:[],completedRuns:[],writeAttempts:0,writeSuccess:0,
    completed:false,cleanupComplete:false};
  if(!old)save(JOURNAL,journal);
  for(let i=0;i<PLAN.runs.length;i++){
    if(journal.completedRuns.includes(i))continue;
    const segment=PLAN.runs[i];
    const attempted=journal.attemptedRuns.includes(i);
    const missing=await beforeRun(world,segment,site,attempted);
    if(!attempted){journal.attemptedRuns.push(i);save(JOURNAL,journal);}
    if(missing){
      if(journal.writeAttempts>=MAX_RUNS)throw Error('P0_WRITE_COMMAND_LIMIT');
      journal.writeAttempts++;save(JOURNAL,journal); // durable BEFORE sending
      const response=await run(world,commandFor(segment,site.origin));
      if(!success(response))throw Error('P0_KEEP_WRITE_FAILED_AT_RUN '+i+' '+String(response?.statusMessage??''));
      journal.writeSuccess++;save(JOURNAL,journal);
    }
    await verifyRun(world,segment,site);
    journal.completedRuns.push(i);save(JOURNAL,journal);
    if(journal.completedRuns.length%100===0)
      console.log('Verified runs '+journal.completedRuns.length+'/'+PLAN.runs.length);
  }
  journal.completed=true;journal.completedAt=now();save(JOURNAL,journal);
  return {outcome:'GAME_COMMAND_AND_READBACK_COMPLETED_NEEDS_VISUAL_CHECK',
    check,confirmedRuns:journal.completedRuns.length,
    writeSuccess:journal.writeSuccess,actualBlocksReadback:PLAN.placementCount,
    journalPath:JOURNAL,visualConfirmation:false};
}
export async function cleanup(world,site,confirm){
  const journal=saved();ensureJournal(site,journal);
  if(!journal)throw Error('P0_CLEANUP_REQUIRES_OWN_JOURNAL');
  const phrase='CLEAN '+PLAN.sha256.slice(0,12)+' '+site.label;
  if(confirm!==phrase)throw Error('P0_EXPLICIT_CLEAN_CONFIRMATION_REQUIRED: '+phrase);
  let removed=0,skipped=0;
  const attempted=[...new Set(journal.attemptedRuns)].reverse();
  for(const i of attempted){
    const runItem=PLAN.runs[i];
    for(const p of cells(runItem,site.origin)){
      if(await asMatch(world,p,'minecraft:air'))continue;
      if(!await asMatch(world,p,runItem.block)){skipped++;continue;}
      const response=await run(world,remove(p,runItem.block));
      if(success(response)&&await asMatch(world,p,'minecraft:air'))removed++;
      else skipped++;
    }
  }
  journal.cleanupComplete=skipped===0;journal.cleanupAt=now();save(JOURNAL,journal);
  return {outcome:skipped?'HOLD_UNSAFE_TO_REMOVE_CHANGED_BLOCKS':'CLEANED_OWN_MATCHING_BLOCKS',
    removed,skipped,cleanupComplete:skipped===0};
}
export function planInfo(){return {...validatePlan(),deployment:'NO_WORLD_WRITE_WITHOUT_BUILD_MODE_AND_OPERATOR_CONFIRMATION',
  mainSafety:'NOT_PREPARED_9_BLOCKED_UNCHANGED'};}
function saveReport(site,mode,result){save(REPORT,{schema:'minecraftaibuilder-ark-lite-game-report-p0',
  mode,observedAt:now(),site,plan:planInfo(),...result,
  independentVisualVerification:false,
  mainConstructionApproval:false});}
async function promptSite(rl){
  const label=(await rl.question('Dedicated TEST WORLD name (manual attestation): ')).trim();
  const raw=(await rl.question('Floor SW origin X Y Z, all air at floor layer: ')).trim();
  if(!/^-?\d+ -?\d+ -?\d+$/.test(raw))throw Error('P0_INVALID_ORIGIN_INPUT');
  const [x,y,z]=raw.split(' ').map(Number);
  return sitePlan({x,y,z},label);
}
export async function live(mode){
  const rl=readline.createInterface({input:stdin,output:stdout});
  let site,confirm='';
  try{
    site=await promptSite(rl);
    console.log('Bounds: '+JSON.stringify(site.extent));
    console.log('Blocks: '+PLAN.placementCount+'; fill/keep runs: '+PLAN.runs.length);
    console.log('World name is OPERATOR ATTESTED, not readable from socket-be.');
    if(mode==='build'||mode==='cleanup'){
      const verb=mode==='build'?'BUILD':'CLEAN';
      console.log('AUTHORIZE TEST-WORLD '+mode.toUpperCase()+' ONLY: '+verb+' '+PLAN.sha256.slice(0,12)+' '+site.label);
      confirm=(await rl.question('Type exact consent phrase (otherwise abort): ')).trim();
      if(confirm!==verb+' '+PLAN.sha256.slice(0,12)+' '+site.label)
        throw Error('P0_CONSENT_NOT_GIVEN');
    }
  }finally{rl.close();}
  const socket=await import('socket-be');
  if(typeof socket.Server!=='function'||!socket.ServerEvent?.WorldAdd)
    throw Error('P0_SOCKET_BE_UNSUPPORTED');
  const server=new socket.Server({port:PORT,webSocketOptions:{host:'127.0.0.1',maxPayload:65536}});
  let once=false;
  server.on(socket.ServerEvent.Open,()=>console.log('Listening on 127.0.0.1:'+PORT));
  server.on(socket.ServerEvent.WorldAdd,evt=>{
    if(once||!evt?.world)return;
    once=true;
    console.log('Education connection received. Starting '+mode+'...');
    void (async()=>{
      let result;
      try{
        if(mode==='survey')result={outcome:'READ_ONLY_SURVEY_PASSED',check:await survey(evt.world,site,saved())};
        else if(mode==='build')result=await build(evt.world,site,confirm);
        else result=await cleanup(evt.world,site,confirm);
        saveReport(site,mode,result);
        console.log('RESULT '+JSON.stringify(result));
        if(mode==='build')console.log('Walk inside and visually verify: game placement alone is not final acceptance.');
      }catch(e){
        result={outcome:'HOLD',error:String(e?.message??e),journalPath:JOURNAL};
        saveReport(site,mode,result);console.error('SAFE STOP: '+result.error);process.exitCode=1;
      }finally{setTimeout(()=>process.exit(process.exitCode??0),200);}
    })();
  });
  server.network?.wss?.on('error',err=>{console.error('WebSocket error: '+err.message);process.exitCode=1;});
  console.log('In the authorized Minecraft Education TEST WORLD run /wsserver 127.0.0.1:8000 ONCE.');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{
    const mode=process.argv[2]??'--inspect';
    if(mode==='--inspect')console.log(JSON.stringify(planInfo(),null,2));
    else if(['--survey','--build','--cleanup'].includes(mode))await live(mode.slice(2));
    else throw Error('P0_INVALID_MODE');
  }catch(e){console.error('P0 HOLD: '+e.message);process.exitCode=1;}
}
