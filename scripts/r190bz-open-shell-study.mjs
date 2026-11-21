/** R190-BZ frozen author sources -> real voxel audit and camera-matched visual evidence.
 * Independent strict SOURCE, B143 VIEWER ONLY, NO model or Minecraft access.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileR190BZ,MATERIALS} from '../source/ai/r190bz-open-shell.mjs';
import {surfaceOnly,renderB143Html} from './b143-gallery-core.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const BM='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const H=x=>createHash('sha256').update(x).digest('hex'),J=x=>JSON.stringify(x,null,2)+'\n';
const colors=['#8b9ca9','#d5d6cf','#657f91','#7dc0ea','#bc9c66','#e7cb86','#5ed1b5'];
const safe=()=>({readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},constructionApproved:false,executionAllowed:false,
 worldContacts:0,worldWrites:0,modelCalls:0,networkRequests:0,
 functionGate:'NOT_TESTED',artGate:'ART_HOLD',officialArtAdoptions:0});
export function elevationR190BZ(c,side){
 const {width:w,height:h,depth:d}=c.bounds,hori=side==='roof'?w:
  ['front','rear'].includes(side)?w:d,vert=side==='roof'?d:h;
 const map=new Map(c.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const pix=6,out=['<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="R190-BZ true occupied voxels '+
  side+' view" viewBox="0 0 '+hori*pix+' '+vert*pix+'"><rect width="100%" height="100%" fill="#14202e"/>'];
 for(let v=0;v<vert;v++)for(let u=0;u<hori;u++){
  let m;
  if(side==='roof'){
   for(let y=h-1;y>=0;y--){const q=map.get(u+','+y+','+v);if(q!==undefined){m=q;break;}}
  }else{
   for(let step=0;step<(['front','rear'].includes(side)?d:w);step++){
    const x=['front','rear'].includes(side)?u:side==='west'?step:w-1-step;
    const z=side==='front'?step:side==='rear'?d-1-step:u;
    const q=map.get(x+','+(h-1-v)+','+z);if(q!==undefined){m=q;break;}
   }
  }
  if(m!==undefined)out.push('<rect x="'+u*pix+'" y="'+v*pix+'" width="'+pix+
   '" height="'+pix+'" fill="'+colors[m]+'"/>');
 }
 return out.join('')+'</svg>';
}
const minus=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a);if(n<1e-9)throw Error('R190BZ_CAMERA_DEGENERATE');return a.map(v=>v/n)};
export function perspectiveR190BZ(c,side){
 const {width:w,height:h,depth:d}=c.bounds;
 const target=[w/2,h*.54,d/2];
 const eye=side==='oblique'?[w*1.65,h*1.52,-d*2.3]:
  side==='ground'?[w*.49,5,-d*1.55]:[w*.5,16,d*.3];
 const look=side==='ground'?[w*.5,h*.61,d*.5]:
  side==='canyon'?[w*.5,h*.75,d*.6]:target;
 const forward=norm(minus(look,eye)),right=norm(cross(forward,[0,1,0]));
 const up=norm(cross(right,forward));
 const n=640,zbuf=new Float32Array(n*n).fill(Infinity),pix=new Int8Array(n*n).fill(-1);
 const scale=side==='canyon'?440:side==='ground'?585:690;
 const surf=surfaceOnly({primitives:c.primitives});
 for(const q of surf){
  const pos=minus(q.slice(0,3),eye),depth=dot(pos,forward);
  if(depth<1)continue;
  const u=Math.round(n/2+scale*dot(pos,right)/depth);
  const v=Math.round(n/2-scale*dot(pos,up)/depth);
  if(u<2||v<2||u>=n-2||v>=n-2)continue;
  const radius=depth<95?2:1;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   const x=u+dx,y=v+dy,i=y*n+x;
   if(depth<zbuf[i]){zbuf[i]=depth;pix[i]=q[3];}
  }
 }
 const out=['<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="R190-BZ real voxel perspective '+
  side+'" viewBox="0 0 '+n+' '+n+'"><rect width="100%" height="100%" fill="#14202e"/>'];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const c=pix[y*n+x];if(c>=0)out.push('<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+colors[c]+'"/>');
 }
 return out.join('')+'</svg>';
}
function viewer(c,p,template){
 const s=surfaceOnly({primitives:c.primitives}),v=c.primitives;
 const mn=[Infinity,Infinity,Infinity],mx=[-1,-1,-1];
 for(const q of v)for(let i=0;i<3;i++){mn[i]=Math.min(mn[i],q[i]);mx[i]=Math.max(mx[i],q[i]);}
 const scene={id:p.id,title:p.title,brief:'R190-BZ AUTHOR SOURCE ONLY — no functional or art certification',
  typology:'open-3d-patches-independent-source',levels:Math.floor(mx[1]/5)+1,
  layerNames:MATERIALS.map(v=>'BZ_'+v.toUpperCase()),surface:s,
  bounds:{minX:mn[0],minY:mn[1],minZ:mn[2],maxX:mx[0],maxY:mx[1],maxZ:mx[2]},
  sourceSha256:c.sourceSha256,geometrySha256:c.geometrySha256,
  stats:{voxels:v.length,renderedSurfaceCells:s.length,layerCounts:c.stats.layerCounts,
   conceptRooms:0,physicalCompletion:'NOT_TESTED',humanReview:'REQUIRED'},
  targetEdition:'MINECRAFT_EDUCATION',designOnly:true,readiness:'NOT_PREPARED',
  worldCoordinates:null,worldContacts:0,BuildPlan:{status:'NOT_PREPARED',operations:[]}};
 const payload={schema:'minecraftaibuilder-b143-gallery-v1',edition:'MINECRAFT_EDUCATION',
  sourceHashes:[c.sourceSha256],geometryHashes:[c.geometrySha256],scenes:[scene],
  safety:{constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
   worldCoordinates:null,worldContacts:0,BuildPlan:{operations:[]},
   original15BuildingSafetyGates:'9 BLOCKED',minecraftWrites:0}};
 return {html:renderB143Html(payload,template),surface:s.length};
}
function depthRows(c){
 const rows=new Map();
 for(const [x,y,z] of c.primitives){
  const curr=rows.get(y)||{low:Infinity,high:-Infinity};
  curr.low=Math.min(curr.low,z);curr.high=Math.max(curr.high,z);rows.set(y,curr);
 }
 return [...rows.values()].filter(v=>v.high-v.low>=40).length;
}
export function studyR190BZ({out}={}){
 if(typeof out!=='string'||!out)throw Error('R190BZ_OUT_REQUIRED');
 const brief=fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt'));
 if(H(brief)!==BM)throw Error('R190BZ_BM_BRIEF_CHANGED');
 const dir=path.resolve(out);if(fs.existsSync(dir))throw Error('R190BZ_OUTPUT_EXISTS');
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 fs.mkdirSync(dir);
 const records=[];
 for(const kind of ['A','B']){
  const filename='evidence/r190bz/FORM_'+kind+'.json',raw=fs.readFileSync(path.join(ROOT,filename));
  const authored=JSON.parse(raw);
  if(authored.originalBriefSha256!==BM)throw Error('R190BZ_BRIEF_BINDING');
  const c=compileR190BZ(raw),folder=path.join(dir,'FORM_'+kind);fs.mkdirSync(folder);
  const display=viewer(c,authored,template);
  fs.writeFileSync(path.join(folder,'ORIGINAL.json'),raw,{flag:'wx'});
  fs.writeFileSync(path.join(folder,'ALL_VOXELS.json'),J({schema:c.schema,
   originalRawSha256:c.originalRawSha256,geometrySha256:c.geometrySha256,primitives:c.primitives}),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'VIEWER_3D.html'),display.html,{flag:'wx'});
  for(const side of ['front','rear','west','east','roof'])
   fs.writeFileSync(path.join(folder,'VIEW_'+side+'.svg'),elevationR190BZ(c,side),{flag:'wx'});
  for(const side of ['oblique','ground','canyon'])
   fs.writeFileSync(path.join(folder,'VIEW_'+side+'.svg'),perspectiveR190BZ(c,side),{flag:'wx'});
  const audit={kind,filename,source:'SEPARATE_R190BZ_OPEN_PATCH_COMPILER_NOT_B143_NATIVE',
   author:'CHAT_GPT_6_RESEARCH_SAMPLE_NOT_QWEN_OR_GEMMA',
   rawSha256:c.originalRawSha256,geometrySha256:c.geometrySha256,
   finalVoxelCount:c.primitives.length,renderedSurfaceVoxelCount:display.surface,
   sourcePatches:c.stats.patches,sourceTriangles:c.stats.triangles,elementWork:c.stats.work,
   wideDepthRowCount:depthRows(c),protectedVoidResults:c.stats.voidResults,
   genuineSourceVoxelProjections:8,cameraModes:['front','rear','west','east','roof','oblique','ground','canyon'],
   independentArtReview:'PENDING_VISUAL_INSPECTION',...safe()};
  fs.writeFileSync(path.join(folder,'AUDIT.json'),J(audit),{flag:'wx'});
  records.push(audit);
 }
 const distinct=records[0].geometrySha256!==records[1].geometrySha256;
 const good=distinct&&records.every(x=>x.finalVoxelCount>1000&&
  x.protectedVoidResults.every(v=>v.occupiedCells===0));
 const report={schema:'minecraftaibuilder-r190bz-independent-real-3d-study-v1',
  originalBMBriefSHA:BM,sourceSystem:'DISCONTINUOUS_AUTHOR_SET_3D_TRIANGLE_PATCHES',
  technicalGate:good?'SOURCE_REAL_DISTINCT_OPEN_PATCHES':'SOURCE_HOLD',
  artGate:'ART_HOLD_PENDING_HUMAN_8_VIEW_REVIEW',
  functionGate:'NOT_TESTED',constructionGate:'BLOCKED',
  sourceB143Unchanged:true,viewerB143Only:true,records,...safe()};
 fs.writeFileSync(path.join(dir,'STUDY.json'),J(report),{flag:'wx'});
 const heads=['front','rear','west','east','roof','oblique','ground','canyon'];
 const rows=records.map(x=>'<tr><td>'+x.kind+'</td><td>'+x.finalVoxelCount+
  '</td><td>'+x.sourcePatches+'</td><td>'+x.protectedVoidResults.map(v=>v.occupiedCells).join(',')+
  '</td><td><a href="FORM_'+x.kind+'/VIEWER_3D.html">3D</a></td><td>'+
  heads.map(side=>'<a href="FORM_'+x.kind+'/VIEW_'+side+'.svg">'+side+'</a>').join(' / ')+
  '</td></tr>').join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-BZ author open shell audit</title>'+
  '<style>body{background:#101827;color:#edf4f8;font:15px/1.65 system-ui;margin:30px auto;max-width:1400px}a{color:#94d8ff}td,th{border:1px solid #46586b;padding:9px}table{border-collapse:collapse}</style>'+
  '<h1>R190-BZ — 主殻の立体的裂開・真正SOURCE監査</h1><p>技術上の形状検査と美術評価は別です。正面だけで採用しない。'+
  'これらはChatGPT研究設計の実ボクセルであり、Qwen/Gemma結果でもB143 nativeでもありません。'+
  '建築用途、階段、実動線、構造、施工の合格は未申告です。</p>'+
  '<table><tr><th>案</th><th>voxels</th><th>patches</th><th>void occupied</th><th>3D</th><th>8視点実ボクセル</th></tr>'+
  rows+'</table><p><a href="STUDY.json">独立監査・出所・SHA</a></p></html>';
 fs.writeFileSync(path.join(dir,'COMPARE.html'),html,{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190BZ_CLI');
  const r=studyR190BZ({out:process.argv[3]});
  console.log(J({technicalGate:r.technicalGate,artGate:r.artGate,
   cases:r.records.map(x=>({kind:x.kind,voxels:x.finalVoxelCount,
    originalSHA:x.rawSha256,geometrySHA:x.geometrySha256,voids:x.protectedVoidResults}))}));
  if(r.technicalGate!=='SOURCE_REAL_DISTINCT_OPEN_PATCHES')process.exitCode=2;
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
