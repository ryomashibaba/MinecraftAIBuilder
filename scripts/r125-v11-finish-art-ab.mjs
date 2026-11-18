/**
 * MAB V11: ONE saved genuine ArchitecturePlan -> actual 8-view B143 ART A/B.
 * No new model calls, hidden corrections, model-original edits, or world IO.
 * Default keeps the previous study. --integrated combines HOST spatial detail,
 * activity-led arrangement and role-specific expanded surfaces.
 * Source failure is HOLD, not an auto retry or a claimed improvement.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {saveB143ABReview} from './r125-static-art-review.mjs';
import {MATERIALS,compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=id=>{throw Error('R125_V11_FINISH_AB_'+id);};

export function saveR125FinishAB({rawPath,sourcePath,outDir,integrated=false,
 fixtureForm='room-scale-v1'}={}){
 if(typeof integrated!=='boolean'||
    !['room-scale-v1','room-scale-v2'].includes(fixtureForm))
  fail('INTEGRATED_FLAG_OR_FIXTURE_FORM');
 if([rawPath,sourcePath,outDir].some(s=>typeof s!=='string'||!s))
  fail('REQUIRES_RAW_SOURCE_OUT');
 const rawFile=path.resolve(rawPath),sourceFile=path.resolve(sourcePath);
 const out=path.resolve(outDir),parent=path.dirname(out);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
    fs.existsSync(out))fail('NEW_OUTPUT_DIRECTORY_REQUIRED');
 const realParent=fs.realpathSync(parent);
 if(out===ROOT||out.startsWith(ROOT+path.sep)||
    realParent===ROOT||realParent.startsWith(ROOT+path.sep))
  fail('OUTPUT_OUTSIDE_REPO_REQUIRED');
 for(const [p,max] of [[rawFile,60000],[sourceFile,2000000]])
  if(!fs.existsSync(p)||!fs.statSync(p).isFile()||
     fs.statSync(p).size>max)fail('INPUT_MISSING_OR_OVERSIZE');
 const original=fs.readFileSync(rawFile,'utf8');
 const saved=fs.readFileSync(sourceFile,'utf8');
 let plan,source;
 try{plan=JSON.parse(original);source=JSON.parse(saved);}
 catch{fail('INVALID_JSON');}
 const current=diagnoseR125ArchitecturePlanOriginal(original);
 if(current.sourceVerified!==true||
    current.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||
    current.sourceDesign?.id!==plan.id)
  fail('BASELINE_SOURCE_HOLD');
 const savedScene=compileDesign(source);
 if(!verifyCompiled(source,savedScene)||
    savedScene.sourceSha256!==current.sourceSha256||
    savedScene.geometrySha256!==current.geometrySha256||
    savedScene.worldContacts!==0||
    savedScene.BuildPlan?.operations?.length!==0)
  fail('BASELINE_B143_ORIGINAL_MISMATCH');
 const policy=integrated?
  {hostDetail:'spatial-v1',fixtureArt:'activity-layout',fixtureForm}:
  {fixtureForm:'readable-v1'};
 const candidate=diagnoseR125ArchitecturePlanOriginal(original,policy);
 if(candidate.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||
    candidate.sourceVerified!==true||
    candidate.originalSha256!==hash(original)||
    !candidate.sourceDesign)
  fail('CANDIDATE_SOURCE_HOLD_'+String(candidate.compilerReason??candidate.status)
   .replace(/[^A-Za-z0-9_-]/g,'_').slice(0,90));
 const afterScene=compileDesign(candidate.sourceDesign);
 if(!verifyCompiled(candidate.sourceDesign,afterScene)||
    afterScene.worldContacts!==0||
    afterScene.BuildPlan?.operations?.length!==0||
    candidate.modelCalls!==0||candidate.worldWrites!==0||
    candidate.modelChosenFixtures!==current.modelChosenFixtures)
  fail('CANDIDATE_SOURCE_OR_WORLD_GATES');
 const originalCells=new Map(savedScene.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const newCells=new Map(afterScene.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const changed=[...originalCells].filter(([loc,mat])=>newCells.get(loc)!==mat);
 if(!changed.length&&originalCells.size===newCells.size)
  fail('NO_ACTUAL_PHYSICAL_DIFFERENCE');
 const profile=JSON.parse(fs.readFileSync(path.join(ROOT,
  'configs/r125-education-verified-palette-v26.33.json'),'utf8'));
 if(profile.schema!=='r125-education-user-verified-palette-v1'||
    profile.version!=='26.33'||!profile.blocks)
  fail('PALETTE_CONTRACT_HOLD');
 const used=[...new Set(afterScene.primitives.map(v=>MATERIALS[v[3]]))].sort();
 const unverified=used.filter(m=>!['stone','glass'].includes(m)&&
  !Object.hasOwn(profile.blocks,m));
 // No files are created until the complete independent model/source check
 // and the selected HOST policy have both passed.
 fs.mkdirSync(out);
 const after=path.join(out,'B143_ART_CANDIDATE_SOURCE_ONLY.json');
 fs.writeFileSync(after,JSON.stringify(candidate.sourceDesign,null,2)+'\n',{flag:'wx'});
 const ab=saveB143ABReview({beforeSourcePath:sourceFile,
  afterSourcePath:after,outDir:path.join(out,'ART_AB')});
 if(ab.before.sourceSha256!==current.sourceSha256||
    ab.after.sourceSha256!==candidate.sourceSha256||
    ab.modelCalls!==0||ab.worldWrites!==0||
    ab.finalVoxelDifference.sameActualGeometryAndMaterial)
  fail('ART_AB_PROVENANCE_OR_DELTA_HOLD');
 const report={schema:'r125-v11-finish-art-ab-v1',
  originalSha256:hash(original),baselineSourceSha256:current.sourceSha256,
  candidateSourceSha256:candidate.sourceSha256,policy,
  candidateStatus:candidate.status,
  changedVoxels:ab.finalVoxelDifference,
  verifiedEquipmentCount:candidate.modelChosenFixtures,
  fixtureFormReview:candidate.fixtureFormReview??null,
  roomScaleReview:candidate.roomScaleReview??null,
  spatialFacadeReview:candidate.spatialFacadeReview??null,
  spatialDetail:candidate.spatialDetail??null,
  photo:'ART_AB/'+ab.preview.file,
  photoSha256:ab.preview.sha256,
  educationMaterials:{used,unverified,
   status:unverified.length?'HOLD_UNATTESTED_MATERIALS':
    'OFFLINE_MAPPING_ONLY_NOT_EDUCATION_TEST'},
  originalAuthorUnchanged:fs.readFileSync(rawFile,'utf8')===original,
  modelCalls:0,worldWrites:0,
  constructionApproved:false,nineWorldGates:Array(9).fill('BLOCKED'),
  art:'HUMAN_REVIEW_REQUIRED_NOT_ACCEPTED',
  minecraftWalking:'NOT_TESTED'};
 if(!report.originalAuthorUnchanged)fail('MODEL_ORIGINAL_CHANGED');
 fs.writeFileSync(path.join(out,'FINISH_AB_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(![6,7].includes(a.length)||a[0]!=='--raw'||a[2]!=='--source'||
     a[4]!=='--out'||(a.length===7&&
      !['--integrated','--integrated-room-scale-v2'].includes(a[6])))
   fail('CLI');
  const r=saveR125FinishAB({
   rawPath:a[1],sourcePath:a[3],outDir:a[5],integrated:a.length===7,
   fixtureForm:a[6]==='--integrated-room-scale-v2'?
    'room-scale-v2':'room-scale-v1'});
  console.log('R125_V11_FINISH_ART_SOURCE_ONLY',JSON.stringify({
   baselineSha:r.baselineSourceSha256,candidateSha:r.candidateSourceSha256,
   unverifiedMaterials:r.educationMaterials.unverified,
   image:r.photo,modelCalls:0,worldWrites:0}));
 }catch(e){
  console.error('R125_V11_FINISH_ART_HOLD',String(e?.message??e).slice(0,240));
  process.exitCode=2;
 }
}
