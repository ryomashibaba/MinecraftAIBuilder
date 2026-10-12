/**
 * B68 bounded, read-only static inspection of the FIVE production source files.
 * Trust boundary: first validate the entire ZIP with frozen B56; then decode its
 * exact allowlisted entries in memory and cross-check SHA-256 against B56.
 * Never writes, imports, compiles, evaluates or executes supplied source.
 * The scanner is a conservative lexical inventory, NOT a JavaScript AST or parity proof.
 */
import fs from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {inspectB55EvidenceZip} from '../../b56/main/zip-intake-b56.mjs';
import {REQUIRED} from '../../b55/main/intake-b55.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B68_STATIC_'+x)};
const MAX_BYTES=20_000_000, MAX_FILE=2_000_000;
const TARGETS=Object.freeze(['composeFacade','buildPlan','generateBuilding','generateBuildingPlan','buildBuilding','buildWalls','buildWall','generateWalls','createWalls','createWall','generateDoors','createDoors','createDoor','generateStairs','createStairs','buildStairs','generateRoof','generateFacade','createFacade','placeBlock','setBlock','fillBlocks','execute','executeBuildPlan','applyBuildPlan','getBlock','getBlocks','world','bridge','architecturalQuality','architecturalLibrary','urbanJapanese','wall','door','stairs','roof','facade','material','palette','windows']);
const TARGET_SET=new Set(TARGETS);
const JSON_KEYS=Object.freeze(['styles','style','materials','palette','palettes','blocks','wall','walls','doors','stairs','windows','roof','facade','quality','building','urban','japanese','colors','version']);
/** Mask comments, quotes, and template strings without changing offsets. No evaluation. */
export function codeMask(text){
 if(typeof text!=='string'||text.length>MAX_FILE*2)fail('TEXT_SIZE');
 const chars=text.split('');let mode='code';let quote='';
 for(let i=0;i<chars.length;i++){
  const c=text[i],n=text[i+1];
  if(mode==='code'){
   if(c==='/'&&n==='/'){chars[i]=' ';chars[++i]=' ';mode='line';continue;}
   if(c==='/'&&n==='*'){chars[i]=' ';chars[++i]=' ';mode='block';continue;}
   if(c==='\''||c==='"'||c==='`'){quote=c;chars[i]=' ';mode='quote';continue;}
  }else if(mode==='line'){if(c!=='\n'&&c!=='\r')chars[i]=' ';else mode='code';continue;}
  else if(mode==='block'){if(c==='*'&&n==='/'){chars[i]=' ';chars[++i]=' ';mode='code';}else if(c!=='\n'&&c!=='\r')chars[i]=' ';continue;}
  else if(mode==='quote'){
   if(c==='\\'){chars[i]=' ';if(i+1<chars.length)chars[++i]=' ';continue;}
   if(c===quote){chars[i]=' ';mode='code';continue;}
   if(c!=='\n'&&c!=='\r')chars[i]=' ';
   continue;
  }
 }
 return chars.join('');
}
function boundedNames(iter){return [...new Set(iter)].filter(x=>/^[a-zA-Z_$][\w$]{0,79}$/.test(x)).sort().slice(0,160);}
export function lexicalInventory(text,kind){
 if(kind==='json'){
  let parsed;try{parsed=JSON.parse(text)}catch{return {syntax:'INVALID_JSON',schemaKeysPresent:[],topLevelKeysCount:0};}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {syntax:'JSON_NOT_OBJECT',schemaKeysPresent:[],topLevelKeysCount:0};
  const keys=Object.keys(parsed);
  return {syntax:'VALID_JSON',schemaKeysPresent:JSON_KEYS.filter(k=>keys.includes(k)),topLevelKeysCount:keys.length};
 }
 const m=codeMask(text);const decl=[],exports=[],references=[];
 for(const re of [/\b(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g,/\bclass\s+([A-Za-z_$][\w$]*)\b/g])for(const match of m.matchAll(re))decl.push(match[1]);
 for(const re of [/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,/\bexports\.([A-Za-z_$][\w$]*)\s*=/g,/\bmodule\.exports\.([A-Za-z_$][\w$]*)\s*=/g])for(const match of m.matchAll(re))exports.push(match[1]);
 for(const target of TARGETS){const re=new RegExp('\\b'+target+'\\b','g');const count=[...m.matchAll(re)].length;if(count)references.push({name:target,count:Math.min(count,9999)});}
 const evalLike=['eval','Function','child_process','execSync','spawn','fetch','WebSocket'].filter(k=>new RegExp('\\b'+k+'\\b').test(m));
 return {syntax:'LEXICAL_ONLY_NOT_AST',declaredSymbols:boundedNames(decl),exportedSymbols:boundedNames(exports),targetReferences:references,executionLikeTokens:evalLike};
}
const u16=(b,o)=>b.readUInt16LE(o),u32=(b,o)=>b.readUInt32LE(o);
/** B56 has already fully validated the ZIP; still check SHA-256 of each decoded entry. */
function validatedEntryBytes(b,expected){
 let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(u32(b,i)===0x06054b50&&i+22+u16(b,i+20)===b.length){end=i;break;}}
 if(end<0)fail('ZIP_EOCD');const count=u16(b,end+10),limit=u32(b,end+16)+u32(b,end+12);
 let at=u32(b,end+16);const out=new Map();
 for(let k=0;k<count;k++){
  if(at+46>limit||u32(b,at)!==0x02014b50)fail('CENTRAL');
  const nl=u16(b,at+28),el=u16(b,at+30),cl=u16(b,at+32),method=u16(b,at+10),compressed=u32(b,at+20),length=u32(b,at+24),local=u32(b,at+42);
  const name=b.subarray(at+46,at+46+nl).toString('utf8');at+=46+nl+el+cl;
  if(!expected.has(name))continue;
  const start=local+30+u16(b,local+26)+u16(b,local+28),payload=b.subarray(start,start+compressed);
  const bytes=method===0?payload:inflateRawSync(payload,{maxOutputLength:MAX_FILE+1});
  if(bytes.length!==length||sha(bytes)!==expected.get(name))fail('HASH_OR_LENGTH_'+name);
  out.set(name,bytes);
 }
 if(at!==limit)fail('CENTRAL_END');return out;
}
export function inspectProductionArchive(input){
 // Buffer or local path only; no network, no dynamic loads of ZIP contents.
 let raw;if(Buffer.isBuffer(input))raw=input;
 else if(typeof input==='string'&&input){const st=fs.lstatSync(input);if(!st.isFile()||st.isSymbolicLink()||st.size>MAX_BYTES)fail('UNSAFE_PATH');raw=fs.readFileSync(input);}
 else fail('INPUT_REQUIRED');
 if(raw.length>MAX_BYTES)fail('OVERSIZE');
 const validated=inspectB55EvidenceZip(raw),snap=validated.snapshot;
 const expected=new Map(snap.files.filter(f=>f.observedSha256).map(f=>[f.key,f.observedSha256]));
 const entries=validatedEntryBytes(raw,expected);
 const files=snap.files.map(f=>{
  const common={path:f.key,status:f.status,expectedSha256:f.expectedSha256,observedSha256:f.observedSha256??null};
  if(!entries.has(f.key))return {...common,inventory:null};
  return {...common,inventory:lexicalInventory(entries.get(f.key).toString('utf8'),f.key.endsWith('.json')?'json':'js')};
 });
 return {schema:'minecraftaibuilder-b68-static-source-inventory-v1',purpose:'NEVER_EXECUTE_PRODUCTION_SOURCES',sourceArchiveSha256:validated.archive.zipSha256,
  count:{required:5,found:validated.archive.sourceFilesFound,exactPinMatch:snap.counts.PINNED_MATCH,versionMismatch:snap.counts.VERSION_MISMATCH,missing:snap.counts.MISSING},
  metadata:validated.archive.metadata,files,
  safety:{sourceExecuted:false,sourceImported:false,sourceWrittenToDisk:false,network:false,worldAccess:false,constructionApproved:false,readiness:'NOT_PREPARED',M4Blocked:9,executionAllowed:false,buildOperations:0},
  productionParity:'UNVERIFIED',inspectionLimit:'LEXICAL_SIGNAL_INVENTORY_ONLY_NOT_API_OR_RUNTIME_COMPATIBILITY'};
}
export function missingSourceReport(){return {schema:'minecraftaibuilder-b68-static-source-inventory-v1',purpose:'NO_SOURCE_EVIDENCE_SUPPLIED',
 sourceArchiveSha256:null,count:{required:5,found:0,exactPinMatch:0,versionMismatch:0,missing:5},metadata:'NOT_PROVIDED',
 files:REQUIRED.map(path=>({path,status:'MISSING',inventory:null})),
 safety:{sourceExecuted:false,sourceImported:false,sourceWrittenToDisk:false,network:false,worldAccess:false,constructionApproved:false,readiness:'NOT_PREPARED',M4Blocked:9,executionAllowed:false,buildOperations:0},
 productionParity:'UNVERIFIED',inspectionLimit:'NO_PRODUCTION_SOURCE_BYTES_AVAILABLE'};}
