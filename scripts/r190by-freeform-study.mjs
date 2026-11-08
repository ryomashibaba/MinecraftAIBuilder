/** R190-BY: author contour data -> actual source voxels, B143-viewer-only adapter.
 * Does NOT claim an unextended B143 shape grammar compiled any loft.
 * No provider, no network, no world, no automatic model/source repair.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileR190BY,MATERIALS} from '../source/ai/r190by-freeform-loft.mjs';
import {surfaceOnly,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const H=x=>createHash('sha256').update(x).digest('hex');
const J=x=>JSON.stringify(x,null,2)+'\n';
const BM='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const safe=()=>({readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0,modelCalls:0,networkRequests:0,art:'ART_HOLD',officialArtAdoptions:0,
 constructionApproved:false,executionAllowed:false});
const color={stone:'#87909d',concrete:'#d3d9dc',metal:'#6b8191',
 glass:'#6fb6e3',wood:'#b58e61',glow:'#f0d38b',accent:'#6ab7a3'};
function viewpoint(compiled,side){
 const c=compiled,b=c.bounds,w=b.width,h=b.height,d=b.depth,
  horizontal=side==='roof'?w:['front','rear'].includes(side)?w:d,vertical=side==='roof'?d:h;
 const map=new Map(c.primitives.map(p=>[p[0]+','+p[1]+','+p[2],p[3]]));
 const pix=7,paint=['<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="R190-BY actual source voxel '+side+
  ' projection" viewBox="0 0 '+(horizontal*pix)+' '+(vertical*pix)+'"><rect width="100%" height="100%" fill="#142030"/>'];
 for(let v=0;v<vertical;v++)for(let u=0;u<horizontal;u++){
  let mat;
  if(side==='roof'){
   for(let y=h-1;y>=0;y--){const q=map.get(u+','+y+','+v);if(q!==undefined){mat=q;break;}}
  }else{
   for(let depth=0;depth<(side==='front'||side==='rear'?d:w);depth++){
    const x=['front','rear'].includes(side)?u:side==='west'?depth:w-1-depth;
    const z=side==='front'?depth:side==='rear'?d-1-depth:v,y=h-1-v;
    const q=map.get(x+','+y+','+z);if(q!==undefined){mat=q;break;}
   }
  }
  if(mat!==undefined)paint.push('<rect x="'+u*pix+'" y="'+v*pix+'" width="'+pix+
   '" height="'+pix+'" fill="'+(color[MATERIALS[mat]]??'#bbb')+'"/>');
 }
 paint.push('</svg>');return paint.join('');
}
function viewer(c,p,template){
 const v=c.primitives, min=[Infinity,Infinity,Infinity],max=[-1,-1,-1];
 for(const q of v)for(let i=0;i<3;i++){min[i]=Math.min(min[i],q[i]);max[i]=Math.max(max[i],q[i]);}
 const surface=surfaceOnly({primitives:v});
 const scene={id:p.id,title:p.title,
  brief:'SOURCE ONLY: author loft contours; functional building and art NOT CERTIFIED',
  typology:'author-contour-loft-source',levels:Math.floor(max[1]/5)+1,
  layerNames:MATERIALS.map(x=>'BY_'+x.toUpperCase()),
  surface,bounds:{minX:min[0],minY:min[1],minZ:min[2],maxX:max[0],maxY:max[1],maxZ:max[2]},
  sourceSha256:c.sourceSha256,geometrySha256:c.geometrySha256,
  stats:{voxels:v.length,renderedSurfaceCells:surface.length,layerCounts:c.stats.layerCounts,
   conceptRooms:0,physicalCompletion:'UNVERIFIED',humanReview:'REQUIRED'},
  targetEdition:'MINECRAFT_EDUCATION',designOnly:true,readiness:'NOT_PREPARED',
  worldCoordinates:null,worldContacts:0,BuildPlan:{status:'NOT_PREPARED',operations:[]}};
 const payload={schema:'minecraftaibuilder-b143-gallery-v1',edition:'MINECRAFT_EDUCATION',
  sourceHashes:[c.sourceSha256],geometryHashes:[c.geometrySha256],scenes:[scene],
  safety:{constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
   worldCoordinates:null,worldContacts:0,BuildPlan:{operations:[]},
   original15BuildingSafetyGates:'9 BLOCKED',minecraftWrites:0}};
 return {html:renderB143Html(payload,template),surface:surface.length};
}
export function studyR190BY({out}={}){
 const brief=fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt'));
 if(H(brief)!==BM)throw Error('R190BY_BM_BRIEF_CHANGED');
 const dir=path.resolve(out);if(fs.existsSync(dir))throw Error('R190BY_OUTPUT_EXISTS');
 fs.mkdirSync(dir);
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const cases=[];
 for(const kind of ['A','B']){
  const filename='evidence/r190by/LOFT_'+kind+'.json',src=fs.readFileSync(path.join(ROOT,filename));
  const author=JSON.parse(src);
  if(author.originalBriefSha256!==BM)throw Error('R190BY_BM_BRIEF_BINDING');
  const result=compileR190BY(src);
  const folder=path.join(dir,'LOFT_'+kind);fs.mkdirSync(folder);
  const display=viewer(result,author,template);
  const metrics={
   source:'NEW_BY_LOFT_COMPILER_NOT_STRICT_B143_DSL',
   geometrySha256:result.geometrySha256,rawSha256:result.originalRawSha256,
   finalVoxelCount:result.primitives.length,
   renderedSurfaceVoxelCount:display.surface,elementWork:result.stats.work,
   protectedVoidResults:result.stats.voidResults,
   sourceShells:author.shells.length,
   sourceAuthorContourLevels:author.shells.reduce((x,y)=>x+y.contours.length,0),
   sourceAuthorControlPoints:author.shells.reduce((s,sh)=>s+sh.contours.reduce((t,c)=>t+c.points.length,0),0),
   sourceMaterialCounts:result.stats.layerCounts,
   sourceIsChatAuthored:true,autonomousQwenOrGemmaResult:false,
   existingB143GrammarUnmodified:true,
   existingB143ViewerAdapterOnly:true,
   genuineSourceVoxelProjection:true,
   functionalRoutes:'NOT_TESTED',functionalProgram:'NOT_TESTED',
   artGate:'ART_HOLD',...safe()
  };
  fs.writeFileSync(path.join(folder,'ORIGINAL.json'),src,{flag:'wx'});
  fs.writeFileSync(path.join(folder,'ALL_VOXELS.json'),J({
   schema:result.schema,originalRawSha256:result.originalRawSha256,
   geometrySha256:result.geometrySha256,primitives:result.primitives}),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'VIEWER_3D.html'),display.html,{flag:'wx'});
  for(const side of ['front','rear','west','east','roof'])
   fs.writeFileSync(path.join(folder,'VIEW_'+side+'.svg'),viewpoint(result,side),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'AUDIT.json'),J(metrics),{flag:'wx'});
  cases.push({kind,filename,...metrics});
 }
 const distinct=cases[0].geometrySha256!==cases[1].geometrySha256;
 const report={schema:'minecraftaibuilder-r190by-verified-author-contour-study-v1',
  originalBMBriefSHA:BM,cases,designAuthorship:'CHAT_GPT_6_CONTOUR_POINTS_AUTHOR',
  compilation:'NEW_STRICT_SEPARATE_R190BY_COMPILER_UNCHANGED_B143',
  visualization:'EXACT_SOURCE_VOXELS_RENDERED_BY_COMPATIBLE_B143_VIEWER_ONLY',
  technicalGate:distinct&&cases.every(x=>x.finalVoxelCount>2000&&
   x.protectedVoidResults.every(v=>v.pass))?'SOURCE_REAL_DISTINCT_LOFT_VOXELS_AND_EMPTY_CANYONS':
   'HOLD_FREEFORM_SOURCE_OR_VOIDS',
  functionGate:'NOT_TESTED',artGate:'ART_HOLD_WAITING_VISUAL_REVIEW',
  providerRawUnchanged:true,buAndBwOriginalsUnchanged:true,...safe()};
 fs.writeFileSync(path.join(dir,'STUDY.json'),J(report),{flag:'wx'});
 const row=cases.map(c=>'<tr><td>'+c.kind+'</td><td>'+c.finalVoxelCount+'</td><td>'+
  c.sourceAuthorControlPoints+'</td><td>'+c.protectedVoidResults.map(v=>v.occupiedCells).join(',')+
  '</td><td><a href="LOFT_'+c.kind+'/VIEWER_3D.html">real 3D</a></td><td>'+
  ['front','rear','west','east','roof'].map(v=>'<a href="LOFT_'+c.kind+'/VIEW_'+v+'.svg">'+v+'</a>').join(' / ')+'</td></tr>').join('');
 fs.writeFileSync(path.join(dir,'COMPARE.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-BY loft source real voxels</title>'+
  '<style>body{margin:24px auto;max-width:1300px;padding:20px;background:#101827;color:#eaf2fa;font:15px/1.75 system-ui}a{color:#93d7ff}td,th{border:1px solid #567;padding:12px}table{border-collapse:collapse}</style>'+
  '<h1>R190-BY / 自由輪郭ロフトの真正3D</h1>'+
  '<p>今工程は別形式BYコンパイラの実SOURCE形状。既存B143のloftネイティブ対応ではない。ビューア互換のみ。Qwen/Gemma実回答ではない。実床・室内空気・階段・BV移動・Minecraft施工は未認定。</p>'+
  '<table><tr><th>作者案</th><th>実ボクセル数</th><th>明示輪郭点数</th><th>保護空洞占有</th><th>実3D</th><th>5方位SVG</th></tr>'+row+'</table>'+
  '<p><a href="STUDY.json">監査・SHA・安全境界</a></p></html>',{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190BY_CLI');
  const r=studyR190BY({out:process.argv[3]});
  console.log(J({status:r.technicalGate,art:r.artGate,cases:r.cases.map(x=>({
   kind:x.kind,voxels:x.finalVoxelCount,sourceSHA:x.rawSha256,
   geometrySHA:x.geometrySha256,voids:x.protectedVoidResults}))}));
  if(r.technicalGate!=='SOURCE_REAL_DISTINCT_LOFT_VOXELS_AND_EMPTY_CANYONS')process.exitCode=2;
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
