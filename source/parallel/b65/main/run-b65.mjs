#!/usr/bin/env node
/** Frozen-source-only deterministic B65 runner: zero network, bridge or game runtime calls. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {compileB65,verifyB65} from './compile-b65.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');const manifest=JSON.parse(fs.readFileSync(path.join(root,'B64_FILE_SHA256.json'),'utf8'));
function pinned(rel){const hash=manifest.baselineFiles[rel]??manifest.addedFiles[rel];if(!hash)throw Error('B65_UNPINNED_'+rel);
 const full=path.join(root,rel),st=fs.lstatSync(full);if(!st.isFile()||st.isSymbolicLink())throw Error('B65_NONREGULAR_'+rel);
 const raw=fs.readFileSync(full);if(createHash('sha256').update(raw).digest('hex')!==hash)throw Error('B65_SOURCE_MISMATCH_'+rel);return JSON.parse(raw);}
export function buildB65FromSource(){const b64=pinned('parallel/b64/main/B64_CONCEPT_ROOM_OWNERSHIP.json'),b17=pinned('reports/B17_INTERIOR_INTEGRATION_IR.json');const report=compileB65(b64,b17);verifyB65(report,b64,b17);return {report,b64,b17};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('B65_READ_ONLY_NO_ARGUMENTS');const x=buildB65FromSource().report;console.log('B65_LOGICAL_ASSEMBLY_PASS',JSON.stringify({floors:x.summary.floors,roomWalls:x.summary.nominalWallEdges,nominalOpenings:x.summary.openingPortCandidates,verticalReservations:x.summary.verticalReservations,physicalBlocks:0,gatesBlocked:x.gates.length,operations:x.BuildPlan.operations.length}));}
