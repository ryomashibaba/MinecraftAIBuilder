import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {enumerateV6ExplicitPlacementChoices,
 compileV6ExplicitPlacementResearch,V6_BOUNDED_CHOICES_SCHEMA,
 recognizedV6ResearchSourceReject,
 V6_EXPLICIT_CHOICES_AUTHOR_JSON_SCHEMA,V6_EXPLICIT_CHOICES_AUTHOR_RESPONSE_FORMAT,
 V6_EXPLICIT_CHOICES_AUTHOR_SYSTEM_PROMPT,parseV6ExplicitChoicesOriginalRaw}
 from '../source/ai/r125-v6-explicit-choices-research.mjs';
import {materializeV4JParentIndexAuthor,V4J_PARENT_INDEX_CIVIC_SCHEMA}
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

test('nondefault single original response schema preserves whole frozen V6 schema and option bounds',()=>{
 const s=V6_EXPLICIT_CHOICES_AUTHOR_JSON_SCHEMA;
 assert.deepEqual(s.required,['schema','v6Author','allowedShifts','allowedCorners']);
 assert.equal(s.additionalProperties,false);
 assert.deepEqual(s.properties.v6Author,V4J_PARENT_INDEX_CIVIC_SCHEMA);
 assert.equal(s.properties.allowedShifts.maxItems,4);
 assert.equal(s.properties.allowedShifts.items.maxItems,3);
 assert.equal(s.properties.allowedCorners.maxItems,2);
 assert.equal(V6_EXPLICIT_CHOICES_AUTHOR_RESPONSE_FORMAT.json_schema.strict,true);
 assert.equal(V6_EXPLICIT_CHOICES_AUTHOR_RESPONSE_FORMAT.json_schema.schema,s);
 for(const token of ['SAME ORIGINAL RESPONSE','FIRST shift MUST','FIRST MUST',
  '16 or fewer','non-default research'])assert(
  V6_EXPLICIT_CHOICES_AUTHOR_SYSTEM_PROMPT.includes(token),token);
});

test('single unedited raw model-shaped JSON includes whole V6 and its alternatives without identity claim',()=>{
 const p=validPacket(),original=p.v6Author.otherSpaces[0].attach.shift;
 p.allowedShifts[0].push(original===3?2:original+1);
 p.allowedCorners.push(p.allowedCorners[0]==='NE'?'NW':'NE');
 const raw=JSON.stringify(p),snapshot=JSON.stringify(p);
 const parsed=parseV6ExplicitChoicesOriginalRaw(raw);
 assert.equal(parsed.originalRawSha256,
  createHash('sha256').update(raw).digest('hex'));
 assert.deepEqual(parsed.privatePacket,p);
 assert.equal(parsed.explicitCandidateCount,4);
 assert.equal(parsed.choicesPresentInSameRawJson,true);
 assert.equal(parsed.modelAuthorshipVerified,false);
 assert.equal(parsed.modelHttpIdentityVerified,false);
 assert.equal(parsed.sourceVerified,false);
 assert.equal(parsed.worldWrites,0);
 assert.deepEqual(parsed.gates,Array(9).fill('BLOCKED'));
 assert.equal(JSON.stringify(p),snapshot);
 for(const bad of ['not json',JSON.stringify(p.v6Author),
  JSON.stringify({...p,allowedCorners:['NW','NW']}),
  JSON.stringify({...p,inventedField:true})])
  assert.throws(()=>parseV6ExplicitChoicesOriginalRaw(bad),
   /MAB_V6_BOUNDED_CHOICES_/);
});

test('single raw author envelope reaches second explicitly named candidate via genuine B143',()=>{
 const p=validPacket();assert.equal(p.v6Author.massing.corner,'NE');
 p.v6Author.massing.corner='NW';p.allowedCorners=['NW','NE'];
 const parsed=parseV6ExplicitChoicesOriginalRaw(JSON.stringify(p));
 assert.equal(parsed.explicitCandidateCount,2);
 const r=compileV6ExplicitPlacementResearch(parsed.privatePacket);
 assert.equal(r.status,'RESEARCH_AUTHOR_OPTIONS_SOURCE_PASS_NOT_GATE_CLEARANCE');
 assert.equal(r.checked,2);assert.equal(r.selectedCorner,'NE');
 const original=structuredClone(p.v6Author);original.massing.corner='NE';
 const direct=compileCivicArcadeAuthorIntent(materializeV4JParentIndexAuthor(original));
 assert.equal(r.sourceSha256,direct.b143.sourceSha256);
 assert.equal(r.geometrySha256,direct.b143.geometrySha256);
 assert.equal(r.modelAuthorshipVerified,false);
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});

test('V6 original-response prompt has ONE current root shape without accumulated legacy roots',()=>{
 const p=V6_EXPLICIT_CHOICES_AUTHOR_SYSTEM_PROMPT;
 assert(p.includes('EXACT top-level keys {schema,v6Author,allowedShifts,allowedCorners}'));
 assert(p.includes('CARTESIAN AUTHOR PERMISSION'));
 assert(p.includes('FIRST shift MUST'));
 assert(p.includes('FIRST MUST'));
 assert(p.includes('16 or fewer'));
 assert(p.includes('non-default research'));
 assert(p.includes('root north face is never a window'));
 for(const legacy of [
  'set rootId=spaces[0].id',
  'V5 OUTPUT SHAPE OVERRIDES',
  'V6 REQUIRED OUTPUT CONTRACT overrides earlier',
  'ROOT: EXACTLY {schema,id,title,brief,materials,spaces',
  'output entrySpace and otherSpaces INSTEAD of root spaces'
 ])assert(!p.includes(legacy),legacy);
});
