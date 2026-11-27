import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturePlan,SCHEMA} from '../source/ai/r125-architecture-plan.mjs';
import {fitR125AuthoredCourtEntryX} from '../source/ai/r125-spatial-detail.mjs';
import {auditR125SourceRoutes,auditR125VisitorRoutes} from '../source/ai/r125-source-routes.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const plan={schema:SCHEMA,id:'entry-court-fit',title:'Synthetic entry court',brief:'Synthetic regression, not genuine model output',footprint:{width:24,depth:28},
 levels:[{splitAxis:'x',splitPercent:50,secondarySplitPercent:50,spaces:[
 {id:'public-room',purpose:'Public reception',access:'public'},
 {id:'other-room',purpose:'Shared activity',access:'shared'},
 {id:'third-room',purpose:'Shared storage',access:'shared'}]}],
 materials:{floor:'wood',wall:'stone',roof:'wood'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'},entry:{shelterDepth:3}};
test('mechanical same-room fitting keeps exact court dimensions',()=>{
 const saved=structuredClone(plan),b=compileArchitecturePlan(plan,{entrancePlacement:'source-accessible'});
 assert.deepEqual(plan,saved);
 assert.deepEqual(b.spatialDetail.entryPlacement,{zoneId:'public-room',from:10,to:8,policy:'same-room-full-authored-court',authorPlanEdited:false});
 assert.equal(b.spatialDetail.court.right-b.spatialDetail.court.left+1,6);
 assert.equal(b.spatialDetail.recessedEntry[2]-b.spatialDetail.originalEntry[2],3);
 assert.equal(b.spatialDetail.policy,'model-selected-entry-court');
 assert.ok(verifyCompiled(b.design,b.compiled));
 assert.equal(auditR125SourceRoutes(b).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditR125VisitorRoutes(b,plan).status,'SOURCE_VISITOR_ROUTES_AVOID_STAFF');
 assert.deepEqual(b.compiled.BuildPlan.operations,[]);
 assert.deepEqual(b.gates,Array(9).fill('BLOCKED'));
});
test('same room only, preserve valid coordinates, reject narrow/deep/staff/ambiguous cases',()=>{
 const spaces=[{id:'front-room',access:'public'},{id:'rear-room',access:'shared'}];
 const zones=[{id:'front-room',range:{x:[2,11],z:[2,12]}},{id:'rear-room',range:{x:[2,11],z:[14,24]}}];
 const run=(x,z=zones,s=spaces)=>fitR125AuthoredCourtEntryX(x,1,z,s);
 assert.equal(run(8).to,8);
 assert.equal(run(10).to,8);
 assert.equal(run(11),null);
 assert.equal(run(10,zones,[{id:'front-room',access:'staff'},spaces[1]]),null);
 assert.equal(run(3,[{id:'front-room',range:{x:[2,6],z:[2,12]}},zones[1]]),null);
 assert.equal(run(3,[{id:'front-room',range:{x:[2,11],z:[2,5]}},zones[1]]),null);
});
