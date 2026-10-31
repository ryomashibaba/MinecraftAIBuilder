import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ARCHITECTURE_PLAN_SCHEMA} from '../source/ai/r190bn-compact-architecture-plan.mjs';
import {compileCompactArchitecturePlan} from '../source/ai/r190bn-compact-to-bn.mjs';
const brief=Buffer.from('Create a community atelier with public exhibition below and a studio above, real outside entry and a usable staircase.');
const H=x=>createHash('sha256').update(x).digest('hex');
const plan=()=>({
 schema:ARCHITECTURE_PLAN_SCHEMA,id:'first-atelier',title:'Original atelier',originalBriefSha256:H(brief),
 site:{width:38,depth:34,height:20},
 stories:[
  {id:'public-floor',clearHeight:6,spaces:[{id:'public-hall',purpose:'Public exhibition and gathering',width:14,depth:18,privacy:'public'}]},
  {id:'quiet-floor',clearHeight:6,spaces:[{id:'quiet-studio',purpose:'Quiet upper workshop and design',width:12,depth:16,privacy:'private'}]}
 ],adjacency:[{a:'public-hall',b:'quiet-studio',relation:'visual'}],
 entry:{spaceId:'public-hall',face:'south'},
 verticalLinks:[{fromStory:'public-floor',toStory:'quiet-floor',
  fromSpace:'public-hall',toSpace:'quiet-studio',kind:'straight',side:'east',width:3}],
 massing:{intent:'Spatially offset public base and quieter upper level',forms:[
  {spaceId:'public-hall',kind:'rectilinear',intent:'Robust lower hall with public entrance'},
  {spaceId:'quiet-studio',kind:'rectilinear',intent:'Stepped back upper workshop'}]},
 roof:{kind:'flat',intent:'Clear single-plane roof over private work area'},
 openings:[{spaceId:'public-hall',face:'north',role:'daylight',pattern:'punched'},
  {spaceId:'quiet-studio',face:'west',role:'view',pattern:'tall'}],
 materials:{floor:'wood',wall:'concrete',roof:'metal'},
 assumptions:[],unmetRequirements:[]
});
test('author-derived two-level BN produces real voxels with usable stair and exterior route proxies',()=>{
 const p=plan(),raw=JSON.stringify(p),r=compileCompactArchitecturePlan(p,{originalBrief:brief,authorship:'SYNTHETIC_TEST_FIXTURE'});
 assert.equal(JSON.stringify(p),raw);
 assert.equal(r.status,'SOURCE_TWO_LEVEL_VOXEL_ROUTE_PROXIES_ART_HOLD',JSON.stringify({
  reason:r.reason,evidence:r.evidence,
  derivedStatus:r.derived?.status,compileFailure:r.failure
 },null,2).slice(0,2000));
 assert.equal(r.geometryCompiled,true);
 assert(r.derived.compiled.primitives.length>1000);
 assert.equal(r.derived.proposal.design.elements.some(x=>x.shape==='staircase'),true);
 assert.deepEqual(r.BNSource.levels.map(x=>x.standingY),[1,8]);
 assert(r.BNSource.spaces.some(s=>s.origin[0]===5&&s.size[0]===12));
 assert(r.evidence.supported);assert(r.evidence.entranceFloor);assert(r.evidence.route);
 assert.equal(r.evidence.verifiedWindowPairs,2);
 assert.equal(r.modelCalls,0);assert.equal(r.art,'ART_HOLD');
 assert.equal(r.worldWrites,0);assert.deepEqual(r.BuildPlan.operations,[]);
});
test('research institute uses identical geometry algorithm, not atelier typography',()=>{
 const p=plan();p.id='labs-research';p.title='Research lab';
 p.stories[0].spaces[0].purpose='Shared prototype display and reception';
 p.stories[1].spaces[0].purpose='Quiet research working rooms';
 p.materials={floor:'stone',wall:'metal',roof:'concrete'};
 const r=compileCompactArchitecturePlan(p,{originalBrief:brief,authorship:'SYNTHETIC_TEST_FIXTURE'});
 assert.equal(r.status,'SOURCE_TWO_LEVEL_VOXEL_ROUTE_PROXIES_ART_HOLD',JSON.stringify(r.evidence??r.reason));
 assert.notEqual(r.geometrySha256,compileCompactArchitecturePlan(plan(),{originalBrief:brief,authorship:'SYNTHETIC_TEST_FIXTURE'}).geometrySha256);
});
test('spiral stairs and curved mass never become silent rectangular/straight replacements',()=>{
 for(const [mutate,reason] of [
  [p=>p.verticalLinks[0].kind='spiral','UNSUPPORTED_AUTHORED_STAIR_KIND_OR_SIDE'],
  [p=>p.massing.forms[0].kind='curved','UNSUPPORTED_AUTHORED_MASSING'],
  [p=>p.roof.kind='shed','UNSUPPORTED_AUTHORED_ROOF'],
  [p=>p.stories[1].spaces[0].width=25,'UNSUPPORTED_UPPER_OVERHANG'],
  [p=>p.unmetRequirements=['spiral-stairs'],'AUTHOR_DECLARED_UNMET_REQUIREMENTS']
 ]){
  const p=plan();mutate(p);
  const r=compileCompactArchitecturePlan(p,{originalBrief:brief});
  assert.equal(r.reason,reason,JSON.stringify(r));
  assert.equal(r.geometryCompiled,false);assert.equal(r.authorDesignRepaired,false);
  assert.equal(r.worldWrites,0);
 }
});
test('invalid plan is HOLD without fabricated source or author-labelled reconstruction',()=>{
 const p=plan();p.originalBriefSha256='a'.repeat(64);
 const r=compileCompactArchitecturePlan(p,{originalBrief:brief});
 assert.equal(r.reason,'INVALID_AUTHOR_CONTRACT');
 assert.equal(r.geometryCompiled,false);
 assert.equal(r.BNSource,undefined);
});
