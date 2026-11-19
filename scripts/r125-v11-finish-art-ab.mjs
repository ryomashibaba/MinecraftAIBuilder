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
 fixtureForm='room-scale-v1',activityContrast=false}={}){
 if(typeof integrated!=='boolean'||typeof activityContrast!=='boolean'||
    !['room-scale-v1','room-scale-v2'].includes(fixtureForm)||
    (activityContrast&&(!integrated||fixtureForm!=='room-scale-v2')))
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
 const baseline=activityContrast?
  diagnoseR125ArchitecturePlanOriginal(original,policy):current;
 if(baseline.sourceVerified!==true||
    baseline.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||
    baseline.modelChosenFixtures!==current.modelChosenFixtures||
    baseline.modelCalls!==0||baseline.worldWrites!==0||
    (activityContrast&&!baseline.sourceDesign))
  fail('ACTIVITY_AB_BASELINE_SOURCE_HOLD');
 const variantPolicy=activityContrast?
  {...policy,fixtureArt:'activity-layout-inlays'}:policy;
 const candidate=diagnoseR125ArchitecturePlanOriginal(original,variantPolicy);
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
 const beforeScene=activityContrast?compileDesign(baseline.sourceDesign):savedScene;
 if(activityContrast&&(!verifyCompiled(baseline.sourceDesign,beforeScene)||
    beforeScene.sourceSha256!==baseline.sourceSha256||
    beforeScene.geometrySha256!==baseline.geometrySha256||
    beforeScene.worldContacts!==0||
    beforeScene.BuildPlan?.operations?.length!==0))
  fail('ACTIVITY_AB_BASELINE_B143_HOLD');
 const originalCells=new Map(beforeScene.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const newCells=new Map(afterScene.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const changed=[...originalCells].filter(([loc,mat])=>newCells.get(loc)!==mat);
 if(!changed.length&&originalCells.size===newCells.size)
  fail('NO_ACTUAL_PHYSICAL_DIFFERENCE');
 let inlayChangedCells=0;
 if(activityContrast){
  const floorYs=new Set(plan.levels.map((_,i)=>1+5*i));
  const floorMaterial=MATERIALS.indexOf(plan.materials.floor);
  const inlayMaterial=MATERIALS.indexOf('accent');
  if(originalCells.size!==newCells.size||
     [...originalCells].some(([loc,mat])=>{
      const next=newCells.get(loc);
      if(next===mat)return false;
      const y=Number(loc.split(',')[1]);
      if(floorYs.has(y)&&mat===floorMaterial&&next===inlayMaterial){
       inlayChangedCells++;return false;
      }
      return true;
     })||
     inlayChangedCells<1||
     candidate.activityInlayReview?.changedCells!==inlayChangedCells||
     candidate.activityInlayReview?.occupancyUnchanged!==true)
   fail('ACTIVITY_AB_NOT_ONLY_AUTHORED_STATION_FLOOR');
 }
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
 const before=activityContrast?path.join(out,'B143_ACTIVITY_LAYOUT_V2_A.json'):sourceFile;
 if(activityContrast)fs.writeFileSync(before,
  JSON.stringify(baseline.sourceDesign,null,2)+'\n',{flag:'wx'});
 const after=path.join(out,'B143_ART_CANDIDATE_SOURCE_ONLY.json');
 fs.writeFileSync(after,JSON.stringify(candidate.sourceDesign,null,2)+'\n',{flag:'wx'});
 const ab=saveB143ABReview({beforeSourcePath:before,
  afterSourcePath:after,outDir:path.join(out,'ART_AB'),
  matchedCamera:true});
 if(ab.before.sourceSha256!==baseline.sourceSha256||
    ab.after.sourceSha256!==candidate.sourceSha256||
    ab.modelCalls!==0||ab.worldWrites!==0||
    ab.finalVoxelDifference.sameActualGeometryAndMaterial)
  fail('ART_AB_PROVENANCE_OR_DELTA_HOLD');
 const report={schema:'r125-v11-finish-art-ab-v1',
  originalSha256:hash(original),baselineSourceSha256:baseline.sourceSha256,
  ...(activityContrast?{
   contrast:'SAME_MODEL_SAME_STATIONS_INLAY_FLOOR_ONLY',
   archivedSourceSha256:current.sourceSha256,
   candidatePolicy:variantPolicy,unchangedOccupancy:true,
   changedFloorMaterialCells:inlayChangedCells,
   activityInlayReview:candidate.activityInlayReview??null,
   physicalScale:ab.preview.physicalScale}:{}),
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

/**
 * Explicit ART trial: compare standard vs steep ridge with SAME room-scale-v2,
 * furniture, model-selected rooms, access and unchanged genuine model bytes.
 * Only the roof B143 voxels may differ. Source and world gates remain strict.
 */
export function saveR125RidgeContrast({rawPath,sourcePath,outDir}={}){
 if([rawPath,sourcePath,outDir].some(x=>typeof x!=='string'||!x.trim()))
  fail('RIDGE_CONTRAST_INPUT_REQUIRED');
 const rawFile=path.resolve(rawPath),sourceFile=path.resolve(sourcePath);
 const dest=path.resolve(outDir),parent=path.dirname(dest);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
    fs.existsSync(dest))fail('RIDGE_CONTRAST_NEW_OUTPUT_REQUIRED');
 const rp=fs.realpathSync(parent);
 if(dest===ROOT||dest.startsWith(ROOT+path.sep)||rp===ROOT||
    rp.startsWith(ROOT+path.sep))fail('RIDGE_CONTRAST_OUTPUT_OUTSIDE_REPO_REQUIRED');
 for(const [f,limit] of [[rawFile,60000],[sourceFile,2000000]])
  if(!fs.existsSync(f)||!fs.statSync(f).isFile()||
     fs.statSync(f).size>limit)fail('RIDGE_CONTRAST_INPUT_MISSING');
 const original=fs.readFileSync(rawFile,'utf8');
 const plan=JSON.parse(original);
 if(plan.expression?.roofProfile!=='ridge'||
    plan.expression.roofVolume!=='raised'||
    plan.expression.ridgeProfile!==undefined||
    plan.expression.rearCourt!==undefined||
    plan.expression.rearCornerCut!==undefined)
  fail('RIDGE_CONTRAST_REQUIRES_UNMODIFIED_RAISED_RIDGE');
 const archived=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
 const archivedCompiled=compileDesign(archived);
 const initial=diagnoseR125ArchitecturePlanOriginal(original);
 if(!initial.sourceVerified||
    initial.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||
    !verifyCompiled(archived,archivedCompiled)||
    archivedCompiled.sourceSha256!==initial.sourceSha256||
    archivedCompiled.geometrySha256!==initial.geometrySha256||
    archivedCompiled.BuildPlan?.operations?.length!==0||
    archivedCompiled.worldContacts!==0)
  fail('RIDGE_CONTRAST_ORIGINAL_SOURCE_MISMATCH');
 const shared={hostDetail:'spatial-v1',fixtureArt:'activity-layout',
  fixtureForm:'room-scale-v2'};
 const a=diagnoseR125ArchitecturePlanOriginal(original,shared);
 const b=diagnoseR125ArchitecturePlanOriginal(original,
  {...shared,roofMassing:'steep-ridge-review'});
 for(const v of [a,b])
  if(v.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||
     v.sourceVerified!==true||!v.sourceDesign||
     v.originalSha256!==hash(original)||
     v.modelChosenFixtures!==initial.modelChosenFixtures||
     v.modelCalls!==0||v.worldWrites!==0)
   fail('RIDGE_CONTRAST_SOURCE_HOLD_'+String(v.compilerReason??v.status).slice(0,80));
 const ca=compileDesign(a.sourceDesign),cb=compileDesign(b.sourceDesign);
 if(!verifyCompiled(a.sourceDesign,ca)||!verifyCompiled(b.sourceDesign,cb)||
    ca.sourceSha256!==a.sourceSha256||cb.sourceSha256!==b.sourceSha256||
    ca.worldContacts!==0||cb.worldContacts!==0||
    ca.BuildPlan?.operations?.length!==0||
    cb.BuildPlan?.operations?.length!==0)
  fail('RIDGE_CONTRAST_COMPILED_HOLD');
 const topY=1+5*plan.levels.length;
 const key=v=>v[0]+','+v[1]+','+v[2];
 const cells=(scene,above)=>new Map(scene.primitives.filter(v=>
  above?v[1]>=topY:v[1]<topY).map(v=>[key(v),v[3]]));
 const belowA=cells(ca,false),belowB=cells(cb,false);
 if(belowA.size!==belowB.size||
    [...belowA].some(([k,m])=>belowB.get(k)!==m))
  fail('RIDGE_CONTRAST_UNDER_ROOF_CHANGED');
 const aboveA=cells(ca,true),aboveB=cells(cb,true);
 const changedRoofCells=[...new Set([...aboveA.keys(),...aboveB.keys()])]
  .filter(k=>aboveA.get(k)!==aboveB.get(k)).length;
 if(!changedRoofCells||a.sourceSha256===b.sourceSha256)
  fail('RIDGE_CONTRAST_NO_ROOF_DIFFERENCE');
 if(fs.readFileSync(rawFile,'utf8')!==original)
  fail('RIDGE_CONTRAST_ORIGINAL_MUTATED');
 // No output is created before all independent source and voxel checks pass.
 fs.mkdirSync(dest);
 const pathA=path.join(dest,'B143_ROOM_SCALE_V2_STANDARD_ROOF.json');
 const pathB=path.join(dest,'B143_ROOM_SCALE_V2_STEEP_ROOF.json');
 fs.writeFileSync(pathA,JSON.stringify(a.sourceDesign,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(pathB,JSON.stringify(b.sourceDesign,null,2)+'\n',{flag:'wx'});
 const ab=saveB143ABReview({beforeSourcePath:pathA,
  afterSourcePath:pathB,outDir:path.join(dest,'ART_AB'),
  matchedCamera:true});
 if(ab.before.sourceSha256!==a.sourceSha256||
    ab.after.sourceSha256!==b.sourceSha256||
    ab.finalVoxelDifference.sameActualGeometryAndMaterial||
    ab.modelCalls!==0||ab.worldWrites!==0)
  fail('RIDGE_CONTRAST_AB_PROVENANCE_HOLD');
 const crest=scene=>Math.max(...scene.primitives.map(v=>v[1]));
 const result={schema:'r125-v11-room-scale-v2-ridge-only-contrast-v1',
  originalSha256:hash(original),archivedSourceSha256:initial.sourceSha256,
  modelOriginalUnchanged:true,originalPlanPreserved:true,
  sourceVerifiedA:true,sourceVerifiedB:true,
  sourceSha256A:a.sourceSha256,sourceSha256B:b.sourceSha256,
  geometrySha256A:a.geometrySha256,geometrySha256B:b.geometrySha256,
  policyA:shared,policyB:{...shared,roofMassing:'steep-ridge-review'},
  fixtureCountA:a.modelChosenFixtures,fixtureCountB:b.modelChosenFixtures,
  sourceVoxelsA:ca.primitives.length,sourceVoxelsB:cb.primitives.length,
  roofCrestYA:crest(ca),roofCrestYB:crest(cb),
  roofTopY:topY,changedRoofCells,belowRoofGeometryAndMaterialIdentical:true,
  changedVoxels:ab.finalVoxelDifference,
  photo:'ART_AB/'+ab.preview.file,photoSha256:ab.preview.sha256,
  photoPhysicalScale:ab.preview.physicalScale,
  modelCalls:0,worldWrites:0,constructionApproved:false,
  nineWorldGates:Array(9).fill('BLOCKED'),art:'NOT_HUMAN_REVIEWED',
  minecraftWalking:'NOT_TESTED',education:'NOT_TESTED'};
 fs.writeFileSync(path.join(dest,'RIDGE_ONLY_AB_REPORT.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(![6,7].includes(a.length)||a[0]!=='--raw'||a[2]!=='--source'||
     a[4]!=='--out'||(a.length===7&&
      !['--integrated','--integrated-room-scale-v2','--roof-contrast-v2','--activity-inlays-v2'].includes(a[6])))
   fail('CLI');
  if(a[6]==='--roof-contrast-v2'){
   const r=saveR125RidgeContrast({rawPath:a[1],sourcePath:a[3],outDir:a[5]});
   console.log('R125_V11_RIDGE_ONLY_ART_SOURCE',JSON.stringify({
    shaA:r.sourceSha256A,shaB:r.sourceSha256B,
    changedRoofCells:r.changedRoofCells,
    belowRoofIdentical:r.belowRoofGeometryAndMaterialIdentical,
    image:r.photo,modelCalls:0,worldWrites:0}));
  }else{
   const r=saveR125FinishAB({
    rawPath:a[1],sourcePath:a[3],outDir:a[5],integrated:a.length===7,
    fixtureForm:['--integrated-room-scale-v2','--activity-inlays-v2'].includes(a[6])?
     'room-scale-v2':'room-scale-v1',
    activityContrast:a[6]==='--activity-inlays-v2'});
   console.log('R125_V11_FINISH_ART_SOURCE_ONLY',JSON.stringify({
    baselineSha:r.baselineSourceSha256,candidateSha:r.candidateSourceSha256,
    unverifiedMaterials:r.educationMaterials.unverified,
    ...(r.contrast?{contrast:r.contrast,
     changedFloorMaterialCells:r.changedFloorMaterialCells,
     unchangedOccupancy:r.unchangedOccupancy}:{}),
    image:r.photo,modelCalls:0,worldWrites:0}));
  }
 }catch(e){
  console.error('R125_V11_FINISH_ART_HOLD',String(e?.message??e).slice(0,240));
  process.exitCode=2;
 }
}
