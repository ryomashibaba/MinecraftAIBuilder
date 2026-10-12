/** B56: bounded, read-only source ZIP inspection. Never extracts, imports, evaluates or executes sources. */
import fs from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PINNED_FILES,REQUIRED,verifySourceIntake,inspectEvidenceRoot} from '../../b55/main/intake-b55.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw new Error('B56_ZIP_'+x)};
const MAX_ARCHIVE_BYTES=20_000_000,MAX_SOURCE_BYTES=2_000_000;
const META='B55_CAPTURE_SUMMARY.json';
const REQUIRED_KEYS=new Set([...REQUIRED,META]);
const statuses=['MISSING','PINNED_MATCH','VERSION_MISMATCH','UNSAFE_LINK','UNSAFE_NONFILE','OVERSIZE','CHANGED_DURING_READ'];
const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
export function crc32(data){let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
const bounds=(b,offset,len)=>Number.isSafeInteger(offset)&&Number.isSafeInteger(len)&&offset>=0&&len>=0&&offset+len<=b.length;
const u16=(b,o)=>{if(!bounds(b,o,2))fail('TRUNCATED');return b.readUInt16LE(o)};
const u32=(b,o)=>{if(!bounds(b,o,4))fail('TRUNCATED');return b.readUInt32LE(o)};
function safeName(name){
 return name&&name.length<260&&!name.includes('\\')&&!name.includes('\0')&&!name.startsWith('/')&&
  name.split('/').every(s=>s&&s!=='.'&&s!=='..')&&REQUIRED_KEYS.has(name);
}
function eocd(b){
 for(let pos=b.length-22;pos>=Math.max(0,b.length-65557);pos--){
  if(u32(b,pos)===0x06054b50&&bounds(b,pos,22)&&pos+22+u16(b,pos+20)===b.length)return pos;
 }
 fail('END_OF_CENTRAL_DIRECTORY_MISSING');
}
/** Inspect exact B55-capture layout; rejects unknown entries, symlinks, traversal, duplicates, decompression bombs. */
export function inspectB55EvidenceZip(input){
 let b;
 if(Buffer.isBuffer(input))b=input;
 else if(typeof input==='string'&&input.length){
  let st;try{st=fs.lstatSync(input)}catch{fail('ZIP_NOT_FOUND')}
  if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_INPUT');
  if(st.size>MAX_ARCHIVE_BYTES)fail('ARCHIVE_OVERSIZE');
  b=fs.readFileSync(input);
 }else fail('ARGUMENT');
 if(b.length>MAX_ARCHIVE_BYTES||b.length<22)fail('ARCHIVE_SIZE');
 const end=eocd(b),count=u16(b,end+10),start=u32(b,end+16),size=u32(b,end+12);
 if(u16(b,end+4)||u16(b,end+6)||u16(b,end+8)!==count||count>6||(count>0&&size===0)||!bounds(b,start,size)||start+size>end)fail('CENTRAL_DIRECTORY');
 if([count,size,start].some(v=>v===65535||v===0xffffffff))fail('ZIP64_UNSUPPORTED');
 const found=new Map();let cur=start;
 for(let i=0;i<count;i++){
  if(u32(b,cur)!==0x02014b50||!bounds(b,cur,46))fail('CENTRAL_HEADER');
  const flags=u16(b,cur+8),method=u16(b,cur+10),crc=u32(b,cur+16),compressed=u32(b,cur+20),raw=u32(b,cur+24);
  const nameLen=u16(b,cur+28),extra=u16(b,cur+30),comment=u16(b,cur+32);
  const external=u32(b,cur+38),local=u32(b,cur+42);
  if(!bounds(b,cur+46,nameLen+extra+comment))fail('CENTRAL_BOUNDS');
  const filename=b.subarray(cur+46,cur+46+nameLen).toString('utf8');
  // Forbid anything beyond data descriptor and UTF8. Unknown flags, encryption, strange file types are never trusted.
  if(!safeName(filename)||found.has(filename)||flags&~(0x0808)||![0,8].includes(method)||compressed>MAX_ARCHIVE_BYTES||raw>MAX_SOURCE_BYTES||(external>>>16&0xf000)===0xa000)fail('UNSAFE_ENTRY');
  if(u32(b,local)!==0x04034b50||!bounds(b,local,30))fail('LOCAL_HEADER');
  const ln=u16(b,local+26),le=u16(b,local+28),lflags=u16(b,local+6),lm=u16(b,local+8);
  if(lflags!==flags||lm!==method||!bounds(b,local+30,ln+le))fail('LOCAL_MISMATCH');
  const localname=b.subarray(local+30,local+30+ln).toString('utf8');
  if(localname!==filename||!(flags&8)&&(u32(b,local+14)!==crc||u32(b,local+18)!==compressed||u32(b,local+22)!==raw))fail('LOCAL_MISMATCH');
  const dataAt=local+30+ln+le;
  if(!bounds(b,dataAt,compressed)||dataAt+compressed>start||local>=start)fail('PAYLOAD_BOUNDS');
  let data;
  if(method===0){data=b.subarray(dataAt,dataAt+compressed);if(raw!==compressed)fail('STORED_LENGTH');}
  else {try{data=inflateRawSync(b.subarray(dataAt,dataAt+compressed),{maxOutputLength:MAX_SOURCE_BYTES+1})}catch{fail('DECOMPRESSION')}}
  if(data.length!==raw||crc32(data)!==crc)fail('CRC_OR_LENGTH');
  found.set(filename,{bytes:data,crc,raw,compressed});
  cur+=46+nameLen+extra+comment;
 }
 if(cur!==start+size)fail('CENTRAL_TRAILING');
 const files=REQUIRED.map(key=>{
  const entry=found.get(key);
  if(!entry)return {key,expectedSha256:PINNED_FILES[key],status:'MISSING'};
  const observedSha256=sha(entry.bytes);
  return {key,expectedSha256:PINNED_FILES[key],status:observedSha256===PINNED_FILES[key]?'PINNED_MATCH':'VERSION_MISMATCH',observedSha256};
 });
 // Capture summary is untrusted metadata, used only to detect a forged/misleading collector declaration.
 let metadata='ABSENT';
 if(found.has(META)){
  let info;try{info=JSON.parse(found.get(META).bytes.toString('utf8'))}catch{fail('METADATA_INVALID')}
  if(info.schema!=='minecraftaibuilder-b55-readonly-source-evidence-v1'||info.projectIdentity!=='minecraft-ai-builder'||
   info.intent!=='LOCAL_SOURCE_FILES_ONLY_NO_EXECUTION'||info.safety?.executionAllowed!==false||
   info.safety?.gameAccess!==false||info.safety?.buildOperations!==0||info.safety?.scans!==0||
   info.safety?.projectFilesModified!==false||!Array.isArray(info.sourceChecks)||info.sourceChecks.length!==5)fail('METADATA_UNSAFE');
  const checks=info.sourceChecks;
  for(let i=0;i<5;i++){
   if(checks[i].key!==REQUIRED[i]||checks[i].expectedSha256!==PINNED_FILES[REQUIRED[i]]||
    checks[i].status!==files[i].status||
    (checks[i].observedSha256??null)!==(files[i].observedSha256??null))fail('METADATA_MISMATCH');
  }
  metadata='CONSISTENT';
 }
 const counts=Object.fromEntries(statuses.map(s=>[s,files.filter(f=>f.status===s).length]));
 const base=inspectEvidenceRoot();
 const snapshot={...base,files,counts,
  snapshotStatus:counts.PINNED_MATCH===REQUIRED.length?'PINNED_SNAPSHOT_IDENTICAL':counts.VERSION_MISMATCH?'SOURCE_VERSION_DRIFT':'INCOMPLETE_SOURCE_EVIDENCE'};
 verifySourceIntake(snapshot);
 return {snapshot,archive:{format:'ZIP_STORED_OR_DEFLATE',sourceFilesFound:5-counts.MISSING,
  metadata,zipSha256:sha(b),totalEntries:count},
  neverExtracted:true,sourceExecuted:false,sourceImported:false,worldAccess:false};
}
