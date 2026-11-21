import test from 'node:test';
import assert from 'node:assert/strict';
import {makeV4DCompactSynthetic} from './r125-v4d-compact-model-fixture.mjs';
import {compileCompactModelIntent,COMPACT_SCHEMA}
 from '../source/ai/r125-v4d-compact-model-ir.mjs';
import {RANKED_SCHEMA,translateRankedExteriorIntent,
 compileRankedExteriorIntent,proveRankedExteriorPhysicalGlazing,RANKED_SYSTEM_PROMPT}
 from '../source/ai/r125-v4e-ranked-exterior-ir.mjs';
function author(){
 const src=makeV4DCompactSynthetic();
 src.schema=RANKED_SCHEMA;
 for(const [i,s] of src.spaces.entries()){
  const ranked=i===0?['west','east','south','north']:
   i===1?['east','west','south','north']:null;
  delete s.windowSide;
  s.windowPriority=s.kind==='sky'?null:ranked;
 }
 return src;
}
test('ranked authored glazing resolves only to previously AUTHORIZED exterior directions, with later-child wall included',()=>{
 const src=author(),frozen=structuredClone(src);
 const interpreted=translateRankedExteriorIntent(src);
 assert.deepEqual(src,frozen);
 assert.equal(interpreted.chosenWindowFaces.length,2);
 assert.deepEqual(interpreted.chosenWindowFaces.map(v=>[v.spaceIndex,v.selectedSide,v.authoredRank]),
  [[0,'east',2],[1,'west',2]]);
 assert(interpreted.chosenWindowFaces[0].excludedNonExteriorDirections.includes('west'));
 assert(interpreted.chosenWindowFaces[0].excludedNonExteriorDirections.includes('south'));
 assert(interpreted.chosenWindowFaces[1].excludedNonExteriorDirections.includes('east'));
 assert.equal(interpreted.autoRepairPerformed,false);
 assert.equal(interpreted.modelAuthoredAllPreferences,true);
 const result=compileRankedExteriorIntent(src);
 assert.equal(result.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert(result.b143.sourceRoutes.zones.every(v=>v.reachedFromEntrance));
 assert(result.b143.sourceRoutes.featureAccess.every(v=>v.reachableFromEntrance));
 assert.equal(result.worldWrites,0);
 assert.equal(result.constructionApproved,false);
 assert.equal(result.executionAllowed,false);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.equal(result.humanArt,'NOT_REVIEWED');
 assert.notEqual(result.b143.geometrySha256,null);
});
test('changing MODEL preference order preserves B143 geometry when the selected exterior side remains the same',()=>{
 const src=author(),modified=structuredClone(src);
 modified.spaces[0].windowPriority=['east','west','south','north'];
 const a=compileRankedExteriorIntent(src);
 const b=compileRankedExteriorIntent(modified);
 assert.equal(a.chosenWindowFaces[0].selectedSide,'east');
 assert.equal(b.chosenWindowFaces[0].selectedSide,'east');
 assert.equal(a.chosenWindowFaces[0].authoredRank,2);
 assert.equal(b.chosenWindowFaces[0].authoredRank,1);
 assert.equal(a.b143.geometrySha256,b.b143.geometrySha256);
 assert.notEqual(a.rankedAuthorSha256,b.rankedAuthorSha256);
 const c=structuredClone(src);
 c.spaces[0].windowPriority=['north','south','west','east'];
 assert.equal(compileRankedExteriorIntent(c).chosenWindowFaces[0].selectedSide,'east');
 assert.equal(compileRankedExteriorIntent(c).chosenWindowFaces[0].authoredRank,4);
});
test('ranked grammar rejects fake glazing without silently moving windows',()=>{
 const src=author(); const bad=[];
 const vary=f=>{const x=structuredClone(src);f(x);bad.push(x);};
 vary(x=>x.schema='something-else');
 vary(x=>x.spaces[0].windowPriority=['east','east','south','north']);
 vary(x=>x.spaces[0].windowPriority=['east']);
 vary(x=>x.spaces[0].windowPriority=['north','east','south','northeast']);
 vary(x=>{x.spaces[0].windowPriority=null;});
 vary(x=>{x.spaces[2].windowPriority=['north','south','east','west'];});
 vary(x=>{x.spaces[1].windowSide='east';});
 vary(x=>{delete x.spaces[0].windowPriority;});
 vary(x=>{x.spaces[1].attach.to='unknown-author-parent';});
 vary(x=>{x.spaces[1].width=0;});
 for(const x of bad){
  assert.throws(()=>compileRankedExteriorIntent(x),/R125_/);
 }
 assert.equal(src.schema,RANKED_SCHEMA);
 assert.equal(compileCompactModelIntent(makeV4DCompactSynthetic()).worldWrites,0);
});
test('V4E opt-in does not alter the old V4D frozen author contract or pretend to have real model evidence',()=>{
 const old=makeV4DCompactSynthetic();
 assert.equal(old.schema,COMPACT_SCHEMA);
 assert.equal(compileCompactModelIntent(old).modelIdentity,'NOT_ATTESTED');
 assert(RANKED_SYSTEM_PROMPT.includes('FIRST option'));
 assert(RANKED_SYSTEM_PROMPT.includes('NEVER choose an unlisted option'));
 const ranked=compileRankedExteriorIntent(author());
 assert.equal(ranked.modelIdentity,'NOT_ATTESTED');
 assert.equal(ranked.modelSizeOrMacMemoryTested,false);
 assert.equal(ranked.sourceProvenance,'RANKED_AUTHOR_USER_OR_LLM_UNATTESTED');
});

test('V4E one POST with injected fake transport stays TEST_DOUBLE but gives true B143 and zero world writes',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const {runV4DLocalAuthor,parseV4DLocalAuthorArgs}
  =await import('./r125-v4d-local-architect.mjs');
 const {replayPrivateV4D}=await import('./r125-v4d-replay-private.mjs');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4e-optin-'));
 const study=path.join(folder,'study'),replay=path.join(folder,'replay');
 const raw=JSON.stringify(author()),calls=[];
 const fetcher=async(url,opt)=>{
  calls.push({url,method:opt?.method});
  if(opt?.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(opt?.method==='POST')return {ok:true,status:200,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',message:{content:raw}}]
  })};
  throw Error('UNEXPECTED_TEST_CALL');
 };
 try{
  const parsed=parseV4DLocalAuthorArgs(['--ranked-windows','--model','qwen3:14b',
   '--out',study,'--prompt','An original culture facility with interior and courtyard.']);
  assert.equal(parsed.rankedWindows,true);
  assert.equal(parsed.compact,false);
  assert.throws(()=>parseV4DLocalAuthorArgs(['--compact','--ranked-windows',
   '--model','qwen3:14b','--out',study]),/ONLY_ONE_AUTHOR_MODE/);
  const r=await runV4DLocalAuthor({...parsed},{fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',r.reason);
  assert.equal(r.authorContract,RANKED_SCHEMA);
  assert.equal(r.modelCalls,1);
  assert.equal(r.worldWrites,0);
  assert.equal(calls.filter(x=>x.method==='POST').length,1);
  const original=JSON.parse(fs.readFileSync(path.join(study,'AUTHOR_INTENT_ORIGINAL.json'),'utf8'));
  assert.deepEqual(original,author());
  assert(fs.existsSync(path.join(study,'RANKED_GLAZING_RESOLUTION.json')));
  const receipt=JSON.parse(fs.readFileSync(path.join(study,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8'));
  assert.equal(receipt.authorContract,RANKED_SCHEMA);
  assert.equal(receipt.sourceCandidateVerified,true);
  assert.equal(receipt.explicitlyInjectedTestResponse,true);
  const count=calls.length;
  const rerun=replayPrivateV4D(study,replay);
  assert.equal(count,calls.length);
  assert.equal(rerun.status,'HOLD_TEST_DOUBLE_REPLAY_ONLY');
  assert.equal(rerun.originalCompilerHashesMatch,true);
  assert.equal(rerun.additionalModelCalls,0);
  assert.equal(rerun.worldWrites,0);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('V4E malformed original preference remains HOLD with safe diagnostic and zero replay calls',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const {runV4DLocalAuthor}=await import('./r125-v4d-local-architect.mjs');
 const {replayPrivateV4D}=await import('./r125-v4d-replay-private.mjs');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4e-invalid-'));
 const study=path.join(folder,'study'),replay=path.join(folder,'replay');
 const faulty=author();
 faulty.spaces[0].windowPriority=['east','east','north','west'];
 const calls=[],raw=JSON.stringify(faulty);
 const fetcher=async(url,opt)=>{
  calls.push(opt?.method);
  if(opt?.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  return {ok:true,status:200,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',message:{content:raw}}]
  })};
 };
 try{
  const r=await runV4DLocalAuthor({
   model:'qwen3:14b',outDir:study,rankedWindows:true,
   prompt:'An original public architecture research building.'
  },{fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.equal(r.modelCalls,1);
  const receipt=JSON.parse(fs.readFileSync(path.join(study,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8'));
  assert.equal(receipt.failureCategory,'RANKED_AUTHOR_EXTERIOR_INVALID');
  const before=calls.length;
  const replayed=replayPrivateV4D(study,replay);
  assert.equal(replayed.status,'HOLD_REPLAY_SOURCE_REJECTED');
  assert.equal(replayed.additionalModelCalls,0);
  assert.equal(calls.length,before);
  const diag=JSON.parse(fs.readFileSync(path.join(replay,'AUTHOR_SOURCE_DIAGNOSTIC.json'),'utf8'));
  assert(diag.issues.some(v=>v.code==='RANKED_WINDOW_PRIORITY_INVALID'));
  assert.equal(replayed.worldWrites,0);
  assert(!fs.existsSync(path.join(replay,'index.html')));
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});


test('V4E source witnesses each entire glass panel and both immediate AIR sides in final B143, never ART',()=>{
 const result=compileRankedExteriorIntent(author());
 const proof=result.rankedPhysicalGlazingSourceProof;
 assert.equal(proof.status,'B143_WINDOW_GLASS_AND_IMMEDIATE_OUTWARD_AIR_SOURCE_VERIFIED');
 assert.equal(proof.windowCount,2);
 assert.equal(proof.verifiedPanelGlassCells,36);
 assert.equal(proof.verifiedImmediateOutwardAirCells,36);
 assert.equal(proof.verifiedImmediateInwardAirCells,36);
 assert.equal(proof.humanArchitecturalArt,'NOT_REVIEWED');
 assert.equal(result.worldWrites,0);
 const room=result.plan.nodes[0];
 const w=result.plan.windows.find(v=>v.nodeId===room.id);
 assert.equal(w.side,'east');
 const wx=room.x+room.width-1,wy=w.sillY,wz=room.z+w.offset;
 const badGlass=structuredClone(result);
 const cell=badGlass.b143.compiled.primitives.find(v=>
  v[0]===wx&&v[1]===wy&&v[2]===wz);
 assert(cell,'the exact selected panel cell must exist');
 cell[3]=-1; // simulate a lost panel after the last B143 compilation
 assert.throws(()=>proveRankedExteriorPhysicalGlazing(badGlass,badGlass.chosenWindowFaces),
  /R125_V4E_RANKED_PHYSICAL_GLAZING_NOT_PRESENT_/);
 const blockedOutward=structuredClone(result);
 blockedOutward.b143.compiled.primitives.push([wx+1,wy,wz,-1]);
 assert.throws(()=>proveRankedExteriorPhysicalGlazing(blockedOutward,blockedOutward.chosenWindowFaces),
  /R125_V4E_RANKED_PHYSICAL_OUTWARD_AIR_OBSTRUCTED_/);
 const blockedInward=structuredClone(result);
 blockedInward.b143.compiled.primitives.push([wx-1,wy,wz,-1]);
 assert.throws(()=>proveRankedExteriorPhysicalGlazing(blockedInward,blockedInward.chosenWindowFaces),
  /R125_V4E_RANKED_PHYSICAL_INWARD_AIR_OBSTRUCTED_/);
});

test('V4E generates inspectable true B143 3D and five projections, never ART or real model PASS',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const {exportV4ESourceArtEvidence}=await import('./r125-v4e-source-art-review.mjs');
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'v4e-source-art-'));
 const folder=path.join(base,'review');
 try{
  const report=exportV4ESourceArtEvidence(folder);
  assert.equal(report.provenance,'LOCAL_STATIC_SYNTHETIC_FIXTURE_NOT_A_QWEN_GEMMA_RESPONSE');
  assert.equal(report.modelRequests,0);
  assert.equal(report.artCertifications,0);
  assert.equal(report.humanArt,'NOT_REVIEWED');
  assert(report.actualFinalB143Voxels>100);
  assert.equal(report.orthographicViews.length,5);
  assert.equal(report.rankedPhysicalGlazingSourceProof.verifiedImmediateInwardAirCells,36);
  assert.deepEqual(report.safety.gates,Array(9).fill('BLOCKED'));
  assert.equal(report.safety.worldWrites,0);
  const svg=fs.readFileSync(path.join(folder,'ACTUAL_FINAL_B143_FIVE_VIEWS.svg'),'utf8');
  assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  for(const side of ['ROOF','NORTH','SOUTH','WEST','EAST'])
   assert(svg.includes(side));
  assert(fs.readFileSync(path.join(folder,'index.html'),'utf8').includes('html'));
  assert.deepEqual(JSON.parse(fs.readFileSync(
   path.join(folder,'SOURCE_ART_HOLD_REPORT.json'),'utf8')),report);
  assert.throws(()=>exportV4ESourceArtEvidence(folder),/OUTPUT_MUST_BE_NEW/);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('five independent synthetic genres use one unmodified V4E→true B143 engine with ART HOLD',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const {syntheticFiveGenreAuthorCases,exportV4ECrossGenreSource}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const cases=syntheticFiveGenreAuthorCases();
 assert.deepEqual(cases.map(x=>x.genre),['housing','shop','research','gallery','station']);
 assert.equal(new Set(cases.map(x=>JSON.stringify(x.source.spaces.map(y=>y.attach)))).size>=3,true);
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4e-cross-'));
 const out=path.join(base,'source-study');
 try{
  const report=exportV4ECrossGenreSource(out);
  assert.equal(report.authorProvenance,'FIVE_HAND_AUTHORED_SYNTHETIC_FIXTURES_NOT_LLM');
  assert.equal(report.modelRequests,0);
  assert.equal(report.humanArt,'NOT_REVIEWED');
  assert.equal(report.cases.length,5);
  assert.equal(new Set(report.cases.map(c=>c.geometrySha256)).size,5);
  assert.equal(report.commonRepresentationLimitations.originalAuthorGraphRoomFootprintsRectangular,true);
  assert.equal(report.commonRepresentationLimitations.nowSupportsOneModelAuthoredCoveredRoomFootprintSetback,true);
  assert(report.cases.every(c=>c.actualWindowProof.verifiedImmediateInwardAirCells===36));
  assert.deepEqual(report.safety.gates,Array(9).fill('BLOCKED'));
  assert.equal(report.safety.worldWrites,0);
  assert(fs.existsSync(path.join(out,'index.html')));
  assert(fs.existsSync(path.join(out,'sectioned.html')));
  assert(fs.existsSync(path.join(out,'massing.html')));
  assert.equal(report.primaryMassingResearch.cases.length,5);
  assert.equal(report.exteriorWingResearch.cases.length,5);
  assert.equal(report.contouredExteriorWingResearch.cases.length,5);
  assert.equal(report.coveredFloorplateResearch.cases.length,5);
  assert.equal(report.trueInhabitedElevatedPublicHallResearch.cases.length,5);
  assert(report.trueInhabitedElevatedPublicHallResearch.cases.every(c=>
   c.realRoofWallGlassAirWitness.actualGainAtHighestVoxel>=5&&
   c.realRoofWallGlassAirWitness.physicallyGlazedClerestoryCells>=96&&
   c.realRoofWallGlassAirWitness.realHallEntryTwoWideWalk.width===2&&
   c.worldWrites===0));
  assert(report.coveredFloorplateResearch.cases.every(c=>
   c.trueB143SourceWitness.entire3dRemovedColumns===49&&
   c.trueB143SourceWitness.roofSilhouetteComparison.views
    .find(v=>v.face==='roof').silhouetteChangedCells>=49&&c.worldWrites===0));
  assert.equal(report.coveredFloorplateResearch.independentlyAuthoredEntryMainVolumeCase
   .witness.rootMainRoomModified,true);
  assert(report.contouredExteriorWingResearch.cases.every(c=>
   c.realB143ContourWitness.authorContourExplicit===true&&
   c.actualRectangleVsContourVisibility.views.find(v=>v.face==='roof')
    .silhouetteChangedCells>=12));
  assert(report.exteriorWingResearch.cases.every(c=>
   c.sourceWitness.independentRoofSilhouette.views.find(v=>v.face==='roof')
    .silhouetteChangedCells>=84));
  assert(report.primaryMassingResearch.cases.every(c=>
   c.visibilityEvidence.views.find(v=>v.face==='roof').depthChangedCells>0));
  assert(report.primaryMassingResearch.cases.every(c=>
   c.sourceWitness.genuinelyOpenSkyFloorCells===49&&
   c.baselineGeometrySha256!==c.finalGeometrySha256&&
   c.humanArt==='ART_HOLD'));
  assert.equal(report.sectionResearch.sectionedCases.length,5);
  assert(report.sectionResearch.sectionedCases.every(c=>
   c.oldGeometrySha256!==c.newGeometrySha256&&c.art==='NOT_REVIEWED'));
  for(const {genre} of cases){
   const elevatedSvg=fs.readFileSync(path.join(out,'ATRIUM_B143_'+genre+'_FIVE_VIEWS.svg'),'utf8');
   assert(elevatedSvg.includes('ACTUAL final B143 voxels'));
   const heightDelta=fs.readFileSync(path.join(out,'ATRIUM_B143_'+genre+'_VISIBLE_DELTA.svg'),'utf8');
   assert(heightDelta.includes('ACTUAL B143 VISIBLE DELTA'));
   const floorplateSvg=fs.readFileSync(path.join(out,'COVERED_FLOORPLATE_'+genre+'_FIVE_VIEWS.svg'),'utf8');
   assert(floorplateSvg.includes('ACTUAL final B143 voxels'));
   const floorDelta=fs.readFileSync(path.join(out,'COVERED_FLOORPLATE_'+genre+'_VISIBLE_DELTA.svg'),'utf8');
   assert(floorDelta.includes('ACTUAL B143 VISIBLE DELTA'));

   const contourDelta=fs.readFileSync(path.join(out,'CONTOUR_VS_RECTANGLE_B143_'+genre+'_VISIBLE_DELTA.svg'),'utf8');
   assert(contourDelta.includes('ACTUAL B143 VISIBLE DELTA'));
   const contouredSvg=fs.readFileSync(path.join(out,'CONTOURED_WING_B143_'+genre+'_FIVE_VIEWS.svg'),'utf8');
   assert(contouredSvg.includes('ACTUAL final B143 voxels'));
   const wingDelta=fs.readFileSync(path.join(out,'WING_B143_'+genre+'_SILHOUETTE_DELTA.svg'),'utf8');
   assert(wingDelta.includes('ACTUAL B143 VISIBLE DELTA'));
   const delta=fs.readFileSync(path.join(out,'MASSING_B143_'+genre+'_VISIBILITY_DELTA.svg'),'utf8');
   assert(delta.includes('ACTUAL B143 VISIBLE DELTA'));
   const svg=fs.readFileSync(path.join(out,'FINAL_B143_'+genre+'_FIVE_VIEWS.svg'),'utf8');
   assert(svg.includes('ACTUAL final B143 voxels'));
   assert(fs.readFileSync(path.join(out,'SECTION_B143_'+genre+'_FIVE_VIEWS.svg'),'utf8')
    .includes('ACTUAL final B143 voxels'));
   assert(fs.readFileSync(path.join(out,'MASSING_B143_'+genre+'_FIVE_VIEWS.svg'),'utf8')
    .includes('ACTUAL final B143 voxels'));
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(
   path.join(out,'FIVE_GENRE_SOURCE_ART_HOLD.json'),'utf8')),report);
  assert.throws(()=>exportV4ECrossGenreSource(out),/OUTPUT_MUST_BE_NEW/);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('V4E author-controlled nonrect semi-outdoor sections produce real B143 and preserve access',async()=>{
 const {compileAuthoredPublicLoggia}
  =await import('../source/ai/r125-v4e-authored-public-loggia.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const cases=syntheticFiveGenreAuthorCases();
 const results=cases.map(s=>compileAuthoredPublicLoggia(s.source,s.authoredSection));
 assert.equal(results.length,5);
 assert(results.every(r=>r.finalGeometrySha256!==r.unchangedV4EBaseGeometrySha256));
 assert(results.every(r=>r.trueSectionSourceWitness.physicallyRemovedOldWallCells>=12));
 assert(results.every(r=>r.trueSectionSourceWitness.actualDiagonalWallCells>=30));
 assert(results.every(r=>r.sectionedRoutes.status==='SOURCE_ROUTES_REACH_ALL_ZONES'));
 assert(results.every(r=>r.worldWrites===0&&r.art==='NOT_REVIEWED'));
 const first=cases[0];
 assert.throws(()=>compileAuthoredPublicLoggia(first.source,{
  spaceId:'welcome',corner:'NW',recessDepth:6
 }),/R125_V4E_SECTION_RECESS_ON_SHARED_WALL/);
 assert.throws(()=>compileAuthoredPublicLoggia(first.source,{
  spaceId:'welcome',corner:'NE',recessDepth:12
 }),/R125_V4E_SECTION_AUTHOR_SECTION_CONTRACT/);
 assert.throws(()=>compileAuthoredPublicLoggia(first.source,{
  spaceId:'garden',corner:'NE',recessDepth:6
 }),/R125_V4E_SECTION_ENVELOPE_NOT_LARGE_ENOUGH/);
});

test('V4E SOUTH corners author true exposed faces and reject parent-linked sides',async()=>{
 const {compileAuthoredPublicLoggia}
  =await import('../source/ai/r125-v4e-authored-public-loggia.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 // The gallery's model-authored attached rooms are on opposite outer flanks:
 // WEST child leaves its SOUTH/WEST corner exposed; EAST child leaves SOUTH/EAST.
 // Do not move either child's linked wall or silently fake an exposed side.
 const cases=syntheticFiveGenreAuthorCases();
 const left=structuredClone(cases[0].source);
 const right=structuredClone(cases[1].source);
 const frozenL=structuredClone(left),frozenR=structuredClone(right);
 const a=compileAuthoredPublicLoggia(left,{
  spaceId:'learning',corner:'SW',recessDepth:6});
 const b=compileAuthoredPublicLoggia(right,{
  spaceId:'learning',corner:'SE',recessDepth:6});
 assert.deepEqual(left,frozenL);
 assert.deepEqual(right,frozenR);
 for(const r of [a,b]){
  assert.notEqual(r.finalGeometrySha256,r.unchangedV4EBaseGeometrySha256);
  assert(r.trueSectionSourceWitness.sourceRoofVoxelsPreserved>0);
  assert(r.trueSectionSourceWitness.authoredFixtureVoxelsPreserved>0);
  assert.equal(r.trueSectionSourceWitness.finalPhysicalGlazing.verifiedPanelGlassCells,36);
  assert.equal(r.trueSectionSourceWitness.finalPhysicalGlazing.verifiedImmediateInwardAirCells,36);
  assert.equal(r.trueSectionSourceWitness.finalPhysicalGlazing.verifiedImmediateOutwardAirCells,36);
  assert.equal(r.sectionedRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(r.worldWrites,0);
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.equal(r.art,'NOT_REVIEWED');
 }
 assert.throws(()=>compileAuthoredPublicLoggia(left,{
  spaceId:'learning',corner:'SE',recessDepth:6
 }),/R125_V4E_SECTION_RECESS_ON_SHARED_WALL/);
 assert.throws(()=>compileAuthoredPublicLoggia(right,{
  spaceId:'learning',corner:'SW',recessDepth:6
 }),/R125_V4E_SECTION_RECESS_ON_SHARED_WALL/);
 assert.throws(()=>compileAuthoredPublicLoggia(left,{
  spaceId:'learning',corner:'SS',recessDepth:6
 }),/R125_V4E_SECTION_AUTHOR_SECTION_CONTRACT/);
});


test('V4E common-engine loggia gets a genuine TWO-wide source-connected interior portal across all five genres',async()=>{
 const {compileAuthoredLoggiaPassage}
  =await import('../source/ai/r125-v4e-authored-loggia-passage.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const samples=syntheticFiveGenreAuthorCases();
 const frozen=structuredClone(samples);
 for(const s of samples){
  const actual=compileAuthoredLoggiaPassage(s.source,s.authoredSection);
  assert.notEqual(actual.initialLoggiaGeometrySha256,actual.finalGeometrySha256);
  assert.equal(actual.sourcePassageWitness.physicallyOpenedDiagonalWallCells,6);
  assert.equal(actual.sourcePassageWitness.twoWideInteriorToLoggiaConnected,true);
  assert(actual.sourcePassageWitness.sourcePadsReached>10);
  assert(actual.sourcePassageWitness.originalFunctionalVoxelsPreserved>0);
  assert.equal(actual.sourcePassageWitness.finalGlazing.verifiedPanelGlassCells,36);
  assert.equal(actual.sectionedRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(actual.worldWrites,0);
  assert.equal(actual.humanArt,'NOT_REVIEWED');
  assert.deepEqual(actual.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(actual.BuildPlan.operations,[]);
 }
 assert.deepEqual(samples,frozen);
});
test('V4E walking passage keeps SOUTH authored corners, refuses blocked/shared original author decisions',async()=>{
 const {compileAuthoredLoggiaPassage}
  =await import('../source/ai/r125-v4e-authored-loggia-passage.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const samples=syntheticFiveGenreAuthorCases();
 const sw=compileAuthoredLoggiaPassage(samples[0].source,{
  spaceId:'learning',corner:'SW',recessDepth:6});
 const se=compileAuthoredLoggiaPassage(samples[1].source,{
  spaceId:'learning',corner:'SE',recessDepth:6});
 for(const result of [sw,se]){
  assert(result.sourcePassageWitness.twoWideInteriorToLoggiaConnected);
  assert(result.sourcePassageWitness.sourcePadsReached>10);
  assert.equal(result.worldWrites,0);
 }
 assert.throws(()=>compileAuthoredLoggiaPassage(samples[0].source,{
  spaceId:'welcome',corner:'NW',recessDepth:6
 }),/R125_V4E_SECTION_RECESS_ON_SHARED_WALL/);
});


test('author-owned PRIMARY massing removes real roof and building volume while preserving program and safe World0',async()=>{
 const {compileAuthoredPrimaryMassingVoid}
  =await import('../source/ai/r125-v4e-authored-primary-massing-void.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const samples=syntheticFiveGenreAuthorCases();
 const frozen=structuredClone(samples);
 const cuts=samples.map(s=>compileAuthoredPrimaryMassingVoid(s.source,s.authoredMassing));
 assert.equal(cuts.length,5);
 for(const cut of cuts){
  assert.notEqual(cut.baselineGeometrySha256,cut.finalGeometrySha256);
  assert(cut.sourceMassingWitness.removedOriginalRoofVoxels>=20);
  assert.equal(cut.sourceMassingWitness.genuinelyOpenSkyFloorCells,49);
  assert(cut.sourceMassingWitness.newPhysicalFacadeVoxels>50);
  assert(cut.sourceMassingWitness.protectedExteriorFacadeSeamCells>0);
  assert(cut.sourceMassingWitness.retainedOriginalRoofVoxels>20);
  assert(cut.sourceMassingWitness.protectedFixtureVoxels>0);
  assert.equal(cut.sourceMassingWitness.originalGlassAndBothAirLayers.verifiedPanelGlassCells,36);
  assert(cut.sourceMassingWitness.originalEntranceToOpenSky.twoByTwoSourcePadsReached>10);
  assert.equal(cut.sourceMassingWitness.originalEntranceToOpenSky.supported,true);
  assert.equal(cut.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(cut.architectureQuality,'ART_HOLD');
  assert.equal(cut.realModel,'NOT_TESTED');
  assert.equal(cut.worldWrites,0);
  assert.deepEqual(cut.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(cut.BuildPlan.operations,[]);
 }
 assert.deepEqual(samples,frozen);
 const s=samples[0];
 assert.throws(()=>compileAuthoredPrimaryMassingVoid(s.source,{
  spaceId:'welcome',corner:'NW',cutWidth:7,cutDepth:7
 }),/R125_V4E_MASSING_MASSING_VOID_INTERSECTS_SHARED_WALL/);
 assert.throws(()=>compileAuthoredPrimaryMassingVoid(s.source,{
  spaceId:'welcome',corner:'NE',cutWidth:12,cutDepth:7
 }),/R125_V4E_MASSING_AUTHOR_MASSING_CONTRACT/);
 assert.throws(()=>compileAuthoredPrimaryMassingVoid(s.source,{
  spaceId:'garden',corner:'NE',cutWidth:7,cutDepth:7
 }),/R125_V4E_MASSING_PRIMARY_VOLUME_TOO_SMALL/);
 const shop=samples[1];
 assert.throws(()=>compileAuthoredPrimaryMassingVoid(shop.source,{
  spaceId:'welcome',corner:'NW',cutWidth:9,cutDepth:7
 }),/R125_V4E_MASSING_MASSING_COLLIDES_ORIGINAL_ENTRANCE/);
});

test('model-authored Z-facing public opening genuinely connects interior to open-sky principal mass without inventing floor',async()=>{
 const {compileAuthoredPrimaryMassingVoid}
  =await import('../source/ai/r125-v4e-authored-primary-massing-void.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const samples=syntheticFiveGenreAuthorCases();
 const s=samples[0],frozen=structuredClone(s.source);
 const selected={spaceId:s.authoredSection.spaceId,
  corner:s.authoredSection.corner,cutWidth:7,cutDepth:7,
  publicAccessSide:'Z'};
 const result=compileAuthoredPrimaryMassingVoid(s.source,selected);
 assert.deepEqual(s.source,frozen);
 assert.deepEqual(result.authoredVoid,selected);
 assert.equal(result.sourceMassingWitness.authorSelectedPublicPortalAxis,'Z');
 assert.equal(result.sourceMassingWitness.publicPortalAuthored,true);
 assert.equal(result.sourceMassingWitness.physicallyVerifiedPublicPortalWallCells,6);
 assert(result.sourceMassingWitness.originalEntranceToOpenSky.twoByTwoSourcePadsReached>10);
 assert.equal(result.sourceMassingWitness.originalEntranceToOpenSky.supported,true);
 assert.equal(result.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.sourceMassingWitness.genuinelyOpenSkyFloorCells,49);
 assert.equal(result.sourceMassingWitness.originalGlassAndBothAirLayers.verifiedPanelGlassCells,36);
 assert.equal(result.worldWrites,0);
 assert.equal(result.realModel,'NOT_TESTED');
 assert.equal(result.architectureQuality,'ART_HOLD');
 assert.deepEqual(result.BuildPlan.operations,[]);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 for(const invalid of ['none','x','WEST','Y']){
  assert.throws(()=>compileAuthoredPrimaryMassingVoid(s.source,
   {...selected,publicAccessSide:invalid}),
   /R125_V4E_MASSING_AUTHOR_MASSING_CONTRACT/);
 }
});

test('ONE-response authored massing combines independent program and true open-sky B143 without host repair',async()=>{
 const {MASSING_SCHEMA,compileMassingAuthorIntent,MASSING_SYSTEM_PROMPT}
  =await import('../source/ai/r125-v4e-massing-author-ir.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const cases=syntheticFiveGenreAuthorCases();
 const frozen=structuredClone(cases);
 for(const [i,s] of cases.entries()){
  const answer={...structuredClone(s.source),schema:MASSING_SCHEMA,
   massing:{...structuredClone(s.authoredMassing),
    publicAccessSide:i===0?'Z':'X'}};
  const before=structuredClone(answer);
  const result=compileMassingAuthorIntent(answer);
  assert.deepEqual(answer,before);
  assert.equal(result.authorContract,MASSING_SCHEMA);
  assert.notEqual(result.b143.geometrySha256,result.unchangedRankedGeometrySha256);
  assert.equal(result.authoredMassingSourceWitness.genuinelyOpenSkyFloorCells,49);
  assert.equal(result.authoredMassingSourceWitness.publicPortalAuthored,true);
  assert.equal(result.authoredMassingSourceWitness.authorSelectedPublicPortalAxis,
   answer.massing.publicAccessSide);
  assert.equal(result.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(result.b143.compiled.primitives.length>100);
  assert.equal(result.worldWrites,0);
  assert.equal(result.worldContacts,0);
  assert.equal(result.humanArt,'NOT_REVIEWED');
  assert.equal(result.realModel,'NOT_TESTED');
  assert.equal(result.constructionApproved,false);
  assert.equal(result.executionAllowed,false);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(result.BuildPlan.operations,[]);
 }
 assert.deepEqual(cases,frozen);
 assert(MASSING_SYSTEM_PROMPT.includes('publicAccessSide'));
 const s=cases[0],a={...structuredClone(s.source),schema:MASSING_SCHEMA,
  massing:{spaceId:s.authoredSection.spaceId,corner:s.authoredSection.corner,
   cutWidth:7,cutDepth:7,publicAccessSide:'X'}};
 for(const change of [
  x=>{delete x.massing.publicAccessSide;},
  x=>{x.massing.publicAccessSide='Y';},
  x=>{x.massing.cutWidth=12;},
  x=>{x.massing.corner='NW';},
  x=>{x.massing.spaceId='garden';},
  x=>{x.massing.extraHostRepair=true;},
  x=>{x.schema='not-the-authored-massing-schema';}
 ]){
  const bad=structuredClone(a);change(bad);
  assert.throws(()=>compileMassingAuthorIntent(bad),/R125_V4E_/);
 }
});

test('ONE injected local massing response stays test-double and offline replay preserves SHA, one POST, zero world writes',async()=>{
 const {MASSING_SCHEMA}=await import('../source/ai/r125-v4e-massing-author-ir.mjs');
 const {syntheticFiveGenreAuthorCases}=await import('./r125-v4e-cross-genre-source-study.mjs');
 const {parseV4DLocalAuthorArgs,runV4DLocalAuthor}=await import('./r125-v4d-local-architect.mjs');
 const {replayPrivateV4D}=await import('./r125-v4d-replay-private.mjs');
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-massing-private-'));
 const study=path.join(root,'study'),replay=path.join(root,'replay');
 const sample=syntheticFiveGenreAuthorCases()[0];
 const answer={...structuredClone(sample.source),schema:MASSING_SCHEMA,
  massing:{...structuredClone(sample.authoredMassing),publicAccessSide:'Z'}};
 const calls=[],raw=JSON.stringify(answer);
 const fetcher=async(url,opt)=>{
  calls.push(opt?.method);
  if(opt?.method==='GET')return {ok:true,status:200,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(opt?.method==='POST')return {ok:true,status:200,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',message:{content:raw}}]})};
  throw Error('UNEXPECTED_TEST_HTTP');
 };
 try{
  const parsed=parseV4DLocalAuthorArgs(['--authored-massing','--model','qwen3:14b',
   '--out',study,'--prompt','Make an original useful public architecture with open-air gathering space.']);
  assert.equal(parsed.authoredMassing,true);
  assert.throws(()=>parseV4DLocalAuthorArgs(['--ranked-section','--authored-massing',
   '--model','qwen3:14b','--out',study]),/ONLY_ONE_AUTHOR_MODE/);
  const r=await runV4DLocalAuthor(parsed,{fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',r.reason);
  assert.equal(r.authorContract,MASSING_SCHEMA);
  assert.equal(r.sourceRoutesStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(r.worldWrites,0);
  assert.equal(calls.filter(x=>x==='POST').length,1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(study,'AUTHOR_INTENT_ORIGINAL.json'),'utf8')),answer);
  const art=JSON.parse(fs.readFileSync(path.join(study,'PRIVATE_B143_MASSING_ART_HOLD_COMPARISON.json'),'utf8'));
  assert(art.actuallyRemovedCells>0);
  assert(art.projectedVisibilityAudit.views.find(v=>v.face==='roof').depthChangedCells>0);
  assert(fs.existsSync(path.join(study,'PRIVATE_B143_MASSING_VISIBILITY_DELTA.svg')));
  assert.equal(art.extraModelRequests,0);
  assert.equal(art.humanArchitecturalArt,'NOT_REVIEWED');
  assert(fs.existsSync(path.join(study,'FINAL_PRIMARY_MASSING_FIVE_VIEWS_PRIVATE.svg')));
  const shared=JSON.parse(fs.readFileSync(path.join(study,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8'));
  assert.equal(shared.authorContract,MASSING_SCHEMA);
  assert.equal(shared.explicitlyInjectedTestResponse,true);
  assert.equal(shared.sourceCandidateVerified,true);
  const n=calls.length,rr=replayPrivateV4D(study,replay);
  assert.equal(calls.length,n);
  assert.equal(rr.status,'HOLD_TEST_DOUBLE_REPLAY_ONLY');
  assert.equal(rr.originalCompilerHashesMatch,true);
  assert.equal(rr.additionalModelCalls,0);
  assert.equal(rr.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('REAL B143 five-view height/silhouette/material delta catches same-material roof removal',async()=>{
 const {auditB143ProjectedVisibility,renderB143ProjectedVisibilityDelta}
  =await import('./r125-v4e-visibility-delta.mjs');
 const {compileRankedExteriorIntent}
  =await import('../source/ai/r125-v4e-ranked-exterior-ir.mjs');
 const {compileAuthoredPrimaryMassingVoid}
  =await import('../source/ai/r125-v4e-authored-primary-massing-void.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 for(const s of syntheticFiveGenreAuthorCases()){
  const original=compileRankedExteriorIntent(s.source).b143.compiled.primitives;
  const cut=compileAuthoredPrimaryMassingVoid(s.source,s.authoredMassing).b143Compiled.primitives;
  const frozen=JSON.stringify([original,cut]);
  const audit=auditB143ProjectedVisibility(original,cut);
  assert.equal(audit.views.length,5);
  assert.equal(audit.certifiedImprovement,false);
  assert(audit.views.find(v=>v.face==='roof').depthChangedCells>0);
  assert(audit.views.every(v=>v.changeFraction>=0&&v.changeFraction<=1));
  const svg=renderB143ProjectedVisibilityDelta(original,cut);
  assert(svg.includes('ACTUAL B143 VISIBLE DELTA'));
  assert(svg.includes('fill="#ffd26a"'));
  assert.equal(JSON.stringify([original,cut]),frozen);
  const permuted=auditB143ProjectedVisibility(original,[...original].reverse());
  assert(permuted.views.every(v=>v.changedCells===0));
 }
 assert.throws(()=>auditB143ProjectedVisibility([],[]),/REAL_B143_REQUIRED/);
});

test('genre-independent physical exterior wing changes REAL outside footprint and preserves entrance, windows and routes',async()=>{
 const {compileAuthoredExteriorWing}
  =await import('../source/ai/r125-v4e-authored-exterior-wing.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const cases=syntheticFiveGenreAuthorCases(),snapshot=structuredClone(cases);
 for(const s of cases){
  const out=compileAuthoredExteriorWing(s.source,s.authoredMassing,s.authoredWing);
  const w=out.sourceWingWitness;
  assert.equal(w.actualSupportedWingFloorCells,84);
  assert.equal(w.actualCoverRoofCells,84);
  assert.equal(w.realPortalCellsRemoved,6);
  assert.equal(w.twoWideUserRoute.status,'SOURCE_TWO_WIDE_ENTRANCE_TO_WING_REACHABLE');
  assert(w.twoWideUserRoute.reachedPads>20);
  assert(w.independentRoofSilhouette.views.find(v=>v.face==='roof').silhouetteChangedCells>=84);
  assert.equal(w.originalGlazingUnchanged.verifiedPanelGlassCells,36);
  assert.equal(w.originalGlazingUnchanged.verifiedImmediateOutwardAirCells,36);
  assert.equal(w.originalGlazingUnchanged.verifiedImmediateInwardAirCells,36);
  assert.equal(out.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(out.humanArt,'NOT_REVIEWED');
  assert.equal(out.realModel,'NOT_TESTED');
  assert.equal(out.worldWrites,0);
  assert.deepEqual(out.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(out.BuildPlan.operations,[]);
  assert.throws(()=>compileAuthoredExteriorWing(s.source,s.authoredMassing,
   {...s.authoredWing,span:21}),/R125_V4E_WING_AUTHOR_WING_CONTRACT/);
 }
 assert.deepEqual(cases,snapshot);
 const home=cases[0];
 assert.throws(()=>compileAuthoredExteriorWing(home.source,home.authoredMassing,
  {...home.authoredWing,spaceId:'welcome',side:'west'}),
  /R125_V4E_WING_WING_COLLIDES_LINK_OR_ENTRANCE/);
});

test('one-response author owns full functional architecture, massing and TRUE new exterior silhouette across five genres',async()=>{
 const {compileWingAuthorIntent,WING_SCHEMA,WING_SYSTEM_PROMPT}
  =await import('../source/ai/r125-v4e-wing-author-ir.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 for(const s of syntheticFiveGenreAuthorCases()){
  const answer={...structuredClone(s.source),schema:WING_SCHEMA,
   massing:structuredClone(s.authoredMassing),wing:structuredClone(s.authoredWing)};
  const frozen=structuredClone(answer),out=compileWingAuthorIntent(answer);
  assert.deepEqual(answer,frozen);
  assert.equal(out.authorContract,WING_SCHEMA);
  assert.equal(out.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.notEqual(out.unchangedMassingGeometrySha256,out.b143.geometrySha256);
  assert.equal(out.authoredWingSourceWitness.actualSupportedWingFloorCells,84);
  assert(out.authoredWingSourceWitness.independentRoofSilhouette.views
   .find(v=>v.face==='roof').silhouetteChangedCells>=84);
  assert.equal(out.worldWrites,0);
  assert.deepEqual(out.gates,Array(9).fill('BLOCKED'));
  assert.equal(out.humanArt,'NOT_REVIEWED');
  assert.equal(out.realModel,'NOT_TESTED');
  const invalid=structuredClone(answer);invalid.wing.reach=20;
  assert.throws(()=>compileWingAuthorIntent(invalid),/R125_V4E_/);
 }
 assert(WING_SYSTEM_PROMPT.includes('wing EXACT'));
});

test('one original FULL WING model response: 1 fake POST, private art comparison and SHA-checked offline replay, zero world writes',async()=>{
 const {WING_SCHEMA}=await import('../source/ai/r125-v4e-wing-author-ir.mjs');
 const {syntheticFiveGenreAuthorCases}=await import('./r125-v4e-cross-genre-source-study.mjs');
 const {parseV4DLocalAuthorArgs,runV4DLocalAuthor}=await import('./r125-v4d-local-architect.mjs');
 const {replayPrivateV4D}=await import('./r125-v4d-replay-private.mjs');
 const {diagnosePrivateV4DAuthor}=await import('./r125-v4d-author-source-diagnostics.mjs');
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-wing-private-'));
 const study=path.join(root,'study'),replay=path.join(root,'replay');
 const sample=syntheticFiveGenreAuthorCases()[0];
 const answer={...structuredClone(sample.source),schema:WING_SCHEMA,
  massing:structuredClone(sample.authoredMassing),wing:structuredClone(sample.authoredContourWing)};
 const raw=JSON.stringify(answer),requests=[];
 const fetcher=async(url,opt)=>{
  requests.push(opt?.method);
  if(opt?.method==='GET')
   return {ok:true,status:200,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(opt?.method==='POST')
   return {ok:true,status:200,text:async()=>JSON.stringify({
    model:'qwen3:14b',choices:[{finish_reason:'stop',message:{content:raw}}]})};
  throw Error('UNEXPECTED_INJECTED_HTTP');
 };
 try{
  const parsed=parseV4DLocalAuthorArgs(['--authored-wing','--model','qwen3:14b',
   '--out',study,'--prompt','Author a public building with an actual exterior shaded wing.']);
  assert.equal(parsed.authorWing,true);
  assert.throws(()=>parseV4DLocalAuthorArgs(['--authored-wing','--authored-massing',
   '--model','qwen3:14b','--out',study]),/ONLY_ONE_AUTHOR_MODE/);
  const result=await runV4DLocalAuthor(parsed,{fetcher,timeoutMs:15000});
  assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',result.reason);
  assert.equal(result.authorContract,WING_SCHEMA);
  assert.equal(result.sourceRoutesStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(result.worldWrites,0);
  assert.equal(requests.filter(m=>m==='POST').length,1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(study,'AUTHOR_INTENT_ORIGINAL.json'),'utf8')),answer);
  assert.equal(fs.readFileSync(path.join(study,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  const art=JSON.parse(fs.readFileSync(path.join(study,'PRIVATE_B143_WING_ART_HOLD_COMPARISON.json'),'utf8'));
  assert(art.actuallyAddedCells>84);
  assert.equal(art.wingSourceWitness.actualSupportedWingFloorCells,88);
  assert.equal(art.wingSourceWitness.authorContourExplicit,true);
  assert.deepEqual(art.wingSourceWitness.authoredThreeBandDepths,[6,9,7]);
  assert.equal(art.wingSourceWitness.physicallyVerifiedSupportPostCount,6);
  assert(art.projectedVisibilityAudit.views.find(v=>v.face==='roof').silhouetteChangedCells>=84);
  assert.equal(art.extraModelRequests,0);
  assert.equal(art.humanArchitecturalArt,'NOT_REVIEWED');
  for(const file of ['PRIVATE_B143_WING_VISIBILITY_DELTA.svg',
   'FINAL_EXTERIOR_WING_FIVE_VIEWS_PRIVATE.svg','AUTHORED_EXTERIOR_WING_SOURCE.json'])
   assert(fs.existsSync(path.join(study,file)));
  const share=JSON.parse(fs.readFileSync(path.join(study,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8'));
  assert.equal(share.authorContract,WING_SCHEMA);
  assert.equal(share.rawModelTextIncluded,false);
  assert.equal(share.explicitlyInjectedTestResponse,true);
  assert.equal(share.sourceCandidateVerified,true);
  assert.equal(diagnosePrivateV4DAuthor(answer,WING_SCHEMA).issues.length,0);
  const n=requests.length,rr=replayPrivateV4D(study,replay);
  assert.equal(requests.length,n);
  assert.equal(rr.status,'HOLD_TEST_DOUBLE_REPLAY_ONLY');
  assert.equal(rr.originalCompilerHashesMatch,true);
  assert.equal(rr.additionalModelCalls,0);
  assert.equal(rr.worldWrites,0);
  assert(!fs.existsSync(path.join(replay,'MODEL_RESPONSE_ORIGINAL.txt')));
  const invalid=structuredClone(answer);invalid.wing.roofY=40;
  assert(diagnosePrivateV4DAuthor(invalid,WING_SCHEMA).issues
   .some(i=>i.code==='EXTERIOR_WING_DIMENSIONS_INVALID'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('AI-authored 3-band nonrectangular wing preserves archived rectangle and visibly differs from a SAME-REACH rectangle',async()=>{
 const {compileAuthoredExteriorWing}
  =await import('../source/ai/r125-v4e-authored-exterior-wing.mjs');
 const {compileWingAuthorIntent,WING_SCHEMA}
  =await import('../source/ai/r125-v4e-wing-author-ir.mjs');
 const {diagnosePrivateV4DAuthor}
  =await import('./r125-v4d-author-source-diagnostics.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const {auditB143ProjectedVisibility}
  =await import('./r125-v4e-visibility-delta.mjs');
 const cases=syntheticFiveGenreAuthorCases(),unchanged=structuredClone(cases);
 for(const s of cases){
  const rectangle=compileAuthoredExteriorWing(s.source,s.authoredMassing,
   {...s.authoredWing,reach:9});
  const contour=compileAuthoredExteriorWing(s.source,s.authoredMassing,
   s.authoredContourWing);
  const w=contour.sourceWingWitness;
  assert.equal(w.authorContourExplicit,true);
  assert.deepEqual(w.authoredThreeBandDepths,s.authoredContourWing.outline);
  assert(w.actualVerifiedDistinctStepDepths>=2);
  assert(w.physicallyVerifiedSupportPostCount>=4);
  assert(w.actualSupportedWingFloorCells>=60);
  assert.equal(w.actualSupportedWingFloorCells,w.actualCoverRoofCells);
  assert.equal(w.realPortalCellsRemoved,6);
  assert.equal(w.originalGlazingUnchanged.verifiedPanelGlassCells,36);
  assert.equal(w.originalGlazingUnchanged.verifiedImmediateInwardAirCells,36);
  assert.equal(w.originalGlazingUnchanged.verifiedImmediateOutwardAirCells,36);
  assert.equal(w.twoWideUserRoute.status,'SOURCE_TWO_WIDE_ENTRANCE_TO_WING_REACHABLE');
  assert.equal(contour.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(contour.worldWrites,0);
  assert.deepEqual(contour.gates,Array(9).fill('BLOCKED'));
  assert.notEqual(rectangle.newGeometrySha256,contour.newGeometrySha256);
  const visible=auditB143ProjectedVisibility(
   rectangle.b143Compiled.primitives,contour.b143Compiled.primitives);
  assert(visible.views.find(v=>v.face==='roof').silhouetteChangedCells>=12);
  const answer={...structuredClone(s.source),schema:WING_SCHEMA,
   massing:structuredClone(s.authoredMassing),wing:structuredClone(s.authoredContourWing)};
  const whole=compileWingAuthorIntent(answer);
  assert.equal(whole.b143.geometrySha256,contour.newGeometrySha256);
  assert.equal(whole.humanArt,'NOT_REVIEWED');
  assert.equal(diagnosePrivateV4DAuthor(answer,WING_SCHEMA).issues.length,0);
  for(const bad of [[9,9,9],[6,7],[5,9,7],[6,10,7],[6,6,6]]){
   const rejected=structuredClone(answer);
   rejected.wing.outline=bad;
   assert.throws(()=>compileWingAuthorIntent(rejected),/R125_V4E_/);
   assert(diagnosePrivateV4DAuthor(rejected,WING_SCHEMA).issues.some(i=>
    i.code==='EXTERIOR_WING_CONTOUR_INVALID'));
  }
 }
 assert.deepEqual(cases,unchanged);
});

test('author chooses true covered-room nonrectangular footprint and original physical 3D and function stay protected',async()=>{
 const {compileAuthoredCoveredFloorplateSetback}
  =await import('../source/ai/r125-v4e-authored-covered-floorplate-setback.mjs');
 const {compileWingAuthorIntent,WING_SCHEMA}
  =await import('../source/ai/r125-v4e-wing-author-ir.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const cases=syntheticFiveGenreAuthorCases(),unchanged=structuredClone(cases);
 for(const s of cases){
  const answer={...structuredClone(s.source),schema:WING_SCHEMA,
   massing:structuredClone(s.authoredMassing),
   wing:structuredClone(s.authoredContourWing)};
  const before=compileWingAuthorIntent(answer);
  const final=compileAuthoredCoveredFloorplateSetback(answer,s.authoredFloorplate);
  assert.notEqual(final.finalGeometrySha256,final.unmodifiedPriorGeometrySha256);
  assert.equal(final.unmodifiedPriorGeometrySha256,before.b143.geometrySha256);
  assert.equal(final.actualSourceWitness.originalWalkableFloorColumnsRemoved,49);
  assert.equal(final.actualSourceWitness.entire3dRemovedColumns,49);
  assert(final.actualSourceWitness.roofVoxelsRemoved>=49);
  assert(final.actualSourceWitness.physicallyVerifiedNewExternalFacadeCells>80);
  assert.equal(final.actualSourceWitness.everyUnchangedVoxelPreserved,true);
  assert.equal(final.actualSourceWitness.originalGlassAndBothAirLayers.verifiedPanelGlassCells,36);
  assert.equal(final.actualSourceWitness.originalGlassAndBothAirLayers.verifiedImmediateInwardAirCells,36);
  assert.equal(final.actualSourceWitness.originalGlassAndBothAirLayers.verifiedImmediateOutwardAirCells,36);
  assert.equal(final.actualSourceWitness.roofSilhouetteComparison.views
   .find(v=>v.face==='roof').silhouetteChangedCells,49);
  assert.equal(final.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(final.worldContacts,0);
  assert.equal(final.worldWrites,0);
  assert.equal(final.constructionApproved,false);
  assert.equal(final.executionAllowed,false);
  assert.deepEqual(final.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(final.BuildPlan.operations,[]);
  assert.equal(final.humanArt,'NOT_REVIEWED');
  assert.equal(final.realModel,'NOT_TESTED');
  assert.throws(()=>compileAuthoredCoveredFloorplateSetback(answer,
   {...s.authoredFloorplate,width:12}),/R125_V4E_FLOORPLATE_AUTHOR_CORNER_CONTRACT/);
  assert.throws(()=>compileAuthoredCoveredFloorplateSetback(answer,
   {...s.authoredFloorplate,corner:'bad'}),/R125_V4E_FLOORPLATE_AUTHOR_CORNER_CONTRACT/);
 }
 assert.deepEqual(cases,unchanged);
 const home=cases[0];
 const input={...structuredClone(home.source),schema:WING_SCHEMA,
  massing:structuredClone(home.authoredMassing),
  wing:structuredClone(home.authoredContourWing)};
 assert.throws(()=>compileAuthoredCoveredFloorplateSetback(input,
  {spaceId:'learning',corner:'NE',width:7,depth:7}),
  /R125_V4E_FLOORPLATE_AUTHOR_SETBACK_INTERSECTS_REAL_SHARED_BOUNDARY/);
 assert.throws(()=>compileAuthoredCoveredFloorplateSetback(input,
  {spaceId:'welcome',corner:'NE',width:7,depth:7}),
  /R125_V4E_FLOORPLATE_AUTHOR_SETBACK_OVERLAPS_PREVIOUS_SKY_VOID/);
 const alt=structuredClone(input);
 alt.massing={spaceId:'learning',corner:'NW',
  cutWidth:7,cutDepth:7,publicAccessSide:'X'};
 const root=compileAuthoredCoveredFloorplateSetback(alt,
  {spaceId:'welcome',corner:'NE',width:7,depth:7});
 assert.equal(root.actualSourceWitness.rootMainRoomModified,true);
 assert.equal(root.actualSourceWitness.otherOriginalCoveredRoomModified,false);
 assert.equal(root.actualSourceWitness.roofSilhouetteComparison.views
  .find(v=>v.face==='roof').silhouetteChangedCells,49);
 assert.equal(root.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(root.worldWrites,0);
 assert.deepEqual(root.gates,Array(9).fill('BLOCKED'));
});


test('V4F one-response floorplate author compiles functional 3D across five genres and strictly rejects corrupt choices',async()=>{
 const {FLOORPLATE_SCHEMA,FLOORPLATE_SYSTEM_PROMPT,compileFloorplateAuthorIntent}
  =await import('../source/ai/r125-v4f-floorplate-author-ir.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const {diagnosePrivateV4DAuthor}
  =await import('./r125-v4d-author-source-diagnostics.mjs');
 const fixtures=syntheticFiveGenreAuthorCases(),orig=structuredClone(fixtures);
 for(const s of fixtures){
  const intent={...structuredClone(s.source),schema:FLOORPLATE_SCHEMA,
   massing:structuredClone(s.authoredMassing),
   wing:structuredClone(s.authoredContourWing),
   floorplate:structuredClone(s.authoredFloorplate)};
  const old=structuredClone(intent);
  const result=compileFloorplateAuthorIntent(intent);
  assert.deepEqual(intent,old);
  assert.equal(result.authorContract,FLOORPLATE_SCHEMA);
  assert.equal(result.authoredFloorplateSourceWitness.originalWalkableFloorColumnsRemoved,49);
  assert.equal(result.authoredFloorplateSourceWitness.roofSilhouetteComparison.views
   .find(v=>v.face==='roof').silhouetteChangedCells,49);
  assert.equal(result.authoredFloorplateSourceWitness.everyUnchangedVoxelPreserved,true);
  assert.notEqual(result.unchangedWingGeometrySha256,result.b143.geometrySha256);
  assert.equal(result.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(result.worldContacts,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.executionAllowed,false);
  assert.equal(result.constructionApproved,false);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(result.BuildPlan.operations,[]);
  assert.equal(result.humanArt,'NOT_REVIEWED');
  assert.equal(result.realModel,'NOT_TESTED');
  assert.equal(diagnosePrivateV4DAuthor(intent,FLOORPLATE_SCHEMA).issues.length,0);
  const bad=structuredClone(intent);
  bad.floorplate.depth=12;
  assert.throws(()=>compileFloorplateAuthorIntent(bad),/R125_V4E_FLOORPLATE/);
  assert(diagnosePrivateV4DAuthor(bad,FLOORPLATE_SCHEMA).issues.some(x=>
   x.code==='COVERED_FLOORPLATE_SIZE_INVALID'));
 }
 assert.deepEqual(fixtures,orig);
 assert(FLOORPLATE_SYSTEM_PROMPT.includes('floorplate'));
});

test('V4F local one-response fake Ollama: root covered building footprint, private review and SHA offline replay, ZERO model extra posts',async()=>{
 const {FLOORPLATE_SCHEMA}=await import('../source/ai/r125-v4f-floorplate-author-ir.mjs');
 const {syntheticFiveGenreAuthorCases}=await import('./r125-v4e-cross-genre-source-study.mjs');
 const {parseV4DLocalAuthorArgs,runV4DLocalAuthor}=await import('./r125-v4d-local-architect.mjs');
 const {replayPrivateV4D}=await import('./r125-v4d-replay-private.mjs');
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4f-private-'));
 const out=path.join(parent,'study'),replay=path.join(parent,'replay');
 const fixture=syntheticFiveGenreAuthorCases()[0];
 const input={...structuredClone(fixture.source),schema:FLOORPLATE_SCHEMA,
  massing:{spaceId:'learning',corner:'NW',cutWidth:7,cutDepth:7,publicAccessSide:'X'},
  wing:structuredClone(fixture.authoredContourWing),
  floorplate:{spaceId:'welcome',corner:'NE',width:7,depth:7}};
 const raw=JSON.stringify(input),calls=[];
 const fetcher=async(url,opt)=>{
  calls.push(opt?.method);
  if(opt?.method==='GET')
   return {ok:true,status:200,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(opt?.method==='POST')
   return {ok:true,status:200,text:async()=>JSON.stringify({
    model:'qwen3:14b',choices:[{finish_reason:'stop',message:{content:raw}}]})};
  throw Error('UNEXPECTED_HTTP_TEST');
 };
 try{
  const opts=parseV4DLocalAuthorArgs(['--authored-floorplate','--model','qwen3:14b',
   '--out',out,'--prompt','Produce one independent program with a real covered main volume setback.']);
  assert.equal(opts.authorFloorplate,true);
  assert.throws(()=>parseV4DLocalAuthorArgs(['--authored-floorplate','--authored-wing',
   '--model','qwen3:14b','--out',out]),/ONLY_ONE_AUTHOR_MODE/);
  const run=await runV4DLocalAuthor(opts,{fetcher,timeoutMs:15000});
  assert.equal(run.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',run.reason);
  assert.equal(run.authorContract,FLOORPLATE_SCHEMA);
  assert.equal(run.sourceRoutesStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(run.worldWrites,0);
  assert.equal(calls.filter(x=>x==='POST').length,1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'AUTHOR_INTENT_ORIGINAL.json'),'utf8')),input);
  assert.equal(fs.readFileSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  const art=JSON.parse(fs.readFileSync(path.join(out,'PRIVATE_B143_FLOORPLATE_ART_HOLD_COMPARISON.json'),'utf8'));
  assert.equal(art.floorplateSourceWitness.rootMainRoomModified,true);
  assert.equal(art.floorplateSourceWitness.originalWalkableFloorColumnsRemoved,49);
  assert.equal(art.projectedVisibilityAudit.views.find(v=>v.face==='roof').silhouetteChangedCells,49);
  assert.equal(art.extraModelRequests,0);
  assert.equal(art.humanArchitecturalArt,'NOT_REVIEWED');
  for(const name of [
   'AUTHORED_COVERED_FLOORPLATE_SOURCE.json','BASELINE_WING_3D_PRIVATE.html',
   'BASELINE_WING_FIVE_VIEWS_PRIVATE.svg','FINAL_COVERED_FLOORPLATE_FIVE_VIEWS_PRIVATE.svg',
   'PRIVATE_B143_FLOORPLATE_VISIBILITY_DELTA.svg'
  ])assert(fs.existsSync(path.join(out,name)),name);
  const safe=JSON.parse(fs.readFileSync(path.join(out,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8'));
  assert.equal(safe.authorContract,FLOORPLATE_SCHEMA);
  assert.equal(safe.sourceCandidateVerified,true);
  assert.equal(safe.rawModelTextIncluded,false);
  assert.equal(safe.explicitlyInjectedTestResponse,true);
  const count=calls.length,rr=replayPrivateV4D(out,replay);
  assert.equal(calls.length,count);
  assert.equal(rr.status,'HOLD_TEST_DOUBLE_REPLAY_ONLY');
  assert.equal(rr.originalCompilerHashesMatch,true);
  assert.equal(rr.additionalModelCalls,0);
  assert.equal(rr.worldWrites,0);
  assert(!fs.existsSync(path.join(replay,'MODEL_RESPONSE_ORIGINAL.txt')));
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});


test('V4G genuinely authored double-height usable public hall replaces full old roof, source windows and two-wide routes preserved across five genres',async()=>{
 const {compileAuthoredTallPublicHall}
  =await import('../source/ai/r125-v4g-authored-atrium-height.mjs');
 const {FLOORPLATE_SCHEMA}
  =await import('../source/ai/r125-v4f-floorplate-author-ir.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const fixtures=syntheticFiveGenreAuthorCases(),frozen=structuredClone(fixtures);
 for(const s of fixtures){
  const author={...structuredClone(s.source),schema:FLOORPLATE_SCHEMA,
   massing:structuredClone(s.authoredMassing),
   wing:structuredClone(s.authoredContourWing),
   floorplate:structuredClone(s.authoredFloorplate)};
  const original=structuredClone(author),a=structuredClone(s.authoredAtrium);
  const r=compileAuthoredTallPublicHall(author,a),w=r.actualSourceWitness;
  assert.deepEqual(author,original);
  assert.deepEqual(s.authoredAtrium,a);
  assert.notEqual(r.finalGeometrySha256,r.priorGeometrySha256);
  assert.equal(w.usableGroundLevelAtriumFloorColumns,a.width*a.depth);
  assert.equal(w.physicallyPresentRaisedRoofCells,a.width*a.depth);
  assert(w.actuallyRemovedOldRoofVoxels>=a.width*a.depth);
  assert(w.physicallyConnectedRoofBoundaryCells>=36);
  assert(w.physicallyGlazedClerestoryCells>=96);
  assert.equal(w.actualGlassInsideOutsideAIRCells,2*w.physicallyGlazedClerestoryCells);
  assert(w.actualGainAtHighestVoxel>=5);
  assert(w.verifiedTallHallCenterVerticalAirCells>=18);
  assert.equal(w.verifiedOriginalWindowCells,36);
  assert(w.realHallEntryTwoWideWalk.realSupportedPadsReached>0);
  assert.equal(w.realHallEntryTwoWideWalk.width,2);
  assert.equal(r.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(w.actualVisibleFiveDirections.views.find(v=>v.face==='roof').depthChangedCells>=100);
  assert(r.b143Design.elements.length<=160);
  assert.equal(r.humanArt,'NOT_REVIEWED');
  assert.equal(r.realModel,'NOT_TESTED');
  assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.equal(r.constructionApproved,false);
  assert.equal(r.executionAllowed,false);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(r.BuildPlan.operations,[]);
  const bad={...a,lift:13};
  assert.throws(()=>compileAuthoredTallPublicHall(author,bad),
   /R125_V4G_ATRIUM_AUTHOR_HEIGHT_SECTION_CONTRACT/);
  assert.throws(()=>compileAuthoredTallPublicHall(author,{...a,offsetX:7,width:16}),
   /R125_V4G_ATRIUM_AUTHOR_HALL_NOT_INSIDE_REAL_COVERED_ROOM/);
 }
 assert.deepEqual(fixtures,frozen);
 const housing=fixtures[0];
 const home={...structuredClone(housing.source),schema:FLOORPLATE_SCHEMA,
  massing:structuredClone(housing.authoredMassing),
  wing:structuredClone(housing.authoredContourWing),
  floorplate:structuredClone(housing.authoredFloorplate)};
 assert.throws(()=>compileAuthoredTallPublicHall(home,
  {...housing.authoredAtrium,spaceId:'learning',offsetX:4,offsetZ:4}),
  /R125_V4G_ATRIUM_ORIGINAL_REAL_ATRIUM_FLOOR_NOT_PRESENT/);
});


test('V4G ONE original author controls full public program, footprint and physical elevated hall for all genres',async()=>{
 const {HEIGHT_SCHEMA,HEIGHT_SYSTEM_PROMPT,compileHeightAuthorIntent}
  =await import('../source/ai/r125-v4g-height-author-ir.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const {diagnosePrivateV4DAuthor}
  =await import('./r125-v4d-author-source-diagnostics.mjs');
 const fixtures=syntheticFiveGenreAuthorCases(),snapshot=structuredClone(fixtures);
 for(const s of fixtures){
  const answer={...structuredClone(s.source),schema:HEIGHT_SCHEMA,
   massing:structuredClone(s.authoredMassing),
   wing:structuredClone(s.authoredContourWing),
   floorplate:structuredClone(s.authoredFloorplate),
   atrium:structuredClone(s.authoredAtrium)};
  const frozen=structuredClone(answer);
  const result=compileHeightAuthorIntent(answer),w=result.authoredTallHallSourceWitness;
  assert.deepEqual(answer,frozen);
  assert.equal(result.authorContract,HEIGHT_SCHEMA);
  assert.notEqual(result.unchangedFloorplateGeometrySha256,result.b143.geometrySha256);
  assert.equal(w.usableGroundLevelAtriumFloorColumns,
   answer.atrium.width*answer.atrium.depth);
  assert.equal(w.physicallyPresentRaisedRoofCells,
   answer.atrium.width*answer.atrium.depth);
  assert(w.physicallyGlazedClerestoryCells>=96);
  assert.equal(w.actualGlassInsideOutsideAIRCells,2*w.physicallyGlazedClerestoryCells);
  assert(w.actualGainAtHighestVoxel>=5);
  assert(w.verifiedTallHallCenterVerticalAirCells>=18);
  assert.equal(w.realHallEntryTwoWideWalk.width,2);
  assert.equal(result.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(result.realModel,'NOT_TESTED');
  assert.equal(result.humanArt,'NOT_REVIEWED');
  assert.equal(result.worldContacts,0);assert.equal(result.worldWrites,0);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(result.BuildPlan.operations,[]);
  assert.equal(diagnosePrivateV4DAuthor(answer,HEIGHT_SCHEMA).issues.length,0);
  const bad=structuredClone(answer);bad.atrium.lift=14;
  assert.throws(()=>compileHeightAuthorIntent(bad),/R125_V4G_ATRIUM_AUTHOR_HEIGHT_SECTION_CONTRACT/);
  assert(diagnosePrivateV4DAuthor(bad,HEIGHT_SCHEMA).issues
   .some(x=>x.code==='TALL_ATRIUM_SECTION_DIMENSION_INVALID'));
 }
 assert(HEIGHT_SYSTEM_PROMPT.includes('atrium'));
 assert.deepEqual(fixtures,snapshot);
});

test('V4G local fake ONE response has real tall roof and clerestory, private art evidence, zero-call source SHA replay, and ZERO worlds',async()=>{
 const {HEIGHT_SCHEMA}=await import('../source/ai/r125-v4g-height-author-ir.mjs');
 const {syntheticFiveGenreAuthorCases}
  =await import('./r125-v4e-cross-genre-source-study.mjs');
 const {parseV4DLocalAuthorArgs,runV4DLocalAuthor}
  =await import('./r125-v4d-local-architect.mjs');
 const {replayPrivateV4D}=await import('./r125-v4d-replay-private.mjs');
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4g-private-'));
 const out=path.join(parent,'study'),replay=path.join(parent,'replay');
 const sample=syntheticFiveGenreAuthorCases()[0];
 const answer={...structuredClone(sample.source),schema:HEIGHT_SCHEMA,
  massing:structuredClone(sample.authoredMassing),
  wing:structuredClone(sample.authoredContourWing),
  floorplate:structuredClone(sample.authoredFloorplate),
  atrium:structuredClone(sample.authoredAtrium)};
 const raw=JSON.stringify(answer),requests=[];
 const fetcher=async(url,opt)=>{
  requests.push(opt?.method);
  if(opt?.method==='GET')
   return {ok:true,status:200,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(opt?.method==='POST')
   return {ok:true,status:200,text:async()=>JSON.stringify({
    model:'qwen3:14b',choices:[{finish_reason:'stop',message:{content:raw}}]})};
  throw Error('UNEXPECTED_MODEL_ORIGIN');
 };
 try{
  const opt=parseV4DLocalAuthorArgs(['--authored-atrium','--model','qwen3:14b',
   '--out',out,'--prompt','Design one unique inhabited public double-height hall with an original roof profile.']);
  assert.equal(opt.authorAtrium,true);
  assert.throws(()=>parseV4DLocalAuthorArgs([
   '--authored-atrium','--authored-floorplate',
   '--model','qwen3:14b','--out',out]),/ONLY_ONE_AUTHOR_MODE/);
  const report=await runV4DLocalAuthor(opt,{fetcher,timeoutMs:15000});
  assert.equal(report.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',report.reason);
  assert.equal(report.authorContract,HEIGHT_SCHEMA);
  assert.equal(report.sourceRoutesStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(report.worldWrites,0);
  assert.equal(requests.filter(x=>x==='POST').length,1);
  assert.deepEqual(JSON.parse(fs.readFileSync(
   path.join(out,'AUTHOR_INTENT_ORIGINAL.json'),'utf8')),answer);
  assert.equal(fs.readFileSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  const art=JSON.parse(fs.readFileSync(
   path.join(out,'PRIVATE_B143_ATRIUM_ART_HOLD_COMPARISON.json'),'utf8'));
  assert(art.projectedVisibilityAudit.views.find(v=>v.face==='roof').depthChangedCells>=100);
  assert(art.tallHallSourceWitness.actualGainAtHighestVoxel>=5);
  assert.equal(art.tallHallSourceWitness.physicallyGlazedClerestoryCells,120);
  assert.equal(art.extraModelRequests,0);
  assert.equal(art.humanArchitecturalArt,'NOT_REVIEWED');
  for(const f of [
   'BASELINE_FLOORPLATE_3D_PRIVATE.html','BASELINE_FLOORPLATE_FIVE_VIEWS_PRIVATE.svg',
   'FINAL_TALL_PUBLIC_HALL_FIVE_VIEWS_PRIVATE.svg','PRIVATE_B143_ATRIUM_VISIBILITY_DELTA.svg',
   'AUTHORED_TALL_PUBLIC_HALL_SOURCE.json'
  ])assert(fs.existsSync(path.join(out,f)),f);
  const safe=JSON.parse(fs.readFileSync(path.join(out,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8'));
  assert.equal(safe.authorContract,HEIGHT_SCHEMA);
  assert.equal(safe.sourceCandidateVerified,true);
  assert.equal(safe.explicitlyInjectedTestResponse,true);
  assert.equal(safe.rawModelTextIncluded,false);
  const callsBeforeReplay=requests.length,replayed=replayPrivateV4D(out,replay);
  assert.equal(requests.length,callsBeforeReplay);
  assert.equal(replayed.status,'HOLD_TEST_DOUBLE_REPLAY_ONLY');
  assert.equal(replayed.originalCompilerHashesMatch,true);
  assert.equal(replayed.additionalModelCalls,0);
  assert.equal(replayed.worldWrites,0);
  assert(!fs.existsSync(path.join(replay,'MODEL_RESPONSE_ORIGINAL.txt')));
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
