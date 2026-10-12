#!/usr/bin/env node
/** Safe offline replay only. Refuses exports unless destination does not exist. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inputsFromSource,buildFromSource} from '../../b44/main/run-b44-main.mjs';
import {compileB45} from '../../b45/main/compile-b45.mjs';
import {compileB46} from '../../b46/main/compile-b46.mjs';
import {compileB47,verifyB47,PINNED_REFERENCE} from './compile-b47.mjs';
import {createHash} from 'node:crypto';
const DIR=path.dirname(fileURLToPath(import.meta.url));
export function assertReferencePins(){
 const fileDigest=x=>createHash('sha256').update(fs.readFileSync(x)).digest('hex');
 const anchors=[['plannerSha256',path.join(DIR,'../../../dev/reference-engine-general-building-planner.js')],
 ['envelopeSha256',path.join(DIR,'../../../dev/pinned-building-envelope.B33.mjs')],
 ['grammarSha256',path.join(DIR,'REFERENCE_BUILDING_GRAMMAR_PINNED.txt')]];
 for(const [key,file] of anchors){if(fileDigest(file)!==PINNED_REFERENCE[key])throw Error('B47_REFERENCE_PIN_MISMATCH_'+key);}
 return true;
}
export function buildB47FromSource(){
 assertReferencePins();
 const i=inputsFromSource(),main=buildFromSource(),b45=compileB45(i.b,main),b46=compileB46(b45,i.b,main);
 const report=compileB47(b46,b45,i.b,main);
 verifyB47(report,b46,b45,i.b,main);
 return {report,b46,b45,structure:i.b,main};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length===1&&args[0]!=='--export'))throw Error('B47_EXPORT_FLAG_ONLY');
 const {report}=buildB47FromSource();
 if(args.length){
  const target=path.join(DIR,'B47_PINNED_PLANNER_COMPATIBILITY.json');
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 }
 console.log('B47_REFERENCE_ENVELOPE_PASS',JSON.stringify({totals:report.totals,
  supported:report.buildings.map(b=>({id:b.id,rule:b.referenceMassing.name,requiresExplicit:b.referenceMassing.requiresExplicitMassing})),
  readiness:report.readiness,blockedGates:report.blockers.M4Gates.length,operations:0}));
}
