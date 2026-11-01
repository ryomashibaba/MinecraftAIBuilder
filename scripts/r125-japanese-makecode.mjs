/** Japanese request -> one local model response -> B143 -> offline MakeCode.
 * A saved plan may be replayed without a model call. Never touches Minecraft.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runR125SemanticPilot} from './r125-semantic-pilot.mjs';
import {compileArchitecturePlan,auditArchitecturePlanCirculation} from '../source/ai/r125-architecture-plan.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';

export function exportSavedPlan(planFile, outDir, provenance='UNVERIFIED_DESIGN',paletteFile=null) {
 const plan=JSON.parse(fs.readFileSync(planFile,'utf8'));
 const product=compileArchitecturePlan(plan);
 // Reuse two EXISTING voxel-derived audits. Source pass means only an
 // offline clearance candidate, never in-game walking certification.
 const circulation=auditArchitecturePlanCirculation(product);
 const routes=auditR125SourceRoutes(product);
 const walkability={
  schema:'minecraftaibuilder-r125-practical-source-review-v1',
  sourceSha256:product.sourceSha256,
  geometrySha256:product.geometrySha256,
  planSha256:product.planSha256,
  status:circulation.status==='SOURCE_CLEARANCE_PROBES_PASS'&&
   routes.status==='SOURCE_ROUTES_REACH_ALL_ZONES'?
   'SOURCE_ROUTE_CANDIDATE':'HOLD_SOURCE_WALKABILITY',
  circulation,routes,modelCallsForReview:0,
  requiresInGameEntranceAndRoomWalk:true,
  actualInGameWalking:'NOT_TESTED',art:'NOT_REVIEWED',
  worldWrites:0,worldContacts:0
 };
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'SOURCE_WALKABILITY_REVIEW.json'),
  JSON.stringify(walkability,null,2)+'\n',{flag:'wx'});
 if(walkability.status!=='SOURCE_ROUTE_CANDIDATE')
  return {status:'HOLD_SOURCE_WALKABILITY',
   reason:'R125_SOURCE_WALKABILITY_NOT_VERIFIED',
   sourceSha256:product.sourceSha256,worldWrites:0,programExecuted:false};
 const verifiedPalette=paletteFile?JSON.parse(fs.readFileSync(paletteFile,'utf8')):null;
 const packet=exportB143EducationMakeCode({design:product.design,scene:product.compiled,provenance,groundLowestLayer:true,verifiedPalette});
 const {code,...report}=packet;
 fs.writeFileSync(path.join(outDir,'B143_SOURCE.json'),JSON.stringify(product.design,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'MAKECODE_EDUCATION.ts'),code,{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'EXPORT_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}

async function main(args) {
 const options={};
 for(let i=0;i<args.length;i+=2) {
  if(!['--out','--prompt','--model','--plan','--palette'].includes(args[i]) || !args[i+1] || Object.hasOwn(options,args[i])) throw Error('INVALID_ARGUMENTS');
  options[args[i]]=args[i+1];
 }
 const out=options['--out'];
 if(!out || fs.existsSync(out) || Boolean(options['--plan'])===Boolean(options['--prompt'])) throw Error('FRESH_OUTPUT_AND_ONE_INPUT_REQUIRED');
 if(options['--plan']) {
  if(options['--model']) throw Error('MODEL_NOT_USED_FOR_REPLAY');
  return exportSavedPlan(options['--plan'],out,'UNVERIFIED_DESIGN',options['--palette']??null);
 }
 if(!options['--model']) throw Error('MODEL_REQUIRED');
 fs.mkdirSync(out);
 const result=await runR125SemanticPilot({model:options['--model'],prompt:options['--prompt'],outDir:path.join(out,'model')});
 if(result.status!=='SOURCE_AND_3D_READY_HUMAN_REVIEW_REQUIRED') return {status:result.status,reason:result.reason??null,worldWrites:0};
 return exportSavedPlan(path.join(out,'model','ARCHITECTURE_PLAN.json'),path.join(out,'makecode'),'LOCAL_MODEL_CAPTURE',options['--palette']??null);
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try { const result=await main(process.argv.slice(2)); console.log(JSON.stringify(result,null,2)); if(result.status?.startsWith('HOLD')) process.exitCode=2; }
 catch(e) { console.error(String(e.message)); process.exitCode=2; }
}

