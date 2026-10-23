import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {subtractR95WallWindow} from './b198zr95-atrium-daylight-portals.mjs';
import {designR96OpenRib,sampleR96RealInnerShell}
 from './b198zr96-window-structure-and-light-study.mjs';

// This is explicitly a FAST push/PR smoke, not a replacement for the
// complete source-provenance/R60 R95 R96 computational regression.
test('R96 quick: true rectangular hole stays absent and its real shell frame is valid',()=>{
 const wall=[
  {kind:'left_inner',a:[-.4,.1,-.1],b:[-.4,.4,-.1],c:[-.4,.1,.2]},
  {kind:'left_inner',a:[-.4,.4,-.1],b:[-.4,.4,.2],c:[-.4,.1,.2]}
 ];
 const rect={yMin:.2,yMax:.25,zMin:-.02,zMax:.07};
 let removed=0,retained=[];
 for(const f of wall){const q=subtractR95WallWindow(f,rect);
  removed+=q.areaRemoved||0;retained.push(...q.faces)}
 assert(removed>0);
 const aperture={side:'left',tier:1,box:rect,
  originalInnerWallCorners:[
   [-.4,.2,-.02],[-.4,.2,.07],[-.4,.25,.07],[-.4,.25,-.02]]};
 const candidate=designR96OpenRib(aperture,wall);
 assert.equal(candidate.faces.length,12);
 assert(candidate.faces.every(f=>[f.a,f.b,f.c].every(p=>p.every(Number.isFinite))));
 assert.equal(candidate.openingUnfilledByRibDesign,true);
 assert.equal(candidate.supportStrengthNotAssessed,true);
 assert.equal(sampleR96RealInnerShell(wall,.2,0)[0],-.4);
 assert.equal(sampleR96RealInnerShell(wall,.5,0),null);
 assert.throws(()=>designR96OpenRib({...aperture,box:{
  ...rect,yMax:.85}},wall),/INSUFFICIENT_RETAINED_CROWN_OR_LOWER_WEB/);
});

test('R96 quick: R60 still binds R95 full evidence to R96 and produces no unsafe permissions',()=>{
 const cwd=path.dirname(fileURLToPath(import.meta.url));
 const r60=fs.readFileSync(path.join(cwd,'b198zr60-evidence-bound-visual-review.mjs'),'utf8');
 const r96=fs.readFileSync(path.join(cwd,'b198zr96-window-structure-and-light-study.mjs'),'utf8');
 const workflow=fs.readFileSync(path.join(cwd,'..','.github','workflows',
  'r60-evidence-bound-visual-review-offline.yml'),'utf8');
 assert(r60.includes('writeR96WindowReview({'));
 assert(r60.includes('R95_SEVEN_SOURCE_DAYLIGHT_PORTALS_EVIDENCE.json'));
 assert(r60.includes('R96_ATRIUM_SOURCE_WINDOW_SURROUND_ARCHITECTURAL_REVIEW.html')||
  r60.includes("relativeR96WindowsAndWall:architecturalWindows96"));
 assert(r96.includes("JSON.stringify(checked)!==JSON.stringify(r95Evidence)"));
 assert(r96.includes("fail('R95_COMPLETE_EVIDENCE_MISMATCH')"));
 assert(r96.includes("readiness:'NOT_PREPARED'"));
 assert(r96.includes("gates:Array(9).fill('BLOCKED')"));
 assert(r96.includes("BuildPlan:{operations:[]}"));
 assert(workflow.includes('workflow_dispatch:'));
 assert(workflow.includes('Full R58-R96 offline historical regression'));
});
