/** V11: A/B art from ONE saved real ArchitecturePlan; zero LLM/world calls. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {saveB143ABReview} from './r125-static-art-review.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=s=>createHash('sha256').update(s).digest('hex');
const err=s=>{throw Error('V11_ROOF_AB_'+s);};
export function compareR125RoofRibbon({rawFile,outDir,massing='baseline'}={}){
 if(!rawFile||!outDir)err('REQUIRE_RAW_OUT');
 if(!['baseline','compact-sawtooth'].includes(massing))err('MASSING_MODE');
 const compact=massing==='compact-sawtooth';
 const input=path.resolve(rawFile),out=path.resolve(outDir),parent=path.dirname(out);
 if(!fs.existsSync(input)||fs.existsSync(out)||!fs.existsSync(parent))
  err('INPUT_MISSING_OR_OUTPUT_EXISTS');
 const realParent=fs.realpathSync(parent);
 if(out===repo||out.startsWith(repo+path.sep)||
    realParent===repo||realParent.startsWith(repo+path.sep)||
    out===input||input.startsWith(out+path.sep))err('OUTPUT_PATH_UNSAFE');
 const original=fs.readFileSync(input,'utf8'),hash=sha(original);
 let plan;try{plan=JSON.parse(original);}catch{err('INVALID_AUTHOR_JSON');}
 if(plan?.expression?.roofProfile!=='sawtooth'||
    plan.expression.roofVolume!=='raised')err('REQUIRES_RAISED_SAWTOOTH');
 // In compact A/B both candidates have identical glass treatment.
 const a=diagnoseR125ArchitecturePlanOriginal(original,
  compact?{roofGlazing:'sawtooth-ribbon'}:{});
 const b=diagnoseR125ArchitecturePlanOriginal(original,
  {roofGlazing:'sawtooth-ribbon',...(compact?{roofMassing:'compact-sawtooth'}:{})});
 if(!a.sourceVerified||!b.sourceVerified||
    a.originalSha256!==hash||b.originalSha256!==hash||
    a.planSha256!==b.planSha256||
    a.sourceSha256===b.sourceSha256||
    (!compact&&a.occupiedVoxels!==b.occupiedVoxels)||
    (compact&&a.geometrySha256===b.geometrySha256))err('SOURCE_HOLD');
 fs.mkdirSync(out);
 const before=path.join(out,'SOURCE_BASELINE.json'),
       after=path.join(out,'SOURCE_RIBBON.json');
 fs.writeFileSync(before,JSON.stringify(a.sourceDesign,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(after,JSON.stringify(b.sourceDesign,null,2)+'\n',{flag:'wx'});
 const ab=saveB143ABReview({beforeSourcePath:before,
  afterSourcePath:after,outDir:path.join(out,'ART_AB')});
 const diff=ab.finalVoxelDifference;
 let crests;
 if(compact){
  const crest=design=>Math.max(...design.elements
   .filter(e=>/^roof-raised-skin-\d+$/.test(e.id)).map(e=>e.origin[1]));
  crests={before:crest(a.sourceDesign),after:crest(b.sourceDesign)};
  if(!Number.isFinite(crests.before)||!Number.isFinite(crests.after)||
   crests.after>=crests.before||diff.added+diff.removed===0)
   err('NO_MEANINGFUL_COMPACT_ROOF');
 }else if(diff.added||diff.removed||!diff.changedMaterial)err('NON_MATERIAL_DELTA');
 if(sha(fs.readFileSync(input,'utf8'))!==hash)err('ORIGINAL_CHANGED');
 const result={schema:compact?'mab-v11-roof-massing-ab-v1':'mab-v11-roof-ribbon-ab-v1',
  originalSha256:hash,originalEdited:false,
  sourceSha256Before:a.sourceSha256,sourceSha256After:b.sourceSha256,
  occupiedVoxels:a.occupiedVoxels,changedMaterial:diff.changedMaterial,
  ...(compact?{massing,occupiedVoxelsAfter:b.occupiedVoxels,
   added:diff.added,removed:diff.removed,roofCrestY:crests,
   skylightPolicy:'SAME_SAWTOOTH_RIBBON_BOTH_SIDES'}:{}),
  image:path.join(out,'ART_AB',ab.preview.file),
  modelCalls:0,worldWrites:0,minecraftWalking:'NOT_TESTED',
  humanArt:'NOT_REVIEWED'};
 fs.writeFileSync(path.join(out,'REVIEW.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const x=process.argv.slice(2);
  if(![4,6].includes(x.length)||x[0]!=='--raw'||x[2]!=='--out'||
   (x.length===6&&(x[4]!=='--massing'||x[5]!=='compact-sawtooth')))err('CLI');
  console.log('V11_ROOF_AB',JSON.stringify(compareR125RoofRibbon({
   rawFile:x[1],outDir:x[3],
   ...(x.length===6?{massing:x[5]}:{})})));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
