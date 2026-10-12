#!/usr/bin/env node
/** B66 deterministic offline runner; pinned B64/B65 sources, no network or world. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {buildB65FromSource} from '../../b65/main/run-b65.mjs';
import {compileB66,verifyB66} from './compile-b66.mjs';
const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
function frozenB64(){const m=JSON.parse(fs.readFileSync(path.join(sourceRoot,'B64_FILE_SHA256.json')));const rel='parallel/b64/main/B64_CONCEPT_ROOM_OWNERSHIP.json';const expected=m.baselineFiles[rel]||m.addedFiles[rel];const fn=path.join(sourceRoot,rel);const stat=fs.lstatSync(fn);if(!stat.isFile()||stat.isSymbolicLink())throw Error('B66_B64_NOT_REGULAR');const raw=fs.readFileSync(fn);if(createHash('sha256').update(raw).digest('hex')!==expected)throw Error('B66_B64_SOURCE_HASH');return JSON.parse(raw);}
export function buildB66FromSource(){const {report:b65,b64}=buildB65FromSource();const frozen=frozenB64();if(JSON.stringify(frozen)!==JSON.stringify(b64))throw Error('B66_B64_PARITY');const report=compileB66(b65,b64);verifyB66(report,b65,b64);return {report,b65,b64};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('B66_NO_CLI_ARGUMENTS');const {report}=buildB66FromSource();console.log('B66_LOCAL_3D_PASS',JSON.stringify({panels:report.summary.virtualWallPanels,openings:report.summary.virtualOpeningVoids,solidVolume:report.summary.virtualSolidVolume,virtualVoid:report.summary.virtualVoidVolume,gates:report.gates.length,operations:0}));
}
