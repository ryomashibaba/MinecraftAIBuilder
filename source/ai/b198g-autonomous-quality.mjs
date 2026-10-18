/**
 * B198G — Bounded model-driven architecture improvement. NO fixed shape templates.
 * A caller supplies a real generator; tests may inject explicitly labeled doubles.
 * All output is B143 source for human review, NEVER world construction.
 */
import {createHash} from 'node:crypto';
import {proposeArchitecture} from './b198-natural-language-design.mjs';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {critiqueArchitecture} from './b198c-spatial-critic.mjs';

export const SCHEMA='minecraftaibuilder-b198g-source-improvement-v1';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const ensure=(ok,reason)=>{if(!ok)throw Error('B198G_'+reason);};
const safeWorld=()=>({
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
});

/**
 * Compare EVERY old material voxel plus ALL previously usable two-wide
 * two-headroom source footprints. A new CUT or later ADD can silently damage
 * earlier geometry despite unchanged element IDs; those edits fail closed.
 */
export function inspectInheritedSource({beforeDesign,beforeCompiled,afterCompiled}){
  const old=new Map(beforeCompiled.primitives.map(p=>[key(...p.slice(0,3)),p[3]]));
  const next=new Map(afterCompiled.primitives.map(p=>[key(...p.slice(0,3)),p[3]]));
  let lost=0,materialChanged=0,oldClear=0,damagedClear=0;
  for(const [k,material] of old){
    if(!next.has(k))lost++;
    else if(next.get(k)!==material)materialChanged++;
  }
  const [width,height,depth]=[beforeDesign.bounds.width,
    beforeDesign.bounds.height,beforeDesign.bounds.depth];
  const oldSolid=new Set(old.keys()),newSolid=new Set(next.keys());
  for(const p of beforeCompiled.primitives){
    const [x,y,z]=p;
    if(x+1>=width||z+1>=depth||y+2>=height)continue;
    let wasClear=true,stillClear=true;
    for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
      const a=key(x+dx,y,z+dz),b=key(x+dx,y+1,z+dz),
        c=key(x+dx,y+2,z+dz);
      if(!oldSolid.has(a)||oldSolid.has(b)||oldSolid.has(c))wasClear=false;
      if(!newSolid.has(a)||newSolid.has(b)||newSolid.has(c))stillClear=false;
    }
    if(wasClear){
      oldClear++;
      if(!stillClear)damagedClear++;
    }
  }
  return {inheritedOccupiedCells:old.size,lostSourceVoxels:lost,
    alteredMaterialVoxels:materialChanged,oldTwoWideOpenFloorSquares:oldClear,
    damagedTwoWideOpenFloorSquares:damagedClear,
    exactOriginalGeometryAndClearancePreserved:
      lost===0&&materialChanged===0&&damagedClear===0,
    sourceOnly:true,actualMinecraftWalkingCertified:false};
}
function compactFindings(critique){
  return critique.findings.map(f=>({
    id:f.id,severity:f.severity,evidence:f.evidence,
    recommendation:f.recommendation
  }));
}
function reportState(current,initial,rounds,modelCalls,referenceSha){
  const last=critiqueArchitecture({design:current.design,compiled:current.compiled});
  const hasHigh=last.highRiskCount>0;
  return {
    schema:SCHEMA,
    status:hasHigh?'HOLD_SOURCE_TOPOLOGY':'SOURCE_CANDIDATE_REVIEW_REQUIRED',
    sourceReviewOnly:true,sourceSha256:current.compiled.sourceSha256,
    geometrySha256:current.compiled.geometrySha256,
    userPromptSha256:referenceSha,
    initialSourceSha256:initial.compiled.sourceSha256,
    initialHighRiskCount:initial.critique.highRiskCount,
    finalHighRiskCount:last.highRiskCount,
    initialLargestConnectedFloor:initial.critique.objectiveAudit.largestSameLevelConnectedSquareCount,
    finalLargestConnectedFloor:last.objectiveAudit.largestSameLevelConnectedSquareCount,
    initialSupportedFloors:initial.critique.objectiveAudit.verifiedTwoWideStandingSquares,
    finalSupportedFloors:last.objectiveAudit.verifiedTwoWideStandingSquares,
    remainingSourceFindings:compactFindings(last),
    attempts:rounds,
    modelInvocationCount:modelCalls,
    generatorProvenance:'CALLER_SUPPLIED_NOT_INDEPENDENTLY_VERIFIED',
    designSemanticQuality:'UNREVIEWED',
    aestheticQuality:'UNREVIEWED',
    reproducibleProviderBenchmark:false,
    sourceGeometryIsNotPlayerWalkability:true,
    world:safeWorld()
  };
}
/**
 * Original Japanese prompt => strict B143 source => exact source-space critic
 * => at most N source-preserving model-directed revisions. No auto approval.
 *
 * Acceptance means measurable source-topology progress only. It does not mean
 * the user request, exterior aesthetics, player traversal or physics passed.
 */
