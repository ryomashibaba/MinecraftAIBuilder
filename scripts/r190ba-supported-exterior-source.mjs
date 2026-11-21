/**
 * R190-BA — disambiguate AIR-TO-BOUNDARY from PHYSICALLY SUPPORTED
 * 2x2-width flat-floor exterior access in model-authored final B143 voxels.
 * A conservative local-source test, NOT Minecraft physics or actual outdoors.
 * No model calls, no source modification, no inferred doors or fixes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {fileURLToPath} from 'node:url';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {auditR190AZModelClaims} from './r190az-physical-claims.mjs';
export const R190BA_SCHEMA='minecraftaibuilder-r190ba-supported-outdoor-entry-v1';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=s=>{throw Error('R190BA_'+s);};
const pkey=(x,z)=>x+','+z;
const safety=()=>({readiness:'NOT_PREPARED',
 constructionApproved:false,executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 modelCallsByReview:0,art:'ART_HOLD',officialArtAdoptions:0});
const trip=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isSafeInteger);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const parentPath=(last,parent)=>{
 const result=[last];
 while(parent.has(last)){last=parent.get(last);result.push(last);}
 return result.reverse().map(k=>k.split(',').map(Number));
};
/**
 * y is not inferred. This deliberately avoids silently certifying stairs,
 * jumps, step-up collision, ramps, construction or actual external ground.
 */
