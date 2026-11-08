/**
 * Offline strict replay of a saved original model response.
 *
 * This is a source DIAGNOSTIC, never a grammar relaxer or silent redesign.
 * It never calls a model, modifies the source, or contacts Minecraft.
 * node scripts/r125-offline-replay.mjs --raw MODEL_RESPONSE_ORIGINAL.txt --out NEW_DIAGNOSIS.json
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readModelProposal} from '../source/ai/b198-natural-language-design.mjs';
import {validateDesign,compileDesign} from '../source/ai/b143-building-dsl.mjs';

const digest=x=>createHash('sha256').update(x).digest('hex');
const fail=reason=>{throw Error('R125_REPLAY_'+reason);};
const record=(all,severity,code,elementId=null)=>all.push({severity,code,...(
 elementId===null?{}:{elementId})});
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const isTriple=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isSafeInteger);
const rId=/^[a-z][a-z0-9-]{2,47}$/;
const badAssumptions=x=>!Array.isArray(x)||x.length>12||
 x.some(s=>typeof s!=='string'||s.length>250||/[\u0000-\u0008\u000b-\u001f]/.test(s));

export function diagnoseR125Original(raw){
 if(typeof raw!=='string'||raw.length===0||raw.length>60000)
  fail('RAW_INPUT_SIZE');
 const findings=[];
 let candidate;
 try{candidate=JSON.parse(raw);}
 catch{
  record(findings,'ERROR','ORIGINAL_NOT_JSON');
  return {schema:'r125-original-offline-diagnostic-v1',
   originalSha256:digest(raw),status:'HOLD_INVALID_ORIGINAL',
   findings,sourceValidation:'NOT_ATTEMPTED',originalEdited:false,
   inferredCorrectedDesign:false,modelCalls:0,worldWrites:0,
   worldGates:Array(9).fill('BLOCKED')};
 }
 if(!isObj(candidate)){
  record(findings,'ERROR','OUTER_NOT_OBJECT');
 }else{
  if(!['design','explanation','assumptions'].every(k=>Object.hasOwn(candidate,k))||
   Object.keys(candidate).length!==3)
   record(findings,'ERROR','MODEL_FIELDS_NOT_EXACT');
  if(badAssumptions(candidate.assumptions))
   record(findings,'ERROR','ASSUMPTIONS_NOT_BOUNDED_STRING_ARRAY');
  if(typeof candidate.explanation!=='string')
   record(findings,'ERROR','EXPLANATION_NOT_STRING');
  const d=candidate.design;
  if(!isObj(d))record(findings,'ERROR','DESIGN_NOT_OBJECT');
  else{
   if(typeof d.id!=='string'||!rId.test(d.id))
    record(findings,'ERROR','DESIGN_ID_INVALID');
   if(!Array.isArray(d.elements))
    record(findings,'ERROR','ELEMENTS_NOT_ARRAY');
   else{
    // A diagnostic is allowed to inspect element type; never auto-convert
    // type -> mode, never auto-expand bounds, and never fill in missing blocks.
    for(const [i,e] of d.elements.entries()){
     if(!isObj(e)){
      record(findings,'ERROR','ELEMENT_NOT_OBJECT','#'+i);continue;
     }
     const id=typeof e.id==='string'?e.id:'#'+i;
     if(e.type!==undefined)
      record(findings,'ERROR','UNKNOWN_TYPE_FIELD_USE_MODE',id);
     if(!['add','cut'].includes(e.mode))
      record(findings,'ERROR','MISSING_OR_INVALID_MODE',id);
     if(e.mode!=='cut'&&!['stone','concrete','metal','glass','wood','glow','accent'].includes(e.material))
      record(findings,'ERROR','MISSING_OR_INVALID_ADD_MATERIAL',id);
     if(e.shape==='staircase'&&isTriple(e.origin)&&
      isObj(d.bounds)&&
      ['x','z'].includes(e.axis)&&[1,-1].includes(e.direction)&&
      Number.isSafeInteger(e.steps)&&Number.isSafeInteger(e.treadDepth)){
      const axis=e.axis==='x'?0:2;
      const edge=e.origin[axis]+e.direction*(e.steps*e.treadDepth-1);
      const limit=e.axis==='x'?d.bounds.width:d.bounds.depth;
      if(Number.isSafeInteger(limit)&&
       (edge<0||edge>=limit||e.origin[axis]<0||e.origin[axis]>=limit))
       record(findings,'ERROR','STAIRCASE_EXCEEDS_DESIGN_BOUNDS',id);
     }
     if(/(?:door|entrance|window)/i.test(id)&&e.type==='add'||
      /(?:door|entrance|window)/i.test(id)&&e.mode==='add')
      record(findings,'REVIEW','DOOR_OR_WINDOW_MAY_NOT_CUT_WALL_OPENING',id);
     if(/(?:room|interior)/i.test(id)&&e.shape==='box'&&
      isTriple(e.size)&&e.size[1]>=3&&
      (e.type==='add'||e.mode==='add')&&!e.shell)
      record(findings,'REVIEW','ROOM_VOLUME_FILLED_NOT_EMPTY',id);
    }
    const floors=d.elements.filter(e=>isObj(e)&&
     /(?:floor|deck)/i.test(e.id)&&e.shape==='box'&&isTriple(e.origin));
    if(floors.length>=2){
     const heights=[...new Set(floors.map(e=>e.origin[1]))].sort((a,b)=>a-b);
     if(heights.length>=2&&heights[1]-heights[0]<3)
      record(findings,'REVIEW','FLOOR_SEPARATION_UNUSABLE');
    }
   }
  }
 }
 let sourceValidation='HOLD';
 let compilerReason=null,sourceSha256=null,geometrySha256=null,occupiedVoxels=null;
 try{
  const checked=readModelProposal(candidate);
  validateDesign(checked.design);
  const compiled=compileDesign(checked.design);
  sourceValidation='B143_COMPILED_VERIFIED';
  sourceSha256=compiled.sourceSha256;
  geometrySha256=compiled.geometrySha256;
  occupiedVoxels=compiled.primitives.length;
 }catch(e){compilerReason=String(e?.message??e).slice(0,360);}
 return {
  schema:'r125-original-offline-diagnostic-v1',
  originalSha256:digest(raw),
  status:sourceValidation==='B143_COMPILED_VERIFIED'?
   'SOURCE_CANDIDATE_REVIEW_REQUIRED':'HOLD_ORIGINAL_SOURCE',
  compilerReason,
  findings,sourceValidation,sourceSha256,geometrySha256,occupiedVoxels,
  architecturalAdequacy:'NOT_CERTIFIED_BY_STATIC_CHECKS',
  originalEdited:false,inferredCorrectedDesign:false,
  modelCalls:0,worldWrites:0,worldGates:Array(9).fill('BLOCKED')
 };
}

export function parseR125ReplayArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==4)fail('REQUIRE_RAW_AND_OUT');
 const opts={};
 for(let i=0;i<4;i+=2){
  if(!['--raw','--out'].includes(argv[i])||Object.hasOwn(opts,argv[i])||
   !argv[i+1]||argv[i+1].startsWith('--'))fail('INVALID_ARGUMENT');
  opts[argv[i]]=path.resolve(argv[i+1]);
 }
 if(!opts['--raw']||!opts['--out']||opts['--raw']===opts['--out'])
  fail('INPUT_OUTPUT_CONFLICT');
 return opts;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseR125ReplayArgs(process.argv.slice(2));
  if(args.help)console.log('node scripts/r125-offline-replay.mjs --raw ORIGINAL.txt --out NEW_DIAGNOSIS.json (NO INFERENCE / NO WORLD)');
  else{
   if(fs.existsSync(args['--out']))fail('OUTPUT_ALREADY_EXISTS');
   const raw=fs.readFileSync(args['--raw'],'utf8');
   const report=diagnoseR125Original(raw);
   fs.writeFileSync(args['--out'],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({status:report.status,
    compilerReason:report.compilerReason,findings:report.findings.length,
    modelCalls:0,worldWrites:0}));
  }
 }catch(e){console.error('R125_REPLAY_HOLD',String(e?.message??e));process.exitCode=2;}
}
