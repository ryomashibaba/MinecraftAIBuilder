/**
 * Opt-in R190 first real massing path from the existing R125 free-build entry.
 * One local model request OR protected saved-plan replay. No world connection.
 * R190 author chooses spatial program, form, openings; never host retitles a
 * rejected plan or silently substitutes unverified materials.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {R190_SCHEMA,compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const endpoint='http://127.0.0.1:11434/v1/chat/completions';
const sha=v=>createHash('sha256').update(v).digest('hex');
const modelName=/^[A-Za-z0-9._:/-]{2,140}$/;
const fail=s=>{throw Error('R125_R190_'+s);};
const SYSTEM=[
 'You are a creative architect planning an original, actually usable 3D building. Return ONE JSON object only.',
 'schema: '+R190_SCHEMA+'; required keys: schema,id,title,brief,site,entrySpaceId,spaces,materials.',
 'id is a lowercase slug (3-40 characters); title,brief are meaningful text.',
 'site is {width,depth,height}, choose practical dimensions about 36..52,36..52,12..16; 16<=width/depth<=80; 10<=height<=32; site volume <= 40000 for the initial Education export.',
 'spaces: 2..4 FUNCTIONALLY DIFFERENT rooms of genuinely different sizes and elevations; choose their purposes and positions, not based on building type templates.',
 'Each space has EXACT keys id,purpose,width,depth,height,parentId,side,privacy; widths/depths 7..22, heights 7..site.height-2.',
 'First space is the entrance room: parentId=null,side=null. All others form a connected tree with parentId an earlier room id and side north/south/east/west.',
 'entrySpaceId is the first space id. Avoid placing a child on the entrance face (default south). privacy=public/shared/private.',
 'Materials are EXACT {floor,wall,roof}; choose only stone or wood for each until new Minecraft materials are verified. These map via the existing verified palette.',
 'Required glazedOpenings is an array of 1..4 {spaceId,face,offset,baseY,width,height}; faces north/south/east/west, offset 2.., width 2..4, baseY 5, height 2; place in an OUTSIDE face, avoid parent/child shared wall and entrance door.',
 'Optional roofFormIntent {spaceId,profile,axis,rise}, choose ridge or shed, axis x/z, rise 2..3; only if the roof fits the site height.',
 'Optional formIntent {spaceId,face,cornerInset} with cornerInset 2..3 for a meaningful real faceted volume, not facade ornaments.',
 'Optional entranceFace north/south/east/west, optional skyCourtIntent, optional spatialRole=open-court on a non-entry room only if explicitly desired; do not add unsupported keys.',
 'Model chooses massing, function, envelopes and explicit windows. No absolute voxel coordinates, no commands, no scripts. If a requirement is not representable, do not silently claim it has been satisfied.'
].join('\n');
const save=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});

export function compileR190FreePlan(plan,{palette,provenance='UNVERIFIED_DESIGN'}={}){
 if(!plan||plan.schema!==R190_SCHEMA)fail('PLAN_SCHEMA');
 if(!Array.isArray(plan.glazedOpenings)||plan.glazedOpenings.length<1)
  fail('EXPLICIT_MODEL_WINDOWS_REQUIRED');
 const input=JSON.stringify(plan);
 const result=compileR190SemanticPlan(plan);
 if(JSON.stringify(plan)!==input||!verifyCompiled(result.design,result.compiled)||
    result.audit?.allProgramSpacesReachable!==true||
    result.audit?.glazedOpenings?.length!==plan.glazedOpenings.length||
    result.worldWrites!==0||result.constructionApproved!==false)
  fail('SOURCE_OR_AUTHORSHIP_INVARIANT');
 const packet=exportB143EducationMakeCode({
  design:result.design,scene:result.compiled,provenance,
  groundLowestLayer:true,verifiedPalette:palette
 });
 if(packet.worldWrites!==0||packet.programExecuted!==false)
  fail('UNEXPECTED_WORLD_ACTIVITY');
 return {result,packet,modelPlanSha256:sha(Buffer.from(input))};
}

export async function runR190FreeEngine({
 prompt=null,model='qwen3:14b',planFile=null,outDir,paletteFile
}={}, {fetcher=fetch}={}){
 if(!outDir||!paletteFile||typeof fetcher!=='function'||
   (!!planFile===!!prompt)||!modelName.test(model))fail('INPUT');
 if(fs.existsSync(outDir))fail('OUTPUT_MUST_BE_NEW');
 fs.mkdirSync(outDir,{recursive:false});
 const modelDir=path.join(outDir,'model'),codeDir=path.join(outDir,'makecode');
 fs.mkdirSync(modelDir);
 let raw;
 const provenance=planFile?'UNVERIFIED_DESIGN':'LOCAL_MODEL_CAPTURE';
 const report={schema:'r125-r190-free-massing-engine-v1',
  status:'HOLD',model:planFile?null:model,modelRequests:0,
  originalResponseSha256:null,designEngine:'R190_SEMANTIC_MASSING',
  humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')};
 try{
  if(planFile){
   raw=fs.readFileSync(planFile,'utf8');
   if(raw.length>100000)fail('SAVED_PLAN_SIZE');
   save(modelDir,'SAVED_PLAN_ORIGINAL.txt',raw);
  }else{
   if(typeof prompt!=='string'||prompt.length<8||prompt.length>4000)
    fail('PROMPT_LENGTH');
   const available=await preflightR125Ollama({model,endpoint,fetcher});
   if(available.status!=='LOCAL_MODEL_LISTED')fail('LOCAL_MODEL_NOT_LISTED');
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),180000);
   let response;
   try{
    report.modelRequests=1;
    response=await fetcher(endpoint,{method:'POST',redirect:'error',
     signal:controller.signal,headers:{'Content-Type':'application/json'},
     body:JSON.stringify({model,stream:false,temperature:0.5,
      reasoning_effort:'none',max_tokens:2600,response_format:{type:'json_object'},
      messages:[{role:'system',content:SYSTEM},{role:'user',content:prompt}]})});
   }finally{clearTimeout(timeout);}
   if(!response?.ok)fail('MODEL_HTTP_'+String(response?.status));
   const body=await response.text();
   if(body.length>250000)fail('MODEL_HTTP_SIZE');
   const json=JSON.parse(body);
   if(json.choices?.length!==1||json.choices[0]?.finish_reason==='length')
    fail('MODEL_TRUNCATED');
   raw=json.choices[0]?.message?.content;
   if(typeof raw!=='string'||raw.length<20||raw.length>30000)
    fail('MODEL_ORIGINAL_MISSING');
   save(modelDir,'MODEL_RESPONSE_ORIGINAL.txt',raw);
  }
  report.originalResponseSha256=sha(Buffer.from(raw));
  const plan=JSON.parse(raw);
  const palette=JSON.parse(fs.readFileSync(paletteFile,'utf8'));
  const {result,packet,modelPlanSha256}=compileR190FreePlan(plan,{palette,provenance});
  fs.mkdirSync(codeDir);
  const {code,...exportReport}=packet;
  save(modelDir,'ARCHITECTURE_PLAN.json',result.inputPlan);
  save(modelDir,'B143_SOURCE.json',result.design);
  save(modelDir,'B143_SCENE.json',result.compiled);
  save(modelDir,'R190_SOURCE_ROUTE_AUDIT.json',result.audit);
  const gallery=compileB143Gallery([result.design]);
  const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
  save(modelDir,'index.html',renderB143Html(gallery,template));
  save(codeDir,'MAKECODE_EDUCATION.ts',code);
  save(codeDir,'EXPORT_REPORT.json',exportReport);
  report.status='SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED';
  report.modelPlanSha256=modelPlanSha256;
  report.sourceSha256=packet.sourceSha256;
  report.geometrySha256=packet.geometrySha256;
  report.plannedVoxelCount=packet.plannedVoxelCount;
  report.roomCount=result.layout.spaces.length;
  report.entranceAndRoomSourceRoutes='SOURCE_PROBES_PASS_NOT_MC_WALKING';
  report.modelAuthorship=planFile?'SAVED_PLAN_UNVERIFIED':'MODEL_RESPONSE_CAPTURED';
  return report;
 }catch(e){
  report.reason=String(e?.message??e).slice(0,500);
  return report;
 }finally{
  save(modelDir,'R190_ENGINE_REPORT.json',report);
 }
}

async function main(argv){
 const opts={};
 for(let i=0;i<argv.length;i+=2){
  if(!['--out','--palette','--prompt','--model','--plan'].includes(argv[i])||
     !argv[i+1]||Object.hasOwn(opts,argv[i]))fail('ARGS');
  opts[argv[i]]=argv[i+1];
 }
 const report=await runR190FreeEngine({outDir:opts['--out'],
  paletteFile:opts['--palette'],prompt:opts['--prompt']??null,
  planFile:opts['--plan']??null,model:opts['--model']??'qwen3:14b'});
 console.log(JSON.stringify(report));
 if(report.status!=='SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main(process.argv.slice(2)).catch(e=>{console.error(String(e?.message??e));process.exitCode=2;});
}
