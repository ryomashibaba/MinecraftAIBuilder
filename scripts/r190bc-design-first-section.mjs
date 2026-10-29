/**
 * R190-BC: independent SOURCE SECTION review of ORIGINAL direct B143/R4 bytes.
 * This module neither calls an LLM nor writes a Minecraft world. All geometry
 * derives solely from a validated B143 model output, without inferred repairs.
 * Numbers are engineering-review proxies, NEVER aesthetic approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {readR4PlannedProposal} from '../source/ai/b198zr4-planned-source.mjs';

export const R190BC_SCHEMA='minecraftaibuilder-r190bc-original-section-study-v1';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190BC_'+x);};
const key=(x,y,z)=>x+','+y+','+z;
const validSHA=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const security=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,modelCalls:0,
 art:'ART_HOLD',officialArtAdoptions:0});
const inside=(x,lo,size)=>x>=lo&&x<lo+size;
const integerTriple=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isSafeInteger);

/**
 * Only a changed input PROMPT, not an inferred 3D building. The exact user
 * request remains embedded unmodified; output grammar stays B143 + R4.
 * No templates, architecture-category classifier or extra model requests.
 */
export function buildR190BCDesignFirstPrompt(japaneseRequest){
 if(typeof japaneseRequest!=='string'||japaneseRequest.trim().length<8||
    japaneseRequest.length>5000||/[\u0000-\u0008\u000b-\u001f]/.test(japaneseRequest))
  fail('BRIEF');
 return [
  japaneseRequest,
  '',
  '【R190-BC 設計先行・完全新規の建築研究／SOURCE ONLY】',
  '元の依頼を優先し、既存建物の座標、既製の平面図、建築カテゴリごとのテンプレートを流用しないでください。',
  '最初に自分自身で利用者と用途、訪問者の空間体験、主要空間の相互関係を考えてください。',
  '次にその体験を成立させる断面・床高さ・必要な空気空間・入口と室間動線を決めてください。',
  '外形と屋根は空間構成から導き、主要な質量・意図的な空洞・床支持と屋根支持を一体に設計してください。',
  '巨大な箱の内部を塗りつぶして部屋と呼ばないでください。壁・屋根・柱・開口はB143の最後の加算／切削後の実ボクセルで成立させてください。',
  '特定の曲面、斜材、対称性、材料や部屋数を形の好みだけで強制しません。依頼に合った独自の空間構成を選んでください。',
  '必ず従来のdirect B143 + R4契約の4キー design、explanation、assumptions、spatialPlanを同じ1回のJSON回答に含めます。',
  'spatialPlan.designIntentには用途と体験、massStrategyには断面・主要質量と空洞と支持の関係、circulationStrategyには実際の経路を具体的に記述してください。',
  '入口・移動先・機能領域の宣言位置は完成B143の床と頭上空気に対応させます。支持のない床やCUTされない窓・吹抜けを成立済みと主張しません。',
  '現在のB143で表現できない部分はassumptionsまたはexplanationに未成立と明記し、別物で代用したと隠さないでください。',
  'Minecraft施工、実機での歩行、美術評価の合格は一切宣言しません。ホストによる設計の自動修正を期待しないでください。'
 ].join('\n');
}

const base=(digest,bytes)=>({schema:R190BC_SCHEMA,originalSha256:digest,
 originalBytes:bytes,originalUnmodified:true,providerIdentityVerified:false,
 hostRepairedGeometry:false,sourceOnly:true,actualMinecraftWalking:'NOT_TESTED',
 structuralLoadSafety:'NOT_CERTIFIED',architecturalQuality:'NOT_CERTIFIED',
 humanArtReview:'ART_HOLD',...security()});

/**
 * Input is original provider content as bytes. This is not a second attempt
 * to rescue failed R4/JSON or manufacture a SOURCE from model prose.
 */
