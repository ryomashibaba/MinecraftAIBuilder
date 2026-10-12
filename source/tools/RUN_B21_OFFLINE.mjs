/** Review-only, fresh-folder output. Never writes project/Legacy/world files. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB21Blockscale,summarizeB21,validateB21Blockscale} from '../runner/step8b-blockscale-b21.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=process.argv[2];
try{
 if(!dest||!path.isAbsolute(dest)||path.resolve(dest)===root||path.resolve(dest).startsWith(root+path.sep)||fs.existsSync(dest))throw Error('B21_REQUIRES_NEW_ABSOLUTE_OUTPUT_FOLDER');
 const report=buildB21Blockscale(root);validateB21Blockscale(report,root);
 fs.mkdirSync(dest,{recursive:false});
 fs.writeFileSync(path.join(dest,'B21_BLOCKSCALE_REVIEW.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(dest,'B21_SUMMARY.json'),JSON.stringify(summarizeB21(report),null,2)+'\n');
 console.log('B21_OFFLINE_REVIEW_PASS',JSON.stringify(summarizeB21(report).counts));
}catch(e){console.error(e.code??e.message);process.exitCode=1;}
