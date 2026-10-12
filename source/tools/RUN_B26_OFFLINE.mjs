/** B26 produces read-only preflight evidence. Never overwrite an existing output. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB26M4,validateB26M4} from '../runner/step8b-m4-static-gate-b26.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=code=>{throw Error('B26_RUN_'+code)};
const dest=process.argv[2];
if(!dest||!path.isAbsolute(dest)||!dest.endsWith('.json'))fail('ABSOLUTE_NEW_JSON_REQUIRED');
const realRoot=fs.realpathSync(root);
const resolved=path.resolve(dest);
if(resolved===realRoot||resolved.startsWith(realRoot+path.sep))fail('SOURCE_WRITE_BLOCKED');
if(fs.existsSync(resolved))fail('NO_OVERWRITE');
const parent=fs.realpathSync(path.dirname(resolved));
if(parent===realRoot||parent.startsWith(realRoot+path.sep))fail('SOURCE_WRITE_BLOCKED');
if(parent!==path.dirname(resolved))fail('REPARSE_PARENT_BLOCKED');
const data=buildB26M4(root);if(!validateB26M4(data,root))fail('REPLAY');
fs.writeFileSync(resolved,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('B26_READONLY_PREFLIGHT_PASS',JSON.stringify({gate:data.gate.deployment,blockers:data.blockers.length,operations:0}));
