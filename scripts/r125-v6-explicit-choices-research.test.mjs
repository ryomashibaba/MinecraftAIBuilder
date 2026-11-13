import test from 'node:test';
import assert from 'node:assert/strict';
import {enumerateV6ExplicitPlacementChoices,
 compileV6ExplicitPlacementResearch,V6_BOUNDED_CHOICES_SCHEMA,
 recognizedV6ResearchSourceReject}
 from '../source/ai/r125-v6-explicit-choices-research.mjs';
import {materializeV4JParentIndexAuthor}
 from '../source/ai/r125-v4j-feasible-envelope.mjs';
import {compileCivicArcadeAuthorIntent,CIVIC_ARCADE_SCHEMA}
 from '../source/ai/r125-v4j-civic-author-ir.mjs';
import {syntheticFiveV4JArcadeAuthors}
 from './r125-v4j-civic-facade-study.mjs';

function validPacket(){
 const fixture=syntheticFiveV4JArcadeAuthors().find(x=>x.genre==='housing');
 assert(fixture);
 const authored={...structuredClone(fixture.wholeBuilding),
  schema:CIVIC_ARCADE_SCHEMA,arcade:structuredClone(fixture.arcade)};
 const {spaces,...rest}=authored;
 const base={...rest,entrySpace:structuredClone(spaces[0]),
  otherSpaces:spaces.slice(1).map((s,i)=>{
   const parentIndex=spaces.slice(0,i+1).findIndex(p=>p.id===s.attach.to);
   assert(parentIndex>=0);
   return {...structuredClone(s),attach:{parentIndex,
    side:s.attach.side,shift:s.attach.shift}};
  })};
 return {schema:V6_BOUNDED_CHOICES_SCHEMA,v6Author:base,
  allowedShifts:base.otherSpaces.map(s=>[s.attach.shift]),
  allowedCorners:[base.massing.corner]};
}

test('research envelope with one explicit choice preserves exact author and genuine B143',()=>{
 const packet=validPacket(),snapshot=JSON.stringify(packet);
 const candidates=enumerateV6ExplicitPlacementChoices(packet);
 assert.equal(candidates.length,1);
 assert.deepEqual(candidates[0].author,packet.v6Author);
 const compiled=compileV6ExplicitPlacementResearch(packet);
 const original=compileCivicArcadeAuthorIntent(
  materializeV4JParentIndexAuthor(packet.v6Author));
 assert.equal(compiled.status,'RESEARCH_AUTHOR_OPTIONS_SOURCE_PASS_NOT_GATE_CLEARANCE');
 assert.equal(compiled.checked,1);
 assert.equal(compiled.sourceSha256,original.b143.sourceSha256);
 assert.equal(compiled.geometrySha256,original.b143.geometrySha256);
 assert.deepEqual(compiled.privateSelectedV6,packet.v6Author);
 assert.equal(compiled.modelAuthorshipVerified,false);
 assert.equal(compiled.worldWrites,0);
 assert.deepEqual(compiled.gates,Array(9).fill('BLOCKED'));
 assert.equal(JSON.stringify(packet),snapshot);
});

test('only author-listed alternatives are enumerated, no inferred placement or mutation',()=>{
 const packet=validPacket();
 const shift=packet.allowedShifts[0][0];
 packet.allowedShifts[0].push(shift===3?2:shift+1);
 const original=JSON.stringify(packet.v6Author);
 const options=enumerateV6ExplicitPlacementChoices(packet);
 assert.equal(options.length,2);
 assert.equal(JSON.stringify(options[0].author),original);
 assert.equal(options[1].author.otherSpaces[0].attach.shift,packet.allowedShifts[0][1]);
 assert.equal(JSON.stringify(packet.v6Author),original);
});

test('rejects unlisted, duplicated, out-of-range choices and excessive combinations',()=>{
 for(const update of [
  p=>{p.allowedShifts[0]=[1,1];},
  p=>{p.allowedShifts[0]=[p.allowedShifts[0][0],4];},
  p=>{p.allowedCorners=['XX'];},
  p=>{p.allowedCorners=[p.allowedCorners[0]==='NW'?'NE':'NW',p.allowedCorners[0]];},
  p=>{p.extra=true;},
 ]){
  const packet=validPacket();update(packet);
  assert.throws(()=>enumerateV6ExplicitPlacementChoices(packet),
   /MAB_V6_BOUNDED_CHOICES_/);
 }
 const p=validPacket();
 p.allowedCorners=[p.allowedCorners[0],p.allowedCorners[0]==='NW'?'NE':'NW'];
 for(let i=0;i<p.allowedShifts.length;i++){
  const old=p.allowedShifts[i][0];
  p.allowedShifts[i]=[old,...[-3,-2,-1,0,1,2,3].filter(v=>v!==old).slice(0,2)];
 }
 assert.throws(()=>enumerateV6ExplicitPlacementChoices(p),
  /MAB_V6_BOUNDED_CHOICES_TOO_MANY_EXPLICIT_COMBINATIONS/);
});

