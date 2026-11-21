/**
 * R190-BH: forensic, literal-source-only postmortem of an actual saved model
 * response. Never compiles invalid B143 to guessed geometry or changes bytes.
 * Independent diagnostics are not a retrofit, architecture or art approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readR4PlannedProposal} from '../source/ai/b198zr4-planned-source.mjs';
import {SCHEMA as B143_SCHEMA} from '../source/ai/b143-building-dsl.mjs';

export const R190BH_SCHEMA='minecraftaibuilder-r190bh-archived-original-forensic-v1';
const H=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190BH_'+x)};
const triple=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isSafeInteger);
const inside=(p,origin,size)=>triple(p)&&triple(origin)&&triple(size)&&
 p.every((v,i)=>size[i]>0&&v>=origin[i]&&v<origin[i]+size[i]);
const intersects=(a,b)=>{
 if(!triple(a?.origin)||!triple(a?.size)||!triple(b?.origin)||!triple(b?.size))return false;
 return a.origin.every((v,i)=>a.size[i]>0&&b.size[i]>0&&
  v<b.origin[i]+b.size[i]&&b.origin[i]<v+a.size[i]);
};
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 modelCalls:0,art:'ART_HOLD',officialArtAdoptions:0});
const RAW_KEYS=['design','explanation','assumptions','spatialPlan'];
const B143_KEYS=['schema','id','title','brief','bounds','elements','designOnly'];
const addBox=e=>e&&e.shape==='box'&&e.mode==='add'&&
 triple(e.origin)&&triple(e.size)&&e.size.every(n=>n>0);
function diagnostic(code,pathName,details,why){
 return {code,path:pathName,observation:details,
  provenFrom:'LITERAL_ARCHIVED_MODEL_JSON_ONLY',
  geometricConsequence:'NOT_CERTIFIED_WITH_INVALID_SOURCE',guidance:why};
}
export function inspectR190BHArchivedOriginal(raw,{expectedSha256}={}){
 if(!(raw instanceof Uint8Array)||raw.length<2||raw.length>120000)
  fail('INPUT_BYTES');
 const digest=H(raw);
 if(!/^[a-f0-9]{64}$/.test(expectedSha256??'')||digest!==expectedSha256)
  fail('ORIGINAL_SHA_MISMATCH');
 const str=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
 let d;try{d=JSON.parse(str)}catch(e){
  return {schema:R190BH_SCHEMA,status:'HOLD_ARCHIVED_ORIGINAL_NOT_JSON',
   originalSha256:digest,bytes:raw.length,firstFailure:String(e.message).slice(0,160),
   literalFindings:[],sourceGeometryProduced:false,originalUnmodified:true,
   modelIdentityCryptographicallyVerified:false,
   improvementCertified:false,...safe()};
 }
 if(!d||typeof d!=='object'||Array.isArray(d))fail('NON_OBJECT');
 const findings=[],push=(...args)=>findings.push(diagnostic(...args));
 const extras=Object.keys(d).filter(k=>!RAW_KEYS.includes(k));
 const missing=RAW_KEYS.filter(k=>!Object.hasOwn(d,k));
 if(extras.length||missing.length)push('TOP_LEVEL_CONTRACT_DRIFT','/',
  {extraKeys:extras,missingKeys:missing},
  'Return exactly design, explanation, assumptions, spatialPlan as one response.');
 const design=d.design;
 if(design&&typeof design==='object'&&!Array.isArray(design)){
  const extraD=Object.keys(design).filter(k=>!B143_KEYS.includes(k));
  if(extraD.length)push('B143_EXTRA_DESIGN_KEYS','design',
   {extraKeys:extraD},'Only source DSL fields may be returned.');
  if(design.schema!==B143_SCHEMA)push('B143_SCHEMA_MISMATCH','design.schema',
   {observed:design.schema??null,expected:B143_SCHEMA},
   'Use the required full B143 schema identifier.');
  const bounds=design.bounds;
  const validBounds=bounds&&['width','height','depth'].every(k=>
   Number.isSafeInteger(bounds[k])&&bounds[k]>0);
  const elements=Array.isArray(design.elements)?design.elements:[];
  const boxAdds=elements.filter(addBox);
  for(const [i,e] of elements.entries()){
   if(!e||typeof e!=='object')continue;
   if(e.mode==='cut'&&Object.hasOwn(e,'material'))
    push('CUT_HAS_FORBIDDEN_MATERIAL','design.elements['+i+'].material',
     {id:e.id??null,observed:e.material},
     'CUT elements must omit material entirely; do not represent cuts as solids.');
   if(e.shape==='staircase'&&!['x','z'].includes(e.axis))
    push('STAIRCASE_UNSUPPORTED_AXIS','design.elements['+i+'].axis',
     {id:e.id??null,observed:e.axis??null,allowed:['x','z']},
     'The model must independently author a supported x/z flight with real landings.');
  }
  const plan=d.spatialPlan;
  if(validBounds&&plan&&typeof plan==='object'&&!Array.isArray(plan)){
   const {width,height,depth}=bounds;
   const upper=[width,height,depth];
   const headroom=plan.headroom;
   const positions=[
    {label:'entrance',value:plan.entrance},
    ...(Array.isArray(plan.destinations)?plan.destinations.map((e,i)=>({
     label:'destinations['+i+']',value:e?.point})):[]
    )];
   for(const {label,value} of positions){
    if(!triple(value))continue;
    if(value.some((n,i)=>n<0||n>=upper[i]))
     push('MODEL_STANDING_POINT_OUT_OF_BOUNDS','spatialPlan.'+label,
      {point:value,bounds:upper},'Ensure the declared standing point is inside design bounds.');
    if((headroom===2||headroom===3)&&value[1]+headroom>height)
     push('HEADROOM_EXTENDS_PAST_BOUNDS','spatialPlan.'+label,
      {point:value,headroom,height},
      'Reserve enough air above each actual standing position.');
    const boxes=boxAdds.filter(e=>inside(value,e.origin,e.size))
     .map(e=>e.id??'(unnamed)');
    if(boxes.length)push('STANDING_POINT_INTERSECTS_LITERAL_ADD_BOX',
     'spatialPlan.'+label,{point:value,authoredAddBoxIds:boxes},
     'Verify final ADD/CUT voxels; a named landing cannot overlap a solid floor.');
   }
   if(Array.isArray(plan.protectedVoids))for(const [i,v] of
    plan.protectedVoids.entries()){
    const overlap=boxAdds.filter(e=>intersects(v,e)).map(e=>e.id??'(unnamed)');
    if(overlap.length)push('DECLARED_VOID_INTERSECTS_LITERAL_ADD_BOX',
     'spatialPlan.protectedVoids['+i+']',
     {id:v?.id??null,authoredAddBoxIds:overlap},
     'Use final ordered ADD/CUT source to prove a void, not its name.');
   }
  }
 }else push('MISSING_DESIGN_OBJECT','design',null,
  'Provide actual B143 source designed by the model.');
 let grammar='NOT_VERIFIED',firstFailure=null;
 try{readR4PlannedProposal(str);grammar='STRICT_R4_PARSED_NOT_SPATIAL_REVIEWED'}
 catch(e){grammar='HOLD_STRICT_R4_OR_B143';firstFailure=String(e.message).slice(0,160)}
 return {schema:R190BH_SCHEMA,
  status:grammar==='HOLD_STRICT_R4_OR_B143'?
   'HOLD_ARCHIVED_MODEL_CONTRACT_VIOLATIONS':'SOURCE_GRAMMAR_ONLY_ART_HOLD',
  originalSha256:digest,bytes:raw.length,
  rawTopLevelKeys:Object.keys(d),strictR4ParsingStatus:grammar,
  firstFailure,checkedAgainstFullB143Schema:B143_SCHEMA,
  literalFindings:findings,findingsCount:findings.length,
  sourceGeometryProduced:false,sourceWasRepaired:false,originalUnmodified:true,
  approximateGeometryNotInvented:true,
  modelIdentityCryptographicallyVerified:false,
  independentArchitecturalQualityReview:'NOT_PERFORMED',
  independentVisualArtReview:'NOT_PERFORMED',
  improvementCertified:false,
  scopeLimitations:[
   'Overlaps are literal authored add boxes, not post-cut final voxels',
   'Staircase source with unsupported axis is never rendered or auto-repaired',
   'A parser failure alone cannot prove what valid final geometry would look like',
   'This diagnosis is one archived answer, not evidence of a model family trend'],
  ...safe()};
}
export function writeR190BHArchivedReview({originalPath,expectedSha256,outDir}){
 if(typeof originalPath!=='string'||typeof outDir!=='string'||
  !path.isAbsolute(originalPath)||!path.isAbsolute(outDir)||
  outDir===originalPath||fs.existsSync(outDir))fail('PATHS');
 const st=fs.lstatSync(originalPath);
 if(!st.isFile()||st.isSymbolicLink()||st.size>120000||st.size<2)
  fail('UNSAFE_ORIGINAL');
 const raw=fs.readFileSync(originalPath);
 const report=inspectR190BHArchivedOriginal(raw,{expectedSha256});
 if(H(fs.readFileSync(originalPath))!==report.originalSha256)
  fail('INPUT_CHANGED');
 const parent=fs.lstatSync(path.dirname(outDir));
 if(!parent.isDirectory()||parent.isSymbolicLink())fail('OUTPUT_PARENT');
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'R190BH_ARCHIVED_ORIGINAL_FINDINGS.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
export function parseR190BHArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==6)fail('ARGUMENTS');
 const v={};
 for(let i=0;i<argv.length;i+=2){
  const name={'--original':'originalPath','--sha':'expectedSha256',
   '--out':'outDir'}[argv[i]];
  if(!name||Object.hasOwn(v,name)||!argv[i+1])fail('ARGUMENTS');
  v[name]=argv[i+1];
 }
 if(!v.originalPath||!v.expectedSha256||!v.outDir)fail('ARGUMENTS');
 return v;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const opts=parseR190BHArgs(process.argv.slice(2));
  console.log(JSON.stringify(opts.help?{help:'Offline: --original SAVED_MODEL_RAW --sha SHA256 --out NEW_DIR; no repaired model or Minecraft calls.'}:
   writeR190BHArchivedReview({...opts,
    originalPath:path.resolve(opts.originalPath),outDir:path.resolve(opts.outDir)}),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=1}
}
