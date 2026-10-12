#!/usr/bin/env node
/** Read-only production-plan JSON compatibility check. No commands/operations emitted. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB72} from './run-b72.mjs';
import {preflightProductionPlan} from './compile-b72.mjs';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.slice(2);
 if(a.length!==4||a[0]!=='--building'||a[2]!=='--plan-json'||!a[1]||!a[3])throw Error('B72_USAGE: --building program/candidate-xx --plan-json /path/to/local.json');
 const st=fs.statSync(a[3]);if(!st.isFile()||st.size>5_000_000)throw Error('B72_PLAN_FILE_TOO_BIG');
 const plan=JSON.parse(fs.readFileSync(a[3],'utf8'));
 const {report,b66}=buildB72(),job=report.jobs.find(j=>j.id===a[1]);if(!job)throw Error('B72_UNKNOWN_BUILDING');
 const result=preflightProductionPlan(plan,job,b66);
 console.log('B72_READONLY_PREFLIGHT',JSON.stringify(result,null,2));
 console.log('NOT_PREPARED / BLOCKED / NO CONSTRUCTION OPERATIONS ISSUED');
}
