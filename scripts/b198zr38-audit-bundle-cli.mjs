#!/usr/bin/env node
/**
 * Explicit local command; no background activity, Qwen or Minecraft.
 * Use R37 reviewer CLAIM ledger JSON, not Qwen raw captured output.
 *   node scripts/b198zr38-audit-bundle-cli.mjs pack ENTRIES.json PINS.json NEW_DIR
 *   node scripts/b198zr38-audit-bundle-cli.mjs verify DIR [MANIFEST_SHA256] [PINS.json]
 *
 * SHA pins provided by the caller are not authenticated electronic signatures.
 */
import fs from 'node:fs';
import {writeR38Bundle,readR38Bundle}
 from './b198zr38-audit-bundle-offline.mjs';

const USAGE=[
 'R38 local-only review CLAIM bundle (never authenticates people).',
 'pack:   node scripts/b198zr38-audit-bundle-cli.mjs pack ENTRIES.json PINS.json NEW_DIR',
 'verify: node scripts/b198zr38-audit-bundle-cli.mjs verify DIR [MANIFEST_SHA256] [PINS.json]',
 'Store the printed manifest SHA256 outside the bundle for comparison.',
 'Do not pass actual Qwen raw response files as entries.'
].join('\n');
function readUserJson(filename,limit){
 const s=fs.lstatSync(filename);
 if(!s.isFile()||s.isSymbolicLink()||s.size>limit||s.size===0)
  throw Error('R38_CLI_INPUT_UNSAFE_OR_OVERSIZED');
 const bytes=fs.readFileSync(filename);
 return JSON.parse(bytes.toString('utf8'));
}
function main(argv){
 const [command,...args]=argv;
 if(command==='--help'&&args.length===0){
  process.stdout.write(USAGE+'\n');return;
 }
 if(command==='pack'&&args.length===3){
  const [entryFile,pinFile,directory]=args;
  const entries=readUserJson(entryFile,3*1024*1024);
  const pins=readUserJson(pinFile,32768);
  const report=writeR38Bundle({directory,entries,pins});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  return;
 }
 if(command==='verify'&&args.length>=1&&args.length<=3){
  const [directory,expectedManifestSha256,pinFile]=args;
  const expectedPins=pinFile===undefined?null:readUserJson(pinFile,32768);
  const report=readR38Bundle({directory,
   expectedManifestSha256:expectedManifestSha256??null,expectedPins});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  return;
 }
 process.stderr.write(USAGE+'\n');
 process.exitCode=2;
}
try{main(process.argv.slice(2))}
catch(e){
 process.stderr.write(String(e?.message||e)+'\n');
 process.exitCode=1;
}
