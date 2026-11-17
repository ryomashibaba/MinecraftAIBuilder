/** Offline V11: ONE saved real author -> opt-in, true B143 entrance-court ART comparison.
 * A HOST-derived architectural study, NEVER original model authorship, approval or world IO.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {saveB143ABReview} from './r125-static-art-review.mjs';
import {compileDesign,verifyCompiled,MATERIALS} from '../source/ai/b143-building-dsl.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=s=>createHash('sha256').update(s).digest('hex');
const hold=s=>{throw Error('V11_SPATIAL_ART_'+s);};
export function saveR125SpatialArt({rawPath,sourcePath,outDir}={}){
 if([rawPath,sourcePath,outDir].some(x=>typeof x!=='string'||!x))
  hold('INPUTS_REQUIRED');
 const rawFile=path.resolve(rawPath),sourceFile=path.resolve(sourcePath),out=path.resolve(outDir);
 const parent=path.dirname(out);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||fs.existsSync(out))
  hold('FRESH_PRIVATE_OUTPUT_REQUIRED');
 const realParent=fs.realpathSync(parent);
 if(out===root||out.startsWith(root+path.sep)||realParent===root||
    realParent.startsWith(root+path.sep))hold('OUTPUT_OUTSIDE_REPO_REQUIRED');
 for(const [p,max] of [[rawFile,60000],[sourceFile,2000000]])
  if(!fs.existsSync(p)||!fs.statSync(p).isFile()||
     fs.statSync(p).size<1||fs.statSync(p).size>max)
   hold('MISSING_OR_OVERSIZE_INPUT');
 const original=fs.readFileSync(rawFile,'utf8');
 let source;
 try{source=JSON.parse(fs.readFileSync(sourceFile,'utf8'));}
 catch{hold('INVALID_SAVED_B143');}
 const before=diagnoseR125ArchitecturePlanOriginal(original);
 if(before.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||before.sourceVerified!==true||
    !before.sourceDesign||source.id!==before.sourceDesign.id)
  hold('BASELINE_AUTHORED_SOURCE_NOT_VERIFIED');
 const scene=compileDesign(source);
 if(!verifyCompiled(source,scene)||scene.sourceSha256!==before.sourceSha256||
    scene.geometrySha256!==before.geometrySha256||scene.worldContacts!==0||
    scene.BuildPlan?.operations?.length!==0)hold('BASELINE_SHA_GUARD');
 // ONE opt-in structural intervention, no automatic retry or unapproved edits.
 const after=diagnoseR125ArchitecturePlanOriginal(original,{hostDetail:'spatial-v1'});
 if(after.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||after.sourceVerified!==true||
    !after.sourceDesign||after.originalSha256!==digest(original)||
    after.spatialDetail?.owner!=='HOST'||
    after.modelChosenFixtures!==before.modelChosenFixtures)
  hold('HOST_RECESSED_COURT_SOURCE_HOLD_'+String(after.compilerReason??after.status)
   .replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80));
 const revised=compileDesign(after.sourceDesign);
 if(!verifyCompiled(after.sourceDesign,revised)||
    revised.sourceSha256!==after.sourceSha256||
    revised.geometrySha256!==after.geometrySha256||
    revised.worldContacts!==0||revised.BuildPlan?.operations?.length!==0||
    after.modelCalls!==0||after.worldWrites!==0)
  hold('DERIVED_SOURCE_OR_WORLD_GUARD');
 const beforeCells=new Map(scene.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const afterCells=new Map(revised.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const removed=[...beforeCells.keys()].filter(x=>!afterCells.has(x)).length;
 const added=[...afterCells.keys()].filter(x=>!beforeCells.has(x)).length;
 if(added+removed===0)hold('NO_REAL_VOLUME_CHANGE');
 const palette=JSON.parse(fs.readFileSync(path.join(root,
  'configs/r125-education-verified-palette-v26.33.json'),'utf8'));
 if(palette.schema!=='r125-education-user-verified-palette-v1'||
    palette.version!=='26.33'||!palette.blocks)hold('PALETTE_GUARD');
 const used=[...new Set(revised.primitives.map(v=>MATERIALS[v[3]]))].sort();
 const unverified=used.filter(m=>!['stone','glass'].includes(m)&&
  !Object.hasOwn(palette.blocks,m));
 fs.mkdirSync(out);
 const candidate=path.join(out,'HOST_DERIVED_SOURCE_ONLY.json');
 fs.writeFileSync(candidate,JSON.stringify(after.sourceDesign,null,2)+'\n',{flag:'wx'});
 const ab=saveB143ABReview({beforeSourcePath:sourceFile,afterSourcePath:candidate,
  outDir:path.join(out,'ART_AB')});
 if(ab.before.sourceSha256!==before.sourceSha256||
    ab.after.sourceSha256!==after.sourceSha256||
    ab.finalVoxelDifference.added!==added||
    ab.finalVoxelDifference.removed!==removed||ab.modelCalls!==0||
    ab.worldWrites!==0)hold('AB_EVIDENCE_MISMATCH');
 const report={schema:'r125-v11-spatial-art-study-v1',
  status:'SOURCE_VERIFIED_HOST_DERIVED_ART_HOLD',
  policy:{hostDetail:'spatial-v1',owner:'HOST',automaticRetries:0},
  originalSha256:digest(original),
  originalUnchanged:fs.readFileSync(rawFile,'utf8')===original,
  baselineSourceSha256:before.sourceSha256,
  derivedSourceSha256:after.sourceSha256,
  modelAuthoredFixtureCount:before.modelChosenFixtures,
  derivedFixtureCount:after.modelChosenFixtures,
  sourceRoomUseBefore:before.roomUseEvidence,
  sourceRoomUseAfter:after.roomUseEvidence,
  structuralDifference:ab.finalVoxelDifference,
  spatialDetail:after.spatialDetail,
  photo:'ART_AB/'+ab.preview.file,
  photoSha256:ab.preview.sha256,
  educationMaterials:{used,unverified,status:unverified.length?
   'HOLD_UNATTESTED_MATERIALS':'PALETTE_ONLY_NOT_EDUCATION_TEST'},
  modelCalls:0,worldWrites:0,worldContacts:0,
  BuildPlan:{operations:[]},nineWorldGates:Array(9).fill('BLOCKED'),
  art:'HUMAN_REVIEW_REQUIRED',minecraftWalking:'NOT_TESTED',
  constructionApproved:false};
 if(!report.originalUnchanged)hold('ORIGINAL_CHANGED');
 fs.writeFileSync(path.join(out,'SPATIAL_ART_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==6||a[0]!=='--raw'||a[2]!=='--source'||a[4]!=='--out')
   hold('CLI_RAW_SOURCE_OUT');
  const result=saveR125SpatialArt({rawPath:a[1],sourcePath:a[3],outDir:a[5]});
  console.log('V11_SPATIAL_ART_SOURCE_ONLY',JSON.stringify({
   baseline:result.baselineSourceSha256,derived:result.derivedSourceSha256,
   difference:result.structuralDifference,
   image:result.photo,unverifiedMaterials:result.educationMaterials.unverified,
   art:'HUMAN_REVIEW_REQUIRED',worldWrites:0,modelCalls:0}));
 }catch(e){
  console.error('V11_SPATIAL_ART_HOLD',String(e?.message??e).slice(0,250));
  process.exitCode=2;
 }
}
