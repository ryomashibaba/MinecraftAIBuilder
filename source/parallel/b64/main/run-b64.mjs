#!/usr/bin/env node
/** Read-only runner. Frozen-source SHA verified against B63 manifest, no bridges. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {compileB64,verifyB64} from './compile-b64.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const hashes=JSON.parse(fs.readFileSync(path.join(root,'B63_FILE_SHA256.json')));
function read(p){const expected=hashes.baselineFiles[p]||hashes.addedFiles[p];if(!expected)throw Error('B64_UNPINNED_'+p);
 const loc=path.join(root,p),st=fs.lstatSync(loc);if(!st.isFile()||st.isSymbolicLink())throw Error('B64_NOT_REGULAR');
 const data=fs.readFileSync(loc);if(createHash('sha256').update(data).digest('hex')!==expected)throw Error('B64_SOURCE_TAMPER_'+p);
 return JSON.parse(data);}
export function buildB64FromSource(){const b63=read('parallel/b63/main/B63_HYPOTHETICAL_WALL_REVIEW.json'),b17=read('reports/B17_INTERIOR_INTEGRATION_IR.json'),b10=read('reports/B10_CONTRACT_REPORT.json');
 const reviews=Object.fromEntries(['apartment','hotel','office'].map(p=>[p,read(`samples/${p}/review.json`)]));
 const report=compileB64(b63,b17,b10,reviews);verifyB64(report,b63,b17,b10,reviews);return {report,b63,b17,b10,reviews};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('B64_READ_ONLY_NO_ARGS');const r=buildB64FromSource().report;
 console.log('B64_ROOM_OWNERSHIP_PASS',JSON.stringify({buildings:r.scope.buildings,floors:r.scope.floors,rooms:r.scope.rooms,ownerCells:r.scope.uniqueConceptRoomFootprintCells,overlaps:r.alternatives.map(a=>a.conceptualRoomOverlapCells),fiveCellClassification:r.alternatives[2].cellClassification,gatesBlocked:r.gates.length,operations:r.BuildPlan.operations.length}));}
