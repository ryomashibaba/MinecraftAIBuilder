/** Read-only pinned B43 input loader + B44 SubB report builder. Never touches engine. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileStructureB44,validateStructureB44} from './structure-b44.mjs';
const manifestSha='364cf34f7f7760e932c998fbb27cdaca77c08fc95a02c54168ee15db68a73317';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const schemaReports={
 b17:'reports/B17_INTERIOR_INTEGRATION_IR.json',
 b29:'reports/B29_M3_M4_ASSEMBLY_IR.json',
 b31:'reports/B31_FLOOR_DOOR_OVERLAY.json',
 b32:'reports/B32_FLOOR_SEAM_LEDGER.json',
 b33:'reports/B33_RECTANGLE_EMITTER_LEDGER.json',
 b43:'reports/B43_VERTICAL_CIRCULATION.json'};
export function readPinnedB43Reports(root){
 if(!root||!fs.statSync(root).isDirectory())throw Error('B44_SUB_B_ROOT');
 function read(rel){
  const p=path.join(root,rel),st=fs.lstatSync(p);
  if(!st.isFile()||st.isSymbolicLink())throw Error('B44_SUB_B_UNSAFE_SOURCE_'+rel);
  return fs.readFileSync(p);
 }
 const manifestRaw=read('B43_FILE_SHA256.json');
 if(hash(manifestRaw)!==manifestSha)throw Error('B44_SUB_B_MANIFEST_CHANGED');
 const manifest=JSON.parse(manifestRaw);
 if(manifest.schema!=='minecraftaibuilder-step8b-b43-manifest-v1'||manifest.fileCount!==690||
    Object.keys(manifest.files??{}).length!==690)throw Error('B44_SUB_B_MANIFEST_SCHEMA');
 const out={};
 for(const [k,rel] of Object.entries(schemaReports)){
  const bytes=read(rel);
  if(hash(bytes)!==manifest.files[rel])throw Error('B44_SUB_B_PINNED_INPUT_CHANGED_'+k);
  out[k]=JSON.parse(bytes.toString('utf8'));
 }
 return out;
}
export function buildB44FromBaseline(root){
 const report=compileStructureB44(readPinnedB43Reports(root));
 validateStructureB44(report);return report;
}
const here=path.dirname(fileURLToPath(import.meta.url));
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=process.argv[2]??path.resolve(here,'../../../');
 const output=process.argv[3];
 const report=buildB44FromBaseline(root);
 if(output){
  // Permit writing only under SubB-owned directory (no baseline/frozen writes).
  const dest=path.resolve(output),own=path.resolve(here)+path.sep;
  if(!dest.startsWith(own)||fs.realpathSync(path.dirname(dest))!==fs.realpathSync(here))
   throw Error('B44_SUB_B_OUTPUT_MUST_BE_WITHIN_OWN_DIRECTORY');
  fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 }
 console.log('B44_SUB_B_REVIEW_PASS',JSON.stringify({totals:report.totals,comparativeFindings:report.comparativeFindings,
  reportSha256:report.reportSha256}));
}
