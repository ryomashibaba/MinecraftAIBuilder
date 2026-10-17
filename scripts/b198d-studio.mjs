/** B198D start local source-design studio. No Minecraft network contact.
 * Examples:
 * node scripts/b198d-studio.mjs --project ./my-city --design ./source-design.json
 * node scripts/b198d-studio.mjs --project ./my-city --model ACCESSIBLE_MODEL_ID
 *
 * On first run --design required; next runs restore the same audited project.
 * --model optional: without it, review/history/undo still work, LLM off.
 */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startB198DLocalStudio}
 from '../source/ai/b198d-local-review-server.mjs';
const fail=s=>{throw Error('B198D_CLI_'+s)};
export async function startB198DFromArgs(args=process.argv.slice(2)){
 const opt={};
 for(let i=0;i<args.length;i++){
  const key=args[i];
  if(!['--project','--design','--model','--port'].includes(key))
   fail('UNKNOWN_FLAG_'+key);
  if(!args[i+1])fail('MISSING_'+key);
  opt[key.slice(2)]=args[++i];
 }
 if(!opt.project)fail('PROJECT_DIRECTORY_REQUIRED');
 const initialDesign=opt.design?JSON.parse(fs.readFileSync(
  path.resolve(opt.design),'utf8')):null;
 const app=await startB198DLocalStudio({
  projectDirectory:path.resolve(opt.project),
  initialDesign,model:opt.model??null,port:Number(opt.port??0)
 });
 return app;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const app=await startB198DFromArgs();
  console.log('B198D_LOCAL_ARCHITECTURE_STUDIO',app.url);
  console.log('SOURCE_ONLY_NOT_PREPARED: real Minecraft world access is absent.');
  console.log('Model inference requires separately authorized OPENAI_API_KEY and --model.');
  console.log('Browser approval commits only design snapshots, NEVER world actions.');
 }catch(e){console.error(String(e.message??e));process.exitCode=1}
}
