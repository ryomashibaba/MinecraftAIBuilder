import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {prepareR62FutureDesignGuidance} from './b198zr62-evidence-backed-revision-guidance.mjs';
import {synthesizeR76ReviewDecisions} from './b198zr76-architecture-next-decisions.mjs';
import {prepareR77FutureArchitecturalBrief} from './b198zr77-cohesive-architecture-revision-brief.mjs';
import {prepareR78SpatialProgramSpec} from './b198zr78-spatial-program-design-spec.mjs';
import {prepareR79ParametricStudy} from './b198zr79-parametric-library-massing.mjs';
import {prepareR80ResearchEvidence} from './b198zr80-supported-route-concept-study.mjs';
import {prepareR81ArchitectureReview} from './b198zr81-envelope-portal-connection-review.mjs';
import {prepareR82GeometryAudit} from './b198zr82-mesh-clearance-and-terrace-audit.mjs';
import {prepareR83ArchitecturalLandingReview} from './b198zr83-wing-terrace-landing-prototypes.mjs';
import {prepareR84MultilevelReview,buildR84MultilevelResearch} from './b198zr84-multilevel-bookstack-review.mjs';
import {prepareR85RouteReview} from './b198zr85-wing-route-alternatives.mjs';
import {prepareR86DeckReview} from './b198zr86-finite-width-deck-study.mjs';
import {prepareR87InteriorReview} from './b198zr87-seven-room-architecture.mjs';
import {prepareR88GalleryReview} from './b198zr88-gallery-circulation-study.mjs';
import {prepareR89AccessReview} from './b198zr89-gallery-interface-architecture.mjs';
import {prepareR90SeamReview} from './b198zr90-source-surface-seams.mjs';
import {prepareR91TurnoutReview} from './b198zr91-tapered-gallery-turnout.mjs';
import {prepareR92WholeLibraryReview} from './b198zr92-whole-library-circulation-atlas.mjs';
import {prepareR93ReadingGalleryReview,buildR93ArchitecturalReadingVariant}
 from './b198zr93-contiguous-reading-arcades.mjs';
import {designR94RoomDoorway,buildR94RoomEntranceVariant,
 prepareR94DoorwayReview,writeR94DoorwayReview}
 from './b198zr94-seven-room-entry-redesign.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
