#!/usr/bin/env node
/**
 * R39 local-only explicit intake and diagnosis commands.
 * Never invokes a model or Minecraft; never auto-repairs an existing bundle.
 */
import fs from 'node:fs';
import {submitR39Review,diagnoseR39Bundle}
 from './b198zr39-review-submission-offline.mjs';
const USAGE=[
 'R39: Review CLAIM submission and read-only diagnostics; NOT proof of a human.',
 'submit:   node scripts/b198zr39-review-submission-cli.mjs submit R37_REPORT_OR_ENTRY.json NEW_DIR [EXTERNAL_PINS.json]',
 'diagnose: node scripts/b198zr39-review-submission-cli.mjs diagnose DIR [MANIFEST_SHA256|-] [EXTERNAL_PINS.json]',
 'Only NEW_DIR can be written; diagnose never repairs, overwrites or creates files.',
 'If external pins are omitted, submit derives them from unverified review fields.',
 'Keep the printed manifestSha256 independently OUTSIDE the bundle.'
].join('\n');
function readJson(path,limit){
 const st=fs.lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.size===0||st.size>limit)
  throw Error('R39_CLI_UNSAFE_OR_OVERSIZE_INPUT');
 return JSON.parse(fs.readFileSync(path,'utf8'));
}
function main(args){
 const [mode,...parts]=args;
 if(mode==='--help'&&parts.length===0){
  process.stdout.write(USAGE+'\n');return;
 }
 if(mode==='submit'&&(parts.length===2||parts.length===3)){
  const [inputFile,directory,pinFile]=parts;
  const submitted=readJson(inputFile,3*1024*1024);
  const expectedPins=pinFile===undefined?null:readJson(pinFile,32768);
  const r=submitR39Review({submitted,directory,expectedPins});
  process.stdout.write(JSON.stringify(r,null,2)+'\n');return;
 }
 if(mode==='diagnose'&&parts.length>=1&&parts.length<=3){
  const [directory,manifestArg,pinFile]=parts;
  const expectedPins=pinFile===undefined?null:readJson(pinFile,32768);
  const r=diagnoseR39Bundle({directory,
   expectedManifestSha256:manifestArg===undefined||manifestArg==='-'?
    null:manifestArg,expectedPins});
  process.stdout.write(JSON.stringify(r,null,2)+'\n');
  if(r.status==='HOLD_BUNDLE_DIAGNOSTIC')process.exitCode=1;
  return;
 }
 process.stderr.write(USAGE+'\n');process.exitCode=2;
}
try{main(process.argv.slice(2))}
catch(e){
 const s=String(e?.message||'R39_CLI_UNEXPECTED_ERROR');
 process.stderr.write((s.startsWith('R39_')||s.startsWith('R38_')?
  s:'R39_CLI_INPUT_OR_FILESYSTEM_ERROR')+'\n');
 process.exitCode=1;
}
