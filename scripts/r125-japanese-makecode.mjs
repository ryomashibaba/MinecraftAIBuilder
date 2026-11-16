/** Japanese request -> one local model response -> B143 -> offline MakeCode.
 * A saved plan may be replayed without a model call. Never touches Minecraft.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runR125SemanticPilot} from './r125-semantic-pilot.mjs';
import {compileArchitecturePlan,auditArchitecturePlanCirculation,
 assessR125ProgramGeometry} from '../source/ai/r125-architecture-plan.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';

export function exportSavedPlan(planFile, outDir, provenance='UNVERIFIED_DESIGN',paletteFile=null,previewTestWorld=false,{hostDetail='legacy',expectedSourceSha256=null}={}) {
 if(typeof previewTestWorld!=='boolean'||(previewTestWorld&&paletteFile!==null))
  throw Error('PREVIEW_REQUIRES_NO_ATTESTED_PALETTE');
 if(!['legacy','spatial-v1'].includes(hostDetail))
  throw Error('HOST_DETAIL_MODE');
 if(expectedSourceSha256!==null&&
   (typeof expectedSourceSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSourceSha256)))
  throw Error('EXPECTED_SOURCE_SHA256_FORMAT');
 const plan=JSON.parse(fs.readFileSync(planFile,'utf8'));
 // The author owns the plan and its room split; HOST owns a viable door.
 // Preserve the prior practical geometry for every case EXCEPT an expressive
 // upper z-divider directly intersecting the fixed stair's z=7/8 landing.
 // This previously yielded HOLD_SOURCE_ROUTES even though the existing
 // compiler has a proven, source-only two-wide "stair-clear" door policy.
 // Original raw plans and compileArchitecturePlan(plan) remain unchanged.
 // Some genuine author plans are SOURCE-valid ONLY under spatial-v1's
 // explicit stair/entry HOST policy. Never run an unrelated default compile
 // first: that may HOLD and wrongly prevent exporting the verified geometry.
 const initial=hostDetail==='spatial-v1'?null:
  compileArchitecturePlan(plan,{entrancePlacement:'source-accessible'});
 const upper=initial?.program[1];
 const stairDividerAtLanding=Boolean(plan.expression)&&
  upper?.splitAxis==='z'&&[7,8].includes(upper.splitCoordinate);
 const upperDoorPlacement=stairDividerAtLanding?'stair-clear':'legacy';
 // The opt-in spatial export must use EXACTLY the same HOST policy as the
 // saved-model offline 3D replay, never an implicitly different geometry.
 // The proven legacy MakeCode code path remains unchanged by default.
 const product=hostDetail==='spatial-v1'?compileArchitecturePlan(plan,{
  entrancePlacement:'source-accessible',
  upperDoorPlacement:Object.hasOwn(plan,'expression')?'stair-clear':'legacy',
  hostDetail
 }):stairDividerAtLanding?compileArchitecturePlan(plan,{
  entrancePlacement:'source-accessible',upperDoorPlacement
 }):initial;
 // Compare with the independently reviewed SOURCE before making any output.
 // A mismatch is not a "close enough" building and must never be exported.
 if(expectedSourceSha256!==null&&product.sourceSha256!==expectedSourceSha256)
  throw Error('SAVED_SOURCE_SHA_MISMATCH');
 // Reuse two EXISTING voxel-derived audits. Source pass means only an
 // offline clearance candidate, never in-game walking certification.
 const circulation=auditArchitecturePlanCirculation(product);
 const routes=auditR125SourceRoutes(product,{featureTargets:product.fixtureTargets??[]});
 // Match the exact combined source gate from the genuine saved-model replay.
 // In particular, an upstairs floor with two disconnected components is
 // NOT approved just because the entry/individual fixture routes pass.
 const critique=critiqueArchitecture({design:product.design,
  compiled:product.compiled});
 const programFloors=assessR125ProgramGeometry(product,critique);
 const walkability={
  schema:'minecraftaibuilder-r125-practical-source-review-v1',
  sourceSha256:product.sourceSha256,
  geometrySha256:product.geometrySha256,
  planSha256:product.planSha256,
  hostSourceCompilerMode:hostDetail==='spatial-v1'?
   'R125_SOURCE_ACCESSIBLE_STAIR_CLEAR_WITH_SPATIAL_V1':
   stairDividerAtLanding?
    'R125_SOURCE_ACCESSIBLE_ENTRY_AND_HOST_STAIR_CLEAR_THRESHOLD':
    'R125_SOURCE_ACCESSIBLE_ENTRANCE_FROM_MODEL_SPLIT_AXIS',
  hostDetail,expectedSourceSha256,
  hostUpperDoorPlacement:hostDetail==='spatial-v1'?
   (Object.hasOwn(plan,'expression')?'stair-clear':'legacy'):upperDoorPlacement,
  originalModelPlanUnchanged:true,
  status:circulation.status==='SOURCE_CLEARANCE_PROBES_PASS'&&
   routes.status==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
   programFloors.programFloorIssues.length===0?
   'SOURCE_ROUTE_CANDIDATE':'HOLD_SOURCE_WALKABILITY',
  circulation,routes,programFloors,modelCallsForReview:0,
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
 const packet=exportB143EducationMakeCode({design:product.design,scene:product.compiled,provenance,groundLowestLayer:true,verifiedPalette,unverifiedTestWorldPreview:previewTestWorld});
 const {code,...report}=packet;
 fs.writeFileSync(path.join(outDir,'B143_SOURCE.json'),JSON.stringify(product.design,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'MAKECODE_EDUCATION.ts'),code,{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'EXPORT_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}

async function main(args) {
 const previewTestWorld=args.includes('--preview-test-world');
 const filtered=args.filter(a=>a!=='--preview-test-world');
 if(args.filter(a=>a==='--preview-test-world').length>1)
  throw Error('DUPLICATE_PREVIEW_FLAG');
 const options={};
 for(let i=0;i<filtered.length;i+=2) {
  if(!['--out','--prompt','--model','--plan','--palette',
    '--host-detail','--source-sha256'].includes(filtered[i]) ||
   !filtered[i+1] || Object.hasOwn(options,filtered[i]))
   throw Error('INVALID_ARGUMENTS');
  options[filtered[i]]=filtered[i+1];
 }
 const out=options['--out'];
 if(!out || fs.existsSync(out) || Boolean(options['--plan'])===Boolean(options['--prompt']))
  throw Error('FRESH_OUTPUT_AND_ONE_INPUT_REQUIRED');
 if(previewTestWorld&&(Boolean(options['--prompt'])||Boolean(options['--palette'])))
  throw Error('PREVIEW_SAVED_PLAN_ONLY');
 if(options['--prompt']&&(options['--host-detail']||options['--source-sha256']))
  throw Error('SOURCE_OPTIONS_REPLAY_ONLY');
 if(options['--plan']) {
  if(options['--model']) throw Error('MODEL_NOT_USED_FOR_REPLAY');
  return exportSavedPlan(options['--plan'],out,'UNVERIFIED_DESIGN',
   options['--palette']??null,previewTestWorld,{
    hostDetail:options['--host-detail']??'legacy',
    expectedSourceSha256:options['--source-sha256']??null
   });
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

