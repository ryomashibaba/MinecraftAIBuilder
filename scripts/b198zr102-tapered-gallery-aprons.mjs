/**
 * R102 architectural alternative. Taper R100 source gallery shoulders into
 * original R88 narrow endpoint sections. Retain R100 when new geometry has
 * no witnessed functional benefit or breaks original source constraints.
 * Still NOT a physical path or structural / Minecraft certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR100WidenedGalleryStudy,designR100ShoulderTriangles,
 prepareR100ShoulderReview,SCHEMA as R100_SCHEMA}
 from './b198zr100-source-gallery-shoulders.mjs';
import {screenR99FiniteRoute}
 from './b198zr99-finite-volume-route-witness.mjs';
import {buildR97CompareViews}
 from './b198zr97-multiview-mesh-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr102-tapered-source-gallery-end-transitions-v1';
const fail=s=>{throw Error('B198ZR102_'+s)};
const R=n=>+n.toFixed(7);
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const OLD_HALF=.016,OUT_HALF=.030;
const tri=(out,a,b,c,kind)=>out.push({a:a.map(R),b:b.map(R),c:c.map(R),kind});
function area(f){
 const u=f.b.map((x,i)=>x-f.a[i]),v=f.c.map((x,i)=>x-f.a[i]);
 const c=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 return Math.hypot(...c)*.5;
}
const lerp=(a,b,t)=>a.map((v,i)=>R(v+(b[i]-v)*t));
const offset=(p,n,half,sign)=>[R(p[0]+sign*half*n[0]),R(p[1]),R(p[2]+sign*half*n[1])];
/**
 * Source anchored and nondegenerate: inner strip remains at original .016
 * half width while outer strip ramps 0.016 -> 0.030 -> 0.016. At start/end
 * there is no invented new overhanging rectangular outer edge.
 */
