/**
 * V11 offline Education material research, not an AI-authored correction.
 * Original genuine Qwen JSON and SOURCE remain untouched. A NEW, clearly
 * labeled HOST-derived study can replace only a real oven's one unverified
 * glow hearth element with the ALREADY user-attested accent semantic material.
 * No automatic palette attestation, Minecraft writes, or approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileDesign,verifyCompiled,MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {exportB143EducationMakeCode}
 from '../source/ai/r125-education-makecode-export.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R125_EDUCATION_STUDY_'+x);};
const hearth=/^fx-l[0-9]+-z[0-9]+(?:-i[0-9]+)?-hearth-glow$/;

export function buildVerifiedOvenResearchAlternative({
 originalRaw,sourceDocument,diagnosis,verifiedPalette
}={}){
 if(typeof originalRaw!=='string'||originalRaw.length<1||
    originalRaw.length>60000||typeof sourceDocument!=='string'||
    sourceDocument.length<1||sourceDocument.length>2000000)
  fail('INPUT_SIZE');
 let author,source;
 try{author=JSON.parse(originalRaw);source=JSON.parse(sourceDocument);}
 catch{fail('BAD_JSON');}
 if(!Array.isArray(author?.levels)||!Array.isArray(source?.elements)||
    !diagnosis||typeof diagnosis!=='object'||
    diagnosis.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||
    diagnosis.sourceVerified!==true||diagnosis.originalEdited!==false||
    diagnosis.originalSha256!==sha(originalRaw)||
    diagnosis.worldWrites!==0||source.id!==author.id)
  fail('SOURCE_AUTHENTICITY_HOLD');
 const independent=diagnoseR125ArchitecturePlanOriginal(originalRaw);
 if(independent.status!=='B143_SOURCE_CANDIDATE_ART_HOLD'||
    independent.sourceVerified!==true||
    independent.sourceSha256!==diagnosis.sourceSha256||
    independent.geometrySha256!==diagnosis.geometrySha256)
  fail('INDEPENDENT_AUTHOR_SOURCE_MISMATCH');
 const before=compileDesign(source);
 if(!verifyCompiled(source,before)||before.sourceSha256!==diagnosis.sourceSha256||
    before.geometrySha256!==diagnosis.geometrySha256||
    before.primitives.length!==diagnosis.occupiedVoxels||
    before.BuildPlan?.operations?.length!==0||before.worldContacts!==0)
  fail('B143_ORIGINAL_SOURCE_MISMATCH');
 const ovens=author.levels.flatMap(level=>level.spaces).reduce(
  (n,s)=>n+(s.fixtures?.filter(f=>f==='oven').length??(s.fixture==='oven'?1:0)),0);
 if(ovens<1)fail('NO_MODEL_AUTHORED_OVEN');
 const glows=source.elements.filter(e=>e.material==='glow');
 if(glows.length===0)fail('NO_UNVERIFIED_OVEN_HEARTH');
 if(glows.some(e=>e.shape!=='box'||e.mode!=='add'||!hearth.test(e.id)))
  fail('UNVERIFIED_GLOW_OUTSIDE_ORIGINAL_OVEN');
 if(!verifiedPalette||verifiedPalette.schema!=='r125-education-user-verified-palette-v1'||
    verifiedPalette.version!=='26.33'||
    verifiedPalette.blocks?.accent?.blockName!=='yellow_concrete')
  fail('ACCENT_ATTESTATION_REQUIRED');
 const derived={...source,elements:source.elements.map(e=>
  e.material==='glow'?{...e,material:'accent'}:e)};
 const after=compileDesign(derived);
 if(!verifyCompiled(derived,after)||after.primitives.length!==before.primitives.length||
    after.worldContacts!==0||after.BuildPlan?.operations?.length!==0)
  fail('DERIVED_SOURCE_OR_WORLD_GATES');
 const beforeMap=new Map(before.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const afterMap=new Map(after.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const originalGlowId=MATERIALS.indexOf('glow'),accentId=MATERIALS.indexOf('accent');
 let changed=0,oldGlow=0;
 for(const [key,oldMaterial] of beforeMap){
  if(!afterMap.has(key))fail('VOXEL_REMOVED');
  const m=afterMap.get(key);
  if(oldMaterial===originalGlowId){
   oldGlow++;
   if(m!==accentId)fail('HEARTH_REMAP_UNEXPECTED_MATERIAL');
   changed++;
  }else if(m!==oldMaterial)fail('NON_HEARTH_VOXEL_CHANGED');
 }
 if(afterMap.size!==beforeMap.size||oldGlow<1||oldGlow!==changed||
    [...afterMap.values()].includes(originalGlowId))
  fail('GEOMETRY_OR_OTHER_GLOW_HOLD');
 const packet=exportB143EducationMakeCode({
  design:derived,scene:after,provenance:'LOCAL_MODEL_CAPTURE',
  verifiedPalette,legacyStoneFallback:false,unverifiedTestWorldPreview:false
 });
 if(packet.materialMode!=='STRICT_USER_ATTESTED'||
    packet.plannedVoxelCount!==after.primitives.length||
    packet.sourceSha256!==after.sourceSha256||
    packet.worldWrites!==0||packet.programExecuted!==false||
    packet.BuildPlan.operations.length!==0||
    packet.gates.some(x=>x!=='BLOCKED'))
  fail('STRICT_MAKECODE_HOLD');
 const report={
  schema:'r125-v11-host-derived-oven-material-study-v1',
  status:'HOST_DERIVED_MATERIAL_ONLY_NOT_MODEL_AUTHORED',
  originalModelSha256:sha(originalRaw),
  originalSourceSha256:before.sourceSha256,
  originalGeometrySha256:before.geometrySha256,
  hostAlternativeSourceSha256:after.sourceSha256,
  hostAlternativeGeometrySha256:after.geometrySha256,
  alteredElementCount:glows.length,changedMaterialCells:changed,
  unchangedOccupiedCoordinates:true,
  onlyOldGlowToAttestedAccent:true,
  semanticReplacement:{from:'glow',to:'accent',
   verifiedEducationBlock:'yellow_concrete'},
  education:{status:'STRICT_OFFLINE_PACKET_GENERATED_NOT_EXECUTED',
   originalEducationStatus:'HOLD_UNATTESTED_GLOW',
   derivedPacketSha256:packet.makecodeSourceSha256,
   strictPaletteSha256:packet.verifiedPaletteSha256,
   materialMode:packet.materialMode},
  originalAITextPreserved:true,originalSourcePreserved:true,
  notAnAIAuthoredCorrection:true,notAnArtPass:true,
  modelCalls:0,worldWrites:0,minecraftWalking:'NOT_TESTED',
  humanArt:'NOT_REVIEWED',constructionApproved:false,
  nineWorldGates:Array(9).fill('BLOCKED')
 };
 return {derived,packet,report};
}
export function saveVerifiedOvenResearchAlternative({
 rawPath,sourcePath,diagnosisPath,outDir
}={}){
 if([rawPath,sourcePath,diagnosisPath,outDir].some(
  s=>typeof s!=='string'||!s))fail('REQUIRED_PATHS');
 const filenames=[rawPath,sourcePath,diagnosisPath].map(s=>path.resolve(s));
 const dest=path.resolve(outDir),parent=path.dirname(dest);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
    fs.existsSync(dest))fail('OUTPUT_DIRECTORY_MUST_BE_NEW');
 const parentReal=fs.realpathSync(parent);
 if(dest===root||dest.startsWith(root+path.sep)||
    parentReal===root||parentReal.startsWith(root+path.sep))
  fail('OUTPUT_INSIDE_REPOSITORY');
 const [raw,source,diag]=filenames.map((f,i)=>{
  if(!fs.existsSync(f)||!fs.statSync(f).isFile()||
     fs.statSync(f).size>[60000,2000000,500000][i])
   fail('PRIVATE_SOURCE_MISSING_OR_OVERSIZE');
  return fs.readFileSync(f,'utf8');
 });
 let diagnosis;
 try{diagnosis=JSON.parse(diag);}catch{fail('BAD_DIAGNOSIS_JSON');}
 const palette=JSON.parse(fs.readFileSync(path.join(root,
  'configs/r125-education-verified-palette-v26.33.json'),'utf8'));
 const outcome=buildVerifiedOvenResearchAlternative({
  originalRaw:raw,sourceDocument:source,diagnosis,verifiedPalette:palette});
 // Only after every independent provenance, geometry and palette gate passed.
 fs.mkdirSync(dest);
 fs.writeFileSync(path.join(dest,'HOST_DERIVED_B143_NOT_AI_ORIGINAL.json'),
  JSON.stringify(outcome.derived,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(dest,'OFFLINE_MAKECODE_NOT_APPROVED.ts'),
  outcome.packet.code,{flag:'wx'});
 fs.writeFileSync(path.join(dest,'RESEARCH_ONLY_REPORT.json'),
  JSON.stringify(outcome.report,null,2)+'\n',{flag:'wx'});
 if(sha(fs.readFileSync(filenames[0]))!==outcome.report.originalModelSha256||
    sha(fs.readFileSync(filenames[1]))!==sha(source))
  fail('PRIVATE_INPUT_CHANGED_DURING_STUDY');
 return outcome.report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==8||a[0]!=='--raw'||a[2]!=='--source'||
     a[4]!=='--diagnosis'||a[6]!=='--out')fail('CLI');
  const report=saveVerifiedOvenResearchAlternative({
   rawPath:a[1],sourcePath:a[3],diagnosisPath:a[5],outDir:a[7]});
  console.log('R125_V11_OVEN_MATERIAL_RESEARCH_ONLY',JSON.stringify({
   originalSourceSha256:report.originalSourceSha256,
   alternateSourceSha256:report.hostAlternativeSourceSha256,
   changedMaterialCells:report.changedMaterialCells,
   strictPacket:report.education.status,modelCalls:0,worldWrites:0}));
 }catch(err){
  console.error('R125_V11_OVEN_MATERIAL_HOLD',String(err?.message??err).slice(0,300));
  process.exitCode=2;
 }
}
