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
import {prepareR86DeckReview,screenR86ResearchRibbon}
 from './b198zr86-finite-width-deck-study.mjs';
import {prepareR87InteriorReview} from './b198zr87-seven-room-architecture.mjs';
import {prepareR88GalleryReview} from './b198zr88-gallery-circulation-study.mjs';
import {extractR89GalleryEdges,designR89GalleryInterface,
 buildR89IntegratedAccessStudy,prepareR89AccessReview,
 writeR89AccessReview} from './b198zr89-gallery-interface-architecture.mjs';
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
 return a;
}
function fixture(){
 const p=[[-.7,.2,-.2],[-.68,.2,0],[-.64,.21,.18]];
 const strip=screenR86ResearchRibbon(p,'left',[]);
 assert.equal(strip.accepted,true);
 const pad={a:[-.65,.21,.18],b:[-.56,.21,.22],c:[-.61,.21,.32]};
 const t={side:'left',tier:1,candidate:{normalizedGradient:.04}};
 return {t,pad,strip:strip.triangles};
}
test('R89 keeps exact R88 shared gallery edge vertices',()=>{
 const x=fixture(),n=extractR89GalleryEdges(x.strip);
 assert.equal(n.length,3);
 assert.deepEqual(n[0][0],x.strip[0].a);
 assert.deepEqual(n[1][1],x.strip[0].c);
 assert.deepEqual(n[2][0],x.strip[3].c);
 assert.throws(()=>extractR89GalleryEdges(x.strip.slice(0,2)),
  /FOUR_SOURCE_R88_STRIP_TRIANGLES_REQUIRED/);
});
test('R89 emits only touching-source study guards and three source-pad rims',()=>{
 const x=fixture(),design=designR89GalleryInterface(x.t,x.strip,x.pad,[]);
 assert.equal(design.rails,4);
 assert.equal(design.padRims,3);
 assert.equal(design.faces.length,18);
 assert.equal(design.railingNotFallProtectionCertified,true);
 assert.equal(design.allLandingRimsTouchExactR84PadVertices,true);
 assert(design.faces.some(f=>f.kind.includes('R89_ARCHITECTURAL_UPRIGHT')));
 const corners=[x.pad.a,x.pad.b,x.pad.c].map(JSON.stringify);
 assert(design.faces.some(f=>corners.includes(JSON.stringify(f.a))));
});
test('R89 refuses invented interface geometry where original shell obstructs',()=>{
 const x=fixture();
 // Wall cut through the gallery, but not the distant pad.
 const wall=[{kind:'left_outer',a:[-.675,.1,-.1],b:[-.675,.6,-.1],c:[-.675,.6,.12]},
 {kind:'left_outer',a:[-.675,.1,-.1],b:[-.675,.6,.12],c:[-.675,.1,.12]}];
 const design=designR89GalleryInterface(x.t,x.strip,x.pad,wall);
 assert(design.rails<4);
 assert(design.warnings.includes('GUARD_SKETCH_NOT_CREATED_DUE_TO_SOURCE_INTERSECTION'));
 assert.equal(design.padRims,3);
});
test('R89 seven real source levels retain all R88 faces and keep HOLD',()=>{
 const a=pack();
 const out=buildR89IntegratedAccessStudy(a.r80Evidence.conceptualRouteNodes);
 assert.equal(out.levels.length,7);
 assert.equal(out.originalR88Triangles,4150);
 assert.equal(out.levelsWithStudyRail,7);
 assert.equal(out.levelsWithStudyLandingRim,7);
 assert(out.newArchitecturalInterfaceTriangles>90);
 assert.equal(out.faces.length,out.originalR88Triangles+
  out.newArchitecturalInterfaceTriangles);
 assert(out.levels.every(l=>l.sourceGalleryVerified===true));
 assert(out.levels.every(l=>l.additionalFaces>0));
 assert.equal(out.actualHumanWalkabilityCertified,false);
 assert.equal(out.independentArchitecturalQuality,'NOT_REVIEWED');
 const proof=prepareR89AccessReview(a);
 assert.equal(proof.r88FullEvidenceRevalidated,true);
 assert.equal(proof.oldB143Status,'HOLD_B143_NOT_COMPILED');
 assert.equal(proof.safety.readiness,'NOT_PREPARED');
 assert.equal(proof.safety.constructionApproved,false);
 assert.deepEqual(proof.safety.BuildPlan.operations,[]);
 assert(proof.safety.gates.every(x=>x==='BLOCKED'));
 assert.equal(proof.worldInteractionOccurred,false);
 assert.equal(proof.modelCalls,0);
});
test('R89 refuses forged R88 provenance and corrupted original source hash',()=>{
 const a=pack(),forged=structuredClone(a.r88Evidence);
 forged.certifiedPublicRoutes=7;
 assert.throws(()=>prepareR89AccessReview({...a,r88Evidence:forged}),
 /R88_COMPLETE_EVIDENCE_MISMATCH/);
 assert.throws(()=>prepareR89AccessReview({...a,
  expectedRawSha256:'f'.repeat(64)}));
});
test('R89 review produces inspectable OBJ/HTML/JSON and no overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r89-'));
 try{
  const a=pack(),r=writeR89AccessReview({...a,destination:dir});
  const html=fs.readFileSync(path.join(dir,
   'R89_GALLERY_LANDING_INTEGRATION_REVIEW.html'),'utf8');
  const mesh=fs.readFileSync(path.join(dir,
   'R89_GALLERY_RAILS_AND_LANDING_PROPOSALS.obj'),'utf8');
  const evidence=JSON.parse(fs.readFileSync(path.join(dir,
   'R89_GALLERY_INTEGRATION_EVIDENCE.json'),'utf8'));
  assert.equal(r.addedFaces,evidence.newArchitecturalInterfaceTriangles);
  assert.equal(evidence.levels.length,7);
  assert(html.includes('R88_ARCHITECTURAL_CIRCULATION_REVIEW.html'));
  assert(html.includes('NOT_PREPARED'));
  assert(mesh.includes('R89_'));
  assert.equal((mesh.match(/^f /gm)||[]).length,
    buildR89IntegratedAccessStudy(a.r80Evidence.conceptualRouteNodes).faces.length);
  assert.throws(()=>writeR89AccessReview({...a,destination:dir}),
    /DO_NOT_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
