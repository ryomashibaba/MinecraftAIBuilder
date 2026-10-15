/**
 * B133: offline-only operator aid. Generates text for four read-only
 * /testforblock probes; never opens Minecraft or executes a game command.
 * A human must separately approve/select an isolated world and run the
 * queries. A typed result is not an authenticated game observation.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import readline from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';
import {inspectB130Package} from '../../b130/main/b130-lab-tool.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const H=b=>createHash('sha256').update(b).digest('hex');
const PIN='B133_READONLY_SOURCE_PIN.json';
const SOURCE='source/parallel/b133/main/b133-readonly-probe.mjs';
const REQUIRED='B132_STATIC_SOURCE_MANIFEST.json';
const BASELINE='B131_MANIFEST_SHA256.json';
const BLOCK='minecraft:oak_stairs';
const STATES=Object.freeze([0,1,2,3]);

export function parseStairPosition(raw){
 if(typeof raw!=='string')throw Error('B133_COORDINATES_MUST_BE_THREE_INTEGERS');
 const words=raw.trim().split(/\s+/);
 if(words.length!==3||words.some(w=>!/^(-?)(0|[1-9][0-9]*)$/.test(w)))
  throw Error('B133_COORDINATES_MUST_BE_THREE_INTEGERS');
 const [x,y,z]=words.map(Number);
 if(![x,y,z].every(Number.isSafeInteger)||Math.abs(x)>30000000||
    Math.abs(z)>30000000||y< -64||y>512)
  throw Error('B133_COORDINATES_OUT_OF_SAFE_RANGE');
 return {x,y,z};
}
export function renderReadOnlyStairProbes(position){
 const {x,y,z}=parseStairPosition(
  typeof position==='string'?position:
  [position?.x,position?.y,position?.z].join(' '));
 return STATES.map(state=>'/testforblock '+x+' '+y+' '+z+' '+
  BLOCK+' ["weirdo_direction" = '+state+']');
}
export function checkB133Sources(root=ROOT){
 const pin=JSON.parse(fs.readFileSync(path.join(root,PIN),'utf8'));
 const staticManifest=JSON.parse(fs.readFileSync(path.join(root,REQUIRED),'utf8'));
 const b131=fs.readFileSync(path.join(root,BASELINE));
 if(pin.schema!=='minecraftaibuilder-b133-offline-readonly-probe-v1'||
    pin.sourceSha256!==H(fs.readFileSync(path.join(root,SOURCE)))||
    pin.noMinecraftAccess!==true||pin.worldContacts!==0||
    pin.operations?.length!==0||pin.constructionAllowed!==false)
  throw Error('B133_PROBE_SOURCE_CHANGED_OR_UNSAFE');
 if(staticManifest.distributionB131ManifestDigest!==H(b131)||
    staticManifest.claimedObservationsAreNotAuthenticated!==true||
    staticManifest.constructionAllowed!==false||
    staticManifest.worldContacts!==0||
    staticManifest.operations?.length!==0)
  throw Error('B133_B132_STATIC_BASE_INVALID');
 const pairs=Object.entries(staticManifest.immutableFilesSha256??{});
 if(pairs.length!==9)throw Error('B133_EXPECTED_9_PINNED_SOURCES');
 for(const [name,digest] of pairs){
  if(name.includes('..')||path.isAbsolute(name)||
     H(fs.readFileSync(path.join(root,name)))!==digest)
   throw Error('B133_B132_SOURCE_TAMPER');
 }
 const {status}=inspectB130Package(root);
 if(status.worldContacts!==0||status.constructionAllowed!==false||
    status.educationBlockstatesCertified!==false||
    status.realMovementCertified!==false||
    status.totalTrialSlots!==8)
  throw Error('B133_OBSERVATION_STATUS_UNSAFE');
 return {
  remainingTrialIds:status.remainingTrialIds,
  humanClaimedReceiptCount:status.humanClaimedReceiptCount,
  unverifiedMappings:status.claimConsistentDirectionMappings,
  nextTrialId:status.remainingTrialIds[0]??null,
  realEducationReadbacksCertified:0,physicalWalkabilityCertified:0,
  constructionAllowed:false,worldContacts:0,operations:[]
 };
}
export async function interactiveProbe(root=ROOT,rl=readline.createInterface({input,output})){
 try{
  const status=checkB133Sources(root);
  console.log('\nB133 階段の向き・読み取り専用プローブ（Minecraft自動接続なし）');
  console.log('未実施枠 '+status.remainingTrialIds.length+'/8。次の枠: '+
   (status.nextTrialId??'なし'));
  if(!status.nextTrialId){
   console.log('8枠は申告済み。実機認証済みを意味しません。');
   return 2;
  }
  console.log('別途承認済みの独立・非本番ワールドに限ります。');
  console.log('実験ワールドで手動設置した通常のオーク階段1個のXYZ座標を確認します。');
  console.log('Minecraft Educationの権限や構文対応は未確認です。');
  console.log('ゲームの変更・起動・操作はこのツールでは実行しません。');
  const raw=(await rl.question('階段のXYZ座標を整数3個で入力（Qで中止）: ')).trim();
  if(raw.toUpperCase()==='Q')return 2;
  let commands;
  try{commands=renderReadOnlyStairProbes(raw);}
  catch(e){console.error(e.message);return 2;}
  console.log('\n以下は読み取り専用の候補です。手動で1行ずつ試してください。');
  commands.forEach((cmd,index)=>console.log('候補 '+index+': '+cmd));
  console.log('\n4件のうち成功した値が厳密に1つだけなら、その値を記録候補とします。');
  console.log('0件・複数件成功・構文エラー・権限不足なら状態値は不明のままです。');
  console.log('階段の上り方向と上半形状を目視し、歩行可能性は別の未認証項目としてください。');
  console.log('スクリーンショットはユーザー自身で撮影し、B130に登録してください。');
  console.log('登録は独立した検証結果の人間申告であり、Minecraftの実機認証ではありません。');
  const next=(await rl.question('実験後にB130の記録画面へ進むなら YES（それ以外は中止）: ')).trim();
  return next==='YES'?0:2;
 }finally{rl.close();}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const action=process.argv[2]??'--interactive';
  if(action==='--commands'){
   console.log(renderReadOnlyStairProbes(process.argv.slice(3).join(' ')).join('\n'));
  }else if(action==='--check'){
   console.log(JSON.stringify(checkB133Sources(),null,2));
  }else if(action==='--interactive'){
   process.exitCode=await interactiveProbe();
  }else throw Error('B133_ONLY_COMMANDS_CHECK_OR_INTERACTIVE');
 }catch(e){console.error('B133安全停止: '+e.message);process.exitCode=1;}
}
