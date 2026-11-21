/**
 * R98 source-mesh architectural alternative: bounded, smooth right-crown
 * loft above tier 3. Original R96 triangles and frozen Qwen are untouched.
 * Candidate adoption is gated by actual triangle ray comparison, not art PASS.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR95DaylightAtriumVariant} from './b198zr95-atrium-daylight-portals.mjs';
import {buildR96ArchitecturalWindowStudy} from './b198zr96-window-structure-and-light-study.mjs';
import {prepareR97ComparisonReview,SCHEMA as R97_SCHEMA,
 buildR97CompareViews} from './b198zr97-multiview-mesh-review.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr98-elevated-right-crown-source-variant-v1';
const fail=s=>{throw Error('B198ZR98_'+s)};
const sha=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const R=n=>+n.toFixed(7);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t)};
const cutRadius=.34,cutStart=.84,cutFull=.965,liftHeight=.085;
/**
 * A broad, tapered crease uplift: continuous at the zone boundary and roof.
 * It changes only the right-hand upper envelope and attached right elements.
 * Never convert research normalized units into Minecraft blocks/metres.
 */
export function liftR98RightCrownVertex(point,zCenter){
 if(!finite(point)||!Number.isFinite(zCenter))fail('FINITE_INPUT_REQUIRED');
 const [x,y,z]=point;
 if(x<=0||y<=cutStart||Math.abs(z-zCenter)>=cutRadius)return [...point];
 const taper=Math.cos(Math.PI*(z-zCenter)/(2*cutRadius))**2;
 const rise=liftHeight*smooth((y-cutStart)/(cutFull-cutStart))*taper;
 return [x,R(y+rise),z];
}
const a3=f=>[f.a,f.b,f.c];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const faceArea=f=>{
 const u=f.b.map((v,i)=>v-f.a[i]),v=f.c.map((p,i)=>p-f.a[i]);
 const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 return Math.hypot(...cross)*.5;
};
function probeRoof(faces,p,side){
 if(!finite(p)||!['left','right'].includes(side))fail('PROBE_SOURCE_REQUIRED');
 const hull=new Set([side+'_inner',side+'_outer',side+'_crown','sky_lounge_glass']);
 const from=[p[0],p[1]+.008,p[2]],to=[p[0],p[1]+.34,p[2]];
 let best=null;
 for(const f of faces){
  if(!hull.has(f.kind))continue;
  const hit=intersectR81SegmentTriangle(from,to,f);
  if(hit&&(!best||hit.point[1]<best.point[1]))
   best={kind:f.kind,point:hit.point,t:hit.t};
 }
 return best?{kind:best.kind,normalizedDistance:R(best.point[1]-p[1]),
  point:best.point,hasHit:true}:
  {kind:null,normalizedDistance:null,point:null,hasHit:false};
}
function sightHits(faces,proof){
 const source=proof.sourceCoordinates;
 let blocked=0;
 const sourceWall=faces.filter(f=>f.kind===proof.side+'_inner'||
  f.kind.includes('_R96_'));
 for(const dz of [-.02,0,.02])for(const height of [.068,.08,.092]){
  const from=[source[0],source[1]+height,source[2]+dz];
  const to=[proof.side==='left'?.04:-.04,from[1],from[2]];
  if(sourceWall.some(f=>intersectR81SegmentTriangle(from,to,f)))blocked++;
 }
 return blocked;
}
export function buildR98ElevatedCrownStudy(nodes){
 const original=buildR96ArchitecturalWindowStudy(nodes),
  earlier=buildR95DaylightAtriumVariant(nodes);
 if(original.faces.length!==4692||earlier.faces.length!==4608||
  JSON.stringify(original.faces.slice(0,4608))!==JSON.stringify(earlier.faces))
  fail('R96_AUTHORED_SOURCE_PREFIX_CHANGED');
 const top=earlier.proofs.find(p=>p.side==='right'&&p.tier===3);
 if(!top)fail('SOURCE_RIGHT_TIER3_MISSING');
 const p=top.sourceCoordinates;
 // Never touch the seven historical aperture frame corners; the loft must
 // start ABOVE them. If not, research stops instead of silently changing holes.
 const corners=earlier.proofs.flatMap(q=>q.originalInnerWallCorners);
 if(corners.some(c=>distance(c,liftR98RightCrownVertex(c,p[2]))>1e-7))
  fail('HISTORICAL_WINDOW_CORNER_MOVED');
 let changed=0,changedFaces=0,maxActual=0;
 const faces=original.faces.map(f=>{
  const vertices=a3(f);
  const moved=vertices.map(v=>liftR98RightCrownVertex(v,p[2]));
  if(!f.kind.startsWith('right_') &&
   moved.some((v,i)=>distance(v,vertices[i])>1e-7))
    return {...f}; // do not transform non-right geometry
  const delta=moved.map((v,i)=>distance(v,vertices[i]));
  const hasMove=delta.some(n=>n>1e-7);
  if(hasMove){
   changedFaces++;changed+=delta.filter(n=>n>1e-7).length;
   maxActual=Math.max(maxActual,...delta);
  }
  const next={...f,a:moved[0],b:moved[1],c:moved[2]};
  if(hasMove&&faceArea(next)<1e-11)fail('NEW_GEOMETRY_DEGENERATE');
  return next;
 });
 if(!changedFaces||maxActual<.025||maxActual>liftHeight+1e-5)
  fail('VISIBLE_ARCHITECTURAL_LOFT_NOT_CREATED');
 // No source mesh is mutated: source surfaces remain independent reference.
 if(original.faces.some((f,i)=>a3(f).some(v=>!finite(v)))||
   faces.length!==original.faces.length)fail('CORRUPT_SOURCE_TRIANGLES');
 const before=probeRoof(original.faces,p,'right'),
  after=probeRoof(faces,p,'right');
 if(!before.hasHit)fail('NO_SOURCE_ROOF_OBSTRUCTION_TO_REDESIGN');
 const lowerBoundAfter=after.hasHit?after.normalizedDistance:.34;
 const observedLowerBoundGain=R(lowerBoundAfter-before.normalizedDistance);
 const sight=earlier.proofs.map(q=>({
  side:q.side,tier:q.tier,
  beforeBlocked:sightHits(original.faces,q),
  afterBlocked:sightHits(faces,q)
 }));
 const noNewSightBlockers=sight.every(q=>q.beforeBlocked===0&&q.afterBlocked===0);
 // Claim HOLD when the new geometry does not produce a witnessed gain.
 const improved=observedLowerBoundGain>=.02&&noNewSightBlockers;
 return {faces,earlier,original,p,sourceTop:top,
  evidence:{
   originalTriangles:original.faces.length,alternativeTriangles:faces.length,
   originalR96Sha256:sha(original.faces),candidateR98Sha256:sha(faces),
   changedRightEnvelopeFaces:changedFaces,changedVertexOccurrences:changed,
   maximumNormalizedLift:R(maxActual),theoreticalLiftUpperBound:liftHeight,
   normalizedBand:{zCenter:R(p[2]),radius:cutRadius,
     yStart:cutStart,yFull:cutFull},
   historicalSevenWindowCornersUnchanged:true,
   allOtherR96OriginalFilesRetained:true,
   localRoofBefore:before,localRoofAfter:after,
   afterLowerBoundCensoredAtNormalizedProbeLimit:!after.hasHit,
   observedNormalizedClearanceGainLowerBound:observedLowerBoundGain,
   sightlineChecks:sight,
   zeroNewLocalSightlineBlockers:noNewSightBlockers,
   adoptionCandidateStatus:improved?'GEOMETRIC_GAIN_OBSERVED_BUT_AESTHETIC_HOLD':
    'HOLD_NO_VERIFIED_CLEARANCE_GAIN',
   humanVisualAssessment:'NOT_REVIEWED',
   originalGeomUnmodified:true,
   structureStrengthCertified:false,humanHeadroomCertified:false,
   minecraftWalkingCertified:false,generativeModelImprovementCertified:false
  }};
}
function authenticate(args){
 const {r97Evidence,...prior}=args;
 const exact=prepareR97ComparisonReview(prior);
 if(!r97Evidence||r97Evidence.schema!==R97_SCHEMA||
  JSON.stringify(r97Evidence)!==JSON.stringify(exact))
  fail('R97_FULL_SOURCE_EVIDENCE_MISMATCH');
 const output=buildR98ElevatedCrownStudy(args.r80Evidence.conceptualRouteNodes);
 return {output,proof:{
  schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:exact.oldB143Status,r97FullEvidenceRecomputed:true,
  ...output.evidence,safety:safe()
 }};
}
export function prepareR98ElevatedCrownReview(args={}){
 return authenticate(args).proof;
}
function exportObj(faces){
 let id=1,kind='',rows=['# R98 source-bound raised right-crown candidate',
 '# Not a structural/walkability/Minecraft approval'];
 for(const f of faces){
  if(f.kind!==kind){kind=f.kind;rows.push('g '+kind.replace(/[^A-Za-z0-9_]/g,'_'))}
  for(const p of a3(f))rows.push('v '+p.join(' '));
  rows.push('f '+id+' '+(id+1)+' '+(id+2));id+=3;
 }
 return rows.join('\n')+'\n';
}
export function writeR98ElevatedCrownReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_SAFE_REVIEW_DIRECTORY_REQUIRED');
 const name='R98_RIGHT_CROWN_LOCAL_LOFT';
 const files=[name+'_EVIDENCE.json',name+'_ACTIVE_ARCHITECTURE.obj',
  name+'_SIX_VIEW.html'].map(n=>path.join(destination,n));
 if(files.some(f=>fs.existsSync(f)))fail('NO_OVERWRITE');
 const {output,proof}=authenticate(args);
 const variants=[
  {revision:'R95',faces:output.earlier.faces},
  {revision:'R96',faces:output.original.faces},
  {revision:'R98-CANDIDATE',faces:output.faces}
 ];
 const views=buildR97CompareViews(variants,output.p);
 const row=proof.localRoofBefore.normalizedDistance;
 const after=proof.localRoofAfter.hasHit?
  proof.localRoofAfter.normalizedDistance:'NO_HIT_WITHIN_0.34_PROBE';
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R98 Right Crown Loft — Architectural Alternative</title>'+
  '<style>body{font:15px/1.65 system-ui;max-width:1500px;margin:22px auto;padding:0 14px}'+
  '.triptych{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'+
  'figure{margin:0}svg{width:100%;border:1px solid #aabbcc}'+
  '@media(max-width:860px){.triptych{grid-template-columns:1fr}}</style>'+
  '<h1>R98：右側上層の屋根を連続的に持ち上げる研究バリアント</h1>'+
  '<p>源R96を変更せず、右側上部の実三角形頂点を滑らかな局所ロフトとして変形。'+
  '実測研究用の頭上方向Ray: before '+row+' / after '+after+
  '（正規化単位）。局所探査外の全館歩行安全を証明しない。</p>'+
  '<p>局所ジオメトリ判定：'+esc(proof.adoptionCandidateStatus)+
  '。変更源面 '+proof.changedRightEnvelopeFaces+' / '+proof.alternativeTriangles+
  '。最大変位 '+proof.maximumNormalizedLift+'。7室の開口角は非改変。</p>'+
  '<p>各図は源メッシュの同じカメラでR95 / R96 / R98候補を比較。'+
  '画家順のSVGでピクセル深度や実際の遮蔽の保証なし。美術品質・耐荷・施工・歩行はNOT_REVIEWED。</p>'+
  views.map(v=>v.html).join('')+
  '<p><a href="'+name+'_ACTIVE_ARCHITECTURE.obj">R98実3D候補OBJ</a> / '+
  '<a href="R97_MESH_BOUND_SIX_VIEW_COMPARISON_REVIEW.html">R97既存比較</a></p>'+
  '<p>NOT_PREPARED / 9 BLOCKED / BuildPlan空 / Qwen0 / World0 / 施工禁止。</p></html>';
 // Build all bytes before first write; wx refuses replacing any historical file.
 const bytes=[JSON.stringify(proof,null,2)+'\n',exportObj(output.faces),html];
 const created=[];
 try{
  for(let i=0;i<files.length;i++){
   fs.writeFileSync(files[i],bytes[i],{flag:'wx'});created.push(files[i]);
  }
 }catch(e){
  for(const f of created)fs.rmSync(f,{force:true});
  throw e;
 }
 return {relativeFile:path.basename(files[2]),
  status:proof.adoptionCandidateStatus,changedFaces:proof.changedRightEnvelopeFaces,
  modelCalls:0,worldWrites:0};
}
