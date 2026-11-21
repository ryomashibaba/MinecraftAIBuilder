/**
 * R190-AX: diagnose a preserved model original WITHOUT transforming it into
 * a building. Addresses proven R190-AA grammar failures before any new inference.
 * No provider/world imports, no model calls, no geometry repair, no new 3D.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TextDecoder} from 'node:util';
import {createHash} from 'node:crypto';
import {SCHEMA as B143,validateDesign,compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

export const R190AX_SCHEMA='minecraftaibuilder-r190ax-original-output-diagnosis-v1';
const SHA=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190AX_'+x);};
const requiredRoot=['design','explanation','assumptions','spatialPlan'];
const array=x=>Array.isArray(x)?x:[];
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,art:'ART_HOLD'});

function issuesForModelOriginal(value){
 const issues=[];
 const add=(code,field,detail)=>{
  issues.push({code,field,detail});
 };
 if(!obj(value)){
  add('ROOT_NOT_OBJECT','root','A strict object with four response fields is required.');
  return issues;
 }
 const actual=Object.keys(value);
 const extra=actual.filter(x=>!requiredRoot.includes(x));
 const missing=requiredRoot.filter(x=>!Object.hasOwn(value,x));
 if(extra.length)add('EXTRA_OUTPUT_METADATA','root',extra.sort());
 if(missing.length)add('REQUIRED_ROOT_FIELDS_MISSING','root',missing);
 if(!obj(value.design)){
  add('NO_AUTHOR_DESIGN_OBJECT','design','No untouched B143 source available.');
  return issues;
 }
 const d=value.design;
 if(d.schema!==B143)
  add('NONCANONICAL_B143_SCHEMA','design.schema',{actual:d.schema??null,expected:B143});
 if(d.designOnly!==true)
  add('NOT_SOURCE_ONLY','design.designOnly','Must explicitly be true.');
 if(!Array.isArray(d.elements)||d.elements.length<1){
  add('NO_ELEMENTS','design.elements','No authored geometry elements.');
  return issues;
 }
 const invalidCut=[],invalidStairs=[],brokenModes=[];
 for(const e of d.elements){
  if(e?.mode==='cut'&&Object.hasOwn(e,'material'))invalidCut.push(e.id??'UNNAMED');
  if(e?.shape==='staircase'&&!['x','z'].includes(e.axis))
   invalidStairs.push({id:e.id??'UNNAMED',axis:e.axis??null});
  if(!['add','cut'].includes(e?.mode))brokenModes.push(e?.id??'UNNAMED');
 }
 if(invalidCut.length)add('CUT_MATERIAL_KEY_PRESENT','design.elements',
  {elementIds:invalidCut,rule:'Omit property entirely, even when value is null.'});
 if(invalidStairs.length)add('UNSUPPORTED_STAIR_DIRECTION','design.elements',
  {elements:invalidStairs,allowedAxes:['x','z'],verticalAxis:'y is elevation, not direction'});
 if(brokenModes.length)add('UNSUPPORTED_ELEMENT_MODE','design.elements',brokenModes);
 const spatial=value.spatialPlan;
 if(obj(spatial)&&Array.isArray(spatial.entrance)){
  const a=spatial.entrance;
  const base=array(d.elements).filter(e=>e?.mode==='add'&&e?.shape==='box'&&
    Array.isArray(e.origin)&&Array.isArray(e.size)&&e.origin.length===3&&
    e.size.length===3&&a.length===3&&
    a.every((v,i)=>Number.isInteger(v)&&v>=e.origin[i]&&v<e.origin[i]+e.size[i]));
  if(base.length)add('DECLARED_ENTRANCE_INSIDE_POSITIVE_BOX','spatialPlan.entrance',{
   containingSourceElementIds:base.map(e=>e.id),
   caveat:'Source additive containment only, not final B143 voxel occupancy or walking proof.'});
 }
 return issues;
}
export function diagnoseR190AXOriginal(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<2||bytes.byteLength>200000)
  fail('MODEL_BYTES');
 const originalSha256=SHA(bytes),len=bytes.length;
 let raw;
 try{raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}
 catch{fail('INVALID_UTF8')}
 let parsed=null,issues=[];
 try{parsed=JSON.parse(raw)}
 catch{issues=[{code:'INVALID_JSON',field:'root',detail:'Unparseable original.'}]}
 if(parsed!==null)issues=issuesForModelOriginal(parsed);
 let sourceStatus='HOLD_NOT_COMPILABLE',geometrySha256=null,
  voxelCount=null,geometryError=null;
 if(obj(parsed)&&obj(parsed.design)){
  try{
   validateDesign(parsed.design);
   const compiled=compileDesign(parsed.design);
   if(!verifyCompiled(parsed.design,compiled))fail('VERIFICATION_FAILED');
   sourceStatus='B143_COMPILED_SOURCE_ONLY_NOT_ARCHITECTURE_PASS';
   geometrySha256=compiled.geometrySha256;
   voxelCount=compiled.primitives.length;
  }catch(e){geometryError=String(e?.message??e).slice(0,140);}
 }
 return {schema:R190AX_SCHEMA,provenance:'PRESERVED_BYTES_NOT_AUTHENTICATED_PROVIDER',
  inputSha256:originalSha256,inputBytes:len,
  issueCount:issues.length,issues,
  sourceStatus,geometryError,geometrySha256,voxelCount,
  originalModelAuthorship:'NOT_CRYPTOGRAPHICALLY_VERIFIED',
  physicalEntrance:'NOT_CERTIFIED',functionalRooms:'NOT_CERTIFIED',
  originalArchitectureBeauty:'NOT_CERTIFIED',
  unchangedOriginal:true,authorGeometryFixedByHost:false,
  modelCallsByAnalysis:0,officialArtAdoptions:0,...safe()};
}
/** Error-specific RESPONDING CONTRACT, never copies prior failed geometry. */
export function buildR190AXFutureContract(diagnosis){
 if(diagnosis?.schema!==R190AX_SCHEMA||!Array.isArray(diagnosis.issues))
  fail('UNTRUSTED_DIAGNOSIS');
 const codes=new Set(diagnosis.issues.map(x=>x.code));
 const lines=[
 '【今後の新たなモデル試験に向けた設計出力契約／研究用。今回はモデルへ送信しない】',
 '独立した建築をあなた自身で設計し、用途・構造・大空洞・動線・屋根・外観の統合を重視してください。既存の失敗案の形状・座標を流用しないでください。',
 '空間や美しさを文章で主張するだけでなく、あなたが選んだ立体形状に表現してください。ホストが空間を補修することはありません。',
 'モデルの回答はJSONオブジェクト1個のみで、最上位キーは design, explanation, assumptions, spatialPlan の4つだけ。追加メタデータやJSONの外の文章を含めないでください。',
 'design.schema は文字列 "'+B143+'" を一字も省略せず、design.designOnly は true。B143の各形状と設計座標・材質は設計者であるモデル自身が決めてください。',
 '切削要素（mode="cut"）には material キーそのものを含めないでください。material:null も禁止です。',
 '階段形状（shape="staircase"）の axis は水平移動方向 x または z のみ。y は段ごとの上昇する高さで、axis:"y" は無効です。',
 'spatialPlanの入口や行先の位置は、実際の支持床の上の空気セルへ配置し、頭上に2セル以上空気を確保し、そこまでの経路がつながるようにしてください。',
 '用途と外観は固定テンプレートから選ばず、元依頼の要求に最適な建築の主構成と見え方をモデル自身が考えてください。未解決の要求は隠さず説明してください。',
 'B143を満たしても構造工学や歩行、意匠の合格を自己認証しないでください。Minecraft施工指示やワールド座標、実行コードを含めないでください。'
 ];
 const explanation={
  lastStudyStatus:diagnosis.sourceStatus,
  historicalProblemCodes:[...codes],
  syntaxRecommendationsRemainSeparateFromArchitecturalArt:true,
  untestedFutureProviderResponse:'NOT_RUN',
  copiedOldGeometry:false,
  hostFixesOldGeometry:false
 };
 return {schema:'minecraftaibuilder-r190ax-future-contract-draft-v1',
  text:lines.join('\n'),diagnosis:explanation,
  action:'FUTURE_RESEARCH_PROMPT_ONLY_NOT_SENT'};
}
function input(p){
 if(!path.isAbsolute(p))fail('ABSOLUTE_INPUT_REQUIRED');
 const stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<2||stat.size>200000)
  fail('UNSAFE_OR_INVALID_INPUT');
 return fs.readFileSync(p);
}
export function writeR190AXStudy({originalPath,outDir,expectedSha256}){
 if(typeof originalPath!=='string'||typeof outDir!=='string'||
   !path.isAbsolute(outDir)||fs.existsSync(outDir))
  fail('NEW_ABSOLUTE_OUTPUT_REQUIRED');
 if(outDir===originalPath||outDir.startsWith(originalPath+path.sep))
  fail('SOURCE_OVERLAP');
 const raw=input(originalPath);
 const result=diagnoseR190AXOriginal(raw);
 if(expectedSha256!==undefined&&
   (!/^[0-9a-f]{64}$/.test(expectedSha256)||
    expectedSha256!==result.inputSha256))
  fail('PRESERVED_ORIGINAL_SHA_MISMATCH');
 const prompt=buildR190AXFutureContract(result);
 if(SHA(input(originalPath))!==result.inputSha256)
  fail('ORIGINAL_CHANGED_DURING_STUDY');
 const parent=fs.lstatSync(path.dirname(outDir));
 if(!parent.isDirectory()||parent.isSymbolicLink())fail('UNSAFE_OUTPUT_PARENT');
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'SOURCE_ONLY_DIAGNOSIS.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'FUTURE_UNSENT_RESPONSE_CONTRACT.txt'),
  prompt.text+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'FUTURE_CONTRACT_MANIFEST.json'),
  JSON.stringify({...prompt,textSha256:SHA(prompt.text)},null,2)+'\n',{flag:'wx'});
 return {diagnosis:result,contract:prompt};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),o={};
  if(args.length!==6||args.some((v,i)=>i%2===0&&
   !['--original','--out','--sha'].includes(v)))
   fail('CLI_ARGS');
  for(let i=0;i<args.length;i+=2){
   if(Object.hasOwn(o,args[i]))fail('CLI_ARGS');
   o[args[i]]=args[i+1];
  }
  if(!o['--original']||!o['--out']||!o['--sha'])fail('CLI_ARGS');
  const result=writeR190AXStudy({
   originalPath:o['--original'],outDir:o['--out'],
   expectedSha256:o['--sha']});
  console.log(JSON.stringify({status:result.diagnosis.sourceStatus,
   sha256:result.diagnosis.inputSha256,
   issueCodes:result.diagnosis.issues.map(x=>x.code),modelCalls:0,
   architecture:'ART_HOLD',worldWrites:0},null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