// A single cached frozen input avoids dozens of expensive repeated
// full-source evidence builds in the 4-suite PR CI smoke gate.
let cached=null;
function getPack(){
 if(cached)return cached;
 const p=r32Courtyard();
 p.design.elements.push({id:'outside',shape:'box',mode:'add',
  material:'stone',origin:[0,p.design.bounds.height,0],size:[2,1,2]});
 const raw=JSON.stringify(p),a={raw,expectedRawSha256:sha(raw),
  b143Status:'HOLD_B143_NOT_COMPILED'};
 a.r62Evidence=prepareR62FutureDesignGuidance(a);
 a.r76Evidence=synthesizeR76ReviewDecisions(a);
 a.r77Evidence=prepareR77FutureArchitecturalBrief(a);
 a.r78Evidence=prepareR78SpatialProgramSpec(a);
 a.r79Evidence=prepareR79ParametricStudy(a);
 a.r80Evidence=prepareR80ResearchEvidence(a);
 a.r81Evidence=prepareR81ArchitectureReview(a);
 a.r82Evidence=prepareR82GeometryAudit(a);
 a.r83Evidence=prepareR83ArchitecturalLandingReview(a);
 a.r84Evidence=prepareR84MultilevelReview(a);
 a.r85Evidence=prepareR85RouteReview(a);
 a.r86Evidence=prepareR86DeckReview(a);
 a.r87Evidence=prepareR87InteriorReview(a);
 a.r88Evidence=prepareR88GalleryReview(a);
 a.r89Evidence=prepareR89AccessReview(a);
 a.r90Evidence=prepareR90SeamReview(a);
 a.r91Evidence=prepareR91TurnoutReview(a);
 a.r92Evidence=prepareR92WholeLibraryReview(a);
 a.r93Evidence=prepareR93ReadingGalleryReview(a);
 cached=a;
 return cached;
}
test('R94 exactly clears R93 entrance furnishings at all REAL source pads',()=>{
 const a=getPack(),nodes=a.r80Evidence.conceptualRouteNodes;
 const old=buildR93ArchitecturalReadingVariant(nodes),
  newer=buildR94RoomEntranceVariant(nodes);
 assert.equal(old.faces.length,4474);
 assert.equal(newer.sourceR93Faces,4474);
 assert.equal(newer.displacedFurnishingTriangles,84);
 assert.equal(newer.newTrueSourceFloorDoorwayTriangles,56);
 assert.equal(newer.newActiveArchitectureTriangles,4446);
 assert.equal(newer.connectedResearchDoorwayCount,7);
 assert.equal(newer.totalRemainingR93FurnishingBays,14);
 assert.equal(newer.certifiedPhysicalDoorways,0);
 assert.deepEqual(newer.faces.slice(0,4306),old.faces.slice(0,4306));
 assert.equal(newer.rooms.length,7);
 const r84=buildR84MultilevelResearch(nodes);
 for(const t of r84.tiers){
  const q=newer.rooms.find(x=>x.side===t.side&&x.tier===t.tier);
  assert(q);
  assert.equal(q.removedSourceR93FurnitureTriangles,12);
  assert.equal(q.replacedMiddleFurnitureBays,2);
  assert.equal(q.retainedOuterReadingBays,2);
  assert.equal(q.sourcePadInsideOriginalTerrace,true);
  assert.equal(q.sourceFloorFacetIndices.length,9);
  assert.equal(q.doorwayTriangles,8);
  assert.equal(q.sampledExistingFurnitureRayHits,0);
  assert.equal(q.researchOpeningLongitudinalLength,.123);
  assert.equal(q.actualHumanWalkingAndStructuralApproval,false);
  const oldRoom=old.levels.find(x=>x.source.side===t.side&&x.source.tier===t.tier);
  const draft=designR94RoomDoorway(t,oldRoom,r84);
  assert.equal(draft.faces.length,8);
  assert(draft.faces.some(f=>f.kind.includes('UNFURNISHED_TRUE_TERRACE_THRESHOLD')));
  assert(draft.faces.some(f=>f.kind.includes('JAMB')));
 }
});
test('R94 strict rechecks original evidence, HOLD, 9 gates and refuses forgeries',()=>{
 const a=getPack(),before=JSON.stringify(a);
 const report=prepareR94DoorwayReview(a);
 assert.equal(report.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(report.priorR93EvidenceFullyRecomputed,true);
 assert.equal(report.safety.readiness,'NOT_PREPARED');
 assert.equal(report.safety.constructionApproved,false);
 assert.equal(report.modelCalls,0);
 assert.equal(report.worldWrites,0);
 assert.deepEqual(report.safety.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(report.safety.BuildPlan.operations,[]);
 assert.equal(JSON.stringify(a),before);
 const altered=structuredClone(a.r93Evidence);
 altered.certifiedFloorPaths=7;
 assert.throws(()=>prepareR94DoorwayReview({...a,r93Evidence:altered}),
  /R93_COMPLETE_EVIDENCE_MISMATCH/);
 assert.throws(()=>prepareR94DoorwayReview({...a,
  expectedRawSha256:'0'.repeat(64)}));
});
test('R94 one-step review contains real 4446-face OBJ + room defects and no overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r94-'));
 try{
  const a=getPack(),res=writeR94DoorwayReview({...a,destination:dir});
  assert.equal(res.faces,4446);
  assert.equal(res.removed,84);
  const base='R94_READING_ROOM_TRUE_TERRACE_ENTRY';
  const obj=fs.readFileSync(path.join(dir,base+'_ACTIVE_ARCHITECTURE.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,base+'_ARCHITECTURAL_REVIEW.html'),'utf8');
  const evidence=JSON.parse(fs.readFileSync(path.join(dir,base+'_EVIDENCE.json'),'utf8'));
  assert.equal((obj.match(/^f /gm)||[]).length,4446);
  assert(html.includes('R93_ORIGINAL_SEVEN_LONG_READING_GALLERIES_FIVE_VIEW.html'));
  assert.equal(evidence.rooms.length,7);
  assert.equal(evidence.safety.readiness,'NOT_PREPARED');
  assert.equal(evidence.newTrueSourceFloorDoorwayTriangles,56);
  assert.throws(()=>writeR94DoorwayReview({...a,destination:dir}),
   /DO_NOT_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
