// Read-only source consumer. Only writes a NEW JSON report file; never overwrites.
import fs from 'node:fs';
import path from 'node:path';
import {buildB3Preview} from '../runner/step8b-geometry-b3.mjs';
const args=process.argv.slice(2);
const within=(dir,target)=>{const rel=path.relative(fs.realpathSync(dir),target);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
if(args.length!==3){console.error('Usage: node tools/RUN_WINDOWS_B3_READONLY.mjs <extracted_source_dir> <review_json> <NEW_output_json>');process.exitCode=2;}
else try{
 const report=buildB3Preview(args[0],JSON.parse(fs.readFileSync(args[1],'utf8')));
 const dest=path.resolve(args[2]);
 // Refuse any output inside source snapshot or adjacent to the input review.
 // Report file must be brand new (wx); no rewriting frozen originals.
 const dir=path.dirname(dest);
 if(!fs.existsSync(dir)||!fs.statSync(dir).isDirectory()||fs.lstatSync(dir).isSymbolicLink())throw Error('OUTPUT_PARENT_MUST_BE_EXISTING_REAL_DIRECTORY');
 const realDir=fs.realpathSync(dir);
 if(within(args[0],realDir)||within(path.dirname(path.resolve(args[1])),realDir))throw Error('OUTPUT_MAY_NOT_BE_INSIDE_SOURCE_OR_REVIEW_DIRECTORY');
 fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('STEP8B_B3_PREVIEW_ONLY',JSON.stringify({status:report.status,sourceFiles:report.sourceFilesVerified,previewCases:report.styleSeedCases,candidates:report.candidates.length,output:dest}));
}catch(e){console.error('STEP8B_B3_BLOCKED',e.code??'ERROR',e.message);process.exitCode=1;}
