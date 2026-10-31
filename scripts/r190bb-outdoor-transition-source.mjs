/**
 * R190-BB SOURCE roofless escape transition. No inferred model shapes, no
 * real-world exterior certification. Model-authored raw bytes stay immutable.
 */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {reviewR190BASupportedExterior} from './r190ba-supported-exterior-source.mjs';
export const R190BB_SCHEMA='minecraftaibuilder-r190bb-source-shelter-to-sky-v1';
const H=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('R190BB_'+x)};
const k=(x,z)=>x+','+z;
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 modelCallsByReview:0,art:'ART_HOLD',officialArtAdoptions:0});
function route(design,compiled,entrance){
 const {width:w,height:h,depth:d}=design.bounds;
 const [ex,y,ez]=entrance,vox=new Set(compiled.primitives.map(p=>p[0]+','+p[1]+','+p[2]));
 const occupied=(x,yy,z)=>vox.has(x+','+yy+','+z);
 const pads=new Map(),starts=[];
 for(let x=0;x<w-1;x++)for(let z=0;z<d-1;z++){
  let valid=true,roofedColumns=0;
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){
   const xx=x+i,zz=z+j;
   if(!occupied(xx,y-1,zz)||occupied(xx,y,zz)||occupied(xx,y+1,zz))valid=false;
   for(let yy=y+2;yy<h;yy++)if(occupied(xx,yy,zz)){
    roofedColumns++;break;
   }
  }
  if(!valid)continue;
  const type=roofedColumns===4?'sheltered':roofedColumns===0?'sky-open':'partly-roofed';
  const point={x,z,type,roofedColumns,boundary:x===0||z===0||x===w-2||z===d-2};
  pads.set(k(x,z),point);
  if(x<=ex&&ex<=x+1&&z<=ez&&ez<=z+1)starts.push(k(x,z));
 }
 const roofedStarts=starts.filter(i=>pads.get(i).type==='sheltered');
 const find=(sources)=>{
  const queue=[...sources],seen=new Set(queue),parent=new Map();
  for(let i=0;i<queue.length;i++){
   const id=queue[i],v=pads.get(id);
   if(v.boundary&&v.type==='sky-open'){
    const witness=[];let node=id;
    while(node!==undefined){
     const p=pads.get(node);
     witness.push({pad:[p.x,y,p.z],exposure:p.type,roofedColumns:p.roofedColumns});
     node=parent.get(node);
    }
    return {found:true,visitedPads:seen.size,witness:witness.reverse()};
   }
   for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
    const nk=k(v.x+dx,v.z+dz);
    if(pads.has(nk)&&!seen.has(nk)){seen.add(nk);parent.set(nk,id);queue.push(nk);}
   }
  }
  return {found:false,visitedPads:seen.size,witness:[]};
 };
 const sheltered=find(roofedStarts),any=sheltered.found?sheltered:find(starts);
 return {sourceTwoWidePadCount:pads.size,entrancePadCount:starts.length,
  shelteredEntrancePadCount:roofedStarts.length,
  skyOpenBoundaryPadCount:[...pads.values()].filter(p=>p.boundary&&p.type==='sky-open').length,
  shelterToSkyOpenBoundary:sheltered.found,
  entranceToSkyOpenBoundary:any.found,
  witness:any.witness,
  firstSkyOpenPadIndex:any.witness.findIndex(p=>p.exposure==='sky-open'),
  witnessLengthSteps:any.witness.length?any.witness.length-1:null,
  sourcePadExposure:[...pads.values()].map(p=>({pad:[p.x,y,p.z],exposure:p.type,boundary:p.boundary})),
  rooflessMeansFourVerticalColumnsAreEmptyToLocalBound:true,
  boundaryIsNotRealMinecraftExterior:true,actualMinecraftWalking:'NOT_TESTED'};
}
export function reviewR190BBOutdoorTransition(raw,{expectedSha256}={}){
 if(!(raw instanceof Uint8Array)||raw.length<2||raw.length>200000)fail('ORIGINAL_BYTES');
 const digest=H(raw);
 if(expectedSha256!==undefined&&(!/^[a-f0-9]{64}$/.test(expectedSha256)||
   expectedSha256!==digest))fail('ORIGINAL_SHA_MISMATCH');
 const ba=reviewR190BASupportedExterior(raw,{expectedSha256:digest});
 const base={schema:R190BB_SCHEMA,originalSha256:digest,originalBytes:raw.length,
  priorBAStatus:ba.status,upstreamAZStatus:ba.upstreamAZStatus,
  originalUnmodified:true,geometryRepairs:0,modelProviderCalled:false,
  actualExteriorAccess:'NOT_CERTIFIED',actualMinecraftWalking:'NOT_TESTED',
  materialEngineering:'NOT_CERTIFIED',...safety()};
 if(ba.status!=='SOURCE_TWO_WIDE_SUPPORTED_FLAT_BOUNDARY_PATH_FOUND')
  return {...base,status:'HOLD_UPSTREAM_NO_SUPPORTED_TWO_WIDE_BOUNDARY_ROUTE',
   sourceGeometrySha256:ba.sourceGeometrySha256,sourceTransitionEvidence:null};
 let payload;
 try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))}
 catch{fail('UPSTREAM_PARSE_INCONSISTENT')}
 const compiled=compileDesign(payload.design);
 if(!verifyCompiled(payload.design,compiled)||compiled.geometrySha256!==ba.sourceGeometrySha256)
  fail('SOURCE_HASH_MISMATCH');
 const proof=route(payload.design,compiled,payload.spatialPlan.entrance);
 return {...base,sourceGeometrySha256:compiled.geometrySha256,
  sourceTransitionEvidence:proof,
  status:proof.shelterToSkyOpenBoundary?
   'SOURCE_SHELTER_TO_SKY_OPEN_LOCAL_BOUNDARY_FOUND':
   proof.entranceToSkyOpenBoundary?
    'SOURCE_SKY_OPEN_BOUNDARY_BUT_NOT_SHELTERED_ENTRANCE':
    'HOLD_SUPPORTED_BOUNDARY_BUT_SKY_EXPOSURE_UNPROVEN'};
}
export function renderR190BBPlanSVG(report){
 if(report.schema!==R190BB_SCHEMA)fail('REVIEW_SCHEMA');
 const proof=report.sourceTransitionEvidence;
 if(!proof)return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="100"><rect width="600" height="100" fill="#111827"/><text x="20" y="50" fill="white">HOLD — no valid model B143 route to render</text></svg>';
 const cells=proof.sourcePadExposure;
 const w=2+Math.max(1,...cells.map(p=>p.pad[0]));
 const d=2+Math.max(1,...cells.map(p=>p.pad[2]));
 const fill={'sheltered':'#64748b','partly-roofed':'#d97706','sky-open':'#67e8f9'};
 const squares=cells.map(p=>'<rect x="'+(16+p.pad[0]*10)+'" y="'+(54+p.pad[2]*10)+
  '" width="9" height="9" fill="'+fill[p.exposure]+'"/>').join('');
 const points=proof.witness.map(p=>[21+p.pad[0]*10,59+p.pad[2]*10]);
 const line=points.length?'<polyline fill="none" stroke="#f43f5e" stroke-width="3" points="'+
  points.map(p=>p.join(',')).join(' ')+'"/>':'';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+(w*10+32)+'" height="'+
  (d*10+66)+'"><rect width="100%" height="100%" fill="#111827"/>'+
  '<text x="16" y="22" fill="white" font-size="13">R190-BB genuine B143 2-wide footprint</text>'+
  '<text x="16" y="42" fill="#e2e8f0" font-size="11">gray sheltered, orange partial, cyan sky, red route</text>'+
  squares+line+'</svg>';
}
export function writeR190BBAudit({originalPath,outDir,expectedSha256}){
 if(typeof originalPath!=='string'||!path.isAbsolute(originalPath))fail('ABSOLUTE_INPUT');
 if(typeof outDir!=='string'||!path.isAbsolute(outDir)||fs.existsSync(outDir))fail('FRESH_OUTPUT');
 const st=fs.lstatSync(originalPath);
 if(!st.isFile()||st.isSymbolicLink()||st.size<2||st.size>200000)fail('UNSAFE_ORIGINAL');
 const raw=fs.readFileSync(originalPath);
 const r=reviewR190BBOutdoorTransition(raw,{expectedSha256});
 if(H(fs.readFileSync(originalPath))!==r.originalSha256)fail('ORIGINAL_CHANGED');
 const parent=fs.lstatSync(path.dirname(outDir));
 if(!parent.isDirectory()||parent.isSymbolicLink())fail('OUTPUT_PARENT');
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'READ_ONLY_SKY_BOUNDARY.json'),JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'SOURCE_2WIDE_ROUTE.svg'),renderR190BBPlanSVG(r),{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'STATUS_JA.txt'),[
  'R190-BB: 支持床が境界に届くことと、天空に開いた屋外に出ることは異なる。',
  '保存原文SHA256: '+r.originalSha256,
  'BA: '+r.priorBAStatus,'BB: '+r.status,
  'ここでの外部はローカルB143設計座標の端でしかない。',
  'モデル新規実行0、原文修復0、Minecraft接触0、ART HOLD。',''
 ].join('\n'),{flag:'wx'});
 return r;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const a=process.argv.slice(2);
  if(a.length!==6||a[0]!=='--original'||a[2]!=='--out'||a[4]!=='--sha')fail('ARGS');
  const r=writeR190BBAudit({originalPath:a[1],outDir:a[3],expectedSha256:a[5]});
  console.log(JSON.stringify({status:r.status,sha:r.originalSha256,modelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
