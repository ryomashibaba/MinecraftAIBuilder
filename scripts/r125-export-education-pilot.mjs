/** Offline CLI: exact B143 or Compact ArchitecturePlan -> MakeCode pilot file.
 * Does NOT connect to Minecraft/Ollama or run generated commands.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {compileCompactArchitecturePlan} from '../source/ai/r190bn-compact-to-bn.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';
const reject=x=>{throw Error('R125_EXPORT_CLI_'+x)};
function read(p,max=200000){
 const stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size===0||stat.size>max)reject('SOURCE_FILE');
 return fs.readFileSync(p);
}
const J=o=>JSON.stringify(o,null,2)+'\n';
export function offlineEducationExport({designFile,compactFile,briefFile,out,provenance='UNVERIFIED_DESIGN',paletteFile=null}={}){
 if(typeof out!=='string'||!out||fs.existsSync(out)||!fs.existsSync(path.dirname(path.resolve(out))))
  reject('FRESH_OUTPUT');
 if(Boolean(designFile)===Boolean(compactFile))reject('ONE_INPUT_MODE');
 let design,scene,derived;
 if(designFile){
  design=JSON.parse(read(path.resolve(designFile)).toString('utf8'));
  scene=compileDesign(design);
 }else{
  if(!briefFile)reject('BRIEF_REQUIRED');
  const plan=JSON.parse(read(path.resolve(compactFile)).toString('utf8'));
  derived=compileCompactArchitecturePlan(plan,{
   originalBrief:read(path.resolve(briefFile),20000),
   authorship:provenance==='SYNTHETIC_TEST_FIXTURE'?'SYNTHETIC_TEST_FIXTURE':'UNVERIFIED_AUTHOR'});
  if(derived.status!=='SOURCE_TWO_LEVEL_VOXEL_ROUTE_PROXIES_ART_HOLD'){
   fs.mkdirSync(out);
   fs.writeFileSync(path.join(out,'HOLD.json'),J({status:'HOLD_NO_GENERATED_CONSTRUCTION',
    reason:derived.reason,detail:derived.failure??null,worldWrites:0,modelCalls:0,
    art:'ART_HOLD',BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')}),{flag:'wx'});
   return {status:'HOLD',reason:derived.reason};
  }
  design=derived.derived.proposal.design;
  scene=derived.derived.compiled;
 }
 const verifiedPalette=paletteFile?JSON.parse(read(path.resolve(paletteFile),20000).toString('utf8')):null;
 const exported=exportB143EducationMakeCode({design,scene,provenance,verifiedPalette});
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'MAKECODE_EDUCATION.ts'),exported.code,{flag:'wx'});
 const {code,...metadata}=exported;
 fs.writeFileSync(path.join(out,'EXPORT_REPORT.json'),J(metadata),{flag:'wx'});
 fs.writeFileSync(path.join(out,'RUN_FIRST_JA.txt'),[
  'Minecraft Education 試験施工パイロット（実機動作は未検証）',
  '1. 必ず新規の平坦な試験ワールドを作り、コピー／バックアップを取る。',
  '2. クリエイティブ・Code Builder利用権限を確認し、建築する無人の平坦な場所に立つ。',
  '3. CキーでCode Builder → MakeCode → JavaScriptを開き、MAKECODE_EDUCATION.tsを貼り付けRun。',
  '4. チャットで mabset を入力し、表示された建築範囲の場所を確認する。',
  '5. チャットで mabbuild と入力する（この時初めてゲーム内ブロック書込みを試みる）。',
  '6. 完了後に mabverify を実行し、入口・階段・空間を目視でも確認。',
  '7. 一度の実行後は再実行しない。部分施工・不具合なら元ワールドコピーへ復元。',
  '8. プログラムは試験ワールドのID/バックアップ実在を検証できない。',
  '9. 未対応の自由形状/未知用途のAI設計は、この出力だけでは解決しない。',
  '10. このステップは実行ファイル生成のみ。成功実績と呼ぶにはゲーム内検証が必要。'
 ].join('\n')+'\n',{flag:'wx'});
 return {status:'OFFLINE_MAKECODE_EXPORT_READY',out,metadata};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),opts={};
  for(let i=0;i<args.length;i+=2){
   if(!['--design','--compact','--brief','--out','--provenance','--palette'].includes(args[i])||
    !args[i+1]||Object.hasOwn(opts,args[i]))reject('ARGUMENTS');
   opts[args[i]]=args[i+1];
  }
  const result=offlineEducationExport({designFile:opts['--design'],compactFile:opts['--compact'],
   briefFile:opts['--brief'],out:opts['--out'],provenance:opts['--provenance'],paletteFile:opts['--palette']});
  console.log(J(result));if(result.status==='HOLD')process.exitCode=2;
 }catch(e){console.error(e.message);process.exitCode=1;}
}
