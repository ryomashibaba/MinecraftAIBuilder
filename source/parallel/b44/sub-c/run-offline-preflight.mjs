#!/usr/bin/env node
/** Read-only CLI. Reads only selected JSON reports; JSON result goes to stdout. */
import fs from 'node:fs';
import path from 'node:path';
import {compileB44CPreflight, BASELINE_REPORT_PATHS, reviewCandidateIR} from './preflight.mjs';
function cli(argv){
 if(![2,6].includes(argv.length)||argv[0]!=='--source'||(argv.length===6&&(argv[2]!=='--role'||!['sub-a','sub-b'].includes(argv[3])||argv[4]!=='--ir')))throw new Error('Usage: node run-offline-preflight.mjs --source <baseline/source> [--role sub-a|sub-b --ir <review-ir.json>]');
 const root=path.resolve(argv[1]);
 const data={};
 for(const [key,relative] of Object.entries(BASELINE_REPORT_PATHS))data[key]=JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
 const preflight=compileB44CPreflight(data);
 const review=argv.length===6?reviewCandidateIR(JSON.parse(fs.readFileSync(argv[5],'utf8')),argv[3]):null;
 process.stdout.write(JSON.stringify({preflight,review},null,2)+'\n');
}
try {cli(process.argv.slice(2));}catch(e){process.stderr.write(`${e.code??'B44C_CLI_ERROR'}: ${e.message}\n`);process.exitCode=1;}