export function designR102TaperedShoulderTriangles({
 side,sourceAnchor,sourcePad,rampFraction=.18
}={}){
 if(!['left','right'].includes(side)||!finite(sourceAnchor)||!finite(sourcePad)||
  !Number.isFinite(rampFraction)||rampFraction<=.05||rampFraction>=.30)
  fail('SOURCE_LINE_AND_TAPER_REQUIRED');
 const original=designR100ShoulderTriangles({side,sourceAnchor,sourcePad});
 const dx=sourcePad[0]-sourceAnchor[0],dz=sourcePad[2]-sourceAnchor[2];
 const planar=Math.hypot(dx,dz),n=[-dz/planar,dx/planar];
 const stations=[{t:0,width:OLD_HALF},{t:rampFraction,width:OUT_HALF},
  {t:1-rampFraction,width:OUT_HALF},{t:1,width:OLD_HALF}];
 const faces=[],kind=side+'_R102_TAPERED_SOURCE_GALLERY_APRON_NOT_CERTIFIED';
 for(const sign of [-1,1]){
  const slices=stations.map(s=>{
   const center=lerp(sourceAnchor,sourcePad,s.t);
   return {inside:offset(center,n,OLD_HALF,sign),
    outside:offset(center,n,s.width,sign)};
  });
  // Pinched first and last strips require triangles, not zero-area quads.
  tri(faces,slices[0].inside,slices[1].outside,slices[1].inside,kind);
  tri(faces,slices[1].inside,slices[1].outside,slices[2].outside,kind);
  tri(faces,slices[1].inside,slices[2].outside,slices[2].inside,kind);
  tri(faces,slices[2].inside,slices[2].outside,slices[3].inside,kind);
 }
 if(faces.length!==8||faces.some(f=>!Number.isFinite(area(f))||area(f)<1e-10))
  fail('TAPER_SHOULDER_HAS_DEGENERATE_REAL_TRIANGLES');
 const endpoints=stations.filter(s=>s.t===0||s.t===1).map(s=>{
  const p=lerp(sourceAnchor,sourcePad,s.t);
  return [-1,1].map(sign=>offset(p,n,OLD_HALF,sign));
 }).flat();
 if(endpoints.some(p=>!finite(p)))fail('SOURCE_END_TRIANGLES_NONFINITE');
 return {faces,endpoints,
  sourceLine:[sourceAnchor,sourcePad],taperFraction:rampFraction,
  sourceNarrowWidthNormalized:OLD_HALF*2,
  wideMiddleWidthNormalized:OUT_HALF*2,
  sourceR100WholeWidthNormalized:original.newNormalizedWidth,
  centralOriginalGalleryUnmodified:true};
}
function preservedAtrium(faces,side){
 return faces.every(f=>[f.a,f.b,f.c].every(p=>
  side==='right'?p[0]>.400001:p[0]<-.400001));
}
function assess(faces,line){
 const m=screenR99FiniteRoute(faces,line);
 return {floor:m.witnessCounts.floor,overhead:m.witnessCounts.overhead,
  lateral:m.witnessCounts.lateral,
  incomplete:m.unscreenedSegmentCount,stationCount:m.stationCount,
  sourceCoverageComplete:m.allDeclaredSourceSegmentsWithinProbeCoverage};
}
export function buildR102TaperedGalleryStudy(nodes){
 const old=buildR100WidenedGalleryStudy(nodes);
 if(old.sourceFaces.length!==4692||old.report.records.length!==7||
  old.report.newActiveTriangles!==old.faces.length)
  fail('ORIGINAL_SOURCE_EVIDENCE_MISSING');
 let next=[...old.sourceFaces],tapered=0,retained=0,rejected=0;
 const records=[];
 for(const r of old.records){
  if(r.addedSourceFaces!==4){
   rejected++;
   records.push({id:r.id,priorStatus:r.status,
    status:'RETAIN_R100_REJECTED_NO_NEW_CANDIDATE',
    addedTriangles:0});continue;
  }
  const [entry,pad]=r.actualSourceSegment,side=r.side;
  const original=designR100ShoulderTriangles({side,sourceAnchor:entry,sourcePad:pad});
  const taperedShape=designR102TaperedShoulderTriangles({side,sourceAnchor:entry,sourcePad:pad});
  const line=[entry,pad];
  const source=assess([...old.sourceFaces],line);
  const rectangle=assess([...old.sourceFaces,...original.faces],line);
  const candidate=assess([...old.sourceFaces,...taperedShape.faces],line);
  const shared=source.sourceCoverageComplete&&rectangle.sourceCoverageComplete&&
   candidate.sourceCoverageComplete&&candidate.stationCount===source.stationCount;
  const noNewCollision=candidate.overhead<=rectangle.overhead&&
   candidate.lateral<=rectangle.lateral;
  const floorGain=candidate.floor<source.floor;
  // Conservative: allow a *small* cost in measured supports at the physical
  // end junction, but never lose most recovered floor witnesses.
  const rectangularGain=source.floor-rectangle.floor;
  const taperedGain=source.floor-candidate.floor;
  const sufficientGain=taperedGain>=Math.max(1,Math.ceil(rectangularGain*.6));
  const fit=preservedAtrium(taperedShape.faces,side);
  const choose=shared&&noNewCollision&&floorGain&&sufficientGain&&fit;
  const kept=choose?taperedShape.faces:original.faces;
  next.push(...kept);
  if(choose)tapered++;else retained++;
  records.push({id:r.id,side:r.side,tier:r.tier,
   priorStatus:r.status,
   status:choose?'TAPERED_END_TRANSITION_GEOMETRICALLY_SUPPORTED_ART_HOLD':
    'RETAIN_R100_RECTANGULAR_SHOULDER_NO_TAPER_CERTIFICATION',
   sourceProbes:source,R100RectangularProbes:rectangle,
   R102TaperedProbes:candidate,
   finiteSampleSourceCoverageComplete:shared,
   preservesResearchAtrium:fit,
   noNewOverheadOrLateralIntersections:noNewCollision,
   taperedRestoredFloorWitnesses:taperedGain,
   rectangularRestoredFloorWitnesses:rectangularGain,
   addedTriangles:kept.length});
 }
 const added=next.length-old.sourceFaces.length;
 if(added!==tapered*8+retained*4||sha(next.slice(0,4692))!==sha(old.sourceFaces))
  fail('SOURCE_PREFIX_OR_FACE_ACCOUNTING_FAILED');
 return {faces:next,priorR100Faces:old.faces,sourceR98Faces:old.sourceFaces,
  report:{schema:SCHEMA,exactOriginalR98MeshSha256:sha(old.sourceFaces),
   priorR100MeshSha256:sha(old.faces),alternativeMeshSha256:sha(next),
   originalR98ExactPrefix:true,originalSourceFaces:4692,
   oldAcceptedGalleryCount:old.report.widenedResearchGalleryCount,
   taperedEndTransitionCount:tapered,retainedR100Rectangles:retained,
   unmodifiedRejectedGalleryCount:rejected,totalGalleryDestinations:7,
   addedNewActiveTriangles:added,sourceMeshesNotOverwritten:true,
   realOriginalR88EndpointsKept:true,records,
   humanContinuousRouteCertification:false,structureCertified:false,
   artQuality:'NOT_REVIEWED',sourceModelGenerationImproved:false,safety:safe()}};
}
export function prepareR102TaperedReview(args={}){
 const {r100Evidence,...old}=args,source=prepareR100ShoulderReview(old);
 if(!r100Evidence||r100Evidence.schema!==R100_SCHEMA||
  JSON.stringify(r100Evidence)!==JSON.stringify(source))
  fail('R100_SOURCE_EVIDENCE_RECOMPUTE_MISMATCH');
 const r=buildR102TaperedGalleryStudy(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:source.oldB143Status,r100StrictAncestryVerified:true,...r.report};
}
function obj(faces){
 let id=1,last='',out=['# R102 source gallery end transition; NOT a certified building'];
 for(const f of faces){
  if(f.kind!==last){last=f.kind;out.push('g '+last.replace(/[^A-Za-z0-9_]/g,'_'));}
  for(const p of [f.a,f.b,f.c])out.push('v '+p.join(' '));
  out.push('f '+id+' '+(id+1)+' '+(id+2));id+=3;
 }
 return out.join('\n')+'\n';
}
export function writeR102TaperedReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())fail('SAFE_EXISTING_DIR_REQUIRED');
 const prefix='R102_SOURCE_GALLERY_TAPERED_APRONS',
  paths=[prefix+'_EVIDENCE.json',prefix+'_ACTIVE_ARCHITECTURE.obj',
   prefix+'_SIX_VIEW.html'].map(x=>path.join(destination,x));
 if(paths.some(p=>fs.existsSync(p)))fail('NO_OVERWRITE');
 const report=prepareR102TaperedReview(args),mesh=buildR102TaperedGalleryStudy(
  args.r80Evidence.conceptualRouteNodes);
 const views=buildR97CompareViews([
  {revision:'R98',faces:mesh.sourceR98Faces},
  {revision:'R100 rectangular',faces:mesh.priorR100Faces},
  {revision:'R102 tapered/reverted',faces:mesh.faces}
 ],[.55,.37,0]);
 const rows=report.records.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+
  esc(r.status)+'</td><td>'+(r.rectangularRestoredFloorWitnesses??'—')+
  '</td><td>'+(r.taperedRestoredFloorWitnesses??'—')+
  '</td><td>'+r.addedTriangles+'</td></tr>').join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R102 Source-Joined Gallery Apron Architectural Comparison</title>'+
  '<style>body{font:15px/1.6 system-ui;max-width:1450px;margin:20px auto;padding:0 16px}'+
  'table{border-collapse:collapse;width:100%}td,th{border:1px solid #abc;padding:7px}'+
  'svg{width:100%;border:1px solid #b7c4d0}.triptych{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'+
  '@media(max-width:850px){.triptych{grid-template-columns:1fr}}</style>'+
  '<h1>R102：両端で自然に細くなる実3D連絡デッキの床</h1>'+
  '<p>R98完全prefix。R100の矩形床帯の両端に急な幅変化があるため、'+
  '端部0.016/中央0.030正規化半幅の局所テーパを実三角形で研究。'+
  '床のRay改善、無新規衝突、保存空洞、R101の源区間検査を満たす候補だけ採用。</p>'+
  '<p>テーパ候補 '+report.taperedEndTransitionCount+
  '、矩形のまま '+report.retainedR100Rectangles+
  '、従来HOLD '+report.unmodifiedRejectedGalleryCount+
  '。美術・耐荷・実移動・Minecraftは未認証。</p>'+
  '<table><tr><th>連絡室</th><th>判断</th><th>R100改善レイ</th>'+
  '<th>R102改善レイ</th><th>追加面</th></tr>'+rows+'</table>'+
  views.map(x=>x.html).join('')+
  '<p><a href="'+prefix+'_ACTIVE_ARCHITECTURE.obj">実3D候補OBJ</a> / '+
  '<a href="R100_SOURCE_GALLERY_WIDENING_SIX_VIEW.html">旧R100</a></p>'+
  '<p>HOLD / NOT_REVIEWED / NOT_PREPARED / 9 BLOCKED / BuildPlan空 / model0 / world0</p></html>';
 const bytes=[JSON.stringify(report,null,2)+'\n',obj(mesh.faces),html],created=[];
 try{for(let i=0;i<paths.length;i++){fs.writeFileSync(paths[i],bytes[i],{flag:'wx'});created.push(paths[i]);}}
 catch(e){for(const p of created)fs.rmSync(p,{force:true});throw e;}
 return {relativeFile:path.basename(paths[2]),
  taperCount:report.taperedEndTransitionCount,retainedCount:report.retainedR100Rectangles,
  modelCalls:0,worldWrites:0};
}
