import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {inspectBlockCandidate,B110_BLOCK_CANDIDATES,deriveB110Interfaces,auditB110Model} from './b110-functional-interfaces.mjs';
import {assembleB110,validateB110Report,writeB110} from './compile-b110.mjs';
import {coDesignB104} from '../../b104/main/b104-joint-layout.mjs';
import {generateB105} from '../../b105/main/b105-building-volume.mjs';
import {B101_SCENARIOS} from '../../b101/main/compile-b101.mjs';
let bundle,unit;
const full=()=>bundle??(bundle=assembleB110());
const single=()=>{
 if(unit)return unit;
 const source=JSON.parse(fs.readFileSync(new URL('../../b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 const group=source.architectureCases[0],d=coDesignB104(group.options[0],B101_SCENARIOS[group.caseId]),v=generateB105(d);
 return unit={d,v,m:deriveB110Interfaces(d,v)};
};
const c=x=>structuredClone(x);
test('01 B110 report conforms to fail-closed schema',()=>assert(validateB110Report(full().report)));
test('02 5 use cases and 15 variants',()=>assert.equal(full().report.totals.variants,15));
test('03 66 floor levels preserved',()=>assert.equal(full().report.totals.floors,66));
test('04 279 conceptual rooms remain',()=>assert.equal(full().report.totals.conceptRooms,279));
test('05 279 room door candidate sets tracked',()=>assert.equal(full().report.totals.nominalDoors,279));
test('06 all 102 existing B105 core links preserved',()=>assert.equal(full().report.totals.verticalCoreLinks,102));
test('07 6 conceptual steps per floor link',()=>assert.equal(full().report.totals.sixTreadDiagrams,612));
test('08 558 B105 fixture anchors tracked',()=>assert.equal(full().report.totals.furnitureAnchors,558));
test('09 all B110 models digest verified',()=>{for(const m of full().models)assert(auditB110Model(m));});
test('10 intact B104 and B105 parents on repeated generation',()=>{
 const {d,v}=single(),s=JSON.stringify([d,v]);deriveB110Interfaces(d,v);assert.equal(JSON.stringify([d,v]),s);
});
test('11 each door lower and upper state is exactly two high in local space',()=>{
 for(const r of single().m.doors)assert.equal(r.localUpper.y-r.localLower.y,1);
});
test('12 each room doorway links the parent B103 corridor candidate',()=>{
 const {d,m}=single();for(const r of m.doors){
  const f=d.plan.floors[r.level],source=f.rooms.find(x=>x.id===r.roomId);
  assert.equal(r.localLower.x,source.conceptualDoorOpening.x);
  assert.equal(r.localLower.z,source.conceptualDoorOpening.z);
  assert.deepEqual(r.externalGalleryCell,source.conceptualDoorOpening.outside);
 }
});
test('13 all six stair steps stay within parent B103 3x3 core',()=>{
 const {m}=single();for(const s of m.stairs)for(const p of s.steps){
  assert(p.x>=s.stairCoreFootprint.x&&p.x<s.stairCoreFootprint.x+3);
  assert(p.z>=s.stairCoreFootprint.z&&p.z<s.stairCoreFootprint.z+3);
 }
});
test('14 all stair headroom diagrams are anchored to B105 volume not actual stair blocks',()=>{
 for(const s of single().m.stairs)assert(s.steps.every(p=>p.headroomAirSample.length===2));
});
test('15 zero actual Minecraft operable doors certified',()=>assert.equal(full().report.totals.actualUsableDoors,0));
test('16 zero physically traversable staircases certified',()=>assert.equal(full().report.totals.actualTraversableStairs,0));
test('17 zero physical rooms marked completed',()=>assert.equal(full().report.totals.physicallyCompletedRooms,0));
test('18 block reference explicitly not version verified in Minecraft Education',()=>{
 for(const role of Object.keys(B110_BLOCK_CANDIDATES)){
 const result=inspectBlockCandidate(role);
 assert.equal(result.education26_3Status,'UNVERIFIED_LOCAL_BUILD');
 assert.equal(result.executable,false);
 }
});
test('19 invented unknown block role is fail closed',()=>{
 const x=inspectBlockCandidate('minecraft:unknown_fake_door');
 assert.equal(x.failClosed,true);assert.equal(x.executable,false);
});
test('20 door block states include lower upper and orientation flags',()=>{
 const keys=inspectBlockCandidate('door').referenceStateNames;
 assert(keys.includes('upper_block_bit'));assert(keys.includes('minecraft:cardinal_direction'));
});
test('21 stairs retain direction/upside-down candidate states',()=>{
 const keys=inspectBlockCandidate('stairs').referenceStateNames;
 assert(keys.includes('upside_down_bit'));assert(keys.includes('weirdo_direction'));
});
test('22 user-version unknown persists despite official Bedrock list',()=>{
 assert.equal(full().report.reference.latestSpecificVersionConfirmedInLocalGame,false);
 assert.equal(full().report.totals.versionPinnedEducationVerifiedBlocks,0);
});
test('23 9 construction gates always blocked',()=>{
 const r=full().report;assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
});
test('24 all world and construction operations prohibited',()=>{
 const r=full().report;assert.equal(r.worldCoordinates,null);assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.actualWorldContacts,0);assert.equal(r.constructionApproved,false);
});
test('25 296 legacy unapproved, 18 held protected',()=>{
 const t=full().report.totals;assert.equal(t.legacyUnapproved,296);assert.equal(t.legacyHeld,18);
});
test('26 synthetic digest tampering detected',()=>{
 const m=c(single().m);m.doors[0].realBlockPlacementValidated=true;
 assert.equal(auditB110Model(m),false);
});
test('27 bogus actual compatible certification rejected in report',()=>{
 const x=c(full().report);x.totals.actualUsableDoors=1;assert.equal(validateB110Report(x),false);
});
test('28 official block list candidate cannot emit placement command',()=>{
 const x=inspectBlockCandidate('door');
 assert.equal(x.executable,false);assert(!Object.hasOwn(x,'worldCoordinates'));
});
test('29 build output contains human review doc and 15 functional model JSON objects',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'b110-'));
 try{const files=writeB110(full(),out);
 const data=JSON.parse(fs.readFileSync(files.modelFile,'utf8'));
 assert.equal(data.length,15);assert(fs.readFileSync(files.reviewFile,'utf8').includes('NOT_PREPARED'));
 assert.equal(files.buildings,15);}
 finally{fs.rmSync(out,{recursive:true,force:true});}
});
test('30 tampered report must never export a package',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'b110-reject-'));
 try{const x=c(full());x.report.constructionApproved=true;
 assert.throws(()=>writeB110(x,out),/UNSAFE/);}
 finally{fs.rmSync(out,{recursive:true,force:true});}
});
