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
import {prepareR94DoorwayReview,buildR94RoomEntranceVariant}
 from './b198zr94-seven-room-entry-redesign.mjs';
import {subtractR95WallWindow,buildR95DaylightAtriumVariant,
 prepareR95DaylightReview,writeR95DaylightReview}
 from './b198zr95-atrium-daylight-portals.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
let cached=null;
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
 cached=a;return cached;
}
test('R95 clipped wall subtracts true surface area without filling window',()=>{
 const original={kind:'left_inner',
  a:[-.38,.1,0],b:[-.38,.3,0],c:[-.38,.1,.2]};
 const box={yMin:.14,yMax:.19,zMin:.04,zMax:.09};
 const result=subtractR95WallWindow(original,box);
 assert.equal(result.cut,true);
 assert(result.faces.length>=3);
 const norm=(f)=>{
  const [a,b,c]=[f.a,f.b,f.c];
  return Math.hypot((b[1]-a[1])*(c[2]-a[2])-
   (b[2]-a[2])*(c[1]-a[1]),
   (b[0]-a[0])*(c[2]-a[2])-
   (b[2]-a[2])*(c[0]-a[0]))/2;
 };
 const originalArea=norm(original),
  retained=result.faces.reduce((a,b)=>a+norm(b),0);
 assert(retained<originalArea);
 assert(Math.abs(originalArea-retained-result.areaRemoved)<1e-6);
 assert.equal(subtractR95WallWindow(original,{
  yMin:.41,yMax:.43,zMin:.04,zMax:.09}).cut,false);
 assert.throws(()=>subtractR95WallWindow({...original,kind:'R87_FURNITURE'},box),
  /ONLY_SOURCE_INNER_WALL_CAN_BE_CUT/);
});
test('R95 seven blocked atrium views actually open after real inner-wall cutting',()=>{
 const nodes=packet().r80Evidence.conceptualRouteNodes;
 const original=buildR94RoomEntranceVariant(nodes);
 const art=buildR95DaylightAtriumVariant(nodes);
 assert.equal(original.faces.length,4446);
 assert.equal(art.sourceR94Faces,4446);
 assert.equal(art.proofs.length,7);
 assert.equal(art.addedSplayedRevealFaces,56);
 assert(art.replacedOriginalInnerHullTriangleCount>0);
 assert(art.wholeAtriumPreviewTriangles>4446);
 assert(art.proofs.every(p=>p.sourceBlockedSightlines>0));
 assert(art.proofs.every(p=>p.postCutInnerHullSightHits===0));
 assert(art.proofs.every(p=>p.sightlineProbes===9&&p.unobstructedSamples===9));
 assert.equal(art.headroomChecks.length,7);
 assert(art.headroomChecks.some(p=>p.side==='right'&&p.tier===3&&
  p.firstVerticalSurfaceDistanceNormalized>.29));
 assert.equal(art.certifiedPublicSightlineQuality,false);
 assert.equal(art.physicalSunlightIlluminationLuxMeasured,false);
 assert.equal(art.structuralCapacityOfCutWallVerified,false);
 assert.equal(art.independentHumanAestheticReview,'NOT_REVIEWED');
});
test('R95 full strict chain and world safety remain HOLD after art opening',()=>{
 const a=packet(),source=JSON.stringify(a);
 const proof=prepareR95DaylightReview(a);
 assert.equal(proof.r94EvidenceStrictlyValidated,true);
 assert.equal(proof.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(proof.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(proof.safety.BuildPlan.operations,[]);
 assert(proof.safety.gates.every(v=>v==='BLOCKED'));
 assert.equal(proof.safety.worldContacts,0);
 assert.equal(proof.modelCalls,0);
 assert.equal(JSON.stringify(a),source);
 const fake=structuredClone(a.r94Evidence);fake.certifiedPhysicalDoorways=7;
 assert.throws(()=>prepareR95DaylightReview({...a,r94Evidence:fake}),
  /R94_FULL_EVIDENCE_MISMATCH/);
 assert.throws(()=>prepareR95DaylightReview({...a,
  expectedRawSha256:'f'.repeat(64)}));
});
test('R95 writes actual wall-hole OBJ, full audit and one-step HTML only once',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r95-'));
 try{
  const a=packet(),result=writeR95DaylightReview({...a,destination:dir});
  assert.equal(result.openings,7);
  const base='R95_SEVEN_SOURCE_DAYLIGHT_PORTALS';
  const report=JSON.parse(fs.readFileSync(path.join(dir,base+'_EVIDENCE.json'),'utf8'));
  const model=fs.readFileSync(path.join(dir,base+'_ARCHITECTURE.obj'),'utf8');
  const html=fs.readFileSync(path.join(dir,base+'_REVIEW.html'),'utf8');
  assert.equal((model.match(/^f /gm)||[]).length,result.activeTriangles);
  assert.equal(report.proofs.length,7);
  assert(html.includes('R94_READING_ROOM_TRUE_TERRACE_ENTRY_ARCHITECTURAL_REVIEW.html'));
  for(const view of ['FRONT','OBLIQUE','SIDE','AERIAL'])
   assert(html.includes('>'+view+'</figcaption>'));
  assert((html.match(/<svg xmlns=/g)||[]).length===4);
  assert.equal(report.safety.readiness,'NOT_PREPARED');
  assert.throws(()=>writeR95DaylightReview({...a,destination:dir}),/DO_NOT_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
