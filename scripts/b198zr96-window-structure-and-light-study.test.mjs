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
import {prepareR84MultilevelReview} from './b198zr84-multilevel-bookstack-review.mjs';
import {prepareR85RouteReview} from './b198zr85-wing-route-alternatives.mjs';
import {prepareR86DeckReview} from './b198zr86-finite-width-deck-study.mjs';
import {prepareR87InteriorReview} from './b198zr87-seven-room-architecture.mjs';
import {prepareR88GalleryReview} from './b198zr88-gallery-circulation-study.mjs';
import {prepareR89AccessReview} from './b198zr89-gallery-interface-architecture.mjs';
import {prepareR90SeamReview} from './b198zr90-source-surface-seams.mjs';
import {prepareR91TurnoutReview} from './b198zr91-tapered-gallery-turnout.mjs';
import {prepareR92WholeLibraryReview} from './b198zr92-whole-library-circulation-atlas.mjs';
import {prepareR93ReadingGalleryReview} from './b198zr93-contiguous-reading-arcades.mjs';
import {prepareR94DoorwayReview} from './b198zr94-seven-room-entry-redesign.mjs';
import {prepareR95DaylightReview,buildR95DaylightAtriumVariant}
 from './b198zr95-atrium-daylight-portals.mjs';
import {sampleR96RealInnerShell,designR96OpenRib,
 buildR96ArchitecturalWindowStudy,prepareR96WindowReview,
 writeR96WindowReview} from './b198zr96-window-structure-and-light-study.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
let cached;
function packet(){
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
 a.r94Evidence=prepareR94DoorwayReview(a);
 a.r95Evidence=prepareR95DaylightReview(a);
 cached=a;return a;
}
test('R96 requires actual shell source points and never invents virtual surfaces',()=>{
 const planar=[{kind:'left_inner',a:[-.4,.10,-.1],
  b:[-.4,.40,-.1],c:[-.4,.10,.2]},
 {kind:'left_inner',a:[-.4,.40,-.1],
  b:[-.4,.40,.2],c:[-.4,.10,.2]}];
 assert.deepEqual(sampleR96RealInnerShell(planar,.2,0),[-.4,.2,0]);
 assert.equal(sampleR96RealInnerShell(planar,.41,0),null);
 const aperture={side:'left',tier:1,box:{yMin:.2,yMax:.25,zMin:-.02,zMax:.07},
  originalInnerWallCorners:[[-.4,.2,-.02],[-.4,.2,.07],
   [-.4,.25,.07],[-.4,.25,-.02]]};
 const proposed=designR96OpenRib(aperture,planar);
 assert.equal(proposed.faces.length,12);
 assert.equal(proposed.openingUnfilledByRibDesign,true);
 assert.equal(proposed.sourceSurfaceSampleCount,4);
 assert(proposed.minNormalizedRemainingCrownWeb>.1);
 assert.throws(()=>designR96OpenRib({...aperture,side:'right'},[]),
  /CANNOT_ANCHOR_WINDOW_SURROUND_ON_REAL_UNCUT_INNER_WALL/);
});
test('R96 seven real source-window surrounds preserve R95, openness and building HOLD',()=>{
 const a=packet(),nodes=a.r80Evidence.conceptualRouteNodes;
 const old=buildR95DaylightAtriumVariant(nodes);
 const r=buildR96ArchitecturalWindowStudy(nodes);
 assert.equal(r.sourceR95Triangles,old.faces.length);
 assert.deepEqual(r.faces.slice(0,old.faces.length),old.faces);
 assert.equal(r.rooms.length,7);
 assert.equal(r.addedArchitecturalSurroundTriangles,84);
 assert.equal(r.faces.length,old.faces.length+84);
 assert(r.originalOpenAreaNormalized>0);
 assert(r.rooms.every(x=>x.minNormalizedRemainingCrownWeb>.04));
 assert(r.sightlineRays.every(x=>x.before.blocked===0&&
  x.after.blocked===0&&x.after.probes===9));
 assert.equal(r.sourceR95ExactMeshPrefix,true);
 assert.equal(r.buildingFacadeStructuralContinuityCertified,false);
 assert.equal(r.daylightLuxOrSolarOrientationCalculated,false);
 assert.equal(r.visualQualityCertified,false);
});
test('R96 strictly checks full R95 ancestry and never claims construction',()=>{
 const a=packet(),original=JSON.stringify(a),
  proof=prepareR96WindowReview(a);
 assert.equal(proof.strictR95SourceEvidenceAuthenticated,true);
 assert.equal(proof.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(proof.independentVisualReview,'NOT_REVIEWED');
 assert.deepEqual(proof.safety.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(proof.safety.BuildPlan.operations,[]);
 assert.equal(proof.safety.readiness,'NOT_PREPARED');
 assert.equal(proof.worldReads,0);
 assert.equal(proof.modelCalls,0);
 assert.equal(JSON.stringify(a),original);
 const forged=structuredClone(a.r95Evidence);
 forged.structuralCapacityOfCutWallVerified=true;
 assert.throws(()=>prepareR96WindowReview({...a,r95Evidence:forged}),
  /R95_COMPLETE_EVIDENCE_MISMATCH/);
 assert.throws(()=>prepareR96WindowReview({...a,
  expectedRawSha256:'f'.repeat(64)}));
});
test('R96 one-step ZIP review makes source-derived OBJ, elevation and evidence',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r96-'));
 try{
  const a=packet(),saved=writeR96WindowReview({...a,destination:dir});
  assert.equal(saved.lightApertures,7);
  const base='R96_ATRIUM_SOURCE_WINDOW_SURROUND';
  const json=JSON.parse(fs.readFileSync(path.join(dir,base+'_EVIDENCE.json'),'utf8'));
  const obj=fs.readFileSync(path.join(dir,base+'_ARCHITECTURE.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,base+'_ARCHITECTURAL_REVIEW.html'),'utf8');
  assert.equal((obj.match(/^f /gm)||[]).length,saved.triangles);
  assert.equal(json.rooms.length,7);
  assert(html.includes('<svg xmlns='));
  assert(html.includes('R95_SEVEN_SOURCE_DAYLIGHT_PORTALS_REVIEW.html'));
  assert.equal(json.safety.readiness,'NOT_PREPARED');
  assert.throws(()=>writeR96WindowReview({...a,destination:dir}),/NO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
