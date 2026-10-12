#!/usr/bin/env node
/** Only reads pinned B43 and new SubA/B/C offline reports. Optional result in main-owned new file. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {generate,readPinnedInputs} from '../sub-a/run-offline-b44a.mjs';
import {buildB44FromBaseline} from '../sub-b/generate-b44.mjs';
import {compileB44CPreflight,BASELINE_REPORT_PATHS} from '../sub-c/preflight.mjs';
import {compileB44Main,verifyB44Main} from './integrate-b44.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const SOURCE=path.resolve(HERE,'../../..');
const sha=buf=>createHash('sha256').update(buf).digest('hex');
const PINS=Object.freeze({
 'sub-a/B44A_CIRCULATION_REVIEW.json':'144f9182c0b6cce194bd59bdbb4c5593ed516abbd1d2acea0b7e7a6d6a600dc2',
 'sub-b/B44_STRUCTURE_REVIEW.json':'b0a6833a0bcf0f02245492304f38e4cd32e122cd48e94d78517c43a27805e548',
 'sub-c/evidence-report.json':'8ba6ea605d3b71bc5dcb26af54697991daf3ac4bda57848d334e6f76c7f38d10'});
const fail=k=>{throw Error('B44_MAIN_RUN_'+k)};
function safeRead(file){const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_FILE');return fs.readFileSync(file);}
function readPinned(rel){const buf=safeRead(path.join(SOURCE,'parallel/b44',rel));if(sha(buf)!==PINS[rel])fail('INPUT_PIN_'+rel);return JSON.parse(buf.toString('utf8'));}
export function inputsFromSource(){
 const a=readPinned('sub-a/B44A_CIRCULATION_REVIEW.json');
 const b=readPinned('sub-b/B44_STRUCTURE_REVIEW.json');
 const cArchived=readPinned('sub-c/evidence-report.json').preflight;
 const inputs={};for(const [k,file] of Object.entries(BASELINE_REPORT_PATHS))inputs[k]=JSON.parse(safeRead(path.join(SOURCE,file)).toString('utf8'));
 const c=compileB44CPreflight(inputs);
 if(JSON.stringify(c)!==JSON.stringify(cArchived))fail('C_ARCHIVE_REPLAY_CHANGED');
 if(JSON.stringify(a)!==JSON.stringify(generate(SOURCE)))fail('A_REPLAY_CHANGED');
 if(JSON.stringify(b)!==JSON.stringify(buildB44FromBaseline(SOURCE)))fail('B_REPLAY_CHANGED');
 return {a,aInputs:readPinnedInputs(SOURCE),b,c};
}
export function buildFromSource(){const inputs=inputsFromSource(),result=compileB44Main(inputs);verifyB44Main(result,inputs);return result;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==0 && !(args.length===2&&args[0]==='--output'))fail('ARGUMENTS');
 const report=buildFromSource();
 if(args.length){
  const dest=path.resolve(args[1]);
  if(path.dirname(dest)!==HERE || fs.existsSync(dest))fail('OUTPUT_NOT_NEW_MAIN_FILE');
  fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 }
 console.log('B44_MAIN_INTEGRATION_PASS',JSON.stringify({reportSha256:report.reportSha256,
  aggregate:report.aggregate,reviewedA:report.crossChecks.normalizedInputA.acceptedForOfflineReview,
  reviewedB:report.crossChecks.normalizedInputB.acceptedForOfflineReview,
  blockedGates:report.crossChecks.cGatesBlocked,engineCalls:report.engineCalls,buildOperations:report.buildOperations}));
}
