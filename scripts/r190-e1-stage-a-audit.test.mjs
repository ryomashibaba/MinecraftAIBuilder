import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditR190E1SavedTwoStage,locateLatestTwoStage,explainR190E1WindowGeometry} from './r190-e1-stage-a-audit.mjs';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
import {layoutR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function fixtures(){
 const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[0]);
 p.site={width:52,depth:52,height:14};
 p.materials={floor:'stone',wall:'wood',roof:'wood'};
 return p;
}
test('Offline audit SHA checks and explains invalid stage-A room with no network or repair',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e1-audit-stage-a-'));
 const dir=path.join(root,'E1-two-stage-test');fs.mkdirSync(dir);
 try{
  const p=fixtures();p.spaces[2].height=6;const raw=JSON.stringify(p);
  fs.mkdirSync(path.join(dir,'modern-home'));
  fs.writeFileSync(path.join(dir,'modern-home','STAGE_A_ORIGINAL.txt'),raw);
  fs.writeFileSync(path.join(dir,'E1_TWO_STAGE_REPORT.json'),JSON.stringify({
   schema:'r190-e1-two-stage-comparison-v1',realModelRequests:0,status:'TEST_DOUBLE_ONLY',
   rows:[{id:'modern-home',stageAOriginalSha256:sha(raw),reason:'R190_SEMANTIC_SPACE'},
    {id:'flower-shop',reason:'R190_SEMANTIC_LAYOUT'},
    {id:'research-lab',reason:'E1_TWO_STAGE_NO_CERTIFIED_WINDOWS'}]
  }));
  assert.equal(locateLatestTwoStage(root),dir);
  const originalDir=fs.readdirSync(path.join(dir,'modern-home'));
  const report=auditR190E1SavedTwoStage(dir,{maxWindowSlots:4});
  assert.equal(report.newModelRequests,0);
  assert.equal(report.worldWrites,0);
  assert.equal(report.rows[0].originalHashMatchesReport,true);
  assert.equal(report.rows[0].inputValidation,'HOLD');
  assert(report.rows[0].issues.some(x=>x.rule==='SPACE_HEIGHT'));
  assert.equal(report.rows[0].layoutStrategies.length,0);
  assert.equal(report.rows[1].reason,'ORIGINAL_NOT_PRESENT');
  assert.deepEqual(fs.readdirSync(path.join(dir,'modern-home')),originalDir);
  assert.equal(fs.readFileSync(path.join(dir,'modern-home','STAGE_A_ORIGINAL.txt'),'utf8'),raw);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('Offline audit proves valid source-window availability from original dimensions',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e1-audit-valid-'));
 const dir=path.join(root,'E1-two-stage-test');fs.mkdirSync(dir);
 try{
  const raw=JSON.stringify(fixtures());
  fs.mkdirSync(path.join(dir,'research-lab'));
  fs.writeFileSync(path.join(dir,'research-lab','STAGE_A_ORIGINAL.txt'),raw);
  fs.writeFileSync(path.join(dir,'E1_TWO_STAGE_REPORT.json'),JSON.stringify({
   schema:'r190-e1-two-stage-comparison-v1',realModelRequests:0,status:'TEST_DOUBLE_ONLY',
   rows:[{id:'modern-home',reason:'HOLD'}, {id:'flower-shop',reason:'HOLD'},
    {id:'research-lab',stageAOriginalSha256:sha(raw),reason:'WINDOW_CATALOG'}]
  }));
  const report=auditR190E1SavedTwoStage(dir,{maxWindowSlots:6});
  const a=report.rows[2];
  assert.equal(a.inputValidation,'PASS');
  assert.equal(a.layoutStrategies[0].status,'FEASIBLE');
  assert(a.windowCatalog.totalPossibleSlots>=a.windowCatalog.testedRepresentativeSlots);
  assert.equal(a.windowCatalog.testedRepresentativeSlots,6);
  assert.equal(a.windowCatalog.certifiedSlots+
   Object.values(a.windowCatalog.sourceRejectionCounts).reduce((x,y)=>x+y,0),6);
  assert.equal(report.newModelRequests,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('E1 lab-style zero-window geometry explains room-height eligibility without changing AI plan',()=>{
 const p=fixtures();
 p.spaces=p.spaces.map(s=>({...s,height:7}));
 const before=JSON.stringify(p);
 const layout=layoutR190SemanticPlan(p);
 const result=explainR190E1WindowGeometry(p,layout);
 assert.equal(result.totalEligible,0);
 assert(result.rooms.every(x=>x.precondition==='ROOM_HEIGHT_BELOW_8'));
 assert.equal(JSON.stringify(p),before);
 const q=fixtures();
 const available=explainR190E1WindowGeometry(q,layoutR190SemanticPlan(q));
 assert(available.totalEligible>0);
 assert.equal(available.worldWrites,0);
});
