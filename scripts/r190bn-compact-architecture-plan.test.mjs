import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ARCHITECTURE_PLAN_SCHEMA,inspectCompactArchitecturePlan} from '../source/ai/r190bn-compact-architecture-plan.mjs';
const originalBrief=Buffer.from('自由な二階建てアトリエを作り、展示と制作の空間を階段でつないでください');
const sha=createHash('sha256').update(originalBrief).digest('hex');
function plan(){return {schema:ARCHITECTURE_PLAN_SCHEMA,id:'studio-archplan',title:'Architect-authored study',originalBriefSha256:sha,
 site:{width:34,depth:32,height:19},stories:[
  {id:'ground',clearHeight:6,spaces:[{id:'gallery',purpose:'Public display and welcome',width:14,depth:18,privacy:'public'}]},
  {id:'upper',clearHeight:6,spaces:[{id:'workshop',purpose:'Quiet working studio',width:12,depth:16,privacy:'private'}]}
 ],adjacency:[{a:'gallery',b:'workshop',relation:'visual'}],
 entry:{spaceId:'gallery',face:'south'},verticalLinks:[{fromStory:'ground',toStory:'upper',fromSpace:'gallery',toSpace:'workshop',kind:'straight',side:'east',width:3}],
 massing:{intent:'Asymmetric intersection between workshop and gallery volumes',forms:[
  {spaceId:'gallery',kind:'curved',intent:'One sweeping main gallery face'},
  {spaceId:'workshop',kind:'faceted',intent:'Upper studio angled toward morning light'}]},
 roof:{kind:'shed',intent:'One rising section over the upper workshop'},
 openings:[{spaceId:'gallery',face:'south',role:'daylight',pattern:'tall'}],
 materials:{floor:'wood',wall:'concrete',roof:'metal'},assumptions:[],unmetRequirements:[]};}
const run=q=>inspectCompactArchitecturePlan(q,{originalBrief});
test('two authored levels are coordinate-free; elevations are arithmetic, no geometry or world claims',()=>{
 const r=run(plan());assert.equal(r.contract,'VALID_AUTHOR_CHOICES_GEOMETRY_NOT_ATTEMPTED');
 assert.deepEqual(r.computedLevels.map(x=>x.standingY),[1,8]);
 assert.equal(r.modelChosen.roof.kind,'shed');assert.equal(r.modelChosen.massing.forms[0].kind,'curved');
 assert.equal(r.geometryCompiled,false);assert.equal(r.art,'ART_HOLD');assert.equal(r.worldWrites,0);
 assert.equal(r.gates.length,9);assert.deepEqual(r.BuildPlan,{operations:[]});
});
test('missing flight cannot pretend vertical circulation',()=>{
 const q=plan();q.verticalLinks=[];assert.throws(()=>run(q),/MISSING_VERTICAL_LINK/);
});
test('undersized building cannot contain claimed second level',()=>{
 const q=plan();q.site.height=12;assert.throws(()=>run(q),/VERTICAL_SITE_OVERFLOW/);
});
test('model-chosen spiral is retained, not silently rewritten into a straight stair',()=>{
 const q=plan();q.verticalLinks[0].kind='spiral';assert.equal(run(q).modelChosen.verticalLinks[0].kind,'spiral');
});
test('missing model-chosen mass or malformed room references refuse instead of host fallback',()=>{
 const q=plan();q.massing.forms=[];assert.throws(()=>run(q),/MASSING/);
 const p=plan();p.openings[0].spaceId='absent';assert.throws(()=>run(p),/OPENING/);
});
test('source brief SHA is never silently repaired and unknown fields are rejected',()=>{
 const q=plan();q.originalBriefSha256='a'.repeat(64);assert.throws(()=>run(q),/BRIEF_BINDING/);
 const p=plan();p.stories[0].spaces[0].origin=[1,1,1];assert.throws(()=>run(p),/SPACE/);
});
