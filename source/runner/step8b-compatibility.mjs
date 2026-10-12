// Step 8B/B0: NON-EXECUTABLE compatibility envelope.
// This module does not import, initialize, or call any Minecraft engine, Bridge, or planner.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const sha=v=>createHash('sha256').update(v).digest('hex');
const fail=(code,message)=>{const e=new Error(message); e.code=code;throw e;};
const onlyObject=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const requiredSafe={constructionApproved:false,executionAllowed:false,notPrepared:true,worldIdentityProven:false,bridgeSessionVerified:false,siteSafetyProven:false,scanAndBridgeSameSessionProven:false};
const reHex=/^[a-f\d]{64}$/;
function checkPlan(o,label,full=false){
 if(!onlyObject(o)||!onlyObject(o.BuildPlan)||o.BuildPlan.status!=='NOT_PREPARED'||
    !Array.isArray(o.BuildPlan.operations)||o.BuildPlan.operations.length!==0||o.BuildPlan.commandCount!==0)
  fail('UNSAFE_BUILD_PLAN',`${label}: strict zero-operation NOT_PREPARED plan required`);
 if(!onlyObject(o.safety))fail('UNSAFE_SAFETY_STATE',`${label}: safety missing`);
 for(const [k,v] of Object.entries(requiredSafe))if((full||Object.hasOwn(o.safety,k))&&o.safety[k]!==v)fail('UNSAFE_SAFETY_STATE',`${label}: ${k} must be ${v}`);
 for(const k of ['constructionApproved','executionAllowed'])if(o.safety[k]!==false)fail('UNSAFE_SAFETY_STATE',`${label}: ${k} must be false`);
 for(const k of ['noWorldMutation','noBridge','noScan']) if(o.safety[k]!==true)fail('UNSAFE_SAFETY_STATE',`${label}: ${k} must be true`);
 if(Object.hasOwn(o.safety,'noPackGeneration')&&o.safety.noPackGeneration!==true)
  fail('UNSAFE_SAFETY_STATE',`${label}: noPackGeneration must be true`);
}
function checkConcept(c,label){
 checkPlan(c,label,true);
 if(c.schema!=='minecraftaibuilder-step8a-concept-v1'||c.EngineCompatibility?.validatedByInstalledEngine!==false||
    c.MaterialGrammar?.blockIds!=='UNVERIFIED_NOT_SELECTED')fail('UNSUPPORTED_CONCEPT_SCHEMA',label);
 const b=c.BuildingComposition,rects=c.Massing?.rectangles;
 if(!onlyObject(b)||!['office','apartment','hotel'].includes(b.program)||
    !Number.isSafeInteger(b.floorCount)||b.floorCount<2||b.floorCount>10||
    b.floorHeight!==(b.program==='hotel'?5:4)||
    !Number.isSafeInteger(b.dimensions?.width)||b.dimensions.width<15||b.dimensions.width>48||
    !Number.isSafeInteger(b.dimensions?.depth)||b.dimensions.depth<12||b.dimensions.depth>40||
    !['north','south','east','west'].includes(b.orientation)||
    !Array.isArray(rects)||rects.length<1||rects.length>12)
   fail('UNSUPPORTED_CONCEPT_GEOMETRY',label);
 for(const r of rects){
  if(![r.x,r.z,r.width,r.depth,r.start,r.end].every(Number.isSafeInteger)||r.x<0||r.z<0||r.width<1||r.depth<1||
   r.x+r.width>b.dimensions.width||r.z+r.depth>b.dimensions.depth||r.start<0||r.end<=r.start||r.end>b.floorCount)
   fail('OUT_OF_BOUNDS_CONCEPT',label);
 }
 if(!reHex.test(c.designSha256||'')) fail('CONCEPT_HASH_MISSING',label);
 const {designSha256,...content}=c;
 if(sha(JSON.stringify(content))!==designSha256)fail('CONCEPT_HASH_MISMATCH',label);
}
function checkCandidate(c,idx){
 const label=`candidate[${idx}]`;
 if(!onlyObject(c))fail('INVALID_CANDIDATE',label);
 checkConcept(c.concept,label+'.concept');
 for(const key of ['architecture','detail','physical','optimization']) checkPlan(c[key],label+'.'+key);
 if(c.architecture?.schema!=='minecraftaibuilder-step8a-architecture-v1'||
   c.detail?.schema!=='minecraftaibuilder-step8a-detail-v1'||
   c.physical?.schema!=='minecraftaibuilder-step8a4-physical-reservation-v1'||
   c.optimization?.schema!=='minecraftaibuilder-step8a5-optimization-v1')
   fail('UNSUPPORTED_DETAIL_SCHEMA',label);
 const b=c.concept.BuildingComposition,ds=c.detail.coordinateSystem;
 if(ds?.origin!=='concept envelope minX/minZ'||ds?.yFloor!==0||ds?.xEast!==true||ds?.zSouth!==true)
   fail('COORDINATE_CONTRACT_MISMATCH',label);
 if(c.detail.roomsAndCorridors?.floors?.length!==b.floorCount||
    c.architecture.orientation!==b.orientation||
    c.physical.dimensions?.width!==b.dimensions.width||c.physical.dimensions?.depth!==b.dimensions.depth)
   fail('DIMENSION_CONTRACT_MISMATCH',label);
 if(c.optimization.proposals?.length>3||!Array.isArray(c.optimization.proposals))
   fail('OPTIMIZATION_CONTRACT_MISMATCH',label);
 const safeChildren=new WeakSet();
 function nestedSafety(node,depth){
  if(depth>35)fail('INVALID_RECURSION_DEPTH',label);
  if(!node||typeof node!=='object')return;
  if(safeChildren.has(node))return;safeChildren.add(node);
  if(Array.isArray(node)){if(node.length>300000)fail('TOO_MANY_ELEMENTS',label);for(const v of node)nestedSafety(v,depth+1);return;}
  if(Object.hasOwn(node,'BuildPlan'))checkPlan(node,label+'.nested');
  if(Object.hasOwn(node,'operations')&&Array.isArray(node.operations)&&node.operations.length!==0)fail('NONEMPTY_OPERATIONS',label);
  if(Object.hasOwn(node,'commandCount')&&node.commandCount!==0)fail('NONZERO_COMMANDS',label);
  if(Object.hasOwn(node,'executionAllowed')&&node.executionAllowed!==false)fail('EXECUTION_ALLOWED',label);
  if(Object.hasOwn(node,'constructionApproved')&&node.constructionApproved!==false)fail('CONSTRUCTION_APPROVED',label);
  for(const [k,v] of Object.entries(node))nestedSafety(v,depth+1);
 }
 nestedSafety(c,0);
}
export function makeCompatibilityEnvelope(report,{snapshotAudit=null}={}){
 if(!onlyObject(report)||report.schema!=='minecraftaibuilder-step8a-review-v3'||
   report.validation?.installedEngineValidated!==false||
   !Array.isArray(report.candidates)||report.candidates.length===0||report.candidates.length>3||
   report.candidateCount!==report.candidates.length)
   fail('INVALID_REVIEW_SCHEMA','Step8A.5 review v3 required');
 checkPlan(report,'review',true);
 const {reviewSha256,...contents}=report;
 if(!reHex.test(reviewSha256||'')||sha(JSON.stringify(contents))!==reviewSha256)
   fail('REVIEW_HASH_MISMATCH','Do not convert modified/unverified reviews');
 report.candidates.forEach(checkCandidate);
 if(snapshotAudit&&(!onlyObject(snapshotAudit)||!['SOURCE_INVENTORY_CHECKED_MAPPING_UNKNOWN','SOURCE_INVENTORY_INCOMPLETE'].includes(snapshotAudit.status)))
   fail('INVALID_SNAPSHOT_AUDIT','Untrusted audit result');
 const reasons=['Current installed Windows building-engine behavior and API have not been verified',
  'No confirmed mapping from conceptual coordinates to world origin / transform',
  'No verified Education block IDs / states / version-skew reconciliation',
  'Room, facade, door, stair, elevator, support and world state remain unverified'];
 if(snapshotAudit?.status==='SOURCE_INVENTORY_INCOMPLETE')reasons.unshift('Source snapshot omitted files; cannot claim complete source review');
 if(snapshotAudit?.status==='SOURCE_INVENTORY_CHECKED_MAPPING_UNKNOWN')reasons.unshift('Source file inventory verified, but behavior/compatibility still untested');
 const designs=report.candidates.map(c=>({
  id:c.id,conceptSha256:c.concept.designSha256,reviewStatus:c.status,
  // Intent-only dimensions, never a block / build / engine input.
  intent:{buildingType:c.concept.BuildingComposition.program,massing:c.concept.BuildingComposition.massing,
   dimensions:{...c.concept.BuildingComposition.dimensions},floorCount:c.concept.BuildingComposition.floorCount,
   floorHeight:c.concept.BuildingComposition.floorHeight,orientation:c.concept.BuildingComposition.orientation},
  compatibility:'UNKNOWN',worldAnchor:null,verifiedWorldCoordinates:false,
  materials:{status:'UNKNOWN',blockIds:[],blockStates:[]},
  doorStairElevatorSupportVerified:false,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},
  safety:{...requiredSafe,noWorldMutation:true,noBridge:true,noScan:true,noPackGeneration:true}
 }));
 const envelope={schema:'minecraftaibuilder-step8b-compatibility-envelope-v1',
  status:'OFFLINE_COMPATIBILITY_REVIEW_ONLY_NOT_PREPARED',compatibility:'UNKNOWN',
  sourceReviewSha256:reviewSha256,snapshotAuditStatus:snapshotAudit?.status??'WINDOWS_SOURCE_NOT_PROVIDED',
  blockers:reasons,coordinateContract:{localX:'east',localZ:'south',localY:'up',floorIndex:'0-based internal / 1-based display',
   worldAnchor:null,worldAxisMappingVerified:false,dimensionUnit:'conceptual blocks, NOT verified Minecraft blocks'},
  engineAPI:{entrypoint:'UNKNOWN',createBuildingPlan:'NOT_VERIFIED',plannerVersion:'UNKNOWN'},
  readiness:{constructionApproved:false,executionAllowed:false,worldIdentityProven:false,
    scanAndBridgeSameSessionProven:false,siteSafetyProven:false,verifiedInstalledEngine:false},
  designs,BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},
  safety:{...requiredSafe,noBridge:true,noScan:true,noWorldMutation:true,noPackGeneration:true}
 };
 envelope.envelopeSha256=sha(JSON.stringify(envelope));
 return envelope;
}
const allowedPrefixes=['scripts/','tests/','bridge/src/','engine/','modules/','mcp/','palettes/','styles/','docs/','catalog/'];
const allowedRoot=new Set(['package.json','package-lock.json','README.md','AGENTS.md']);
const blocked=new Set(['work','logs','config','node_modules','.git','secrets','private','.ssh','.codex','worlds','minecraftworlds']);
function allowedPath(p){
 if(typeof p!=='string'||p.length>400||p.startsWith('/')||p.includes('\\')||p.includes('\0'))return false;
 const parts=p.split('/');if(parts.some(s=>!s||s==='.'||s==='..'||s.startsWith('.env')||blocked.has(s.toLowerCase())))return false;
 return allowedRoot.has(p)||allowedPrefixes.some(x=>p.startsWith(x));
}
// Audit a separately extracted snapshot directory, never execute sources or run imports.
// The parent command must extract using a zip-safe extractor (no '..', duplicates, symlinks).
export function auditSourceDirectory(directory){
 const root=path.resolve(directory),manifestFile=path.join(root,'WINDOWS_SNAPSHOT_MANIFEST.json');
 if(!fs.existsSync(manifestFile))fail('MISSING_MANIFEST','WINDOWS_SNAPSHOT_MANIFEST.json required');
 if(fs.lstatSync(root).isSymbolicLink())fail('UNSAFE_SNAPSHOT_PATH','Root must be real directory');
 const mf=JSON.parse(fs.readFileSync(manifestFile,'utf8').replace(/^\uFEFF/,''));
 if(mf.schema!=='minecraftaibuilder-step7s-windows-source-only-snapshot-v1'||
    !Array.isArray(mf.files)||!Number.isSafeInteger(mf.filesIncluded)||mf.files.length!==mf.filesIncluded||
    mf.notPrepared!==true||mf.executionAllowed!==false||
    !Array.isArray(mf.excluded)||mf.filesExcludedBySize!==mf.excluded.length)
   fail('INVALID_SOURCE_MANIFEST','Unexpected snapshot schema / safety / count');
 const seen=new Set();let bytes=0;
 const signals={createBuildingPlan:[],GeneralBuildingPlanner:[],BlockDefinition:[],BlockStates:[],floorHeight:[],palette:[],worldAnchor:[]};
 const patterns={createBuildingPlan:/\bcreateBuildingPlan\b/,GeneralBuildingPlanner:/\bGeneralBuildingPlanner\b/,BlockDefinition:/\bBlockDefinition\b/,BlockStates:/\bBlockStates\b/,floorHeight:/\bfloorHeight\b/,palette:/\bpalette(?:s)?\b/i,worldAnchor:/\b(?:worldAnchor|originX|originZ)\b/};
 let packageVersion=null;
 for(const row of mf.files){
  const p=row.path;
  if(!allowedPath(p)||seen.has(p))fail('UNSAFE_SOURCE_PATH','Duplicate or forbidden path');
  seen.add(p);
  if(!Number.isSafeInteger(row.bytes)||row.bytes<0||row.bytes>5*1024*1024||!reHex.test(row.sha256||''))
   fail('INVALID_FILE_RECORD',p);
  const f=path.join(root,...p.split('/'));
  // Forbid reparse/symlink even in parent directories; never follow symlinks.
  let cur=root;for(const seg of p.split('/')){cur=path.join(cur,seg);if(fs.lstatSync(cur).isSymbolicLink())fail('UNSAFE_SNAPSHOT_SYMLINK',p);}
  if(!fs.statSync(f).isFile())fail('NOT_SOURCE_FILE',p);
  const raw=fs.readFileSync(f);
  if(raw.length!==row.bytes||sha(raw)!==row.sha256)fail('SNAPSHOT_HASH_MISMATCH',p);
  bytes+=raw.length;
  if(p==='package.json'){try{const pkg=JSON.parse(raw.toString('utf8'));if(typeof pkg.version==='string'&&pkg.version.length<80)packageVersion=pkg.version;}catch{/* version unknown */}}
  if(/\.(?:js|mjs|cjs|ts|tsx|jsx|json)$/i.test(p)){const source=raw.toString('utf8');
   for(const [k,rx] of Object.entries(patterns))if(rx.test(source)&&signals[k].length<30)signals[k].push(p);}
 }
 if(bytes!==mf.includedBytes||bytes>40*1024*1024)fail('SNAPSHOT_SIZE_MISMATCH','Manifest total inconsistent');
 function visit(d,prefix=''){
  for(const ent of fs.readdirSync(d,{withFileTypes:true})){
   const rel=prefix?prefix+'/'+ent.name:ent.name,fp=path.join(d,ent.name);
   if(ent.isSymbolicLink())fail('UNSAFE_SNAPSHOT_SYMLINK',rel);
   if(ent.isDirectory())visit(fp,rel);
   else if(!ent.isFile()||(rel!=='WINDOWS_SNAPSHOT_MANIFEST.json'&&!seen.has(rel)))fail('UNEXPECTED_SNAPSHOT_FILE',rel);
  }
 }
 visit(root);
 for(const row of mf.excluded) if(typeof row.path!=='string'||!allowedPath(row.path)||row.reason!=='SIZE_LIMIT')fail('INVALID_EXCLUDED_RECORD','Excluded records must identify size-limited source');
 const manifestSha256=sha(fs.readFileSync(manifestFile));
 const required=['package.json','scripts/step7r-qa.js'];
 const missing=required.filter(x=>!seen.has(x));
 const omitted=mf.excluded.length;
 return {schema:'minecraftaibuilder-step8b-source-inventory-audit-v1',
  status:missing.length||omitted?'SOURCE_INVENTORY_INCOMPLETE':'SOURCE_INVENTORY_CHECKED_MAPPING_UNKNOWN',
  sourceFilesVerified:seen.size,totalBytesVerified:bytes,sourceManifestSha256:manifestSha256,
  snapshotCreatedAtLocal:mf.createdAtLocal??null,missingRequiredPaths:missing,excludedCount:omitted,
  // Presence of files is not proof of method signatures or behavior.
  engineCompatibility:'UNKNOWN',engineEntrypoint:'NOT_VERIFIED',packageVersionObserved:packageVersion,
  apiTextOccurrenceHints:signals,
  hintLimit:'Static text occurrences; may be comments, unused code, or outdated; NOT verified functions',
  proofLimit:'Source byte inventory only; NOT runtime, API behavior, or Minecraft world freshness',
  safety:{executionAllowed:false,notPrepared:true}};
}
