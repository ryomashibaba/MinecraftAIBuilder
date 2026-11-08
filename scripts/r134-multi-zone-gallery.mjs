/**
 * R134 offline 3D source gallery of independently authored semantic IR cases.
 * Real B143 voxels, intentionally NOT freshly model-authored evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileR134MultiZonePlan,SCHEMA}
 from '../source/ai/r134-multi-zone-plan.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cases=[
 {id:'site-research',axis:'z',count:4,
  title:'High Daylight Field Research',
  brief:'An unknown four-zone field exploration and prototyping center',
  roof:'ridge',facade:'fins',weights:[4,2,3,1]},
 {id:'arts-invention',axis:'x',count:3,
  title:'Creative Fabrication Commons',
  brief:'Three spatially distinct workshops for making and exhibiting inventions',
  roof:'sawtooth',facade:'screen',weights:[3,1,4]},
 {id:'ecological-hub',axis:'z',count:3,
  title:'Ecological Study Pavilion',
  brief:'An open educational research space with distinct testing and group activities',
  roof:'flat',facade:'plain',weights:[1,4,2]}
];
export function buildR134MultiZoneGallery(){
 const template=fs.readFileSync(path.join(ROOT,
  'source/ai/b143-viewer-template.html'),'utf8');
 const pages=[],records=[];
 for(const c of cases){
  const program={
   schema:SCHEMA,id:c.id,title:c.title,brief:c.brief,
   footprint:{width:28,depth:28},
   materials:{floor:'wood',wall:'stone',roof:'metal'},
   layout:{axis:c.axis,spaces:Array.from({length:c.count},(_,i)=>({
    id:c.id+'-zone-'+(i+1),
    purpose:'Independent meaningful zone and user activities '+(i+1),
    weight:c.weights[i]}))},
   form:{roofProfile:c.roof,facadeLanguage:c.facade}
  };
  const result=compileR134MultiZonePlan(program);
  const file=c.id+'.html';
  pages.push({file,html:renderB143Html(compileB143Gallery([result.design]),template)});
  records.push({file,case:c.id,zones:result.program[0].zones,
   voxels:result.compiled.primitives.length,sourceSha256:result.sourceSha256,
   geometrySha256:result.geometrySha256,
   sourceRoutes:result.sourceRouteAudit.status,
   sourceOnly:true,modelCalls:0,humanArtApproval:false});
 }
 const cards=records.map(r=>'<article><h2>'+r.case+'</h2>'+
  '<p>'+r.voxels+' real B143 cells / '+r.zones.length+
  ' rooms / '+r.sourceRoutes+'</p><iframe loading="lazy" src="'+r.file+
  '" title="'+r.case+'"></iframe><a href="'+r.file+
  '" target="_blank" rel="noopener">単独3D</a></article>').join('');
 const home='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R134 multizone original 3D</title>'+
  '<style>body{margin:0;padding:20px;font:15px system-ui;background:#0f1e2b;'+
  'color:#eef7ff}.row{display:grid;grid-template-columns:repeat(3,minmax(240px,1fr));'+
  'gap:12px}article{background:#213249;padding:12px;border-radius:10px}'+
  'iframe{height:480px;width:100%;border:1px solid #597389}a{color:#9edcfd}'+
  '@media(max-width:940px){.row{grid-template-columns:1fr}}</style>'+
  '<h1>R134｜3・4区画の新規建築を本物の3Dで比較</h1>'+
  '<p>これは人が選んだ短いIRを汎用コンパイラが実ボクセル化した試験作品。'+
  '実Qwen/Gemmaの新規設計やMinecraft実施工とは区別する。</p>'+
  '<main class="row">'+cards+'</main></html>';
 pages.unshift({file:'index.html',html:home});
 return {schema:'r134-new-multi-zone-source-review-v1',
  records,pages,independentSourcePrograms:true,modelCalls:0,
  inGameWalking:'NOT_TESTED',artReview:'NOT_REVIEWED',
  worldWrites:0,constructionApproved:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
}
export function saveR134MultiZoneGallery(out){
 if(typeof out!=='string'||!out.trim())throw Error('R134_GALLERY_OUTPUT_REQUIRED');
 const dir=path.resolve(out);
 if(fs.existsSync(dir))throw Error('R134_GALLERY_NO_OVERWRITE');
 const r=buildR134MultiZoneGallery();
 fs.mkdirSync(dir,{recursive:false});
 for(const x of r.pages)
  fs.writeFileSync(path.join(dir,x.file),x.html,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'R134_GALLERY_EVIDENCE.json'),
  JSON.stringify({...r,pages:r.pages.map(x=>x.file)},null,2)+'\n',
  {flag:'wx'});
 return r;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')
   throw Error('R134_GALLERY_ARGS');
  const r=saveR134MultiZoneGallery(args[1]);
  console.log(JSON.stringify({status:'OFFLINE_3D_SOURCE_ART_READY',
   scenes:r.records.length,voxels:r.records.map(x=>x.voxels),
   zoneCounts:r.records.map(x=>x.zones.length),worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