test('unexpected R125 internal errors must not be retried as SOURCE geometry',()=>{
 assert.equal(recognizedV6ResearchSourceReject(
  'R125_UNEXPECTED_INTERNAL_RUNTIME_FAILURE'),false);
 assert.equal(recognizedV6ResearchSourceReject(
  'B143_UNCLASSIFIED_INTERNAL_FAILURE'),false);
 assert.equal(recognizedV6ResearchSourceReject(
  'R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_1'),true);
 assert.equal(recognizedV6ResearchSourceReject(
  'R125_V4E_MASSING_MASSING_VOID_INTERSECTS_SHARED_WALL'),true);
});

test('recognized frozen SOURCE rejection advances ONLY to author-permitted next corner and true B143 passes',()=>{
 const packet=validPacket();
 // Synthetic housing author: first room has WEST and SOUTH child attachments.
 // Its original NE massing corner compiles, but NW intersects the WEST wall.
 assert.equal(packet.v6Author.otherSpaces[0].attach.side,'west');
 assert.equal(packet.v6Author.otherSpaces[1].attach.side,'south');
 assert.equal(packet.v6Author.massing.spaceId,packet.v6Author.entrySpace.id);
 assert.equal(packet.v6Author.massing.corner,'NE');
 packet.v6Author.massing.corner='NW';
 packet.allowedCorners=['NW','NE'];
 const immutablePacket=JSON.stringify(packet);
 const rejected=materializeV4JParentIndexAuthor(packet.v6Author);
 assert.throws(()=>compileCivicArcadeAuthorIntent(rejected),
  /R125_V4E_MASSING_MASSING_VOID_INTERSECTS_SHARED_WALL/);
 const result=compileV6ExplicitPlacementResearch(packet);
 assert.equal(result.status,'RESEARCH_AUTHOR_OPTIONS_SOURCE_PASS_NOT_GATE_CLEARANCE');
 assert.equal(result.checked,2);
 assert.equal(result.selectedCorner,'NE');
 assert.deepEqual(result.selectedShifts,packet.allowedShifts.map(v=>v[0]));
 const permitted=structuredClone(packet.v6Author);
 permitted.massing.corner='NE';
 assert.deepEqual(result.privateSelectedV6,permitted);
 const direct=compileCivicArcadeAuthorIntent(materializeV4JParentIndexAuthor(permitted));
 assert.equal(result.sourceSha256,direct.b143.sourceSha256);
 assert.equal(result.geometrySha256,direct.b143.geometrySha256);
 assert.equal(result.privateCompiledResult.b143.sourceRoutes.status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.modelAuthorshipVerified,false);
 assert.equal(result.worldWrites,0);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(result.BuildPlan.operations,[]);
 assert.equal(JSON.stringify(packet),immutablePacket);
});

test('all explicitly permitted but conflicting corners HOLD without HOST repair',()=>{
 const packet=validPacket();
 assert.equal(packet.v6Author.massing.corner,'NE');
 // WEST wall is used by first child; both these corners intersect it.
 packet.v6Author.massing.corner='NW';
 packet.allowedCorners=['NW','SW'];
 const original=JSON.stringify(packet);
 for(const corner of packet.allowedCorners){
  const attempt=structuredClone(packet.v6Author);
  attempt.massing.corner=corner;
  assert.throws(()=>compileCivicArcadeAuthorIntent(
   materializeV4JParentIndexAuthor(attempt)),
   /R125_V4E_MASSING_MASSING_VOID_INTERSECTS_SHARED_WALL/);
 }
 const report=compileV6ExplicitPlacementResearch(packet);
 assert.equal(report.status,'HOLD_ALL_EXPLICIT_CHOICES_SOURCE_REJECTED');
 assert.equal(report.checked,2);
 assert.equal(report.sourceVerified,false);
 assert.equal(report.modelAuthorshipVerified,false);
 assert.equal(report.worldWrites,0);
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);
 assert.equal(JSON.stringify(packet),original);
});
