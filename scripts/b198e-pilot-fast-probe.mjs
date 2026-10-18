import {getB198EChatAuthoredPilot} from '../source/ai/b198e-chat-authored-pilot.mjs';
import {compileDesign,verifyCompiled,MAX_CELLS} from '../source/ai/b143-building-dsl.mjs';
import {inspectSourceGeometry,inspectProtectedVoxelFidelity,
 evaluateSourceGoals} from '../source/ai/b198b-architecture-quality.mjs';
import {CREATION_CASES,REVISION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
const p=getB198EChatAuthoredPilot();
for(const [id,design] of Object.entries(p.created)){
 const c=compileDesign(design),source=inspectSourceGeometry({design,compiled:c}),
  goals=evaluateSourceGoals(CREATION_CASES.find(x=>x.id===id),source);
 if(!verifyCompiled(design,c)||c.primitives.length>MAX_CELLS)throw Error('B198E_INVALID_'+id);
 console.log('B198E_CHAT_AUTHORED_CREATION',JSON.stringify({
  id,sourceVoxels:c.primitives.length,authoredElements:design.elements.length,
  sourceHeight:source.sourceBoundingSize.y,
  materialFamilies:source.usedMaterialFamilyCount,
  primitiveFamilies:source.distinctPrimitiveFamilies,
  twoWideFootprints:source.source2WideSupportedFootprintSquares,
  sourceGoals:goals.status,geometrySha:c.geometrySha256}));
}
for(const [id,design] of Object.entries(p.revised)){
 const rev=REVISION_CASES.find(x=>x.id===id),base=p.created[rev.baseCaseId],
  a=compileDesign(base),b=compileDesign(design);
 const proof=inspectProtectedVoxelFidelity({baseDesign:base,
  revisionDesign:design,protectedElementIds:p.protectedIds[id]});
 if(!proof.exactProtectedVoxelPreservationPassed)throw Error('B198E_REVISION_PROTECTION_'+id);
 console.log('B198E_CHAT_AUTHORED_REVISION',JSON.stringify({
  id,base:rev.baseCaseId,oldCells:a.primitives.length,
  newCells:b.primitives.length,delta:b.primitives.length-a.primitives.length,
  protectionPassed:true,sourceSha:b.sourceSha256}));
}
console.log('B198E_MODEL_PROVENANCE',p.provenance,
 'MODEL_API_CALLS',p.liveAPIResponsesObserved,
 'NOT_RUN',p.unattemptedCreationCases);

import {inspectB198EChatPilot} from '../source/ai/b198e-source-evidence.mjs';
const detailed=inspectB198EChatPilot();
console.log('B198E_SOURCE_EVIDENCE_HOLDS',JSON.stringify({samples:detailed.creations.map(x=>({id:x.caseId,failed:x.fixedCoordinateArchitecturalSamples.filter(y=>!y.actualSourceSatisfied)})),revisions:detailed.revisions.map(x=>({id:x.caseId,clear:x.originalFloors,protected:x.protectedVoxels.exactProtectedVoxelPreservationPassed,edits:x.sourceChangeList.totalTouched}))}));
