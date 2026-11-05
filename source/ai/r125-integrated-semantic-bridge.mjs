/**
 * Optional V7 author-semantic boundary for the existing PRIVATE integrated-shell.
 * This does NOT contain a substitute building engine, a geometry solver or a
 * model runner. It preserves the author's decisions until the existing host
 * can resolve actual source anchors and compile with the frozen real B143.
 *
 * PRIVATE originals, true host intents, images and B143 results never enter
 * this public module. A valid contract is not a SOURCE/ART/Minecraft pass.
 */
import {createHash} from 'node:crypto';

export const INTEGRATED_SEMANTIC_SCHEMA =
 'minecraftaibuilder-r125-integrated-semantic-intent-v1';
const fail = code => {throw Error('R125_INTEGRATED_SEMANTIC_'+code);};
const fields = (x, names) => x !== null && typeof x === 'object' &&
 !Array.isArray(x) && Object.keys(x).length === names.length &&
 names.every(k => Object.hasOwn(x,k));
const slug = x => typeof x === 'string' && /^[a-z][a-z0-9-]{2,24}$/.test(x);
const words = x => typeof x === 'string' && x.length >= 3 &&
 x.length <= 160 && !/[\u0000-\u001f<>]/.test(x);
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sides = ['north','south','east','west'];
const profiles = ['gable','shed','flat','segmented'];
const scales = ['small','medium','large'];
const fixtures = ['seat','worktop','storage','display','service','equipment'];
const hold = reason => ({
 schema:'minecraftaibuilder-r125-integrated-semantic-bridge-result-v1',
 status:'HOLD',reason,modelCalls:0,worldContacts:0,worldWrites:0,
 readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,BuildPlan:{operations:[]},
 gates:Array(9).fill('BLOCKED'),art:'ART_HOLD',
 realB143:'NOT_TESTED',minecraftWalking:'NOT_TESTED'
});

/** Strict validation: no mechanical IDs, coordinates, SHA fields or repairs. */
export function validateIntegratedSemanticIntent(untrusted){
 let value;
 try {value=structuredClone(untrusted);} catch {fail('NOT_CLONEABLE');}
 if(!fields(value,['schema','id','concept','spaces','roofs','entry','shelters','features']) ||
  value.schema!==INTEGRATED_SEMANTIC_SCHEMA || !slug(value.id) ||
  !words(value.concept))fail('ROOT');
 if(!Array.isArray(value.spaces) || value.spaces.length<2 ||
  value.spaces.length>8)fail('SPACE_COUNT');
 const known=new Set();
 for(const [i,s] of value.spaces.entries()){
  if(!fields(s,['key','purpose','link']) || !slug(s.key) ||
   known.has(s.key) || !words(s.purpose))fail('SPACE_'+i);
  if(i===0){if(s.link!==null)fail('ROOT_LINK');}
  else if(!fields(s.link,['to','kind']) || !known.has(s.link.to) ||
   !['door','open'].includes(s.link.kind))fail('LINK_'+i);
  known.add(s.key);
 }
 if(!Array.isArray(value.roofs) || value.roofs.length!==value.spaces.length)
  fail('ROOF_COVERAGE');
 const roofed=new Set();let primary=0;
 for(const [i,r] of value.roofs.entries()){
  if(!fields(r,['space','profile','axis','rank']) ||
   !known.has(r.space) || roofed.has(r.space) ||
   !profiles.includes(r.profile) || !['x','z'].includes(r.axis) ||
   !['primary','secondary','subordinate'].includes(r.rank))fail('ROOF_'+i);
  if(r.rank==='primary')primary++;
  roofed.add(r.space);
 }
 if(primary!==1)fail('PRIMARY_ROOF_UNIQUE');
 if(!fields(value.entry,['face','space','intent']) ||
  !sides.includes(value.entry.face) || !known.has(value.entry.space) ||
  !words(value.entry.intent))fail('ENTRY');
 if(!Array.isArray(value.shelters) || value.shelters.length>3)
  fail('SHELTER_COUNT');
 for(const [i,s] of value.shelters.entries())
  if(!fields(s,['purpose','connectTo','edge','scale','roof']) ||
   !words(s.purpose) || !known.has(s.connectTo) ||
   !sides.includes(s.edge) || !scales.includes(s.scale) ||
   !profiles.includes(s.roof))fail('SHELTER_'+i);
 if(!Array.isArray(value.features) || value.features.length<1 ||
  value.features.length>16)fail('FEATURE_COUNT');
 for(const [i,f] of value.features.entries())
  if(!fields(f,['space','kind','purpose']) || !known.has(f.space) ||
   !fixtures.includes(f.kind) || !words(f.purpose))fail('FEATURE_'+i);
 const serialized=JSON.stringify(value);
 if(Buffer.byteLength(serialized,'utf8')>4096)fail('INPUT_BUDGET');
 return value;
}

