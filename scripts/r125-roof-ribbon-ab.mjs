/** V11: A/B art from ONE saved real ArchitecturePlan; zero LLM/world calls. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {saveB143ABReview} from './r125-static-art-review.mjs';
import {inspectRoofAir} from './r125-roof-interior-study.mjs';
import {compileDesign,verifyCompiled,MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=s=>createHash('sha256').update(s).digest('hex');
const err=s=>{throw Error('V11_ROOF_AB_'+s);};
export function compareR125RoofRibbon({rawFile,outDir,massing='baseline',education=false}={}){
 if(!rawFile||!outDir)err('REQUIRE_RAW_OUT');
 if(!['baseline','compact-sawtooth'].includes(massing))err('MASSING_MODE');
 if(typeof education!=='boolean'||(education&&massing!=='compact-sawtooth'))
  err('EDUCATION_REQUIRES_COMPACT_AB');
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
 // Export from the EXACT TWO B143 A/B designs, not a second HOST compile
 // with implicit defaults. Strict verified palette; unknown materials HOLD.
 let educationPackets=null;
 if(education){
  const palette=JSON.parse(fs.readFileSync(path.join(repo,
   'configs/r125-education-verified-palette-v26.33.json'),'utf8'));
  // One Code Builder paste per candidate now includes the existing movement
  // probe. Its code is read-only and never changes the B143 building plan.
  const movement=fs.readFileSync(path.join(repo,
   'scripts/R125_V11_EDUCATION_INPUT_CHECK.ts'),'utf8');
  if(!movement.includes('player.onChat("mabwhere"')||
     !movement.includes('player.onChat("mabwalk"')||
     /\bblocks\s*\.|\bplayer\s*\.\s*teleport\s*\(/.test(movement))
   err('MOVEMENT_PROBE_NOT_READ_ONLY');
  const prepare=(diagnosis)=>{
   const design=diagnosis.sourceDesign,scene=compileDesign(design);
   if(!verifyCompiled(design,scene)||
      scene.sourceSha256!==diagnosis.sourceSha256||
      scene.geometrySha256!==diagnosis.geometrySha256)
    err('EDUCATION_SOURCE_MISMATCH');
   const base=exportB143EducationMakeCode({design,scene,
    provenance:'UNVERIFIED_DESIGN',groundLowestLayer:true,
    verifiedPalette:palette});
   const code=base.code+'\n'+movement;
   const packet={...base,code,makecodeSourceSha256:sha(code),
    movementProbeEmbedded:true};
   if(packet.sourceSha256!==diagnosis.sourceSha256||
      packet.geometrySha256!==diagnosis.geometrySha256||
      packet.worldWrites!==0||packet.programExecuted!==false||
      packet.materialMode!=='STRICT_USER_ATTESTED')err('EDUCATION_PACKET_HOLD');
   return packet;
  };
  educationPackets={before:prepare(a),after:prepare(b)};
 }
 // Verify the author-authored program, entrance, furniture and all real
 // solid/air geometry BELOW the roof spring line are identical in B143.
 // Comparing actual voxels guards against accidental HOST layout regressions.
 const top=1+5*plan.levels.length;
 const sceneA=compileDesign(a.sourceDesign),sceneB=compileDesign(b.sourceDesign);
 if(!verifyCompiled(a.sourceDesign,sceneA)||
    !verifyCompiled(b.sourceDesign,sceneB)||
    sceneA.sourceSha256!==a.sourceSha256||
    sceneB.sourceSha256!==b.sourceSha256)
   err('AB_SOURCE_MISMATCH');
 let unchangedUnderRoofVoxels=0,roofAir=null;
 if(compact){
  const below=scene=>new Map(scene.primitives.filter(v=>v[1]<top)
   .map(v=>[v.slice(0,3).join(','),v[3]]));
  const oldInterior=below(sceneA),newInterior=below(sceneB);
  if(oldInterior.size!==newInterior.size||
     [...oldInterior].some(([key,material])=>newInterior.get(key)!==material))
    err('AB_INTERIOR_OR_PROGRAM_DRIFT');
  unchangedUnderRoofVoxels=oldInterior.size;
  const roofShape=s=>inspectRoofAir({compiled:s.scene},{
   design:s.design,compiled:s.scene,plan});
  const previous=roofShape({scene:sceneA,design:a.sourceDesign});
  const reduced=roofShape({scene:sceneB,design:b.sourceDesign});
  for(const shape of [previous,reduced])
   if(shape.flatRoofBaseRetained||
      shape.unclosedEaveOrEndCells!==0||
      shape.unclosedStepCells!==0||
      shape.verticallyConnectedTwoWideRoofPads<1)
    err('AB_ROOF_ENCLOSURE_OR_AIR_HOLD');
  roofAir={before:{twoWideHighPads:previous.twoWideHighRoofPads,
   verticallyConnectedPads:previous.verticallyConnectedTwoWideRoofPads},
   after:{twoWideHighPads:reduced.twoWideHighRoofPads,
    verticallyConnectedPads:reduced.verticallyConnectedTwoWideRoofPads},
   enclosedEavesAndSteps:true,
   actualMinecraftWalking:'NOT_TESTED'};
  const glass=MATERIALS.indexOf('glass');
  if(!sceneA.primitives.some(v=>v[1]>=top&&v[3]===glass)||
     !sceneB.primitives.some(v=>v[1]>=top&&v[3]===glass))
    err('AB_SKYLIGHT_LOST');
 }
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
 let educationPreview=null;
 if(educationPackets){
  const rows=[['BASELINE',educationPackets.before],
   ['COMPACT',educationPackets.after]];
  const packets=[];
  for(const [variant,packet] of rows){
   const {code,...report}=packet;
   const codeName='MAKECODE_'+variant+'.ts';
   const reportName='EXPORT_'+variant+'.json';
   fs.writeFileSync(path.join(out,codeName),code,{flag:'wx'});
   fs.writeFileSync(path.join(out,reportName),
    JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   packets.push({variant,codeFile:codeName,reportFile:reportName,
    sourceSha256:report.sourceSha256,
    makecodeSourceSha256:report.makecodeSourceSha256,
    plannedVoxelCount:report.plannedVoxelCount,
    materialMode:report.materialMode,
    movementProbeEmbedded:report.movementProbeEmbedded===true});
  }
  educationPreview={packets,worldExecution:'NOT_TESTED',
   instruction:'Use existing dedicated flat test world, inspect unused site; paste each variant once. Run mabwhere and mabwalk outdoors then indoors, and mabset, mabbuild, mabverify',
   actualMinecraftWalking:'NOT_TESTED'};
 }
 const result={schema:compact?'mab-v11-roof-massing-ab-v1':'mab-v11-roof-ribbon-ab-v1',
  originalSha256:hash,originalEdited:false,
  sourceSha256Before:a.sourceSha256,sourceSha256After:b.sourceSha256,
  occupiedVoxels:a.occupiedVoxels,changedMaterial:diff.changedMaterial,
  ...(compact?{massing,occupiedVoxelsAfter:b.occupiedVoxels,
   added:diff.added,removed:diff.removed,roofCrestY:crests,
   skylightPolicy:'SAME_SAWTOOTH_RIBBON_BOTH_SIDES',
   unchangedUnderRoofVoxels,belowRoofGeometryAndMaterialIdentical:true,
   roofAir}:{}),
  image:path.join(out,'ART_AB',ab.preview.file),
  modelCalls:0,worldWrites:0,minecraftWalking:'NOT_TESTED',
  humanArt:'NOT_REVIEWED',...(educationPreview?{education:educationPreview}:{})};
 fs.writeFileSync(path.join(out,'REVIEW.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const x=process.argv.slice(2);
  const eduCount=x.filter(v=>v==='--education').length;
  if(eduCount>1)err('CLI');
  const args=x.filter(v=>v!=='--education');
  if(![4,6].includes(args.length)||args[0]!=='--raw'||args[2]!=='--out'||
   (args.length===6&&(args[4]!=='--massing'||args[5]!=='compact-sawtooth')))err('CLI');
  console.log('V11_ROOF_AB',JSON.stringify(compareR125RoofRibbon({
   rawFile:args[1],outDir:args[3],education:eduCount===1,
   ...(args.length===6?{massing:args[5]}:{})})));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
