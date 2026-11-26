import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturePlan,SCHEMA,validateArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {auditR125TableGroups,r125TableGroupRelation} from '../source/ai/r125-room-fixtures.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {r125ResponseFormatForEndpoint} from '../source/ai/b198g-local-model-adapter.mjs';
const room={id:'public-room',purpose:'Shared work',access:'public',fixtures:['table','seating'],fixtureArrangement:'table-group'};
const base={schema:SCHEMA,id:'table-group-test',title:'Synthetic grouped furniture',brief:'Synthetic test, not model output',footprint:{width:26,depth:26},levels:[{splitAxis:'z',splitPercent:50,spaces:[room,{id:'other-room',purpose:'Shared room',access:'shared'}]}],materials:{floor:'wood',wall:'stone',roof:'wood'}};
const spatial={...base,id:'table-group-spatial',levels:[{layoutMode:'spatial-tree',spaces:[{...room,volume:{width:12,depth:12,roofY:7}},{id:'other-room',purpose:'Shared room',access:'shared',volume:{width:9,depth:10,roofY:8,attach:{to:'public-room',side:'east',shift:0}}}]}]};
const opts=p=>p.levels[0].layoutMode==='spatial-tree'?{}:{entrancePlacement:'source-accessible'};
for(const p of [base,spatial])test(p.id+' group geometry and source reachability',()=>{
 const b=compileArchitecturePlan(p,opts(p));
 assert.equal(b.tableGroups.status,'SOURCE_TABLE_GROUP_PASS');
 assert.equal(b.tableGroups.groups.length,1);
 assert.equal(b.fixtureTargets.length,2);
 assert.equal(auditR125SourceRoutes(b,{featureTargets:b.fixtureTargets}).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 const rel=b.tableGroups.groups[0];
 assert.ok(rel.gap>=1&&rel.gap<=2);assert.ok(rel.alignedWidth>=2);
 const occupied=new Set(b.compiled.primitives.map(v=>v.slice(0,3).join(',')));
 assert.ok(rel.cells.every(v=>!occupied.has(v.join(','))));
 assert.equal(b.compiled.BuildPlan.operations.length,0);
 const blocked={...b.compiled,primitives:[...b.compiled.primitives,[...rel.cells[0],0]]};
 assert.equal(auditR125TableGroups(blocked,b.fixtureTargets).status,'HOLD_TABLE_GROUP');
});
test('explicit contract, no automatic groups or role substitutions',()=>{
 const p=structuredClone(base);delete p.levels[0].spaces[0].fixtureArrangement;
 assert.equal(compileArchitecturePlan(p,opts(p)).tableGroups,undefined);
 for(const roles of [['seating','table'],['table'],['table','table','seating']]){
  const q=structuredClone(base);q.levels[0].spaces[0].fixtures=roles;
  assert.throws(()=>validateArchitecturePlan(q),/SPACE_FIXTURE_ARRANGEMENT/);
 }
 assert.ok(JSON.stringify(r125ResponseFormatForEndpoint('http://127.0.0.1:11434/v1/chat/completions')).includes('table-group'));
});
test('seat direction and gap are physical constraints',()=>{
 const table={id:'t',zoneId:'room',kind:'table',origin:[2,2,2],size:[3,3,2]};
 const seat={id:'s',zoneId:'room',kind:'seating',origin:[2,2,5],size:[3,3,2]};
 assert.equal(r125TableGroupRelation(table,seat).gap,1);
 assert.equal(r125TableGroupRelation(table,{...seat,origin:[2,2,0]}),null);
 assert.equal(r125TableGroupRelation(table,{...seat,origin:[6,2,2],size:[2,3,3],orientation:'quarter-turn'}).seatFaces,'west');
});
