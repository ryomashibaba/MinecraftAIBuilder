/**
 * R190-AY: conservative, read-only comparison of ORIGINAL model-written claims
 * with the model's own ELEMENT DECLARATIONS (before invalid B143 compilation).
 * NOT a lenient compiler. Never produces geometry, never edits the model.
 * No provider, browser, world, installer or Minecraft dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {fileURLToPath} from 'node:url';
export const R190AY_SCHEMA='minecraftaibuilder-r190ay-source-declaration-crosscheck-v1';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('R190AY_'+x);};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const k=['x','y','z'];
const validTrip=x=>Array.isArray(x)&&x.length===3&&x.every(v=>Number.isSafeInteger(v)&&v>=0);
const makeBox=e=>e?.shape==='box'&&validTrip(e.origin)&&validTrip(e.size)&&
 e.size.every(x=>x>0)?{min:e.origin,max:e.origin.map((v,i)=>v+e.size[i])}:null;
const intersect=(a,b)=>a&&b?a.min.reduce((n,v,i)=>
 n*Math.max(0,Math.min(a.max[i],b.max[i])-Math.max(v,b.min[i])),1):null;
const inside=(box,point)=>box&&validTrip(point)&&point.every((v,i)=>
 v>=box.min[i]&&v<box.max[i]);
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 modelCallsByReview:0,officialArtAdoptions:0,art:'ART_HOLD'});

function interpretSource(original){
 if(!obj(original)||!obj(original.design)||
  !Array.isArray(original.design.elements))fail('NO_UNMODIFIED_SOURCE_ELEMENTS');
 const es=original.design.elements;
 // The first lightwell CUT only has preceding additive boxes in this
 // archival case. Unknown preceding solids would force INDETERMINATE.
 const cut=es.find(e=>e.id==='light-well'&&e.mode==='cut');
 const cutIndex=es.indexOf(cut);
 let lightwell;
 if(!cut||!makeBox(cut)){lightwell={status:'NOT_ESTABLISHED'};}
 else{
  const before=es.slice(0,cutIndex).filter(e=>e.mode==='add');
  const allKnown=before.every(e=>makeBox(e)!==null);
  const overlap=allKnown?before.map(e=>({
   id:e.id,boxIntersectionCells:intersect(makeBox(e),makeBox(cut))
  })):null;
  lightwell={id:cut.id,cutIndex,cutDomainBox:{origin:cut.origin,size:cut.size},
   priorAddElements:before.map(e=>e.id),priorAddsAllKnownBoxes:allKnown,
   priorAddDeclaredIntersectionCells:overlap,
   status:!allKnown?'NOT_ESTABLISHED_UNKNOWN_PRIOR_ADDS':
    overlap.every(e=>e.boxIntersectionCells===0)?
     'ZERO_CELLS_TO_CUT_IN_PRIOR_DECLARED_BOXES':
     'PRIOR_DECLARED_BOXES_DO_INTERSECT',
   strictB143SourceValidity:'NOT_ESTABLISHED',
   laterUnsupportedAdditiveShapes:es.slice(cutIndex+1).filter(e=>
    e.mode==='add'&&!makeBox(e)).map(e=>e.id)};
 }
 const north=es.find(e=>e.id==='north-window'&&e.mode==='cut');
 const south=es.find(e=>e.id==='south-window'&&e.mode==='cut');
 const windows=makeBox(north)&&makeBox(south)?{
  ids:[north.id,south.id],
  zBands:[[north.origin[2],north.origin[2]+north.size[2]],
          [south.origin[2],south.origin[2]+south.size[2]]],
  status:north.origin[2]===south.origin[2]&&north.size[2]===south.size[2]?
   'BOTH_NAMED_OPPOSITE_WINDOWS_AT_IDENTICAL_Z_BAND':
   'DISTINCT_Z_BANDS_OR_AMBIGUOUS_ORIENTATION',
  northWallBoxIntersectionCells:(es.find(e=>e.id==='north-wall')?.shape==='box')?
    [north,south].map(w=>intersect(makeBox(w),makeBox(es.find(e=>e.id==='north-wall')))):null,
  actualCompassOrientation:'NOT_ESTABLISHED'
 }: {status:'NOT_ESTABLISHED'};
 function pointEvidence(id,point){
  const matches=es.map((e,i)=>({e,i,b:makeBox(e)})).filter(({e,b})=>
   e.mode==='add'&&inside(b,point));
  const afterLast=matches.length?Math.max(...matches.map(e=>e.i)):-1;
  const laterCuts=es.slice(afterLast+1).filter(e=>e.mode==='cut'&&
    (makeBox(e)?inside(makeBox(e),point):true)).map(e=>e.id);
  return {id,point,declaredAddBoxesContainingPoint:matches.map(x=>x.e.id),
   lastPositiveBoxAtIndex:afterLast,
   laterCutCandidates:laterCuts,
   status:!validTrip(point)?'NOT_ESTABLISHED_INVALID_POINT':
    matches.length&&laterCuts.length===0?
     'POINT_IN_LAST_ADDED_POSITIVE_BOX_WITHOUT_LATER_CUT':
     'SOURCE_POINT_OCCUPANCY_NOT_ESTABLISHED',
   actualB143Voxel:'UNAVAILABLE_INVALID_SOURCE'};
 }
 const entrance=pointEvidence('author-claimed-entrance',original.spatialPlan?.entrance);
 const target=original.spatialPlan?.destinations?.find(v=>v.id==='reading-room');
 const destination=pointEvidence('author-claimed-reading-room-destination',target?.point);
 const base=es.find(e=>e.id==='base'&&e.mode==='add');
 const store=es.find(e=>e.id==='storage-floor'&&e.mode==='add');
 const duplicate={ids:[base?.id??null,store?.id??null],
  declaredOverlappingBoxCells:intersect(makeBox(base),makeBox(store)),
  status:'BOX_OVERLAP_ONLY_NOT_CLAIMED_AS_BUILDING_FAILURE'};
 const cuts=es.filter(e=>e.mode==='cut').map(e=>e.id);
 const entranceCut=cuts.filter(id=>/door|entrance|entry/i.test(id));
 const claims=[
  {requirement:'actual_intermediate_void_and_daylight',
   originalClaimText:typeof original.explanation==='string'&&/light well/i.test(original.explanation)?
    'light well':null,evidence:lightwell.status,
   certifiedPhysicalResult:'NOT_TESTED_INVALID_B143'},
  {requirement:'north_and_south_windows',
   originalClaimText:typeof original.explanation==='string'&&/north and south/i.test(original.explanation)?
    'north and south sides':null,evidence:windows.status,
   certifiedPhysicalResult:'NOT_TESTED_INVALID_B143'},
  {requirement:'external_entrance',
   originalClaimText:original.spatialPlan?.circulationStrategy??null,
   evidence:entrance.status,explicitDoorCutNames:entranceCut,
   certifiedPhysicalResult:'NOT_TESTED_INVALID_B143'},
  {requirement:'upper_reading_room_occupancy',
   originalClaimText:original.spatialPlan?.destinations?.[0]?.id??null,
   evidence:destination.status,certifiedPhysicalResult:'NOT_TESTED_INVALID_B143'},
  {requirement:'stairs_connect_two_levels',
   originalClaimText:typeof original.explanation==='string'&&/staircase connects/i.test(original.explanation)?
    'staircase connects the two levels':null,
   evidence:es.filter(e=>e.shape==='staircase').map(e=>({
    id:e.id,declaredAxis:e.axis,allowedByB143:['x','z'].includes(e.axis)})),
   certifiedPhysicalResult:'NOT_TESTED_INVALID_B143'},
  {requirement:'mountain_terrain_integration_and_weather',
   originalClaimText:original.spatialPlan?.massStrategy??null,
   evidence:'TEXT_CLAIM_NOT_INDEPENDENT_GEOMETRY_PROOF',
   certifiedPhysicalResult:'NOT_TESTED_INVALID_B143'}
 ];
 return {lightwell,windows,entrance,destination,duplicate,claims};
}
export function reviewR190AYPreservedClaims(input,{expectedSha256}={}){
 if(!(input instanceof Uint8Array)||input.length<2||input.length>200000)
  fail('INVALID_ORIGINAL_BYTES');
 const digest=sha(input);
 if(expectedSha256!==undefined&&(!/^[a-f0-9]{64}$/.test(expectedSha256)||
    expectedSha256!==digest))fail('ORIGINAL_SHA_MISMATCH');
 let raw;
 try{raw=new TextDecoder('utf-8',{fatal:true}).decode(input)}
 catch{fail('INVALID_UTF8')}
 let parsed;
 try{parsed=JSON.parse(raw)}catch{fail('INVALID_JSON')}
 const witnessed=interpretSource(parsed);
 return {schema:R190AY_SCHEMA,
  originalSha256:digest,originalBytes:input.length,
  sourceKind:'MODEL_RETURNED_INVALID_B143_DECLARATIONS',
  provenance:'SAVED_CAPTURED_RESPONSE_NOT_CRYPTOGRAPHIC_MODEL_IDENTITY',
  modelAuthorship:'PROVIDER_CLAIM_ONLY_NOT_CRYPTOGRAPHICALLY_VERIFIED',
  strictB143CompileStatus:'HOLD_B143_SCHEMA_OR_MODE',
  hasActualCompiledB143Geometry:false,sourceClaims:witnessed,
  evidenceLimit:'BOX_INTERSECTION_AND_OPERATION_ORDER_ONLY_NO_REPAIR_OR_VOXEL_COMPILATION',
  requirementCoverage:'NOT_CERTIFIED',
  weatherProof:'NOT_CERTIFIED',structuralEngineering:'NOT_CERTIFIED',
  modelSelfDesignQuality:'NOT_CERTIFIED',
  architectureBeauty:'ART_HOLD',real3D:'NOT_GENERATED',
  inputOriginalPreserved:true,modelGeometryChanged:false,...safety()};
}
const toMarkdown=x=>[
 '# R190-AY — 保存済みモデル原回答と作者の部材宣言の整合検査',
 '',
 '原回答SHA256: \`'+x.originalSha256+'\`（'+x.originalBytes+' bytes）。原文は変更せず、既存記録と照合。',
 '正式B143コンパイル: **HOLD**。このレポートは真正3Dやワールドの検証ではない。',
 '',
 '## 元回答の設計記述で確認できること',
 '',
 '- **吹き抜け**: CUT \`light-well\` より前に配置された加算部材はすべて箱形。CUTの範囲に重なる宣言箱は'+
  x.sourceClaims.lightwell.priorAddDeclaredIntersectionCells?.reduce((s,a)=>s+a.boxIntersectionCells,0)+
  'セル。先行ソリッドを実際に切削する指示にはなっていない。後続の未対応階段の挙動は未確定。',
 '- **南北窓**: \`north-window\`、\`south-window\` はいずれも z='+x.sourceClaims.windows?.zBands?.[0]?.[0]+
  '..'+(x.sourceClaims.windows?.zBands?.[0]?.[1]-1)+' の同一帯。方位は形状のみからは認証不能。',
 '- **入口**: \`'+x.sourceClaims.entrance.declaredAddBoxesContainingPoint.join('\` / \`')+
  '\` の宣言された加算床に入口座標が含まれ、後続CUTにその座標の切削は宣言されていない。',
 '- **閲覧室**: \`'+x.sourceClaims.destination.declaredAddBoxesContainingPoint.join('\` / \`')+
  '\` の加算床に行先座標が含まれる。',
 '- **床の重複**: \`base\` と \`storage-floor\` は宣言箱で'+
  x.sourceClaims.duplicate.declaredOverlappingBoxCells+'セル重複。これは部材配置の重複であり、直ちに建築失敗の証明ではない。',
 '',
 '## 判断の境界',
 '',
 '- 上記は無改変元回答の箱形の座標、記述順序、モデルが返した語句に限定した**保守的な静的監査**。',
 '- 原文は無効B143なので、完成した固体、動線、光、開口、屋根、外観・美術を正式検証していない。',
 '- ユーザー要求を全体として満たしたこと、実モデル固有の創作性能の優劣、施工可能性は一切確定しない。',
 '- AIの新規推論0、ホストの幾何修理0、Minecraft接触/施工0、ART HOLD、正式採用0。',
 ''
].join('\n');
function localInput(p){
 if(typeof p!=='string'||!path.isAbsolute(p))fail('ABSOLUTE_INPUT_REQUIRED');
 const st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||st.size<2||st.size>200000)
  fail('UNSAFE_ORIGINAL_FILE');
 return fs.readFileSync(p);
}
export function writeR190AYReview({originalPath,outDir,expectedSha256}){
 if(typeof outDir!=='string'||!path.isAbsolute(outDir)||fs.existsSync(outDir))
  fail('FRESH_ABSOLUTE_OUTPUT_REQUIRED');
 const input=localInput(originalPath);
 const review=reviewR190AYPreservedClaims(input,{expectedSha256});
 const parent=fs.lstatSync(path.dirname(outDir));
 if(!parent.isDirectory()||parent.isSymbolicLink())fail('OUTPUT_PARENT');
 if(outDir===originalPath||outDir.startsWith(originalPath+path.sep))
  fail('OUTPUT_OVERLAPS_SOURCE_FILE');
 if(sha(localInput(originalPath))!==review.originalSha256)
  fail('INPUT_CHANGED_DURING_ANALYSIS');
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'SOURCE_ONLY_CLAIM_WITNESS.json'),
  JSON.stringify(review,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'SOURCE_ONLY_CLAIM_REVIEW_JA.md'),
  toMarkdown(review),{flag:'wx'});
 return review;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==6||a[0]!=='--original'||a[2]!=='--out'||a[4]!=='--sha')
   fail('CLI_ARGS');
  const result=writeR190AYReview({
   originalPath:a[1],outDir:a[3],expectedSha256:a[5]});
  console.log(JSON.stringify({
   status:result.strictB143CompileStatus,
   sha256:result.originalSha256,
   cut:result.sourceClaims.lightwell.status,
   windowPlacement:result.sourceClaims.windows.status,
   outputContainsSourceOriginal:false,
   worldWrites:0,modelCalls:0},null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
