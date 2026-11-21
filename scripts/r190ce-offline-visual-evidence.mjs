/** R190-CE: source-preserving eight-view real B143 voxel evidence.
 * Five exact projections and three approximate splat camera probes.
 * Human ART and usability remain HOLD. No model or Minecraft I/O.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {elevationR190BZ,perspectiveR190BZ} from './r190bz-open-shell-study.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const J=x=>JSON.stringify(x,null,2)+'\n';
const views=['front','rear','west','east','roof','oblique','ground','canyon'];
const fail=x=>{throw Error('R190CE_'+x)};
function read(p,max=15000000){
 const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>max)fail('SOURCE_FILE');
 return fs.readFileSync(p);
}
const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderR190CE({reviewDir,out}={}){
 if(typeof reviewDir!=='string'||!reviewDir||typeof out!=='string'||!out||fs.existsSync(out))
  fail('FRESH_OUTPUT_REQUIRED');
 const root=path.resolve(reviewDir),dest=path.resolve(out);
 if(!fs.statSync(path.dirname(dest)).isDirectory())fail('OUTPUT_PARENT');
 let score,assessment,vox;
 try{
  score=JSON.parse(read(path.join(root,'CD_SCORECARD.json')));
  assessment=JSON.parse(read(path.join(root,'ASSESSMENT.json'),500000));
  vox=JSON.parse(read(path.join(root,'DERIVED_VOXELS.json')));
 }catch{fail('CD_EVIDENCE_MISSING');}
 const raw=read(path.join(root,'UNALTERED_SOURCE.txt'),200000);
 const brief=read(path.join(root,'ORIGINAL_BRIEF.txt'),20000);
 if(assessment.status!=='HOLD_PHYSICAL_ART_FIDELITY_AND_PROVIDER_PROVENANCE'||
  !Array.isArray(vox.primitives)||!vox.primitives.length||
  !score.bounds||score.rawSourceSha256!==H(raw)||
  assessment.unalteredSourceSha256!==H(raw)||vox.originalRawSha256!==H(raw)||
  assessment.briefSha256!==H(brief)||
  score.geometrySha256!==vox.geometrySha256||
  score.geometrySha256!==assessment.geometrySha256||
  H(JSON.stringify(vox.primitives))!==vox.rawVoxelOnlySha256||
  score.primitiveVoxelSha256!==vox.rawVoxelOnlySha256||
  score.voxelCount!==vox.primitives.length||
  score.artGate!=='ART_HOLD_REQUIRES_REAL_MULTI_VIEW_HUMAN'||
  score.worldWrites!==0||score.modelCalls!==0||
  score.readiness!=='NOT_PREPARED'||score.gates?.length!==9||
  score.gates.some(x=>x!=='BLOCKED')||score.BuildPlan?.operations?.length!==0)
   fail('SOURCE_OR_GEOMETRY_INTEGRITY');
 const bounds=score.bounds,seen=new Set();
 for(const p of vox.primitives){
  if(!Array.isArray(p)||p.length<4||p.slice(0,3).some((x,i)=>
   !Number.isInteger(x)||x<0||x>=[bounds.width,bounds.height,bounds.depth][i])||
   !Number.isInteger(p[3])||p[3]<0||p[3]>6)fail('VOXEL_FORMAT');
  const key=p.slice(0,3).join(',');
  if(seen.has(key))fail('DUPLICATE_FINAL_VOXEL');
  seen.add(key);
 }
 const c={primitives:vox.primitives,bounds};
 fs.mkdirSync(dest);
 const images=[];
 for(const view of views){
  const ortho=views.indexOf(view)<5;
  const svg=ortho?elevationR190BZ(c,view):perspectiveR190BZ(c,view);
  if(!svg.startsWith('<svg ')||!svg.includes('<rect x=')||!svg.endsWith('</svg>'))
   fail('NO_RENDERABLE_VOXEL_VIEW_'+view);
  const file='VIEW_'+view+'.svg';
  fs.writeFileSync(path.join(dest,file),svg,{flag:'wx'});
  images.push({view,file,sha256:H(Buffer.from(svg)),bytes:Buffer.byteLength(svg),
   kind:ortho?'EXACT_VOXEL_ORTHOGRAPHIC':'APPROXIMATE_VOXEL_SURFACE_CAMERA'});
 }
 const audit={schema:'minecraftaibuilder-r190ce-eight-voxel-views-v1',
  sourceRawSha256:H(raw),briefSha256:H(brief),
  geometrySha256:score.geometrySha256,rawVoxelOnlySha256:score.primitiveVoxelSha256,
  voxelCount:vox.primitives.length,bounds,images,
  origin:'SAVED_SOURCE_UNVERIFIED_NOT_PROVIDER_AUTHENTICATED',
  perspectiveLimit:'THREE_FIXED_CAMERA_SPLATS_NOT_INDEPENDENT_RAYTRACES_OR_CERTIFIED_INTERIOR_VIEW',
  independentlyVerifiedViews:'PENDING_SEPARATE_PYTHON_FIVE_ORTHOGRAPHIC_CHECK',
  humanArtReview:'NOT_PERFORMED',artDecision:'ART_HOLD',
  userBriefFidelity:'NOT_CERTIFIED',realMinecraftWalking:'NOT_TESTED',
  modelCalls:0,networkRequests:0,worldWrites:0,worldContacts:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},constructionApproved:false,executionAllowed:false,
  officialArtAdoptions:0};
 fs.writeFileSync(path.join(dest,'VISUAL_EVIDENCE.json'),J(audit),{flag:'wx'});
 const rows=score.programs.map(p=>'<tr><td>'+htmlEscape(p.id)+'</td><td>'+
  htmlEscape(p.sourceDeclaredPurpose)+'</td><td>'+p.supportedClearCells+
  '/'+p.requestedCells+'</td><td>'+p.conservativeTwoWideReachable+'</td></tr>').join('');
 const pics=images.map(x=>'<figure><img loading="lazy" src="'+x.file+'"><figcaption>'+
  htmlEscape(x.view)+' / '+(x.kind.startsWith('EXACT')?'実voxel正投影':'近似カメラ')+
  '</figcaption></figure>').join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R190-CE voxel visual audit</title>'+
  '<style>body{font:15px/1.6 system-ui;background:#111923;color:#eaf1f9;max-width:1300px;margin:25px auto;padding:0 15px}'+
  '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:13px}'+
  'figure{margin:0;border:1px solid #64748b;padding:10px}img{width:100%;height:290px;object-fit:contain;background:#14202e}'+
  'table{border-collapse:collapse}td,th{border:1px solid #64748b;padding:7px}a{color:#9cd3ff}</style>'+
  '<h1>R190-CE 最終ボクセル8視点レビュー</h1>'+
  '<p><strong>ART HOLD・機能HOLD・施工禁止。</strong>これは保存済み設計の決定論的3Dです。'+
  'モデル自由設計の実証、建築の美しさ、実Minecraft歩行は認定していません。</p>'+
  '<p>5正投影は全voxelsに基づく表示、3カメラは表面セルの近似表示です。内観・実歩行視点の認定ではありません。</p>'+
  '<p>原文SHA '+audit.sourceRawSha256+' / 幾何SHA '+audit.geometrySha256+
  ' / <a href="VISUAL_EVIDENCE.json">証拠と制限</a></p>'+
  '<table><tr><th>空間</th><th>作者の用途</th><th>支持床+頭上空気</th><th>2幅到達候補</th></tr>'+
  rows+'</table><div class="grid">'+pics+'</div></html>';
 fs.writeFileSync(path.join(dest,'REVIEW.html'),html,{flag:'wx'});
 return audit;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==6||process.argv[2]!=='--review'||process.argv[4]!=='--out')
   fail('CLI_USAGE');
  const r=renderR190CE({reviewDir:process.argv[3],out:process.argv[5]});
  console.log(J({voxels:r.voxelCount,views:r.images.length,art:r.artDecision,worldWrites:0}));
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
