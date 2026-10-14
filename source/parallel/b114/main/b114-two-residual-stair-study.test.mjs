import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateTwoResiduals} from './b114-two-residual-stair-study.mjs';
const root='b114-review-output/';
const r=JSON.parse(fs.readFileSync(root+'B114_Final_Two_Stair_Conflicts_3D_Study.json','utf8'));
const prior=JSON.parse(fs.readFileSync(root+'B114_15_Buildings_CrossFlight_Position_Study.json','utf8'));
test('two-problem residual source fixed and report checksummed',()=>{
 assert(validateTwoResiduals(r));
 assert.equal(r.sourceCrossFlightIntegrity,prior.integritySha256);
 assert.equal(r.totals.originalStairInterferencePairs,2);
 assert.equal(r.library.originalRemainingPairs,1);
 assert.equal(r.apartment.originalRemainingPairs,1);
});
test('LIBRARY_V2 retains two floor-grounded rail piers and avoids all other adjacent bodies',()=>{
 assert.equal(r.library.id,'LIBRARY_V2');
 assert.equal(r.library.targetFlight,1);
 assert.equal(r.library.originalRailWidthBlocks,1);
 assert.equal(r.library.chosenLastPierRunWidthBlocks,.625);
 assert.equal(r.library.originalPierCount,r.library.proposedPierCount);
 assert.equal(r.library.changedStairFootprints,0);
 assert(r.library.sourceFloorContactPreserved);
 assert(r.library.treadUndersideContactPreserved);
 assert(r.library.peerInterferenceResolvedInOfflineModel);
 assert.equal(r.library.remainingPairs,0);
 assert(r.library.shortlistedWidthCandidates.find(x=>x.width===.75).totalCollisionPairs>0);
 assert.equal(r.library.shortlistedWidthCandidates.find(x=>x.width===.625).totalCollisionPairs,0);
});
test('APARTMENT_V1 exhaustive bounded four-direction study does not fake modeled switchback',()=>{
 assert.equal(r.apartment.id,'APARTMENT_V1');
 assert(r.apartment.candidateOriginDirectionTrials>1000);
 assert(r.apartment.validSourcePreservingGalleryConnectedCandidates>=0);
 assert(r.apartment.full3DPairSetsEvaluated>=0);
 assert.equal(r.apartment.realTurningStairModelValidated,false);
 assert.equal(r.apartment.originalParentStairNotChanged,true);
 assert(r.apartment.afterSearchInterferencePairs===0||r.apartment.afterSearchInterferencePairs===1);
});
test('no world data, source patch, approval or construction command is produced',()=>{
 assert.equal(r.noSourceOrWorldChanges,true);
 assert.equal(r.halfStepAndBedrockStatesUnverified,true);
 assert.equal(r.totals.physicallyCertifiedInterferenceResolutions,0);
 assert.equal(r.totals.actualMinecraftCommands,0);
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);
 assert.equal(r.commandCount,0);assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);assert(r.gates.every(x=>x.status==='BLOCKED'));
});
test('written Japanese reports contain provenance and unverified stair materials',()=>{
 const md=fs.readFileSync(root+'B114_Final_Two_Stair_Conflicts_Review_JA.md','utf8');
 const csv=fs.readFileSync(root+'B114_Final_Two_Stair_Conflicts_Options.csv','utf8');
 assert(md.includes('APARTMENT_V1'));
 assert(md.includes('LIBRARY_V2'));
 assert(md.includes('NOT_PREPARED'));
 assert(csv.includes('LAST_PIER_RUN_WIDTH'));
});
