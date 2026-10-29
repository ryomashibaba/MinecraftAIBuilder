/**
 * R190-AW: pure OFFLINE intake of a preserved original architecture response.
 * It DOES NOT infer model authorship, execute a model, repair user/model
 * geometry, certify art, contact Minecraft or alter prior evidence.
 *
 * This is a LOCAL command. Never attach real user output to GitHub CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {compileR190AQParti,R190AQ_SCHEMA} from '../source/ai/r190aq-architectural-parti.mjs';
import {auditR190ARStructuralContinuity} from '../source/ai/r190ar-structure-audit.mjs';
import {reviewR190ATZones,R190AT_SCHEMA} from '../source/ai/r190at-functional-zones.mjs';
import {reviewR190AUMandatoryForum,R190AU_SCHEMA} from '../source/ai/r190au-mandatory-forum.mjs';
import {reviewR190ASCoDesign,R190AS_SCHEMA} from '../source/ai/r190as-integrated-architecture.mjs';
import {verifyCompiled,compileDesign,SCHEMA as B143_SCHEMA} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const H=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190AW_'+x);};
const safe=()=>({readiness:'NOT_PREPARED',executionAllowed:false,
 constructionApproved:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,art:'ART_HOLD'});
const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false});
function readOriginal(p,min,max){
 if(!path.isAbsolute(p)||!fs.existsSync(p))fail('ABSOLUTE_EXISTING_INPUT_REQUIRED');
 const stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<min||stat.size>max)
  fail('INVALID_OR_SYMLINK_INPUT');
 const data=fs.readFileSync(p);
 if(data.length!==stat.size)fail('UNSTABLE_BYTES');
 try{return {bytes:data,utf8:decoder.decode(data),sha256:H(data)};}
 catch{fail('INVALID_UTF8');}
}
function pathSafe(response,brief,out){
 const result=path.resolve(out),inputs=[path.resolve(response),path.resolve(brief)];
 if(!path.isAbsolute(out)||inputs.some(x=>!path.isAbsolute(x)))fail('ABSOLUTE_PATHS');
 if(new Set(inputs).size!==2||inputs.some(x=>x===result)||
    fs.existsSync(result))fail('OUTPUT_NOT_FRESH');
 const parent=fs.realpathSync(path.dirname(result));
 if(!fs.statSync(parent).isDirectory())fail('OUTPUT_PARENT');
 // Original inputs are regular files, never directories. A fresh output
 // subfolder beside their files is safe and the expected low-friction usage.
 // Only reject overlap with the ACTUAL input file paths and existing output.
 // Do not reject merely because an input symlink's parent is the output parent.
 if(inputs.some(x=>result===x||result.startsWith(x+path.sep)))
  fail('OUTPUT_OVERLAPS_SOURCE_FILE');
}
const supported=[B143_SCHEMA,R190AQ_SCHEMA,R190AS_SCHEMA,R190AT_SCHEMA,R190AU_SCHEMA];
function inspectRaw(raw){
 let parsed;
 try{parsed=JSON.parse(raw);}catch{fail('INVALID_RAW_JSON');}
 if(!parsed||Array.isArray(parsed)||typeof parsed!=='object'||
    !supported.includes(parsed.schema))fail('UNSUPPORTED_OR_WRAPPED_IR_SCHEMA');
 // Native B143 is category-neutral; this permits original works without
 // a mandatory sky-court or predetermined room/hall count. Do not certify
 // function, outdoor exposure, stairs or actual player circulation here.
 if(parsed.schema===B143_SCHEMA){
  const compiled=compileDesign(parsed);
  if(!verifyCompiled(parsed,compiled))fail('B143_INDEPENDENT_VERIFICATION');
  for(const c of compiled.stats.designOperations)
   if(c.mode==='cut'&&c.removed<1)fail('NATIVE_B143_INEFFECTIVE_VOID');
  const structure=auditR190ARStructuralContinuity({
   design:parsed,compiled,modelCallsByCompiler:0,...safe()
  });
  if(structure.detachedVoxelCount!==0)fail('SOURCE_HAS_FLOATING_MASSES');
  return {design:parsed,compiled,source:null,
   audit:{kind:'NATIVE_CATEGORY_NEUTRAL_B143',
    physicalSky:'NOT_TESTED',sourceCirculation:'NOT_TESTED',
    roofPerformance:'NOT_TESTED',
    structural:structure.status,
    authorShapeCount:parsed.elements.length,
    modelDecidedBuildingTypology:'NOT_ESTABLISHED',
    houseOrMuseumOrOther:'NOT_INFERRED'}};
 }
 // No fallback, incomplete source fix-up, synthesized walls, inferred supports.
 if(parsed.schema===R190AQ_SCHEMA){
  const r=compileR190AQParti(parsed);
  const structure=auditR190ARStructuralContinuity(r);
  if(structure.detachedVoxelCount!==0)fail('SOURCE_HAS_FLOATING_MASSES');
  return {design:r.design,compiled:r.compiled,source:r,
   audit:{kind:'AQ_SOURCE_ONLY',physicalSky:r.audit.openSkyColumns,
    route: r.audit.allAnchorsReachable,structural:structure.status,
    modelDidNotSupplyFunctionZones:true}};
 }
 if(parsed.schema===R190AS_SCHEMA){
  const r=reviewR190ASCoDesign(parsed);
  return {design:r.actualB143Design,compiled:r.compiled,source:r,
   audit:{kind:'AS_CO_DESIGN',physicalSky:r.sourceAudit.openSkyColumns,
    route:r.sourceAudit.allAnchorsReachable,structural:r.contactAudit.status,
    authoredPairCount:r.supportedEnvelopePairs.length}};
 }
 if(parsed.schema===R190AT_SCHEMA){
  const r=reviewR190ATZones(parsed);
  return {design:r.source.design,compiled:r.source.compiled,source:r,
   audit:{kind:'AT_FUNCTIONAL_ZONES',physicalSky:r.source.audit.openSkyColumns,
    route:r.source.audit.allAnchorsReachable,structural:r.structure.status,
    physicalZones:r.zones}};
 }
 const r=reviewR190AUMandatoryForum(parsed);
 return {design:r.source.source.design,compiled:r.source.source.compiled,source:r,
  audit:{kind:'AU_MANDATORY_FORUM',
   physicalSky:r.source.source.audit.openSkyColumns,
   route:r.routeAudit.everyTwoWideGroundRouteRequiresSky,
   sourceWitnessLength:r.routeAudit.sourceRouteWitness.length,
   structural:r.source.structure.status,
   physicalZones:r.source.zones}};
}
const write=(p,b)=>fs.writeFileSync(p,b,{flag:'wx'});
const json=(p,v)=>write(p,JSON.stringify(v,null,2)+'\n');
export function reviewR190AWPreservedOriginal({
 responsePath,briefPath,outDir,expectedSha256=null
}){
 if(typeof responsePath!=='string'||typeof briefPath!=='string'||
    typeof outDir!=='string')fail('ARGS');
 pathSafe(responsePath,briefPath,outDir);
 const original=readOriginal(responsePath,2,200000),
  brief=readOriginal(briefPath,8,8000);
 if(expectedSha256!==null&&
    (!/^[0-9a-f]{64}$/.test(expectedSha256)||expectedSha256!==original.sha256))
  fail('MODEL_ORIGINAL_SHA_MISMATCH');
 const evidence={schema:'minecraftaibuilder-r190aw-saved-original-readonly-v1',
  provenance:'UNVERIFIED_USER_SUPPLIED_BYTES_CANNOT_PROVE_MODEL_AUTHORSHIP',
  original:{sha256:original.sha256,bytes:original.bytes.length,
   originalSourceCopiedWithoutChanges:true,providerIdentity:'UNVERIFIED',
   providerCallsByThisReview:0},
  independentUserBrief:{sha256:brief.sha256,bytes:brief.bytes.length,
   semanticRequirementsSatisfied:'NOT_CERTIFIED'},
  outputSourceClassification:'NOT_EVALUATED',
  originalArchitecturalAesthetics:'NOT_CERTIFIED',
  originalBuildingFunction:'NOT_CERTIFIED',
  actuallyModelGenerated:'NOT_ESTABLISHED',
  actualMinecraftWalking:'NOT_TESTED',
  actualMaterialEngineering:'NOT_CERTIFIED',
  reviewerAddsNoShapes:true,
  sourceProof:null,realSourceViewerProduced:false,
  modelCallsByReview:0,officialArtAdoptions:0,...safe()};
 const outputs=[];
 let failure=null,review=null;
 try{
  review=inspectRaw(original.utf8);
  if(!verifyCompiled(review.design,review.compiled))
   fail('B143_INDEPENDENT_VERIFICATION');
  evidence.sourceProof=review.audit;
  evidence.outputSourceClassification=
   'AUTHOR_ORIGIN_UNVERIFIED_REAL_B143_COMPILED';
  evidence.realSourceViewerProduced=true;
  const template=fs.readFileSync(
   new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
  const html=renderB143Html(compileB143Gallery([review.design]),template);
  if(!html.includes('<body>'))fail('B143_VIEWER_NOT_GENERATED');
  outputs.push(['UNAPPROVED_TRUE_B143_SOURCE.json',
   JSON.stringify(review.design,null,2)+'\n']);
  outputs.push(['UNAPPROVED_TRUE_B143_3D.html',html.replace(
   '<body>','<body><aside style="font:15px system-ui;padding:12px;background:#532;color:white">R190-AW LOCAL SOURCE PROVENANCE UNVERIFIED / ART HOLD / NO MINECRAFT CONSTRUCTION</aside>')]);
  for(const face of ['front','rear','west','east','roof'])
   outputs.push(['UNAPPROVED_'+face+'.svg',
    renderR164Elevation(review.compiled,review.design,face)]);
 }catch(e){
  failure=String(e?.message??e);
  evidence.outputSourceClassification='HOLD_UNCOMPILED_OR_UNPROVEN_SOURCE';
  evidence.sourceProof={status:'HOLD',firstFailure:failure,
    hostRepairsAttempted:false,notAestheticReview:true};
 }
 // Before writing, re-read originals to ensure they were not replaced.
 if(H(readOriginal(responsePath,2,200000).bytes)!==original.sha256||
    H(readOriginal(briefPath,8,8000).bytes)!==brief.sha256)
  fail('ORIGINAL_CHANGED_DURING_REVIEW');
 fs.mkdirSync(outDir);
 write(path.join(outDir,'ORIGINAL_RESPONSE_UNCHANGED.txt'),original.bytes);
 write(path.join(outDir,'INDEPENDENT_BRIEF_UNCHANGED.txt'),brief.bytes);
 for(const [name,content] of outputs)write(path.join(outDir,name),content);
 json(path.join(outDir,'REVIEW.json'),evidence);
 return {receipt:evidence,failed:failure!==null,firstFailure:failure};
}
export function parseR190AWArgs(args){
 const allowed=new Set(['--response','--brief','--out','--expected-sha']),options={};
 if(args.length%2!==0||args.length<6||args.length>8)fail('CLI_ARGS');
 for(let i=0;i<args.length;i+=2){
  if(!allowed.has(args[i])||!args[i+1]||Object.hasOwn(options,args[i]))
   fail('CLI_ARGS');
  options[args[i]]=args[i+1];
 }
 if(!options['--response']||!options['--brief']||!options['--out'])
  fail('CLI_REQUIRED');
 return {responsePath:options['--response'],briefPath:options['--brief'],
  outDir:options['--out'],expectedSha256:options['--expected-sha']??null};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const x=reviewR190AWPreservedOriginal(parseR190AWArgs(process.argv.slice(2)));
  console.log(JSON.stringify({status:x.failed?'HOLD':'TECH_LIMITED_PASS_ART_HOLD',
    review:x.receipt,firstFailure:x.firstFailure},null,2));
  if(x.failed)process.exitCode=2;
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