export async function generateArchitectureWithFeedback({
  prompt,generator,maxRepairRounds=2,minimumConnectedGain=4,
  maxAddedSourceVoxels=30000,maxChangedElements=24
}={}){
  ensure(typeof prompt==='string'&&prompt.trim().length>=8&&prompt.length<=6100,
    'INVALID_PROMPT_LENGTH');
  ensure(typeof generator==='function','REAL_GENERATOR_REQUIRED');
  ensure(Number.isSafeInteger(maxRepairRounds)&&maxRepairRounds>=0&&
    maxRepairRounds<=3,'REPAIR_ROUND_CAP');
  ensure(Number.isSafeInteger(minimumConnectedGain)&&minimumConnectedGain>=1&&
    minimumConnectedGain<=1000,'INVALID_TOPOLOGY_GAIN');
  ensure(Number.isSafeInteger(maxAddedSourceVoxels)&&maxAddedSourceVoxels>=1&&
    maxAddedSourceVoxels<=50000,'INVALID_VOXEL_BUDGET');
  ensure(Number.isSafeInteger(maxChangedElements)&&maxChangedElements>=1&&
    maxChangedElements<=60,'INVALID_REVISION_LIMIT');

  let modelCalls=0;
  const countedGenerator=async args=>{
    modelCalls++;
    return generator(args);
  };
  const first=await proposeArchitecture({
    prompt,generator:countedGenerator,maxAttempts:2
  });
  ensure(verifyCompiled(first.design,first.compiled),'ORIGINAL_COMPILE_NOT_VERIFIED');
  const firstCritique=critiqueArchitecture({design:first.design,compiled:first.compiled});
  const initial={...first,critique:firstCritique};
  let best=first,quality=firstCritique;
  const rounds=[];
  for(let i=1;i<=maxRepairRounds&&quality.highRiskCount>0;i++){
    const before=best,older=quality.objectiveAudit;
    const feedback=JSON.stringify({
      reason:'Measured B143 voxel-space topology deficiency',
      sourceSha256:before.compiled.sourceSha256,
      findings:compactFindings(quality),
      verifiedTwoWideStandingSquares:older.verifiedTwoWideStandingSquares,
      largestSameLevelConnectedSquareCount:older.largestSameLevelConnectedSquareCount,
      requiredLargestConnectedGain:minimumConnectedGain,
      constraints:'Preserve every old material voxel and every previously clear two-wide floor/headroom; add authentic independently supported source geometry only. No user request changes.'
    });
    const repairPrompt=prompt+'\n\nSOURCE-ONLY ARCHITECTURAL CORRECTION:\n'+feedback.slice(0,1600);
    ensure(repairPrompt.length<=8000,'REPAIR_CONTEXT_OVERFLOW');
    let proposed;
    try{
      proposed=await proposeArchitecture({
        prompt:repairPrompt,generator:countedGenerator,
        baseDesign:before.design,
        expectedBaseSha256:before.compiled.sourceSha256,
        // Preserve all prior source element IDs, not just one cosmetic sample.
        protectedElementIds:before.design.elements.map(x=>x.id),
        maxChangedElements,allowRemovals:false,maxAttempts:2
      });
    }catch{
      rounds.push({round:i,decision:'REJECTED_MODEL_OR_DSL_GUARD',
        inheritedSourceSha256:before.compiled.sourceSha256});
      continue;
    }
    const inherited=inspectInheritedSource({
      beforeDesign:before.design,beforeCompiled:before.compiled,
      afterCompiled:proposed.compiled
    });
    const next=critiqueArchitecture({
      design:proposed.design,compiled:proposed.compiled
    });
    const nextFloor=next.objectiveAudit,sourceGrowth=
      proposed.compiled.primitives.length-before.compiled.primitives.length;
    const connectedGain=nextFloor.largestSameLevelConnectedSquareCount-
      older.largestSameLevelConnectedSquareCount;
    const sourceProgress=(next.highRiskCount<quality.highRiskCount)||
      (next.highRiskCount===quality.highRiskCount&&
       connectedGain>=minimumConnectedGain&&
       nextFloor.verifiedTwoWideStandingSquares>=
       older.verifiedTwoWideStandingSquares);
    const safe=inherited.exactOriginalGeometryAndClearancePreserved&&
      sourceGrowth>=0&&sourceGrowth<=maxAddedSourceVoxels&&
      next.highRiskCount<=quality.highRiskCount;
    const accepted=safe&&sourceProgress;
    rounds.push({round:i,decision:accepted?
      'IMPROVED_SOURCE_PROPOSAL_RETAINED':
      'REJECTED_DESTRUCTIVE_OR_NO_SOURCE_IMPROVEMENT',
      inheritedSourceSha256:before.compiled.sourceSha256,
      proposedSourceSha256:proposed.compiled.sourceSha256,
      inheritedGeometryProof:inherited,
      netVoxelGrowth:sourceGrowth,connectedFloorGain:connectedGain,
      highRiskBefore:quality.highRiskCount,highRiskAfter:next.highRiskCount});
    if(accepted){best=proposed;quality=next;}
  }
  return {
    design:structuredClone(best.design),
    compiled:best.compiled,
    report:reportState(best,initial,rounds,modelCalls,hash(prompt))
  };
}
