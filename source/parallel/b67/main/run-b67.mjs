#!/usr/bin/env node
/** Deterministic B67 offline summary. Never imports a provided production file. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB66FromSource} from '../../b66/main/run-b66.mjs';
import {buildB56FromSource} from '../../b56/main/run-b56.mjs';
import {compileB67,verifyB67} from './compile-b67.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export function buildB67FromSource(){const b66=buildB66FromSource().report,b56=buildB56FromSource().report;const report=compileB67(b66,b56);verifyB67(report,b66,b56);return {report,b66,b56};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('B67_RUN_NO_FLAGS');const {report}=buildB67FromSource();console.log('B67_SOURCE_COLLECTION_READY',JSON.stringify({expected:5,currentlyAvailable:0,sourceExecution:false,zipProtocol:'B55_B56',gates:9,buildOperations:0,reportSha256:report.reportSha256}));
}