function supportedRoute(compiled,bounds,entry){
 const w=bounds.width,h=bounds.height,d=bounds.depth;
 if(!trip(entry)||entry[0]<0||entry[0]>=w||entry[2]<0||entry[2]>=d||
   entry[1]<=0||entry[1]+1>=h)
  return {status:'HOLD_INVALID_MODEL_ENTRANCE_POINT',
   sourceTwoWidePadCount:0,entranceCandidatePads:0,
   visitedPads:0,witness:[],boundaryPads:[]};
 const [ex,y,ez]=entry;
 const voxels=new Set(compiled.primitives.map(c=>c[0]+','+c[1]+','+c[2]));
 const has=(x,yy,z)=>voxels.has(x+','+yy+','+z);
 const pad=new Set(),entrancePads=[];
 for(let x=0;x<w-1;x++)for(let z=0;z<d-1;z++){
  let all=true;
  for(let dx=0;dx<=1&&all;dx++)for(let dz=0;dz<=1;dz++){
   const xx=x+dx,zz=z+dz;
   if(!has(xx,y-1,zz)||has(xx,y,zz)||has(xx,y+1,zz)){all=false;break;}
  }
  if(!all)continue;
  pad.add(pkey(x,z));
  if(x<=ex&&x+1>=ex&&z<=ez&&z+1>=ez)
   entrancePads.push(pkey(x,z));
 }
 if(!entrancePads.length)
  return {status:'HOLD_ENTRANCE_NOT_IN_SUPPORTED_TWO_WIDE_CLEAR_PAD',
   sourceTwoWidePadCount:pad.size,entranceCandidatePads:0,
   visitedPads:0,witness:[],boundaryPads:[]};
 const parent=new Map(),seen=new Set(entrancePads),queue=[...entrancePads];
 const boundaryPads=[];
 let found=null;
 for(let i=0;i<queue.length;i++){
  const k=queue[i],[x,z]=k.split(',').map(Number);
  if(x===0||z===0||x===w-2||z===d-2){
   boundaryPads.push([x,z]);
   if(found===null)found=k;
  }
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const n=pkey(x+dx,z+dz);
   if(pad.has(n)&&!seen.has(n)){
    seen.add(n);parent.set(n,k);queue.push(n);
   }
  }
 }
 const witness=found===null?[]:parentPath(found,parent).map(([x,z])=>[x,y,z]);
 return {
  status:found===null?'HOLD_NO_SUPPORTED_TWO_WIDE_FLAT_PATH_TO_BOUNDARY':
    'SOURCE_TWO_WIDE_SUPPORTED_FLAT_BOUNDARY_PATH_FOUND',
  sourceTwoWidePadCount:pad.size,entranceCandidatePads:entrancePads.length,
  visitedPads:seen.size,witness,boundaryPads,
  shortestSourceWitnessSteps:found===null?null:witness.length-1,
  crossingWidthInBlocks:2,minimumAirHeightInBlocks:2,
  requiredSupportedFootprintCellsPerPad:4,
  entirelySingleModelDeclaredEntranceY:true,
  boundaryIsOnlyLocalDesignVolumeNotRealOutside:true,
  actualMinecraftWalking:'NOT_TESTED',
  verticalCirculation:'NOT_TESTED',
  firstPersonAccessAndDoors:'NOT_CERTIFIED'};
}
export function reviewR190BASupportedExterior(raw,{expectedSha256}={}){
 if(!(raw instanceof Uint8Array)||raw.length<2||raw.length>200000)fail('INVALID_ORIGINAL_BYTES');
 const digest=sha(raw);
 if(expectedSha256!==undefined&&(!/^[a-f0-9]{64}$/.test(expectedSha256)||
   digest!==expectedSha256))fail('ORIGINAL_SHA_MISMATCH');
 const previous=auditR190AZModelClaims(raw,{expectedSha256:digest});
 const base={schema:R190BA_SCHEMA,originalSha256:digest,originalBytes:raw.length,
  sourceOriginalModified:false,modelProviderCalled:false,
  upstreamAZStatus:previous.status,
  upstreamAZAirBoundaryProxy:previous.physical?.entranceToBoundaryAirProxy??null,
  modelProvenance:'ORIGINAL_BYTES_IDENTITY_UNVERIFIED',
  actualExteriorSiteConnection:'NOT_CERTIFIED',
  actualMinecraftWalking:'NOT_TESTED',
  aesthetics:'ART_HOLD',...safety()};
 if(previous.status==='HOLD_INVALID_B143'||previous.status==='HOLD_INVALID_JSON'||
   previous.status==='HOLD_NO_DESIGN'){
  return {...base,status:'HOLD_UPSTREAM_INVALID_SOURCE',
   firstFailure:previous.firstFailure,sourceGeometrySha256:null,
   routeEvidence:null};
 }
 let original;
 try{original=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}
 catch{fail('INTERNAL_PARSED_SOURCE_MISMATCH')}
 if(!object(original)||!object(original.design))
  fail('NO_SOURCE');
 const compiled=compileDesign(original.design);
 if(!verifyCompiled(original.design,compiled))fail('INDEPENDENT_B143_VERIFICATION');
 const route=supportedRoute(compiled,original.design.bounds,original.spatialPlan?.entrance);
 return {...base,status:route.status,
  firstFailure:route.status.startsWith('HOLD')?route.status:null,
  sourceGeometrySha256:compiled.geometrySha256,
  routeEvidence:route};
}
function readOriginal(file){
 if(typeof file!=='string'||!path.isAbsolute(file))fail('ABSOLUTE_INPUT_REQUIRED');
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<2||st.size>200000)
  fail('UNSAFE_ORIGINAL_FILE');
 return fs.readFileSync(file);
}
export function writeR190BAReview({originalPath,outDir,expectedSha256}){
 if(typeof outDir!=='string'||!path.isAbsolute(outDir)||fs.existsSync(outDir))
  fail('FRESH_ABSOLUTE_OUTPUT_REQUIRED');
 const raw=readOriginal(originalPath);
 const result=reviewR190BASupportedExterior(raw,{expectedSha256});
 if(sha(readOriginal(originalPath))!==result.originalSha256)
  fail('INPUT_CHANGED_DURING_AUDIT');
 const parent=fs.lstatSync(path.dirname(outDir));
 if(!parent.isDirectory()||parent.isSymbolicLink())fail('OUTPUT_PARENT');
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'REAL_SOURCE_BOUNDARY_ROUTE.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'RESULT_JA.txt'),[
  'R190-BA — 空気だけの境界連結は実通路ではない。',
  '原文SHA256: '+result.originalSha256,
  'B143来源の成否: '+result.upstreamAZStatus,
  '2×2床と2高空気が連続する境界経路: '+result.status,
  'この検査は単一高さのフラットな通路のみ。階段やMinecraftプレイヤーの実移動を実証しない。',
  'B143 boundsの外の現実地面・外部の道路への接続は不明。',
  '保存済み原文の改変ゼロ、追加モデル呼び出しゼロ、世界接触ゼロ、ART HOLD。',
  ''
 ].join('\n'),{flag:'wx'});
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==6||a[0]!=='--original'||a[2]!=='--out'||a[4]!=='--sha')
   fail('CLI_ARGS');
  const x=writeR190BAReview({originalPath:a[1],outDir:a[3],expectedSha256:a[5]});
  console.log(JSON.stringify({status:x.status,source:x.upstreamAZStatus,
   originalSha256:x.originalSha256,worldWrites:0,modelCalls:0},null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
