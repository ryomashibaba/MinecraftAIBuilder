/**
 * Cross-program R125 HOST roof-volume study. Does NOT call a model or touch
 * Minecraft. Three program variations are SYNTHETIC, not Qwen outputs.
 * Only the public saved Qwen residential plan is used as a protected seed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan,assessR125ProgramGeometry}
 from '../source/ai/r125-architecture-plan.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PIN='46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271';
const fail=code=>{throw Error('R125_ROOF_INTERIOR_'+code);};
const key=(x,y,z)=>x+','+y+','+z;
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

function syntheticCases(seed){
 const house=structuredClone(seed);
 house.id='roof-house-synthetic';
 house.title='Synthetic two-level residential roof study';
 house.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'sawtooth',roofAxis:'z',facadeLanguage:'plain'};
 const store=structuredClone(seed);
 store.id='roof-store-synthetic';
 store.title='Synthetic store with distinct single-level program';
 store.brief='Synthetic retail program for a true raised interior ceiling; not a new model response.';
 store.footprint={width:20,depth:22};
 store.levels=[{splitAxis:'x',splitPercent:60,spaces:[
  {id:'display-room',purpose:'Public area for product display and customer movement'},
  {id:'staff-room',purpose:'Inventory inspection and staff back office'}]}];
 store.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'sawtooth',roofAxis:'x',facadeLanguage:'plain'};
 const lab=structuredClone(seed);
 lab.id='roof-lab-synthetic';
 lab.title='Synthetic two-level research facility';
 lab.brief='Synthetic scientific workspace split by security and research function; not a model response.';
 lab.footprint={width:26,depth:24};
 lab.levels=[
  {splitAxis:'z',splitPercent:50,spaces:[
   {id:'public-intake',purpose:'Public sample registration and entry'},
   {id:'sample-prep',purpose:'Controlled preparation and supply area'}]},
  {splitAxis:'x',splitPercent:60,spaces:[
   {id:'analysis-lab',purpose:'Research analysis with two-wide internal movement'},
   {id:'instrument-room',purpose:'Equipment instrumentation and archive'}]}];
 lab.expression={setbackSide:'none',setbackDepth:0,
  roofProfile:'sawtooth',roofAxis:'z',facadeLanguage:'plain'};
 return [house,store,lab];
}
function inspectRoofAir(before,after){
 const {design,compiled,plan}=after;
 const top=1+5*plan.levels.length;
 const skins=design.elements.filter(e=>e.id.startsWith('roof-raised-skin-'));
 const roofBase=design.elements.some(e=>e.id==='roof-base');
 const occupied=new Set(compiled.primitives.map(v=>key(v[0],v[1],v[2])));
 const older=new Set(before.compiled.primitives.map(v=>key(v[0],v[1],v[2])));
 const upper=skins.map(e=>e.origin);
 const minX=Math.min(...upper.map(p=>p[0]));
 const maxX=Math.max(...skins.map(e=>e.origin[0]+e.size[0]-1));
 const minZ=Math.min(...upper.map(p=>p[2]));
 const maxZ=Math.max(...skins.map(e=>e.origin[2]+e.size[2]-1));
 const has=(x,y,z)=>occupied.has(key(x,y,z));
 const air=(x,z)=>!has(x,top,z)&&!has(x,top+1,z);
 let newCeilingAirCells=0,highAirColumns=0,twoWideHighRoofPads=0;
 let verticallyConnectedTwoWideRoofPads=0;
 const upperStandingY=2+5*(plan.levels.length-1);
 // A real 2x2 supported pad under the entire upper headroom column,
 // verified from FINAL B143 cells. This is still not player physics.
 const verticalPad=(x,z)=>{
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   const xx=x+dx,zz=z+dz;
   if(!has(xx,upperStandingY-1,zz))return false;
   for(let y=upperStandingY;y<=top+1;y++)
    if(has(xx,y,zz))return false;
  }
  return true;
 };
 for(let x=minX+1;x<maxX;x++)for(let z=minZ+1;z<maxZ;z++){
  if(older.has(key(x,top,z))&&!has(x,top,z))newCeilingAirCells++;
  if(air(x,z))highAirColumns++;
  if(x+1<maxX&&z+1<maxZ&&
   air(x,z)&&air(x+1,z)&&air(x,z+1)&&air(x+1,z+1)){
   twoWideHighRoofPads++;
   if(verticalPad(x,z))verticallyConnectedTwoWideRoofPads++;
  }
 }
 // Every perimeter strip is checked against the actual compiled source.
 // No virtual filling of missing voxels, and no "watertight" certification.
 const axis=plan.expression.roofAxis;
 let unclosedEaveOrEndCells=0,unclosedStepCells=0;
 for(const skin of skins){
  const pos=Number(skin.id.slice('roof-raised-skin-'.length));
  const h=skin.origin[1]-top;
  const extent=axis==='x'?skin.size[2]:skin.size[0];
  for(let offset=0;offset<extent;offset++){
   const x=axis==='x'?skin.origin[0]:skin.origin[0]+offset;
   const z=axis==='x'?skin.origin[2]+offset:skin.origin[2];
   if(!has(x,top+h,z))fail('MISSING_REAL_ROOF_SKIN');
   if((offset===0||offset===extent-1||
    (pos===skins.length-1&&h>0)))
    for(let y=top;y<top+h;y++)
     if(!has(x,y,z))unclosedEaveOrEndCells++;
  }
  if(pos===0)continue;
  const previous=skins.find(e=>e.id==='roof-raised-skin-'+(pos-1));
  if(!previous)fail('MISSING_PREVIOUS_SKIN');
  const ph=previous.origin[1]-top;
  if(Math.abs(h-ph)>1){
   const tall=h>ph?skin:previous;
   for(let offset=0;offset<extent;offset++)
    for(let y=top+Math.min(h,ph)+1;y<top+Math.max(h,ph);y++){
     const x=axis==='x'?tall.origin[0]:tall.origin[0]+offset;
     const z=axis==='x'?tall.origin[2]+offset:tall.origin[2];
     if(!has(x,y,z))unclosedStepCells++;
    }
  }
 }
 return {from:'VERIFIED_FINAL_B143_VOXELS',roofProfile:plan.expression.roofProfile,
  roofAxis:axis,topY:top,skinStripCount:skins.length,
  flatRoofBaseRetained:roofBase,
  newCeilingAirCells,highAirColumns,twoWideHighRoofPads,
  verticallyConnectedTwoWideRoofPads,upperStandingY,
  unclosedEaveOrEndCells,unclosedStepCells,
  interiorOccupiedFloorConnectivity:'SEPARATELY_AUDITED',
  trueWorldWaterproofing:'NOT_TESTED',actualMinecraftWalking:'NOT_TESTED'};
}
export function studyR125RoofInterior(){
 const seed=JSON.parse(fs.readFileSync(path.join(ROOT,
  'scripts/fixtures/r125-qwen14b-residential-2024a.json'),'utf8'));
 if(sha(seed)!==PIN)fail('PUBLIC_MODEL_SEED_DRIFT');
 const frozen=JSON.stringify(seed),template=fs.readFileSync(path.join(ROOT,
  'source/ai/b143-viewer-template.html'),'utf8');
 const cases=[],views=[];
 for(const source of syntheticCases(seed)){
  const basePlan=structuredClone(source);
  const raisedPlan=structuredClone(source);
  raisedPlan.expression.roofVolume='raised';
  const options={upperDoorPlacement:'stair-clear'};
  const before=compileArchitecturePlan(basePlan,options);
  const after=compileArchitecturePlan(raisedPlan,options);
  const oldRisk=assessR125ProgramGeometry(before,critiqueArchitecture({
   design:before.design,compiled:before.compiled}));
  const newRisk=assessR125ProgramGeometry(after,critiqueArchitecture({
   design:after.design,compiled:after.compiled}));
  if(before.geometrySha256===after.geometrySha256||
   JSON.stringify(basePlan.levels)!==JSON.stringify(raisedPlan.levels)||
   oldRisk.programFloorIssues.length||newRisk.programFloorIssues.length)
   fail('PROGRAM_OR_GEOMETRY_REGRESSION_'+source.id);
  const roof=inspectRoofAir(before,after);
  if(roof.flatRoofBaseRetained||roof.newCeilingAirCells<1||
   roof.highAirColumns<1||roof.twoWideHighRoofPads<1||
   roof.verticallyConnectedTwoWideRoofPads<1||
   roof.unclosedEaveOrEndCells!==0||roof.unclosedStepCells!==0)
   fail('NO_VERIFIED_ENCLOSED_INTERIOR_'+source.id);
  for(const p of [before,after])
   if(p.gates.length!==9||p.gates.some(g=>g!=='BLOCKED')||
    p.worldWrites!==0||p.constructionApproved!==false)
    fail('WORLD_SAFETY_'+source.id);
  const originalHtml=renderB143Html(compileB143Gallery([before.design]),template);
  const raisedHtml=renderB143Html(compileB143Gallery([after.design]),template);
  views.push({slug:source.id,originalHtml,raisedHtml});
  cases.push({slug:source.id,modelAuthorship:'SYNTHETIC_PROGRAM_NOT_NEW_MODEL_OUTPUT',
   option:'HOST_OPT_IN_RAISED_ROOF',
   originalPlanSha256:before.planSha256,raisedPlanSha256:after.planSha256,
   decorativeGeometrySha256:before.geometrySha256,
   raisedGeometrySha256:after.geometrySha256,
   sourceFloorIssuesBefore:oldRisk.programFloorIssues,
   sourceFloorIssuesAfter:newRisk.programFloorIssues,
   roof,art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
   worldContacts:0,worldWrites:0});
 }
 if(JSON.stringify(seed)!==frozen)fail('MUTATED_SAVED_MODEL_SEED');
 const esc=t=>String(t).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');
 const blocks=cases.map(c=>'<section><h2>'+esc(c.slug)+'</h2><p>'+
  '旧：実屋根板あり / 新：実内部空気の連続領域。2幅上部空気パッド: '+
  c.roof.twoWideHighRoofPads+'。屋根耐候・実歩行・ARTは未認定。</p>'+
  '<div><iframe title="'+esc(c.slug)+' decorative" src="'+esc(c.slug)+
  '/decorative/index.html"></iframe><iframe title="'+esc(c.slug)+
  ' raised" src="'+esc(c.slug)+'/raised/index.html"></iframe></div></section>').join('');
 const indexHtml='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R125 共通屋根SOURCE・実室内空気比較</title>'+
  '<style>body{background:#142533;color:#f3f7ff;font:16px system-ui;margin:18px}'+
  'section{border-top:1px solid #648092;margin:20px 0}section div{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,370px),1fr));gap:8px}'+
  'iframe{width:100%;height:510px;border:1px solid #6c899b}a{color:#a5e4ff}</style>'+
  '</head><body><h1>真正B143屋根断面：装飾と内部容積</h1>'+
  '<p>3件は独立実モデル応答ではなく、公開済み実Qwen住宅を変形した合成プログラム。'+
  '屋根は用途ごとに同じ共通生成則でSOURCE改修。実歩行/美術/施工認定なし。</p>'+
  '<p><a href="ROOF_INTERIOR_SOURCE_REPORT.json">検査値・出所・形状SHA</a></p>'+
  blocks+'</body></html>';
 return {report:{schema:'r125-common-roof-interior-study-v1',
  originalSavedQwenSha256:PIN,originalSavedModelUnchanged:true,
  cases,sourceOnly:true,modelCalls:0,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'},views,indexHtml};
}
export function saveR125RoofInterior(out){
 if(typeof out!=='string'||!out.trim())fail('OUTPUT_REQUIRED');
 const dir=path.resolve(out);
 if(fs.existsSync(dir))fail('OUTPUT_ALREADY_EXISTS');
 const s=studyR125RoofInterior();
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'index.html'),s.indexHtml,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'ROOF_INTERIOR_SOURCE_REPORT.json'),
  JSON.stringify(s.report,null,2)+'\n',{flag:'wx'});
 for(const v of s.views)for(const [key,html] of [
  ['decorative',v.originalHtml],['raised',v.raisedHtml]]){
  const target=path.join(dir,v.slug,key);
  fs.mkdirSync(target,{recursive:true});
  fs.writeFileSync(path.join(target,'index.html'),html,{flag:'wx'});
 }
 return s.report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')fail('REQUIRE_OUT');
  const r=saveR125RoofInterior(process.argv[3]);
  console.log('R125_COMMON_ROOF_INTERIOR_'+r.cases.length+'_SYNTHETIC_SOURCE_ONLY');
 }catch(e){console.error(String(e));process.exitCode=2;}
}
