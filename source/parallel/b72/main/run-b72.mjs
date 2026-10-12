#!/usr/bin/env node
/** Safe B72 replay from frozen B71 + copied 5-file ZIP. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB71FromSource} from '../../b71/main/run-b71.mjs';
import {compileB72} from './compile-b72.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const archive=path.resolve(here,'../../../../B71_REFERENCE_PINNED_SOURCE_EVIDENCE.zip');
// Read ONE pinned JS text only, never import or execute production JS.
export function readPinnedGrammar(zip=archive){
 if(path.resolve(zip)!==archive)throw Error('B72_CUSTOM_ARCHIVE_NOT_ACCEPTED');
 // B71's ZIP was previously pinned; python extracts only the named bytes in this sandbox.
 const saved=path.resolve(here,'B72_PINNED_BUILDING_GRAMMAR_SOURCE.txt');
 if(!fs.existsSync(saved))throw Error('B72_PINNED_GRAMMAR_TEXT_MISSING');
 return fs.readFileSync(saved,'utf8');
}
export function buildB72(){
 const {report:b71,b65,b66,b69,b70}=buildB71FromSource(archive);
 return {report:compileB72(b65,b66,b69,b70,b71,readPinnedGrammar()),b71,b65,b66,b69,b70};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||args.some(a=>a!=='--write'))throw Error('B72_USAGE: [--write]');
 const {report}=buildB72();
 if(args.includes('--write'))fs.writeFileSync(path.join(here,'B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json'),JSON.stringify(report,null,2)+'\n');
 console.log('B72_SOURCE_BACKED_INPUT_CANDIDATES_PASS',JSON.stringify(report.summary));
}
