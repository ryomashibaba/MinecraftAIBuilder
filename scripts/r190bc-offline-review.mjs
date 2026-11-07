/** R190-BC offline-only access to source SECTION and design-first prompt. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {buildR190BCDesignFirstPrompt,writeR190BCOriginalReview}
 from './r190bc-design-first-section.mjs';
export const R190BC_CLI_SCHEMA='minecraftaibuilder-r190bc-offline-prompt-v1';
const fail=s=>{throw Error('R190BC_CLI_'+s)};
const H=x=>createHash('sha256').update(x).digest('hex');
export function parseR190BCArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==6)fail('EXPECTED_--brief_OR_--original_--sha_--out');
 const opts={};
 for(let i=0;i<argv.length;i+=2){
  const a=argv[i],k=a==='--brief'?'brief':a==='--original'?'original':
   a==='--sha'?'sha':a==='--out'?'out':null;
  if(!k||Object.hasOwn(opts,k)||!argv[i+1])fail('UNKNOWN_OR_DUPLICATE');
  opts[k]=argv[i+1];
 }
 if(Boolean(opts.brief)===Boolean(opts.original)||!opts.out||
   !/^[a-f0-9]{64}$/.test(opts.sha??''))fail('FLAGS');
 return opts;
}
export function prepareR190BCOfflinePrompt({briefPath,outDir,expectedSha256}){
 if(typeof briefPath!=='string'||!path.isAbsolute(briefPath)||
  typeof outDir!=='string'||!path.isAbsolute(outDir)||fs.existsSync(outDir))
  fail('FRESH_ABSOLUTE_PATHS');
 const st=fs.lstatSync(briefPath);
 if(!st.isFile()||st.isSymbolicLink()||st.size<8||st.size>20000)
  fail('UNSAFE_BRIEF');
 const bytes=fs.readFileSync(briefPath),digest=H(bytes);
 if(!/^[a-f0-9]{64}$/.test(expectedSha256??'')||digest!==expectedSha256)
  fail('BRIEF_SHA_MISMATCH');
 let plain;
 try{plain=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}
 catch{fail('INVALID_UTF8')}
 const prompt=buildR190BCDesignFirstPrompt(plain);
 if(H(fs.readFileSync(briefPath))!==digest)fail('INPUT_CHANGED');
 const parent=fs.lstatSync(path.dirname(outDir));
 if(!parent.isDirectory()||parent.isSymbolicLink())fail('UNSAFE_OUTPUT_PARENT');
 const receipt={schema:R190BC_CLI_SCHEMA,originalBriefSha256:digest,
  modelRequestPromptSha256:H(Buffer.from(prompt,'utf8')),originalUnmodified:true,
  newModelRequests:0,hostGeneratedGeometry:false,
  architectureQuality:'NOT_CERTIFIED',sourceOnly:true,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,art:'ART_HOLD'};
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'ORIGINAL_BRIEF.txt'),bytes,{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'DESIGN_FIRST_PROMPT.txt'),prompt,{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'R190BC_PROMPT_RECEIPT.json'),
  JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 return receipt;
}
export function runR190BCOfflineArgs(argv){
 const o=Array.isArray(argv)?parseR190BCArgs(argv):argv;
 if(o.help)return {help:
  'node scripts/r190bc-offline-review.mjs --brief <file> --sha <sha256> --out <new-dir> OR --original <R4-model-response> --sha <sha256> --out <new-dir>. Offline only.'};
 const out=path.resolve(o.out);
 if(o.brief)return prepareR190BCOfflinePrompt({
  briefPath:path.resolve(o.brief),outDir:out,expectedSha256:o.sha});
 return writeR190BCOriginalReview({originalPath:path.resolve(o.original),
  outDir:out,expectedSha256:o.sha});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=runR190BCOfflineArgs(process.argv.slice(2));
  console.log(JSON.stringify(result,null,2));
  if(result.status?.startsWith('HOLD'))process.exitCode=2;
 }catch(e){console.error(String(e?.message??e));process.exitCode=1}
}
