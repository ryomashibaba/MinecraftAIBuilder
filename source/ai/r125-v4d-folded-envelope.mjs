/**
 * V4D opt-in sectional folded envelope (fourth, conceptually independent)
 * A short AUTHOR cross-section IR generates continuous B143 planar roof ribbons
 * by exact per-X run compression. No repeated beams, per-genre recipes,
 * arbitrary model code, real-model attestation, or Minecraft world operations.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const V4D_FOLDED_SCHEMA='minecraftaibuilder-r125-v4d-authored-folded-envelope-v1';
const fail=s=>{throw Error('R125_V4D_FOLDED_'+s)};
const int=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const exact=(v,f)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===f.slice().sort().join('|');
const prose=v=>typeof v==='string'&&v.length>=3&&v.length<=100&&
 !/[\u0000-\u001f<>]/.test(v);
const slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{2,45}$/.test(v);
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});

function makeProfile(section,side){
 const isWest=side==='west',court=section.centerX,cWidth=section.courtWidth;
 const xStart=isWest?court-section.westSpan:court+cWidth;
 const xEnd=isWest?court-1:court+cWidth+section.eastSpan-1;
 const roof=isWest?section.westRoof:section.eastRoof;
 const xKnee=xStart+Math.round((xEnd-xStart)*roof.kneePercent/100);
 const anchors=isWest?[
  [xStart,roof.eaveY],[xKnee,roof.kneeY],[xEnd,roof.crestY]
 ]:[
  [xStart,roof.crestY],[xKnee,roof.kneeY],[xEnd,roof.eaveY]
 ];
 const ys=[];
 for(let x=xStart;x<=xEnd;x++){
  const part=x<=xKnee?0:1;
  const [ax,ay]=anchors[part],[bx,by]=anchors[part+1];
  ys.push(Math.round(ay+(by-ay)*(x-ax)/(bx-ax)));
 }
 return {side,xStart,xEnd,ys,
  outX:isWest?xStart:xEnd,innerX:isWest?xEnd:xStart,
  eaveY:roof.eaveY,crestY:roof.crestY};
}
export function validateV4DFoldedEnvelope(p){
 if(!exact(p,['schema','id','title','brief','materials','site','sections','doors'])||
  p.schema!==V4D_FOLDED_SCHEMA||!slug(p.id)||
  !prose(p.title)||!prose(p.brief)||
  !exact(p.materials,['floor','wall','roof','public'])||
  !['stone','concrete','wood'].includes(p.materials.floor)||
  !['concrete','stone','wood','metal'].includes(p.materials.wall)||
  !['metal','stone','wood','concrete'].includes(p.materials.roof)||
  !['stone','concrete','accent'].includes(p.materials.public))
  fail('ROOT');
 const site=p.site;
 if(!exact(site,['frontZ','sectionLength','approachDepth','entryOffset'])||
  !int(site.frontZ,15,28)||!int(site.sectionLength,16,24)||
  !int(site.approachDepth,8,12)||
  site.frontZ-site.approachDepth<2||!int(site.entryOffset,5,9))
  fail('SITE');
 if(!Array.isArray(p.sections)||p.sections.length!==3||
  !Array.isArray(p.doors)||p.doors.length!==2)fail('COUNT');
 const ids=new Set();
 for(const s of p.sections){
  if(!exact(s,['id','purpose','centerX','courtWidth','westSpan','eastSpan','westRoof','eastRoof'])||
   !slug(s.id)||ids.has(s.id)||!prose(s.purpose)||
   !int(s.centerX,40,58)||!int(s.courtWidth,14,20)||
   !int(s.westSpan,22,35)||!int(s.eastSpan,22,35)||
   s.centerX-s.westSpan<8||
   s.centerX+s.courtWidth+s.eastSpan>116)
   fail('SECTION');
  ids.add(s.id);
  for(const side of ['west','east']){
   const r=s[side+'Roof'];
   if(!exact(r,['eaveY','kneeY','crestY','kneePercent'])||
    !int(r.eaveY,8,15)||!int(r.crestY,17,30)||
    !int(r.kneeY,10,28)||!int(r.kneePercent,35,65)||
    Math.min(r.eaveY,r.crestY)>r.kneeY+7||
    Math.max(r.eaveY,r.crestY)<r.kneeY-7)
    fail('ROOF_PROFILE');
   const profile=makeProfile(s,side);
   if(profile.ys.some((y,i)=>i&&Math.abs(y-profile.ys[i-1])>1))
    fail('ROOF_SLOPE_DISCONTINUITY');
  }
 }
 if(Math.max(...p.sections.map(s=>s.centerX))-
   Math.min(...p.sections.map(s=>s.centerX))<3||
  Math.max(...p.sections.map(s=>s.westRoof.crestY))-
   Math.min(...p.sections.map(s=>s.westRoof.crestY))<3||
  Math.max(...p.sections.map(s=>s.eastRoof.crestY))-
   Math.min(...p.sections.map(s=>s.eastRoof.crestY))<3)
  fail('REPEATED_BOX_LIKE_PROFILE');
 for(let i=1;i<p.sections.length;i++){
  const a=p.sections[i-1],b=p.sections[i];
  if(Math.abs(a.centerX-b.centerX)>4||
   Math.abs(a.courtWidth-b.courtWidth)>4)
   fail('PUBLIC_AXIS_SEVERED');
 }
 const seenSides=new Set();
 for(const d of p.doors){
  if(!exact(d,['sectionId','side','offsetZ','width'])||
   !ids.has(d.sectionId)||!['west','east'].includes(d.side)||
   seenSides.has(d.side)||!int(d.offsetZ,4,site.sectionLength-8)||
   !int(d.width,4,6)||d.offsetZ+d.width>site.sectionLength-3)
   fail('DOOR');
  seenSides.add(d.side);
 }
 if(seenSides.size!==2)fail('DOOR_SIDES');
 const first=p.sections[0];
 if(site.entryOffset+2>first.courtWidth-4)fail('ENTRY');
 return true;
}
function addRoofRuns(elements,prefix,profile,z,length,mat){
 const ys=profile.ys;
 let a=0;
 for(let i=1;i<=ys.length;i++){
  if(i!==ys.length&&ys[i]===ys[a])continue;
  const n=i-a;
  elements.push(box(prefix+'-'+a,'add',
   [profile.xStart+a,ys[a]-1,z],[n,2,length],mat));
  a=i;
 }
}
export function compileV4DFoldedEnvelope(input){
 const p=structuredClone(input);
 validateV4DFoldedEnvelope(p);
 const s=p.site,L=s.sectionLength,mat=p.materials;
 const el=[],proof=[];
 for(const [index,section] of p.sections.entries()){
  const z=s.frontZ+index*L;
  const left=makeProfile(section,'west'),right=makeProfile(section,'east');
  const court=section.centerX,cEnd=court+section.courtWidth-1;
  proof.push({id:section.id,z,left,right,court,cEnd});
  // Continuous usable ground: the central open-air public spine is drawn
  // independently of the two programmed covered wings from the outset.
  el.push(box('west-floor-'+index,'add',[left.xStart,1,z],
   [section.westSpan,1,L],mat.floor));
  el.push(box('civic-spine-floor-'+index,'add',[court,1,z],
   [section.courtWidth,1,L],mat.public));
  el.push(box('east-floor-'+index,'add',[right.xStart,1,z],
   [section.eastSpan,1,L],mat.floor));
  // Continuous broad *sheets* built by run-length compressing author
  // cross-sections. Not hundreds of isolated beams or color-only roof strips.
  addRoofRuns(el,'west-roof-'+index,left,z,L,mat.roof);
  addRoofRuns(el,'east-roof-'+index,right,z,L,mat.roof);
  // Real wall with continuous high-coverage glazing and interior/public side
  // windows; unbroken opaque walls are NOT the default facade.
  for(const [label,profile] of [['west',left],['east',right]]){
   const out=profile.outX,inner=profile.innerX;
   el.push(box(label+'-outer-wall-'+index,'add',[out,2,z],
    [1,profile.eaveY-2,L],mat.wall));
   el.push(box(label+'-inner-wall-'+index,'add',[inner,2,z],
    [1,profile.crestY-2,L],mat.wall));
   // The glazing is SOURCE-real, not rendered transparency without voxels.
   const glz=profile.crestY-6;
   el.push(box(label+'-public-glass-'+index,'add',
    [inner,4,z+2],[1,glz,L-4],'glass'));
   if(profile.eaveY>=10)
    el.push(box(label+'-external-glass-'+index,'add',
     [out,5,z+2],[1,profile.eaveY-7,L-4],'glass'));
  }
 }
 const front=proof[0],rear=proof.at(-1),entry=front.court+s.entryOffset;
 el.push(box('civic-forecourt','add',
  [front.court-3,1,s.frontZ-s.approachDepth],
  [front.cEnd-front.court+7,1,s.approachDepth],mat.public));
 // Deliberately covered and framed entry; central axis is otherwise sky-lit.
 el.push(box('entry-roof-threshold','add',
  [front.court-2,10,s.frontZ-5],
  [front.cEnd-front.court+5,1,7],mat.roof));
 el.push(box('entry-framing-screen','add',
  [front.court-2,2,s.frontZ],
  [front.cEnd-front.court+5,8,1],mat.wall));
 el.push(box('exterior-entrance','cut',
  [entry,2,s.frontZ],[2,6,1]));
 // Two AUTHOR-selected portals through the real inner curtain walls.
 for(const [i,d] of p.doors.entries()){
  const q=proof.find(k=>k.id===d.sectionId),profile=d.side==='west'?q.left:q.right;
  const x=d.side==='west'?profile.innerX-1:profile.innerX;
  el.push(box('program-portal-'+i,'cut',
   [x,2,q.z+d.offsetZ],[2,5,d.width]));
 }
 if(el.length>160)fail('B143_ELEMENT_BUDGET_'+el.length);
 const maxHeight=Math.max(...p.sections.flatMap(r=>[
  r.westRoof.crestY,r.eastRoof.crestY,r.westRoof.kneeY,r.eastRoof.kneeY]))+4;
 const maxX=Math.max(...proof.map(q=>q.right.xEnd))+4;
 const design={schema:B143,id:p.id,title:p.title,brief:p.brief,
  bounds:{width:maxX,height:maxHeight,
   depth:s.frontZ+L*p.sections.length+4},elements:el,designOnly:true};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_DRIFT');
 const occ=new Map(compiled.primitives.map(a=>[key(a[0],a[1],a[2]),a[3]]));
 const has=(x,y,z)=>occ.has(key(x,y,z));
 let roofCells=0,clearPads=0;
 for(const q of proof){
  for(const f of [q.left,q.right]){
   // Every X and every Z position must have real roof at the authored
   // interpolated height. Each sheet is two voxels thick with no gaps.
   for(let i=0;i<f.ys.length;i++)for(let z=q.z;z<q.z+L;z++){
    if(!has(f.xStart+i,f.ys[i],z)||
     !has(f.xStart+i,f.ys[i]-1,z))fail('REAL_CONTINUOUS_ROOF_HOLE');
    roofCells++;
   }
  }
  for(let z=q.z+5;z<q.z+L-3;z++)
   for(let x=q.court+3;x<=q.cEnd-4;x++){
    if(!has(x,1,z))fail('OPEN_SPINE_LACKS_SUPPORT');
    for(let y=2;y<maxHeight;y++)if(has(x,y,z))
     fail('AUTHOR_PUBLIC_SKY_OCCUPIED');
    if(x<q.cEnd-4)clearPads++;
   }
 }
 const glassN=compiled.primitives.filter(a=>a[3]===MATERIALS.indexOf('glass')).length;
 if(glassN<150)fail('NOT_ENOUGH_REAL_GLAZING');
 const firstDoor=p.doors.find(d=>d.side==='west');
 const secondDoor=p.doors.find(d=>d.side==='east');
 const wz=proof.find(q=>q.id===firstDoor.sectionId);
 const ez=proof.find(q=>q.id===secondDoor.sectionId);
 const middle=proof[1];
 const program=[{level:0,standingFloorY:2,zones:[
  {id:'open-civic-spine',purpose:'Public sky lit promenade and arrival',
   range:{x:[middle.court+4,middle.cEnd-4],
    z:[middle.z+4,middle.z+L-4]}},
  {id:'west-program',purpose:p.sections.find(t=>t.id===firstDoor.sectionId).purpose,
   range:{x:[wz.left.xStart+5,wz.left.innerX-2],
    z:[wz.z+4,wz.z+L-4]}},
  {id:'east-program',purpose:p.sections.find(t=>t.id===secondDoor.sectionId).purpose,
   range:{x:[ez.right.innerX+2,ez.right.xEnd-5],
    z:[ez.z+4,ez.z+L-4]}}
 ]}];
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256
 });
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==3||routes.zones.some(z=>!z.reachedFromEntrance))
  fail('TWO_WIDE_SOURCE_CIRCULATION_HOLD');
 return {
  schema:'r125-v4d-fourth-continuous-folded-shell-source-result-v1',
  authorIR:p,originalPlanSha256:digest(p),
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  design,compiled,program,sourceRoutes:routes,
  sourceProof:{
   authoredRoofProfiles:p.sections.map(t=>({section:t.id,
    west:t.westRoof,east:t.eastRoof,centerX:t.centerX,courtWidth:t.courtWidth})),
   physicalRoofCellsChecked:roofCells,openSkyTwoWidePads:clearPads,
   actualGlazingVoxels:glassN,
   connectedZones:routes.zones.length,
   totalB143Elements:el.length,
   originalSourceUnmodified:true,
   roofWaterproofing:'NOT_TESTED',structuralSafety:'NOT_TESTED',
   gameplayAndTerrain:'NOT_TESTED'
  },
  provenance:'SYNTHETIC_AUTHOR_SUPPLIED_NOT_REAL_QWEN',
  realModelAuthorship:'NOT_ATTESTED',humanArchitecturalArt:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0
 };
}
