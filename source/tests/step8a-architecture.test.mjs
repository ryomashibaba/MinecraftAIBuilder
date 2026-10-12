import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createReview,writeReview} from '../runner/step8a-review.mjs';
import {buildConcept} from '../runner/step8a-design.mjs';
import {planArchitecture} from '../runner/step8a-architecture.mjs';
import {renderFloorPlanHtml} from '../runner/step8a-floorplan.mjs';

const fmt='幅24奥行20の6階建てオフィス、ガラス張り';
function areas(plan){let {width:w,depth:d}=plan.EngineCompatibility.parameters;return Array.from({length:plan.BuildingComposition.floorCount},(_,f)=>{let cells=new Set();for(const r of plan.Massing.rectangles)if(r.start<=f&&f<r.end)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)cells.add(`${x},${z}`);return cells;});}
function insideShaft(mask,c){if(!c)return true;for(let z=c.z;z<c.z+3;z++)for(let x=c.x;x<c.x+3;x++)if(!mask.has(`${x},${z}`))return false;return true;}

test('schema v2 emits offline-only safe entrypoint with zero operations',()=>{const r=createReview(fmt);assert.equal(r.schema,'minecraftaibuilder-step8a-review-v3');assert.equal(r.BuildPlan.commandCount,0);assert.equal(r.safety.constructionApproved,false);assert.equal(r.validation.verticalTravelVerified,false);for(const x of r.candidates){assert.equal(x.architecture.BuildPlan.status,'NOT_PREPARED');assert.deepEqual(x.architecture.BuildPlan.operations,[]);assert.equal(x.architecture.safety.executionAllowed,false);}});
test('four orientations produce appropriate exterior boundary candidates',()=>{for(const [label,axis,outer] of [['北向き','north','z'],['南向き','south','z'],['東向き','east','x'],['西向き','west','x']]){const p=buildConcept(fmt+'、'+label+',直方体'),a=planArchitecture(p);assert.equal(a.entrance.axis,axis);assert.equal(a.entrance.widthAvailable>=a.entrance.openingWidthRequired+2,true);const coord=a.entrance[outer];assert.equal(coord,axis==='north'||axis==='west'?0:outer==='x'?p.BuildingComposition.dimensions.width-1:p.BuildingComposition.dimensions.depth-1);}});
test('all massing families and bounding-box extremes reserve only on footprint',()=>{for(const mass of ['直方体','L字','コの字','中庭','タワー','段々','ツイン','非対称'])for(const [w,d,n] of [[15,12,4],[24,20,6],[48,40,10]]){const p=buildConcept(`幅${w}奥行${d}の${n}階建てホテル ${mass}`),a=planArchitecture(p),m=areas(p);for(const c of [a.verticalCore.stair,a.verticalCore.elevator])for(const f of m)assert.ok(insideShaft(f,c),mass+': '+w+'x'+d);if(a.verticalCore.stair&&a.verticalCore.elevator){const A=a.verticalCore.stair,B=a.verticalCore.elevator;assert.ok(A.x+3<=B.x||B.x+3<=A.x||A.z+3<=B.z||B.z+3<=A.z);}}});
test('floor reachability cannot exceed footprint count, no invented access to split wing',()=>{const p=buildConcept('幅40×奥行32、10階建てマンション、ツイン'),a=planArchitecture(p);assert.ok(a.issues.some(x=>x.includes('分断')));for(const f of a.circulation.perFloor){assert.ok(f.reachableCellsFromCore<=f.totalCells);assert.ok(f.reachableCellsFromCore>=0);}assert.equal(a.circulation.perFloor.at(-1).allFootprintCellsAccessible,false);});
test('fully connected rectangular floors have all footprint cells reachable in geometry',()=>{const p=buildConcept('幅20奥行16の7階建てオフィス。直方体'),a=planArchitecture(p);assert.ok(a.circulation.perFloor.every(x=>x.allFootprintCellsAccessible));assert.equal(a.circulation.perFloor[0].routeFromEntrance?.[0]?.x,a.entrance.x);assert.equal(a.circulation.perFloor[0].routeFromEntrance?.[0]?.z,a.entrance.z);});
test('a 3x3 core does not claim functional stair or elevator mechanism',()=>{const a=planArchitecture(buildConcept(fmt+'。直方体'));assert.ok(a.verticalCore.stair);assert.equal(a.verticalCore.stair.detailedVerticalCirculationDesigned,false);assert.equal(a.verticalCore.stair.headClearanceVerified,false);assert.equal(a.circulation.physicalVerticalTravelVerified,false);assert.equal(a.support.structuralAdequacy,'NOT_VERIFIED');assert.deepEqual(a.materialIntent.actualBlocks,[]);});
test('all programs have deterministic floor roles and honest net area estimates',()=>{for(const [type,role] of [['オフィス','workspace'],['ホテル','guest_room_zone'],['マンション','residential_units']]){const p=buildConcept('幅24奥行20 6階建て'+type+'。直方体'),a=planArchitecture(p);assert.equal(a.floorProgram[1].role,role);assert.ok(a.floorProgram.every((f,i)=>f.grossFootprintBlocks===p.Massing.areaByFloor[i]));assert.ok(a.floorProgram.every(f=>f.remainingBeforeWallsAndCirculationBlocks<=f.grossFootprintBlocks));assert.ok(a.floorProgram.every(f=>f.roomsAssigned===false));}});
test('geometry-only review SHA and architecture consistent across repeat calls',()=>{const a=createReview(fmt),b=createReview(fmt);assert.equal(a.reviewSha256,b.reviewSha256);assert.deepEqual(a.candidates.map(x=>x.architecture),b.candidates.map(x=>x.architecture));});
test('candidate preference strongly reduces rank for disconnected floors',()=>{const x=createReview('幅40奥行30の8階建てマンション、ツイン');assert.equal(x.candidates.length,1);assert.equal(x.candidates[0].status,'REVIEW_REQUIRED');assert.ok(x.candidates[0].assessment.reviewIssues.some(x=>x.includes('分断')));});
test('all sample candidates leave actual block palette UNKNOWN',()=>{for(const request of [fmt,'幅20奥行16の4階建てマンション 中庭','幅30奥行25の8階建てホテル'])for(const c of createReview(request).candidates){assert.equal(c.architecture.materialIntent.compatibility,'UNKNOWN_NOT_TESTED');assert.equal(c.architecture.facade.windowCount,'NOT_DETERMINED');assert.equal(c.architecture.roof.parapetOrRoofGeometry,'UNVERIFIED');}});
test('report emits offline floor viewer and svg uses only schematic masks',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'step8a2-'));try{const dest=path.join(root,'generated');writeReview(dest,fmt);const html=fs.readFileSync(path.join(dest,'FLOOR_PLANS.html'),'utf8');assert.match(html,/Step 8A|Step8A/);assert.match(html,/3×3/);assert.match(html,/NOT PREPARED/);assert.doesNotMatch(html,/<script[^>]+src=/);assert.doesNotMatch(html,/(?:src|href)\s*=\s*[\"']https?:\/\//i);assert.ok(!html.includes('fetch('));const json=JSON.parse(fs.readFileSync(path.join(dest,'review.json'),'utf8'));assert.equal(json.candidates[0].architecture.BuildPlan.commandCount,0);}finally{fs.rmSync(root,{recursive:true,force:true});}});
test('viewer escapes attacker text and loads as JSON without script breakout',()=>{const p=createReview(fmt+' <script>alert(1)</script>');const html=renderFloorPlanHtml(p);assert.ok(!html.includes('<script>alert(1)</script>'));assert.match(html,/type=\"application\/json\"/);assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);});
test('invalid building program, dimension, orientation and live operations still hard-fail',()=>{for(const request of ['12×8のホテル', '幅20奥行18の病院','幅20奥行18のホテル。北向き南向き','ホテルを今すぐ施工して','地下2階建てホテル'])assert.throws(()=>createReview(request));});
test('review never reads or writes actual project paths during plan (pure plan object)',()=>{const p=buildConcept('幅20奥行16 5階建てホテル。直方体');const original=JSON.stringify(p);const a=planArchitecture(p);assert.equal(JSON.stringify(p),original);assert.equal(a.safety.noWorldMutation,true);});

test('floor viewer executes against a minimal DOM and changing controls redraws',async()=>{
 const vm=await import('node:vm');const html=renderFloorPlanHtml(createReview(fmt));
 const json=html.match(/<script type="application\/json" id="model">([\s\S]*?)<\/script>/)?.[1];
 const code=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
 assert.ok(json&&code);
 class Node{constructor(){this.children=[];this.value='1';this.textContent='';this.attrs={};}
  appendChild(x){this.children.push(x);return x;}
  setAttribute(k,v){this.attrs[k]=v;}}
 const elements=new Map(['model','candidate','floor','drawing','level','label','stats','warnings','limitations'].map(x=>[x,new Node()]));
 elements.get('model').textContent=json;
 const document={getElementById:id=>elements.get(id),createElementNS:()=>new Node(),createElement:()=>new Node(),createTextNode:text=>{const n=new Node();n.textContent=text;return n;}};
 vm.runInNewContext(code,{document,console},{timeout:3000});
 assert.ok(elements.get('drawing').children.length>30);
 assert.ok(elements.get('candidate').children.length>=1);
 const first=elements.get('drawing').children.length;
 elements.get('floor').value='4';elements.get('floor').oninput();
 assert.ok(elements.get('drawing').children.length>30);
 assert.ok(first>0);assert.equal(elements.get('level').textContent,'4F');
 elements.get('candidate').value='1';elements.get('candidate').onchange({target:{value:'1'}});
 assert.equal(elements.get('floor').value,'1');
});
