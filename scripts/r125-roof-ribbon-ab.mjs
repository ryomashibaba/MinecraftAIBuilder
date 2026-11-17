/** V11: A/B art from ONE saved real ArchitecturePlan; zero LLM/world calls. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {saveB143ABReview} from './r125-static-art-review.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
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
    err('AB_ROOF_ENCLOSURE_OR_AIR_HOLD_'+[
      shape.twoWideHighRoofPads,shape.verticallyConnectedTwoWideRoofPads,
      shape.unclosedEaveOrEndCells,shape.unclosedStepCells,
      Number(shape.flatRoofBaseRetained)].join('_'));
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
 // Exact source SHA is retained by rendering EACH saved B143 design alone.
 // Renaming IDs to merge them into a single gallery would change SOURCE SHA.
 const template=fs.readFileSync(path.join(repo,
  'source/ai/b143-viewer-template.html'),'utf8');
 const threeDViews=[];
 for(const [variant,design,expectedSource,expectedGeometry] of [
  ['BASELINE',a.sourceDesign,a.sourceSha256,a.geometrySha256],
  ['COMPACT',b.sourceDesign,b.sourceSha256,b.geometrySha256]]){
  const gallery=compileB143Gallery([design]);
  if(gallery.sourceHashes[0]!==expectedSource||
     gallery.geometryHashes[0]!==expectedGeometry)
    err('VIEWER_SOURCE_DRIFT');
  const html=renderB143Html(gallery,template);
  const filename='B143_'+variant+'_INTERACTIVE_3D.html';
  fs.writeFileSync(path.join(out,filename),html,{flag:'wx'});
  threeDViews.push({variant,file:filename,sha256:sha(html),
   sourceSha256:expectedSource,
   renderer:'TRUE_B143_GALLERY_NOT_MINECRAFT_SCREENSHOT'});
 }
 // One offline dashboard for human architectural comparison. The two
 // iframes show separately verified ORIGINAL B143 sources and their interiors.
 // They do not simulate Minecraft physics, material texture or player walking.
 const dashboardFile='ROOF_AB_REVIEW.html';
 const dashboard='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>MAB V11 — 屋根 A/B 建築比較</title><style>'+
  'body{margin:0;background:#101925;color:#eaf2fb;font:15px system-ui,sans-serif}'+
  'header,section{padding:16px 22px}header{background:#193047}'+
  'h1{font-size:22px;margin:0 0 8px}small{color:#bed3e5}'+
  '.compare{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px}'+
  '.view{min-width:0;background:#182a3a;border:1px solid #3e5b73;border-radius:9px;overflow:hidden}'+
  'h2{font-size:18px;margin:12px}iframe{width:100%;height:65vh;min-height:370px;border:0}'+
  'img{display:block;width:100%;height:auto}a{color:#8ee0ff}'+
  '@media(max-width:800px){.compare{grid-template-columns:1fr}iframe{height:55vh}}'+
  '</style></head><body><header><h1>MinecraftAIBuilder V11 — 同一AI設計の屋根比較</h1>'+
  '<small>左: 既存屋根 + 採光帯 / 右: 低重心屋根 + 同一採光帯。'+
  '2画面は真正B143 SOURCEの3D描画であり、Minecraft実機・歩行・美術合格を意味しません。'+
  'マウスでそれぞれ回転、室内断面も確認できます。</small></header>'+
  '<div class="compare"><div class="view"><h2>BEFORE — 通常の屋根</h2>'+
  '<iframe loading="lazy" title="通常屋根 3D" src="B143_BASELINE_INTERACTIVE_3D.html"></iframe>'+
  '</div><div class="view"><h2>AFTER — 低重心屋根</h2>'+
  '<iframe loading="lazy" title="低重心屋根 3D" src="B143_COMPACT_INTERACTIVE_3D.html"></iframe>'+
  '</div></div><section><h2>同角度の4面比較（左: 通常 / 右: 低重心）</h2>'+
  '<img alt="屋根A/B SOURCE比較" src="ART_AB/AB_OLD_LEFT_NEW_RIGHT.png">'+
  '<p>実機での見え方はMinecraft Educationで別途確認してください。'+
  '床・設備・通路はSOURCE一致ですが実歩行は未検証です。</p></section></body></html>';
 fs.writeFileSync(path.join(out,dashboardFile),dashboard,{flag:'wx'});
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
  interactive3D:threeDViews,
  artDashboard:{file:dashboardFile,sha256:sha(dashboard),
   type:'SOURCE_RENDER_ONLY',minecraftExecution:'NOT_TESTED'},
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
