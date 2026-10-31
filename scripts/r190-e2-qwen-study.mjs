/**
 * E2 first REAL local Qwen architectural authoring study (one request only).
 * AI authors the complete B143 geometry, program, access and daylight,
 * not a predefined architecture or host patch. No Minecraft or MakeCode.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {requestLocalModel} from './r190-e1-two-stage.mjs';
import {runE2SavedSource} from './r190-e2-offline-source.mjs';
import {openE1ResultFolder} from './r190-e1-open-result-folder.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(path.dirname(ROOT),'MinecraftAIBuilder-E1-Outputs');
const sha=x=>createHash('sha256').update(x).digest('hex');
const save=(dir,name,val)=>fs.writeFileSync(path.join(dir,name),
 typeof val==='string'?val:JSON.stringify(val,null,2)+'\n',{flag:'wx'});
const error=e=>String(e?.message??e).slice(0,500);
export const E2_QWEN_SYSTEM=Object.freeze([
 'You are a creative architect and procedural 3D design engineer. Design a new functional small RESEARCH AND PROTOTYPING FACILITY for Minecraft Education.',
 'YOU must author ALL solids, cuts, room locations, exterior wall openings, roof shape, entrance, materials and functional zones yourself. The host will not move, repair or add any geometry.',
 'This is NOT a box-placement exercise. Use original coherent architectural composition, visually distinct wings, a legible covered arrival and a meaningful non-box B143 shape when appropriate. Architectural function wins over random decoration.',
 'Return precisely ONE JSON object, NO markdown. This is a SOURCE-only experiment, NOT a Minecraft command.',
 'EXACT top-level fields: schema,sourceDesign,programSpaces,entrance,glazedOpenings.',
 'schema="minecraftaibuilder-e2-authored-architecture-v1".',
 'sourceDesign fields: schema,id,title,brief,designOnly,bounds,elements.',
 'sourceDesign.schema="minecraftaibuilder-b143-building-dsl-v1", designOnly=true; id is lowercase ASCII kebab-case length 3..48.',
 'bounds={width,height,depth}, choose roughly width/depth 28..44, height 12..18, all coordinates are LOCAL integer voxel coordinates [x,y,z] within 0..bounds-1.',
 'elements: ordered 8..35 fully authored B143 primitives. Each element has id,shape,mode and applicable fields. Use no arbitrary metadata, world coordinates, scripts or unsupported operations.',
 'BOX add: {id,shape:"box",mode:"add",material:"stone"|"wood"|"glass",origin:[x,y,z],size:[w,h,d]}, optionally shell:1 for hollow floor+walls+roof of one continuous envelope. BOX cut: {id,shape:"box",mode:"cut",origin:[x,y,z],size:[w,h,d]}, NO material.',
 'Other genuine shape option: cylinder add with material and origin:[x,y,z],axis:"x"|"y"|"z",radius integer>=1,length integer>=1; ellipsoid add with center:[x,y,z],radii:[rx,ry,rz]; or beam add with start,end,thickness. All domains strictly within bounds. Only choose curved shapes which have meaningful roof/entry structure.',
 'Order matters: ADD walls/floors/roofs first; CUT doors and windows; ADD glass LAST. Cutting later than windows can silently erase them.',
 'Each corridor and EACH interior room must have actual horizontal floor blocks at y=1, supported 2x2 space at y=2 and y=3 with no walls. Roof witness above room y>=4. An entire 2x2 standing pad must be valid.',
 'programSpaces: 2..4 entries, each EXACTLY {id,purpose,zone,witness}. id ASCII lowercase kebab-case. purpose meaningful Japanese. zone=[x,z,width,depth] within bounds, width/depth>=4. witness=[x,z] is the LOWER LEFT of real 2x2 walkable floor inside that zone.',
 'Do not generate a wall or partition across the only route between entrance and rooms. If you generate a partition, you MUST CUT a 2-block-wide real opening through it with free y=2 and y=3.',
 'entrance EXACTLY {spaceId,face,approachPad,arrivalPad}. spaceId refers to entrance programSpace. face north/south/east/west. approachPad is 2x2 real floor at site BOUNDARY: south=>z=0, north=>z=bounds.depth-2, west=>x=0,east=>x=bounds.width-2. arrivalPad is 2x2 walkable inside entrance programSpace.',
 'A continuous 2x2 floor path must physically connect approachPad at boundary to arrivalPad and EVERY programSpace witness. For a 2-block-wide path, no walls at either y=2 or y=3 at ANY intermediate pad.',
 'glazedOpenings: 1..3 entries EXACTLY {spaceId,face,origin,width,height}. origin=[x,y,z], width 2..8, height 2..4. Glass begins y>=3 and fits fully within source bounds. Both inner and outer adjacent cells must be AIR at each glass voxel.',
 'A window on south/north runs along X; on east/west along Z. Use real glass element whose voxels exactly match window rectangle, preserve real stone or wood sill at y-1 and header at y+height, and ensure exterior ray towards site boundary is clear of all solids.',
 'Window must face outside air, with its interior-adjacent cells within its referenced programSpace zone. Avoid glazing a shared wall between two wings.',
 'Use only reliable B143 material names stone,wood,glass for this first bounded source trial. This is NOT a claim of full Minecraft Education palette support.',
 'Never output unsupported fields, dangling references, inaccessible rooms, floating roofs, fake windows, spatially impossible cuts, or arbitrary exterior ornaments. Validate all element positions and B143 domain bounds mentally before final JSON.',
 'Return ONLY the single complete model-authored E2 JSON object.'
].join('\n'));

export const E2_QWEN_RESEARCH_BRIEF=[
 '自主設計課題: 来客受付、共同製作スペース、静かな研究スペースをもつ小規模な研究・試作施設。',
 '空間構成はモデル自身が考え、外側の姿から機能が読み取れる独創的な建築にすること。',
 '従来E1は3室の箱が同じ高さに並び、広い平らな屋根・単調な壁・弱い入口・窓の少なさが美術HOLDだった。',
 'E2はモデルが実立体を著作できるため、建物の優先順位、立体の高低差、屋根の意味ある造形、入りやすさと採光を改善する。',
 'ただし建築内部を2×2幅で歩けること、屋根とガラスが実在することを必ず優先する。',
 'E1研究施設の原本は上書きせず、完全に新しい独立案を作成する。'
].join('\n');

export async function runE2QwenStudy({
 model='qwen3:14b',outRoot=OUT,maxTokens=5200,timeoutMs=360000
}={}, {request=requestLocalModel}={}){
 if(typeof request!=='function'||!/^[A-Za-z0-9._:/-]{2,140}$/.test(model)||
  !Number.isSafeInteger(maxTokens)||maxTokens<800||maxTokens>8000||
  !Number.isSafeInteger(timeoutMs)||timeoutMs<10000||timeoutMs>600000)
  throw Error('E2_QWEN_BAD_CONFIGURATION');
 const synthetic=request!==requestLocalModel;
 fs.mkdirSync(outRoot,{recursive:true});
 const directory=fs.mkdtempSync(path.join(path.resolve(outRoot),'E2-qwen-'));
 const report={schema:'minecraftaibuilder-e2-first-local-qwen-study-v1',
  provenance:synthetic?'TEST_DOUBLE_ONLY':'REAL_LOCAL_QWEN_REQUEST_ATTEMPT',
  model,modelRequests:0,syntheticStageCalls:0,
  status:'SOURCE_HOLD',sourceReady:false,rawModelOriginalPresent:false,
  modelOriginalSha256:null,sourceReportRelativePath:null,
  sourceSha256:null,geometrySha256:null,worldWrites:0,worldContacts:0,
  constructionApproved:false,makecodeExported:false,
  humanArt:'NOT_REVIEWED',minecraftPlayerWalking:'NOT_TESTED',
  automaticRetries:0,modelAuthoredGeometry:'NOT_YET_VERIFIED'};
 save(directory,'E2_MODEL_REQUEST_INTENT.json',{
  schema:'minecraftaibuilder-e2-first-qwen-prompt-v1',model,
  system:E2_QWEN_SYSTEM,user:E2_QWEN_RESEARCH_BRIEF,
  maxTokens,timeoutMs,explicitMaximumModelRequests:1,
  synthetic,noTemplateGeometryInjected:true,
  worldWrites:0,constructionApproved:false});
 const rawFile=path.join(directory,'QWEN_E2_ORIGINAL.txt');
 let rawCaptured=null;
 function preserve(raw,{finishReason=null}={}){
  if(typeof raw!=='string'||raw.length>150000)throw Error('E2_QWEN_RAW_SIZE');
  if(rawCaptured!==null){
   if(rawCaptured!==raw)throw Error('E2_QWEN_RAW_CHANGED_WITHIN_ONE_REQUEST');
   return;
  }
  rawCaptured=raw;save(directory,'QWEN_E2_ORIGINAL.txt',raw);
  report.rawModelOriginalPresent=true;
  report.modelOriginalSha256=sha(raw);
  report.modelFinishReason=finishReason;
 }
 try{
  const answer=await request({stage:'E2_ARCHITECTURE',model,
   system:E2_QWEN_SYSTEM,user:E2_QWEN_RESEARCH_BRIEF,
   maxTokens,timeoutMs,
   onAttempt:()=>{if(synthetic)report.syntheticStageCalls++;else report.modelRequests++;},
   onRaw:preserve});
  if(typeof answer?.raw!=='string')throw Error('E2_QWEN_EMPTY_RESPONSE');
  preserve(answer.raw);
  const built=runE2SavedSource({planFile:rawFile,outRoot:directory});
  report.sourceReportRelativePath=path.relative(directory,
   path.join(built.dir,'E2_SOURCE_REPORT.json'));
  if(built.authorOriginalSha256!==report.modelOriginalSha256)
   throw Error('E2_QWEN_SOURCE_ORIGINAL_SHA_MISMATCH');
  if(built.status!=='SOURCE_READY_ART_HOLD'){
   report.reason=built.reason??'E2_QWEN_SOURCE_HOLD';
   report.sourceDetail=built.status;
  }else{
   report.sourceReady=true;
   report.status='SOURCE_READY_ART_HOLD';
   report.modelAuthoredGeometry=synthetic?'SYNTHETIC_FIXTURE_ONLY':
    'LOCAL_MODEL_ORIGINAL_SOURCE_VERIFIED_NOT_ART_ACCEPTED';
   report.sourceSha256=built.sourceSha256;
   report.geometrySha256=built.geometrySha256;
   report.sourceVoxelCount=built.sourceVoxelCount;
   report.programSpaces=built.programSpaces;
   report.glazedOpenings=built.glazedOpenings;
   report.viewerRelativePath=path.relative(directory,path.join(built.dir,'index.html'));
  }
 }catch(e){report.reason=error(e);}
 save(directory,'E2_QWEN_REPORT.json',report);
 console.log('E2 Qwen study saved: '+path.join(directory,'E2_QWEN_REPORT.json'));
 console.log('E2 status: '+report.status+'; source: '+(report.sourceReady?'READY':'HOLD')+
  '; real model requests: '+report.modelRequests);
 return {dir:directory,...report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runE2QwenStudy().then(r=>{
  const opened=openE1ResultFolder(path.join(r.dir,'E2_QWEN_REPORT.json'));
  if(opened.attempted)console.log('E2 result folder opening: '+opened.folder);
  if(!r.sourceReady)process.exitCode=2;
 }).catch(e=>{console.error(error(e));process.exitCode=2;});
}
