import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {studyR124ReadingSeat,buildR124FromNodes,writeR124Packet,R123_SHA}
 from './b198zr124-reading-seat-art-study.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],[-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],[.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],[.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R124 quick: reject invented geometry',()=>{
 assert.throws(()=>studyR124ReadingSeat({faces:[]}),/R124_REAL_R107_R98_REQUIRED/);
 assert.equal(R123_SHA.length,64);
});
test('R124 real: source-based reading seat 45 to 65 percent architectural investigation',()=>{
 const study=buildR124FromNodes(nodes),r=study.report;
 assert.equal(r.previousSeatAreaRatio,.45);
 assert.equal(r.attempts.length,3);
 assert(r.attempts.every(x=>Math.abs(x.retainedSeatAreaRatio-.65)<.00001));
 assert(r.attempts.every(x=>x.art==='NOT_REVIEWED'));
 assert.equal(r.originalBuildingChanged,false);
 assert.equal(r.independentArtApproval,'NOT_REVIEWED');
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 if(r.selectedOption){const a=r.attempts.find(x=>x.option===r.selectedOption);
 assert(a.qualified&&a.newExternalStrictPiercings.length===0&&a.oldSeamsIntact&&a.floor===0&&a.overhead===0&&a.lateral===0&&a.oldFiveNonregressing);
 assert.equal(study.possibleCandidate.length,4716)}
 else assert.equal(study.possibleCandidate,null);
 if(process.env.R124_ARTIFACT_DIR){
 const dir=path.resolve(process.env.R124_ARTIFACT_DIR);fs.mkdirSync(dir,{recursive:true});
 const done=writeR124Packet(study,dir);assert.equal(done.files.length,5);
 for(const file of done.files)assert(fs.statSync(path.join(dir,file)).size>100);
 console.log('R124_ART_PACKET',JSON.stringify(done));
 }
 console.log('R124_REAL_SEAT_REVIEW',JSON.stringify(r));
});
