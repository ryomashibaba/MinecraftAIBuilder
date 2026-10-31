/**
 * R59 — safely ingest an ALREADY-SAVED Windows result ZIP.
 *
 * No extraction by the user. No generic filesystem extraction.
 * Extracts only five exactly named original evidence files to a fresh
 * temporary directory, checks their full saved SHA chain via R58, then
 * deletes the temporary directory. Does not modify the input ZIP.
 *
 * Supports ordinary single-disk ZIP store/deflate archives only; rejects
 * traversal, duplicate paths, encryption, ZIP64, corrupt CRC and zip bombs.
 * No external library, model, browser, Minecraft, world or network calls.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {writeR58Comparison}
 from './b198zr58-frozen-c01-quality-review-packet.mjs';

export const SCHEMA='minecraftaibuilder-b198zr59-safe-zip-review-ingest-v1';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bad=s=>{throw Error('B198ZR59_'+s)};
const MAX_ARCHIVE=40*1024*1024;
const MAX_FILE=180000;
const MAX_PATH=280;
const crcTable=Array.from({length:256},(_,i)=>{
 let n=i;
 for(let j=0;j<8;j++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;
 return n>>>0;
});
const crc32=b=>{
 let c=0xffffffff;
 for(const byte of b)c=crcTable[(c^byte)&255]^(c>>>8);
 return (c^0xffffffff)>>>0;
};
function pathCheck(name){
 if(!name||name.length>MAX_PATH||name.includes('\\')||
  name.includes('\0')||name.startsWith('/')||name.includes(':')||
  name.split('/').some(x=>x==='.'||x==='..'))
  bad('UNSAFE_ZIP_MEMBER_PATH');
 // Only a strict ASCII subset is expected in these program-created names.
 if(!/^[A-Za-z0-9_./-]+$/.test(name))bad('UNSUPPORTED_ZIP_MEMBER_NAME');
}
function checkedZipBuffer(file){
 if(typeof file!=='string'||!path.isAbsolute(file)||!fs.existsSync(file)||
  !fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())
  bad('EXISTING_ABSOLUTE_ORDINARY_ZIP_REQUIRED');
 const len=fs.statSync(file).size;
 if(len<22||len>MAX_ARCHIVE)bad('ZIP_SIZE_LIMIT');
 return fs.readFileSync(file);
}
function findEOCD(b){
 const begin=Math.max(0,b.length-65557);
 for(let i=b.length-22;i>=begin;i--){
  if(b.readUInt32LE(i)!==0x06054b50)continue;
  if(i+22+b.readUInt16LE(i+20)!==b.length)continue;
  return i;
 }
 bad('ZIP_CENTRAL_DIRECTORY_MISSING');
}
/**
 * Each entry retains the bytes from the ZIP central directory.
 * The returned byte buffers may be reused only inside this same call.
 */
