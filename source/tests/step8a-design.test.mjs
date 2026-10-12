import test from 'node:test';import assert from 'node:assert/strict';import {buildConcept,parseJapanese,renderSVG} from '../runner/step8a-design.mjs';
const prompt=[
 '幅24×奥行20の6階建てオフィスビル。タワーと低層基壇、全面ガラスの外壁、高級感',
 '横20ブロック 奥行16ブロック、4階建ての中庭型マンション、和モダン',
 '30×25の8階建てホテル、段々状で屋上テラス',
 '15×12の2階建てオフィス、L字形、北向き',
 '40×32の10階建ての集合住宅。ツインの棟にして窓を少なめ',
 '18×15の3階建てホテル。コの字型でアーケード',
 '32×22の7階建てオフィス。非対称デザインで縦格子',
 '48×40の10階建てマンション、シンプルな箱型でミニマル'
];
test('eight distinct prompts produce deterministic complete schemas and safe concept-only',()=>{const signatures=new Set();for(const s of prompt){const p=buildConcept(s);assert.equal(p.designSha256,buildConcept(s).designSha256);assert.equal(p.Massing.areaByFloor.length,p.BuildingComposition.floorCount);assert.ok(p.Massing.totalFloorAreaBlocks>0);assert.equal(p.BuildPlan.operations.length,0);assert.equal(p.safety.executionAllowed,false);assert.equal(p.EngineCompatibility.validatedByInstalledEngine,false);assert.match(renderSVG(p),/<svg/);signatures.add(p.BuildingComposition.massing);}assert.equal(signatures.size,8);});
test('explicit envelope/floor dimensions parsed without silently changing values',()=>{const x=buildConcept('横20×奥行16の5階建てのオフィス、L字');assert.equal(x.BuildingComposition.dimensions.width,20);assert.equal(x.BuildingComposition.dimensions.depth,16);assert.equal(x.BuildingComposition.floorCount,5);});
test('unknown program is BLOCKED, not falsely categorized as office',()=>assert.throws(()=>buildConcept('30×20の4階建て学校'),/サポート対象外/));
test('unsupported underground floor is BLOCKED',()=>assert.throws(()=>buildConcept('地下2階を含むホテル、20×18、6階建て'),/地下階/));
test('ambiguous use cannot be resolved by guessing',()=>assert.throws(()=>buildConcept('ホテルとマンションを作って'),/一意/));
test('out-of-range 10 floors/width validation hard fails',()=>{assert.throws(()=>buildConcept('幅100×奥行18、7階建てのオフィス'),/width/);assert.throws(()=>buildConcept('幅20×奥行18、11階建てホテル'),/floors/);});
test('low-rise podium tower cannot be constructed as if validated',()=>assert.throws(()=>buildConcept('3階建てのタワー型オフィス'),/4階以上/));
test('contradictory orientation hard fails',()=>assert.throws(()=>parseJapanese('5階建てホテル 北向き 南向き'),/矛盾/));
test('unspecified dimensions visible as assumptions, not facts',()=>{const x=buildConcept('近未来のオフィスビルを設計');assert.equal(x.assumptions.length>=3,true);assert.equal(x.safety.notPrepared,true);});
test('all 8 massings stay within envelope across extremes',()=>{const forms=['直方体','L字','コの字','中庭','タワー','段々','ツイン','非対称'];for(const f of forms){for(const [w,d,n] of [[15,12,4],[48,40,10]]){const x=buildConcept(`幅${w} 奥行${d} ${n}階建てのオフィス ${f}`);for(const r of x.Massing.rectangles){assert.ok(r.x>=0&&r.z>=0&&r.width>0&&r.depth>0&&r.x+r.width<=w&&r.z+r.depth<=d);}}}});