/**
 * Lossless executable handoff declarations for the PRIVATE integrated host.
 * This is NOT a geometry generator: every datum comes from the original author.
 * The host must bind these symbolic space keys to real geometry or fail closed.
 */
export function projectIntegratedSemanticOperations(untrusted){
 const author=validateIntegratedSemanticIntent(untrusted);
 const operations=[
  ...author.spaces.map(s=>({type:'SPACE',key:s.key,
   purpose:s.purpose,link:s.link})),
  ...author.roofs.map(r=>({type:'ROOF',space:r.space,
   profile:r.profile,axis:r.axis,rank:r.rank})),
  {type:'ENTRY',face:author.entry.face,space:author.entry.space,
   intent:author.entry.intent},
  ...author.shelters.map(s=>({type:'SHELTER',purpose:s.purpose,
   connectTo:s.connectTo,edge:s.edge,scale:s.scale,roof:s.roof})),
  ...author.features.map(f=>({type:'FEATURE',space:f.space,
   kind:f.kind,purpose:f.purpose}))
 ];
 return {operations,operationSha256:sha(operations)};
}

/**
 * A precise symbolic handoff, NOT a secretly auto-filled roof/voxel design.
 * PRIVATE host must map these symbols to its old intent.json + original B143
 * source. If it cannot preserve author choices, it MUST HOLD (no fallback).
 */
export function prepareIntegratedSemanticBridge(untrusted){
 const author=validateIntegratedSemanticIntent(untrusted);
 const authorSha256=sha(author);
 const {operations,operationSha256}=projectIntegratedSemanticOperations(author);
 const payload={
  schema:'minecraftaibuilder-r125-integrated-host-handoff-v1',
  authorSource:'CALLER_SUPPLIED_UNATTESTED',authorSha256,
  authoredChoices:author,operations,operationSha256,
  hostResponsibilities:[
   'BIND_EXISTING_SOURCE_AND_GEOMETRY_SHA_PRIVATE',
   'MAP_SPACE_KEYS_TO_ORIGINAL_AND_NEW_SPACE_ANCHORS',
   'EXPAND_ROOF_SECTIONS_AND_SHELTERS_WITHOUT_REPLACING_AUTHOR_CHOICES',
   'EXPAND_ENTRANCE_AND_FEATURES_WITHOUT_SILENT_REPAIR',
   'COMPILE_USING_EXISTING_INTEGRATED_SHELL_AND_GENUINE_B143',
   'INDEPENDENT_TWO_WIDE_AUDIT_AND_IMAGE_REVIEW'
  ]
 };
 return {...hold('PRIVATE_HOST_EXPANSION_REQUIRED'),
  status:'PREPARED_SEMANTIC_HANDOFF_NOT_B143',authorSha256,
  authorChoicesPreserved:true,payload};
}

/** Verify an echo of the authored choices before accepting host handoff. */
export function assertAuthoredSemanticsUnchanged(prepared,hostEcho){
 if(prepared?.status!=='PREPARED_SEMANTIC_HANDOFF_NOT_B143' ||
  prepared.payload?.authorSha256!==sha(prepared.payload?.authoredChoices))
  fail('PREPARED_TAMPERED');
 const expected=projectIntegratedSemanticOperations(prepared.payload.authoredChoices);
 if(prepared.payload.operationSha256!==expected.operationSha256 ||
  sha(prepared.payload.operations)!==expected.operationSha256)
  fail('OPERATION_PLAN_TAMPERED');
 if(sha(hostEcho)!==prepared.authorSha256)fail('HOST_CHANGED_AUTHOR_CHOICES');
 return true;
}

export const INTEGRATED_SEMANTIC_AUTHOR_PROMPT=[
 'Design the building yourself, not a style label for a fixed template.',
 'Return only one JSON object with schema,id,concept,spaces,roofs,entry,shelters,features.',
 'schema='+INTEGRATED_SEMANTIC_SCHEMA,
 'Use 2..8 spaces in parent-before-child order. Each has key,purpose,link; first link=null; others link={to:earlierKey,kind:door|open}.',
 'Each space has one roof entry {space,profile:gable|shed|flat|segmented,axis:x|z,rank:primary|secondary|subordinate}; exactly one primary.',
 'Entry {face:north|south|east|west,space:key,intent:meaningfulText}.',
 'Shelters 0..3: {purpose,connectTo:key,edge:north|south|east|west,scale:small|medium|large,roof:gable|shed|flat|segmented}.',
 'Features 1..16: {space:key,kind:seat|worktop|storage|display|service|equipment,purpose:meaningfulText}.',
 'Do not output world coordinates, element IDs, source hashes, B143, Minecraft commands, code, repair instructions, or an art approval.'
].join('\n');