export function inspectR59Archive(zipPath,{tag}={}){
 if(!['R48','R54'].includes(tag))bad('TAG_R48_OR_R54_REQUIRED');
 const b=checkedZipBuffer(zipPath),archiveSHA256=hash(b);
 const e=findEOCD(b);
 const disk=b.readUInt16LE(e+4),centralDisk=b.readUInt16LE(e+6);
 const nDisk=b.readUInt16LE(e+8),n=b.readUInt16LE(e+10);
 const centralLength=b.readUInt32LE(e+12),centralOffset=b.readUInt32LE(e+16);
 if(disk||centralDisk||n!==nDisk||n===0||n===0xffff||
  centralLength===0xffffffff||centralOffset===0xffffffff||
  centralOffset+centralLength>e||n>3000)bad('ZIP_MULTI_DISK_OR_ZIP64_OR_INVALID');
 let at=centralOffset;
 const seen=new Set(),wanted=new Map();
 let totalUncompressed=0;
 for(let i=0;i<n;i++){
  if(at+46>centralOffset+centralLength||
   b.readUInt32LE(at)!==0x02014b50)bad('ZIP_CENTRAL_ENTRY_CORRUPT');
  const flags=b.readUInt16LE(at+8),method=b.readUInt16LE(at+10);
  const crc=b.readUInt32LE(at+16),compressed=b.readUInt32LE(at+20);
  const expanded=b.readUInt32LE(at+24);
  const nameLength=b.readUInt16LE(at+28),extraLength=b.readUInt16LE(at+30);
  const commentLength=b.readUInt16LE(at+32);
  const diskStart=b.readUInt16LE(at+34),localOffset=b.readUInt32LE(at+42);
  const end=at+46+nameLength+extraLength+commentLength;
  if(end>centralOffset+centralLength||diskStart||flags&1||
   compressed===0xffffffff||expanded===0xffffffff||
   localOffset===0xffffffff||![0,8].includes(method))
   bad('ZIP_UNSUPPORTED_ENTRY');
  const nameBytes=b.subarray(at+46,at+46+nameLength);
  // Reject non-ASCII or ambiguous UTF-8 names. Both are unnecessary here.
  if(nameBytes.some(x=>x>127))bad('ZIP_MEMBER_NOT_ASCII');
  const name=nameBytes.toString('ascii');
  pathCheck(name);
  if(seen.has(name))bad('ZIP_DUPLICATE_MEMBER');
  seen.add(name);
  totalUncompressed+=expanded;
  if(totalUncompressed>80*1024*1024)bad('ZIP_EXPANSION_BUDGET');
  const m=name.match(/^(R(?:48|54)_[0-9a-f-]{36})\/(R(?:48|54)_[A-Z0-9_]+\.(?:txt|json))$/);
  if(m&&m[2].startsWith(tag+'_')){
   const allowed=[
    tag+'_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt',
    tag+'_FROZEN_REQUEST.json',
    tag+'_CAPTURE_RESULT.json',
    tag+'_FINAL_EVIDENCE_MANIFEST.json',
    tag+'_WINDOWS_ORIGINAL_SHA_AUDIT.json'
   ];
   if(allowed.includes(m[2])){
    if(expanded>MAX_FILE||compressed>MAX_ARCHIVE)
     bad('SELECTED_EVIDENCE_SIZE_LIMIT');
    if(localOffset+30>b.length||
     b.readUInt32LE(localOffset)!==0x04034b50)
     bad('ZIP_LOCAL_HEADER_INVALID');
    const localFlags=b.readUInt16LE(localOffset+6);
    const localMethod=b.readUInt16LE(localOffset+8);
    const localNameLength=b.readUInt16LE(localOffset+26);
    const localExtraLength=b.readUInt16LE(localOffset+28);
    const offset=localOffset+30+localNameLength+localExtraLength;
    if(localFlags!==flags||localMethod!==method||
     localNameLength!==nameLength||
     !b.subarray(localOffset+30,localOffset+30+localNameLength).equals(nameBytes))
     bad('ZIP_LOCAL_VS_CENTRAL_HEADER_MISMATCH');
    if(!(flags&8)&&(
     b.readUInt32LE(localOffset+14)!==crc||
     b.readUInt32LE(localOffset+18)!==compressed||
     b.readUInt32LE(localOffset+22)!==expanded))
     bad('ZIP_LOCAL_VS_CENTRAL_SIZE_MISMATCH');
    if(offset+compressed>b.length||offset+compressed>centralOffset)
     bad('ZIP_DATA_OUT_OF_BOUNDS');
    const encoded=b.subarray(offset,offset+compressed);
    let bytes;
    try{
     bytes=method===0?Buffer.from(encoded):
      inflateRawSync(encoded,{maxOutputLength:Math.min(MAX_FILE,expanded)+1});
    }catch{bad('ZIP_INFLATION_FAILED')}
    if(bytes.length!==expanded||crc32(bytes)!==crc)
     bad('ZIP_CRC_OR_LENGTH_MISMATCH');
    // Names are exact, but the matching capture root must be unique.
    wanted.set(name,{root:m[1],name:m[2],bytes});
   }
  }
  at=end;
 }
 if(at!==centralOffset+centralLength)bad('ZIP_CENTRAL_DIRECTORY_TRAILING');
 const entries=[...wanted.values()];
 const roots=new Set(entries.map(x=>x.root));
 const needed=[
  tag+'_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt',
  tag+'_FROZEN_REQUEST.json',
  tag+'_CAPTURE_RESULT.json',
  tag+'_FINAL_EVIDENCE_MANIFEST.json'
 ];
 if(roots.size!==1||needed.some(name=>!entries.some(x=>x.name===name))||
  new Set(entries.map(x=>x.name)).size!==entries.length)
  bad('ZIP_REQUIRED_CAPTURE_MISSING_OR_AMBIGUOUS');
 return {schema:SCHEMA,tag,archiveSHA256,selectedFiles:entries,
  sourceZipBytes:b.length,sourceZipNeverModified:true};
}
export function reviewR59AlreadySavedZip({
 r54Zip,r48Zip=null,destination
}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  fs.existsSync(destination)||!fs.existsSync(path.dirname(destination))||
  !fs.statSync(path.dirname(destination)).isDirectory())
  bad('NEW_ABSOLUTE_OUTPUT_DIRECTORY_REQUIRED');
 const r54=inspectR59Archive(r54Zip,{tag:'R54'});
 const r48=r48Zip===null?null:inspectR59Archive(r48Zip,{tag:'R48'});
 if(r48Zip!==null&&path.resolve(r48Zip)===path.resolve(r54Zip))
  bad('R48_AND_R54_ZIPS_MUST_DIFFER');
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'r59-verified-source-only-'));
 try{
  function place(z){
   if(!z)return null;
   const dest=path.join(work,z.tag);
   fs.mkdirSync(dest);
   for(const f of z.selectedFiles)
    fs.writeFileSync(path.join(dest,f.name),f.bytes,{flag:'wx'});
   return dest;
  }
  const a=place(r48),b=place(r54);
  // This function additionally checks frozen c01 prompt + exact original
  // raw model SHA + historical R48 source SHA before writing output.
  const report=writeR58Comparison({r48Dir:a,r54Dir:b,destination});
  const receipt={
   schema:SCHEMA,
   r54ZipSHA256:r54.archiveSHA256,
   r48ZipSHA256:r48?.archiveSHA256??null,
   originalsWereExtractedOnlyToEphemeralTemp:true,
   userSuppliedArchivesNeverChanged:true,
   r58Status:report.status,independentHumanQualityReview:'NOT_PERFORMED',
   modelCalls:0,worldReads:0,worldWrites:0,
   constructionApproved:false,
   gates:Array(9).fill('BLOCKED')
  };
  fs.writeFileSync(path.join(destination,'R59_ZIP_REVIEW_RECEIPT.json'),
   JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  return {status:report.status,files:3,receipt,
   modelCalls:0,worldWrites:0};
 }finally{fs.rmSync(work,{recursive:true,force:true})}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(!([4,6].includes(a.length))||a[0]!=='--r54-zip'||a[2]!=='--out'||
   (a.length===6&&a[4]!=='--r48-zip'))
   bad('CLI_FLAGS');
  console.log(JSON.stringify(reviewR59AlreadySavedZip({
   r54Zip:a[1],destination:a[3],r48Zip:a.length===6?a[5]:null
  })));
 }catch(e){
  console.error(String(e?.message??e).slice(0,220));
  process.exitCode=2;
 }
}
