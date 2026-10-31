#!/usr/bin/env node
/** R40 explicit local receipt workflow; never launches a model or Minecraft.
 * The receipt must be independently kept OUTSIDE the R38 bundle. Receipt
 * generation from a bundle does not itself authenticate the source.
 */
import fs from 'node:fs';
import {saveR40Receipt,verifyR40Receipt}
 from './b198zr40-separate-receipt-offline.mjs';
const USAGE=[
 'R40 offline separate SHA receipt (NOT a trusted external anchor).',
 'save:   node scripts/b198zr40-separate-receipt-cli.mjs save R38_DIR OUTSIDE_RECEIPT.json [SOURCE_PINS.json]',
 'verify: node scripts/b198zr40-separate-receipt-cli.mjs verify R38_DIR OUTSIDE_RECEIPT.json [SOURCE_PINS.json]',
 'Save the receipt in a separately controlled location; no automatic copying.',
 'Neither successful verification nor receipt storage certifies quality or authorship.'
].join('\n');
function readPins(file){
 if(file===undefined)return null;
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>32768)
  throw Error('R40_CLI_INVALID_PIN_FILE');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function main(args){
 const [command,directory,receiptPath,pinFile]=args;
 if(command==='--help'&&args.length===1){
  process.stdout.write(USAGE+'\n');return;
 }
 if(!['save','verify'].includes(command)||args.length<3||args.length>4){
  process.stderr.write(USAGE+'\n');process.exitCode=2;return;
 }
 const expectedPins=readPins(pinFile);
 const result=command==='save'?
  saveR40Receipt({directory,receiptPath,expectedPins}):
  verifyR40Receipt({directory,receiptPath,expectedPins});
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(result.status.startsWith('HOLD_'))process.exitCode=1;
}
try{main(process.argv.slice(2))}
catch(e){
 const message=String(e?.message||'');
 process.stderr.write((/^R40_[A-Za-z0-9_]+$/.test(message)?message:
  'R40_CLI_OPERATION_FAILED')+'\n');
 process.exitCode=1;
}
