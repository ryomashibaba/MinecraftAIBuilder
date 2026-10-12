/** Strict standalone read-only offline candidate export. No existing target may be overwritten. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {compileB18M2,validateB18M2,summarizeB18} from '../runner/step8b-interior-geometry-b18.mjs';
try{
 if(process.argv.length!==3)throw Error('ONE_NEW_OUTPUT_DIRECTORY_REQUIRED');
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const out=path.resolve(process.argv[2]),parent=path.dirname(out);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||fs.existsSync(out))throw Error('OUTPUT_MUST_BE_NEW');
 const target=path.join(fs.realpathSync(parent),path.basename(out));
 if(target===root||target.startsWith(root+path.sep)||root.startsWith(target+path.sep))throw Error('OUTPUT_OVERLAPS_SOURCE');
 const report=compileB18M2(root);validateB18M2(report,root);
 fs.mkdirSync(out,{mode:0o700});
 fs.writeFileSync(path.join(out,'B18_M2_LOCAL_GEOMETRY.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(out,'B18_M2_SUMMARY.json'),JSON.stringify(summarizeB18(report),null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('B18_M2_LOCAL_ONLY',JSON.stringify({counts:report.counts,gate:'BLOCKED',commandCount:0}));
}catch(e){console.error('B18_NO_EXPORT',e.code||'ERROR',e.message);process.exitCode=1}
