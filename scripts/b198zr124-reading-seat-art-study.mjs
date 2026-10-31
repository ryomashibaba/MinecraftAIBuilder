/** R124: real source reading-seat restoration investigation. No Minecraft/model operations. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy,auditR107AdjacentCorridor} from './b198zr107-compact-reading-table-recovery.mjs';
import {buildR121SourceArtPacket,SOURCE_DELTA,auditR121LocalSourceConnectivity} from './b198zr121-r120-source-art-packet.mjs';
import {raiseR115LanternAndSupportedBookwall} from './b198zr115-integral-lantern-clerestory.mjs';
import {insetR118ActualConnectedSeat} from './b198zr118-reading-seat-clearance.mjs';
import {liftR120RealDoorLightRib} from './b198zr120-r94-suspended-light-rib-relief.mjs';
import {bendR123RibTip,R123_TRIALS,sourceEditedExternalPiercings} from './b198zr123-r94-rib-terrace-alternatives.mjs';
import {deriveR110SourceLane} from './b198zr110-source-contoured-right-room-approach.mjs';
import {extractR104ActiveR91Throat} from './b198zr104-r91-active-throat-repair.mjs';
import {buildR97CompareViews} from './b198zr97-multiview-mesh-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr124-recovered-reading-seat-art-v1';
export const R123_SHA='c9c4a31acae3676a5b7fb1062d808186b9b1b8f9f3ff26b9cc79bd7ae940bddb';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const vertices=f=>[f.a,f.b,f.c];
const area=f=>{const a=f.b.map((v,i)=>v-f.a[i]),b=f.c.map((v,i)=>v-f.a[i]);return Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])/2};
const seat=f=>area(f[4475])+area(f[4476]);
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
export function studyR124ReadingSeat(r107){
 if(!r107||r107.faces?.length!==4716||r107.originalR98Faces?.length!==4692||
 sha(r107.faces)!==r107.report?.alternativeR107Sha256||sha(r107.originalR98Faces)!==r107.report?.originalR98Sha256)
 throw Error('R124_REAL_R107_R98_REQUIRED');
 const original=r107.faces,originalSha=sha(original),packet=buildR121SourceArtPacket(r107);
 const preferred=bendR123RibTip(packet.faces,R123_TRIALS[0]);
 if(sha(preferred)!==R123_SHA)throw Error('R124_R123_PROVENANCE_DRIFT');
 const areaOriginal=seat(original),areaPrevious=seat(preferred);
 if(Math.abs(areaPrevious/areaOriginal-.45)>1e-5)throw Error('R124_HISTORIC_SEAT_AREA_MISMATCH');
 const high=raiseR115LanternAndSupportedBookwall(original,4474,{rise:.16});
 const deep=insetR118ActualConnectedSeat(high.faces,4476,.35);
 if(deep.indices.join(',')!=='4475,4476')throw Error('R124_REAL_SEAT_STRIP_REQUIRED');
 const elevated=liftR120RealDoorLightRib(deep.faces,4535,{rise:.1});
 const sourcePairs=new Set(sourceEditedExternalPiercings(original).map(x=>x.edited+':'+x.other));
 const previousFive=auditR107AdjacentCorridor(original,extractR104ActiveR91Throat(r107.originalR98Faces));
 if(!previousFive.allFiniteSourceLanesScreened)throw Error('R124_HISTORIC_FIVE_CORRIDOR_SOURCE_REQUIRED');
 const attempts=[],variantFaces=[];
 for(const option of [R123_TRIALS[0],R123_TRIALS[1],R123_TRIALS[3]]){
  const faces=bendR123RibTip(elevated.faces,option),connectivity=auditR121LocalSourceConnectivity(original,faces,SOURCE_DELTA);
  const added=sourceEditedExternalPiercings(faces).filter(p=>!sourcePairs.has(p.edited+':'+p.other));
  const ratio=seat(faces)/areaOriginal;
  const result={option:option.id,sourceSha256:sha(faces),retainedSeatAreaRatio:+ratio.toFixed(7),
   newExternalStrictPiercings:added,oldSeamsIntact:connectivity.noNewlyDisconnectedPreviouslySharedSourceFaces,
   coverage:false,floor:null,overhead:null,lateral:null,oldFiveNonregressing:null,qualified:false,art:'NOT_REVIEWED'};
  if(!added.length&&result.oldSeamsIntact&&Math.abs(ratio-.65)<1e-5){
   const lane=deriveR110SourceLane(faces,r107.originalR98Faces,.035,{gap:.003});
   const five=auditR107AdjacentCorridor(faces,extractR104ActiveR91Throat(r107.originalR98Faces));
   const counts=lane.measured?.witnessCounts;
   const nonregressing=five.allFiniteSourceLanesScreened&&previousFive.surrogateLanes.every((a,i)=>{
    const b=five.surrogateLanes[i];return b.floor<=a.floor&&b.headroom<=a.headroom&&b.lateral<=a.lateral;
   });
   result.coverage=lane.sourceCoverageComplete&&!!lane.measured?.allDeclaredSourceSegmentsWithinProbeCoverage;
   result.floor=counts?.floor??null;result.overhead=counts?.overhead??null;result.lateral=counts?.lateral??null;
   result.oldFiveNonregressing=nonregressing;
   result.qualified=!!counts&&result.coverage&&counts.floor===0&&counts.overhead===0&&counts.lateral===0&&nonregressing;
  }
  attempts.push(result);variantFaces.push(faces);
 }
 if(sha(original)!==originalSha)throw Error('R124_ARCHIVE_MUTATED');
 const selected=attempts.findIndex(x=>x.qualified);
 return {original,preferred,comparison:selected>=0?variantFaces[selected]:variantFaces[0],
  possibleCandidate:selected>=0?variantFaces[selected]:null,
  report:{schema:SCHEMA,originalSha,preferredR123Sha:R123_SHA,originalSeatArea:areaOriginal,
   previousSeatAreaRatio:+(areaPrevious/areaOriginal).toFixed(7),attempts,
   selectedOption:selected>=0?attempts[selected].option:null,
   status:selected>=0?'LOCAL_GEOMETRY_RESTORED_SEAT_ART_HOLD':'HOLD_NO_SOURCE_SAFE_65_PERCENT_SEAT',
   originalBuildingChanged:false,readingBodyUseCertified:false,walkingCertified:false,
   engineeringCertified:false,independentArtApproval:'NOT_REVIEWED',modelGeneralizationVerified:false,safety:safe()}};
}
export function buildR124FromNodes(nodes){return studyR124ReadingSeat(buildR107CompactReadingStudy(nodes))}
function obj(faces,header){
 const lines=['# '+header,'# NOT A BUILD PLAN'];let id=1,prev='';
 for(const f of faces){if(prev!==f.kind){prev=f.kind;lines.push('g '+prev.replace(/[^a-zA-Z0-9_]/g,'_'))}
 for(const p of vertices(f))lines.push('v '+p.join(' '));lines.push('f '+id+' '+(id+1)+' '+(id+2));id+=3}
 return lines.join('\n')+'\n';
}
export function writeR124Packet(study,dest){
 if(!study||study.report?.schema!==SCHEMA||typeof dest!=='string'||!path.isAbsolute(dest)||
 !fs.existsSync(dest)||!fs.statSync(dest).isDirectory()||fs.lstatSync(dest).isSymbolicLink())
 throw Error('R124_SAFE_EVIDENCE_DIRECTORY_REQUIRED');
 const v=buildR97CompareViews([
 {revision:'Original R107 full mesh',faces:study.original},
 {revision:'R123 true full mesh, seat 45 percent',faces:study.preferred},
 {revision:'R124 unapproved full mesh, seat 65 percent',faces:study.comparison}
 ],[.54,.55,-.69]);
 if(v.length!==6||v.some(view=>view.sampleTriangleCounts.join(',')!=='4716,4716,4716'))
 throw Error('R124_REAL_SIX_VIEW_REQUIRED');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8"><title>R124 real mesh reading-seat review</title>'+
 '<style>body{font:14px system-ui;max-width:1800px;margin:auto;padding:20px}.triptych{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}svg{width:100%}</style>'+
 '<h1>R124 original / R123 / 65% seat full real mesh — ART HOLD</h1><p>R97 schematic painter projection. NO accurate occlusion, human seating, walking, engineering or art approval.</p>'+
 v.map(x=>x.html).join('')+'<p>NOT_PREPARED / 9 BLOCKED / BuildPlan empty</p></html>';
 const files=[['R124_EVIDENCE.json',JSON.stringify(study.report,null,2)+'\n'],
 ['R124_ORIGINAL_FULL.obj',obj(study.original,'original')],
 ['R124_R123_FULL.obj',obj(study.preferred,'R123 unapproved')],
 ['R124_SEAT65_FULL.obj',obj(study.comparison,'R124 seat restoration comparison only')],
 ['R124_SIX_VIEW.html',html]];
 if(files.some(([name])=>fs.existsSync(path.join(dest,name))))throw Error('R124_NO_OVERWRITE');
 const written=[];
 try{for(const [name,body] of files){const f=path.join(dest,name);fs.writeFileSync(f,body,{flag:'wx'});written.push(f)}}catch(err){for(const f of written)fs.rmSync(f,{force:true});throw err}
 return {files:files.map(x=>x[0]),views:v.length,humanArt:'NOT_REVIEWED'};
}
