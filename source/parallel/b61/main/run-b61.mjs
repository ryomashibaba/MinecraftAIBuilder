#!/usr/bin/env node
/** Read only pinned B60/B43/B57 evidence; does not call a Minecraft engine or write files. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileB61,verifyB61} from './compile-b61.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const old=JSON.parse(fs.readFileSync(path.join(root,'B60_FILE_SHA256.json')));
function frozen(file){
 const expected=old.addedFiles[file]||old.baselineFiles[file];
 if(!expected)throw Error(`B61_MISSING_PIN_${file}`);
 const buffer=fs.readFileSync(path.join(root,file));
 if(createHash('sha256').update(buffer).digest('hex')!==expected)throw Error(`B61_FROZEN_HASH_${file}`);
 return JSON.parse(buffer.toString('utf8'));
}
export function buildB61FromSource(){
 const b60=frozen('parallel/b60/main/B60_GUARDED_CIRCULATION_CONTRACT.json');
 const guard=frozen('reports/B43_GUARDED_LAYOUT_ASSEMBLY.json');
 const b57=frozen('parallel/b57/main/B57_ENVELOPE_TOPOLOGY.json');
 const report=compileB61(b60,guard,b57);
 verifyB61(report,b60,guard,b57);
 return {report,b60,guard,b57};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('B61_READ_ONLY_NO_ARGS');
 const r=buildB61FromSource().report;
 console.log('B61_OFFLINE_PASS',JSON.stringify({extraCorridorCells:r.gap.minimumNewCorridorCells,
  hypotheticalDoorConnectivity:`${r.topology.candidateSymbolicallyConnected}/${r.topology.sourceDoors}`,
  readiness:r.readiness,physicalRouteApproved:r.gap.physicalRouteApproved}));
}
