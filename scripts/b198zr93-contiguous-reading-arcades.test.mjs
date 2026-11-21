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
import {prepareR84MultilevelReview,buildR84MultilevelResearch}
 from './b198zr84-multilevel-bookstack-review.mjs';
import {prepareR85RouteReview} from './b198zr85-wing-route-alternatives.mjs';
import {prepareR86DeckReview} from './b198zr86-finite-width-deck-study.mjs';
import {prepareR87InteriorReview} from './b198zr87-seven-room-architecture.mjs';
import {prepareR88GalleryReview} from './b198zr88-gallery-circulation-study.mjs';
import {prepareR89AccessReview} from './b198zr89-gallery-interface-architecture.mjs';
import {prepareR90SeamReview} from './b198zr90-source-surface-seams.mjs';
import {prepareR91TurnoutReview} from './b198zr91-tapered-gallery-turnout.mjs';
import {prepareR92WholeLibraryReview,buildR92WholeLibraryAtlas}
 from './b198zr92-whole-library-circulation-atlas.mjs';
import {selectR93ContiguousFloor,designR93LongGallery,
 buildR93ArchitecturalReadingVariant,prepareR93ReadingGalleryReview,
 writeR93ReadingGalleryReview}
 from './b198zr93-contiguous-reading-arcades.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function pack(){
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
 return a;
}
test('R93 seven ORIGINAL connected floor terraces house 28 multi-bay galleries',()=>{
 const a=pack(),n=a.r80Evidence.conceptualRouteNodes;
 const r84=buildR84MultilevelResearch(n);
 const old=buildR92WholeLibraryAtlas(n);
 const art=buildR93ArchitecturalReadingVariant(n);
 assert.equal(art.sourceR92Faces,4306);
 assert.equal(art.newMultiBayBookGalleryTriangles,168);
 assert.equal(art.faces.length,4474);
 assert.deepEqual(art.faces.slice(0,4306),old.faces);
 assert.equal(art.realOriginalFloorFacetsReferenced,63);
 assert.equal(art.longitudinalRoomsWithArchitecture,7);
 assert.equal(art.totalEmittedBays,28);
 assert(art.totalOriginalConnectedRoomFloorArea>.6);
 assert.equal(art.certifiedFloorPaths,0);
 assert.equal(art.independentVisualReview,'NOT_REVIEWED');
 for(const t of r84.tiers){
  const floor=selectR93ContiguousFloor(r84,t);
  assert(floor.sourceFaceIndices.includes(t.triangleIndex));
  assert.equal(floor.sourceTriangles,9);
  assert(floor.sourceNormalizedArea>floor.originalTriangleArea*8);
  const gallery=designR93LongGallery(r84,t,old.faces);
  assert.equal(gallery.emittedLongitudinalBays,4);
  assert.equal(gallery.designTriangles,24);
  assert.equal(gallery.stations.length,5);
  assert.equal(gallery.warnings.length,0);
  assert(gallery.faces.some(f=>f.kind.includes('READING_SEAT_LEDGE')));
  assert(gallery.faces.some(f=>f.kind.includes('CANOPY')));
  assert(gallery.faces.some(f=>f.kind.includes('BOOKWALL')));
  assert(gallery.faces.every(f=>[f.a,f.b,f.c].every(p=>
   t.side==='left'?p[0]<=-.4:p[0]>=.4)));
 }
});
test('R93 strict source evidence, complete BLOCKED gates, and immutability',()=>{
 const a=pack(),before=JSON.stringify(a);
 const e=prepareR93ReadingGalleryReview(a);
 assert.equal(e.r92ProvenanceFullyRevalidated,true);
 assert.equal(e.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(e.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(e.safety.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(e.safety.BuildPlan.operations,[]);
 assert.equal(e.modelCalls,0);
 assert.equal(e.worldReads,0);
 assert.equal(e.worldWrites,0);
 assert.equal(JSON.stringify(a),before);
 assert.equal(JSON.stringify(prepareR93ReadingGalleryReview(a)),
  JSON.stringify(e));
 const fake=structuredClone(a.r92Evidence);
 fake.graph.summary.physicalCertifiedRoomsReached=7;
 assert.throws(()=>prepareR93ReadingGalleryReview({...a,r92Evidence:fake}),
  /R92_COMPLETE_EVIDENCE_MISMATCH/);
 assert.throws(()=>prepareR93ReadingGalleryReview({...a,
  expectedRawSha256:'0'.repeat(64)}));
});
test('R93 writing produces actual 4474-face OBJ and five source-derived views',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r93-'));
 try{
  const a=pack(),res=writeR93ReadingGalleryReview({...a,destination:dir});
  assert.equal(res.rooms,7);
  assert.equal(res.faces,168);
  const base='R93_ORIGINAL_SEVEN_LONG_READING_GALLERIES';
  const model=fs.readFileSync(path.join(dir,base+'_ARCHITECTURE.obj'),'utf8');
  const page=fs.readFileSync(path.join(dir,base+'_FIVE_VIEW.html'),'utf8');
  const data=JSON.parse(fs.readFileSync(path.join(dir,base+'_EVIDENCE.json'),'utf8'));
  assert.equal((model.match(/^f /gm)||[]).length,4474);
  assert(model.includes('R93_SWEEPING_SAIL_CANOPY')||
   model.includes('left_R93_SWEEPING_SAIL_CANOPY'));
  for(const view of ['FRONT','OBLIQUE','SIDE','AERIAL','ATRIUM-TO-GALLERY'])
   assert(page.includes(view));
  assert.equal(data.totalEmittedBays,28);
  assert.equal(data.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(data.safety.readiness,'NOT_PREPARED');
  assert.throws(()=>writeR93ReadingGalleryReview({...a,destination:dir}),
   /NO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
