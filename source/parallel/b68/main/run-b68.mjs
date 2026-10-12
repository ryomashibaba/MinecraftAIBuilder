#!/usr/bin/env node
/** B68 offline only. Optional --source-zip inspects a local B67 output without execution. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB67FromSource} from '../../b67/main/run-b67.mjs';
import {inspectProductionArchive,missingSourceReport} from './inspect-b68.mjs';
import {compileB68,verifyB68} from './compile-b68.mjs';
export function buildB68FromSource(sourceZip=null){
 const b67=buildB67FromSource().report;
 const inventory=sourceZip===null?missingSourceReport():inspectProductionArchive(sourceZip);
 const report=compileB68(b67,inventory);verifyB68(report,b67,inventory);
 return {report,inventory,b67};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const argv=process.argv.slice(2);
 if(argv.length>0&&!(argv.length>=2&&argv.length<=3&&argv[0]==='--source-zip'&&argv[1]&&
 (argv.length===2||argv[2]==='--json')))throw Error('B68_USAGE: [--source-zip PATH [--json]]');
 const x=buildB68FromSource(argv.length?argv[1]:null);
 console.log('B68_STATIC_GATE_PASS',JSON.stringify({received:x.report.intake.found,pinned:x.report.intake.exactPinMatch,drift:x.report.intake.versionMismatch,
  gatesBlocked:9,buildOperations:0,productionParity:'UNVERIFIED',sourceExecuted:false}));
 if(argv[2]==='--json')console.log(JSON.stringify({gate:x.report,inventory:x.inventory},null,2));
 else if(argv.length)console.log('STATIC_NAMES_ONLY',JSON.stringify(x.report.interfaceMatrix.map(x=>({source:x.source,names:x.staticNamesFound,status:x.sourceStatus}))));
}