export function reviewR190BCOriginal(raw,{expectedSha256}={}){
 if(!(raw instanceof Uint8Array)||raw.length<2||raw.length>200000)
  fail('ORIGINAL_BYTES');
 const digest=sha(raw);
 if(expectedSha256!==undefined&&(!validSHA(expectedSha256)||digest!==expectedSha256))
  fail('ORIGINAL_SHA_MISMATCH');
 const common=base(digest,raw.length);
 let proposal,compiled;
 try{
  const source=new TextDecoder('utf-8',{fatal:true}).decode(raw);
  proposal=readR4PlannedProposal(source);
  compiled=compileDesign(proposal.design);
  if(!verifyCompiled(proposal.design,compiled))fail('COMPILATION_INTEGRITY');
 }catch(e){
  return {...common,status:'HOLD_INVALID_ORIGINAL_R4_OR_B143',
   firstFailure:String(e?.message??e).slice(0,180),
   sourceSha256:null,geometrySha256:null,sectionEvidence:null};
 }
 const {width:w,height:h,depth:d}=proposal.design.bounds;
 const vox=new Set(compiled.primitives.map(([x,y,z])=>key(x,y,z)));
 const has=(x,y,z)=>vox.has(key(x,y,z));
 const headroom=proposal.spatialPlan.headroom;
 const stand=(x,y,z)=>y>0&&y+headroom<=h&&
   has(x,y-1,z)&&Array.from({length:headroom},(_,i)=>!has(x,y+i,z)).every(Boolean);
 const roof=(x,y,z)=>{
  for(let yy=y+headroom;yy<h;yy++)if(has(x,yy,z))return true;
  return false;
 };
 const zones=proposal.spatialPlan.functionalZones.map(zone=>{
  const isRegion=integerTriple(zone.origin)&&integerTriple(zone.size)&&
    zone.size.every(n=>n>0)&&zone.origin.every((n,i)=>n>=0&&
     n+zone.size[i]<=[w,h,d][i]);
  if(!isRegion)return {id:String(zone.id).slice(0,80),
   sourceStatus:'HOLD_INVALID_MODEL_ZONE',twoWidePadCount:0,
   roofedPadCount:0,skyOpenPadCount:0,floorLevels:[]};
  const [ox,oy,oz]=zone.origin,[sx,sy,sz]=zone.size;
  let pads=0,roofed=0,sky=0,partly=0;
  const levels=new Set();
  // A 2x2 standing footprint at the SAME floor elevation. This proxy
  // avoids accepting a one-cell shelf or a label inside a solid slab.
  for(let y=oy;y<oy+sy;y++)for(let z=oz;z<oz+sz-1;z++)
   for(let x=ox;x<ox+sx-1;x++){
    let valid=true,overhead=0;
    for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
     if(!stand(x+dx,y,z+dz))valid=false;
     if(roof(x+dx,y,z+dz))overhead++;
    }
    if(!valid)continue;
    pads++;levels.add(y);
    if(overhead===4)roofed++;
    else if(overhead===0)sky++;
    else partly++;
   }
  return {id:String(zone.id).slice(0,80),modelPurposeUnverified:true,
   origin:zone.origin,size:zone.size,requiredHeadroom:headroom,
   twoWidePadCount:pads,roofedPadCount:roofed,skyOpenPadCount:sky,
   partlyRoofedPadCount:partly,floorLevels:[...levels].sort((a,b)=>a-b),
   sourceStatus:pads?'SOURCE_CLEAR_SUPPORTED_TWO_WIDE_FOOTPRINT_FOUND':
    'HOLD_NO_CLEAR_SUPPORTED_TWO_WIDE_FOOTPRINT',
   actualSeparateRoom:'NOT_CERTIFIED',
   overheadSolidsDoNotProveRoofOrWeatherproofing:true};
 });
 const z=Array.isArray(proposal.spatialPlan.entrance)&&
  Number.isSafeInteger(proposal.spatialPlan.entrance[2])&&
  inside(proposal.spatialPlan.entrance[2],0,d)?
   proposal.spatialPlan.entrance[2]:Math.floor(d/2);
 // Exact source slice at one fixed z; never drawn by reinterpreting an
 // author's labels or by inventing a repaired geometry.
 const solidSection=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(has(x,y,z))
  solidSection.push([x,y]);
 const noSupportedZone=zones.some(q=>q.twoWidePadCount===0);
 return {...common,status:noSupportedZone?
  'HOLD_MODEL_DECLARED_ZONE_SECTION_UNUSABLE':
  'SOURCE_SECTION_PROXIES_AVAILABLE_ART_HOLD',
  firstFailure:noSupportedZone?'MODEL_DECLARED_ZONE_LACKS_SUPPORTED_TWO_WIDE_SPACE':null,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  modelDeclaredDesignIntent:proposal.spatialPlan.designIntent,
  modelDeclaredMassStrategy:proposal.spatialPlan.massStrategy,
  modelDeclaredCirculationStrategy:proposal.spatialPlan.circulationStrategy,
  zoneEvidence:zones,
  sectionEvidence:{axis:'x-y',fixedZ:z,width:w,height:h,
   finalSourceVoxelCount:compiled.primitives.length,
   occupiedCellsAtSlice:solidSection,
   isModelOriginalFinalB143:true,
   cutAppliedThroughOriginalCompiler:true,
   doesNotProveOverallArchitectureQuality:true},
  limitations:['No guarantee that roofed pads are independently enclosed rooms',
   'No independent program or aesthetic certification',
   'No load bearing analysis; no Minecraft avatar or world test']};
}
export function renderR190BCSectionSVG(result){
 if(result?.schema!==R190BC_SCHEMA)fail('REVIEW_SCHEMA');
 const s=result.sectionEvidence;
 if(!s)return '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="80"><rect width="100%" height="100%" fill="#0f172a"/><text x="12" y="42" fill="white">HOLD — no valid original B143 section</text></svg>';
 const cell=9,ox=20,oy=60;
 const rects=s.occupiedCellsAtSlice.map(([x,y])=>'<rect x="'+(ox+x*cell)+
  '" y="'+(oy+(s.height-1-y)*cell)+'" width="8" height="8" fill="#93c5fd"/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+(s.width*cell+40)+
  '" height="'+(s.height*cell+80)+'"><rect width="100%" height="100%" fill="#0f172a"/>'+
  '<text x="18" y="24" fill="white" font-size="13">R190-BC original B143 x/y section — ART HOLD</text>'+
  '<text x="18" y="43" fill="#cbd5e1" font-size="11">z = '+s.fixedZ+'; solid = blue, air = background</text>'+
  rects+'</svg>';
}
export function writeR190BCOriginalReview({originalPath,outDir,expectedSha256}){
 if(typeof originalPath!=='string'||!path.isAbsolute(originalPath)||
    typeof outDir!=='string'||!path.isAbsolute(outDir)||
    fs.existsSync(outDir))fail('FRESH_ABSOLUTE_PATHS');
 const st=fs.lstatSync(originalPath);
 if(!st.isFile()||st.isSymbolicLink()||st.size<2||st.size>200000)
  fail('UNSAFE_ORIGINAL');
 const raw=fs.readFileSync(originalPath);
 const r=reviewR190BCOriginal(raw,{expectedSha256});
 if(sha(fs.readFileSync(originalPath))!==r.originalSha256)
  fail('ORIGINAL_CHANGED');
 const parent=fs.lstatSync(path.dirname(outDir));
 if(!parent.isDirectory()||parent.isSymbolicLink())fail('UNSAFE_OUTPUT_PARENT');
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'R190BC_SECTION_AUDIT.json'),
  JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'R190BC_SOURCE_SECTION.svg'),
  renderR190BCSectionSVG(r),{flag:'wx'});
 return r;
}
