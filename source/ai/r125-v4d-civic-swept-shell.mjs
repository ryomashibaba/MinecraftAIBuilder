/**
 * R125 V4D third opt-in SOURCE-only study: author-controlled twin swept roof
 * wings flanking a genuinely walkable open civic axis. Architecture is
 * synthesized from a SHORT IR, never a genre-specific room template.
 * No local-model attestation, world adapter or Minecraft commands.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,MATERIALS,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const V4D_SHELL_SCHEMA='minecraftaibuilder-r125-v4d-civic-swept-shell-v1';
const fail=s=>{throw Error('R125_V4D_SHELL_'+s)};
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const exact=(o,fields)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===fields.slice().sort().join('|');
const name=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,46}$/.test(s);
const prose=s=>typeof s==='string'&&s.length>=3&&s.length<=100&&
 !/[\u0000-\u001f<>]/.test(s);
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const k=(x,y,z)=>x+','+y+','+z;
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
const beam=(id,start,end,material,repeat)=>({
 id,shape:'beam',mode:'add',start,end,thickness:2,material,
 ...(repeat?{repeat}: {})
});

export function validateV4DSweptShell(plan){
 if(!exact(plan,['schema','id','title','brief','materials','site','bays','portals','glazing'])||
  plan.schema!==V4D_SHELL_SCHEMA||!name(plan.id)||!prose(plan.title)||
  !prose(plan.brief)||!exact(plan.materials,['floor','wall','roof','public'])||
  !['stone','concrete','wood'].includes(plan.materials.floor)||
  !['concrete','stone','wood','metal'].includes(plan.materials.wall)||
  !['metal','concrete','wood','stone'].includes(plan.materials.roof)||
  !['stone','concrete','accent'].includes(plan.materials.public))fail('TOP_LEVEL');
 const s=plan.site;
 if(!exact(s,['frontZ','bayLength','promenadeWidth','forecourtDepth','entryOffset'])||
  !int(s.frontZ,16,28)||!int(s.bayLength,15,21)||
  s.bayLength%3!==0||s.promenadeWidth!==12||
  !int(s.forecourtDepth,8,14)||!int(s.entryOffset,4,7)||
  s.frontZ-s.forecourtDepth<3)fail('SITE_CONTRACT');
 const b=plan.bays;
 if(!Array.isArray(b)||b.length!==3||!Array.isArray(plan.portals)||
  plan.portals.length!==2||!Array.isArray(plan.glazing)||
  plan.glazing.length!==2)fail('BAY_COUNT');
 const ids=new Set();
 for(const p of b){
  if(!exact(p,['id','purpose','centerX','westWidth','eastWidth',
    'westEaveY','westRidgeY','eastRidgeY','eastEaveY'])||
   !name(p.id)||ids.has(p.id)||!prose(p.purpose)||
   !int(p.centerX,43,62)||!int(p.westWidth,27,35)||
   !int(p.eastWidth,27,35)||!int(p.westEaveY,8,15)||
   !int(p.eastEaveY,8,15)||
   !int(p.westRidgeY,p.westEaveY+6,29)||
   !int(p.eastRidgeY,p.eastEaveY+6,29)||
   p.centerX-p.westWidth-3<6||
   p.centerX+11+p.eastWidth+3>124)
   fail('BAY_AUTHOR_CONTRACT');
  ids.add(p.id);
 }
 if(b.some((p,i)=>i&&Math.abs(p.centerX-b[i-1].centerX)>4)||
  Math.max(...b.map(p=>p.centerX))-Math.min(...b.map(p=>p.centerX))<3||
  Math.max(...b.map(p=>p.westRidgeY))-Math.min(...b.map(p=>p.westRidgeY))<4||
  Math.max(...b.map(p=>p.eastRidgeY))-Math.min(...b.map(p=>p.eastRidgeY))<4)
  fail('NO_MEANINGFUL_ARTICULATION');
 const doors=new Set();
 for(const p of plan.portals){
  if(!exact(p,['bayId','side','offsetZ','spanZ'])||
   !ids.has(p.bayId)||!['west','east'].includes(p.side)||
   !int(p.offsetZ,3,s.bayLength-7)||
   !int(p.spanZ,4,6)||p.offsetZ+p.spanZ>s.bayLength-2||
   doors.has(p.side))fail('PORTAL_CONTRACT');
  doors.add(p.side);
 }
 if(doors.size!==2)fail('BOTH_WINGS_NEED_ACCESS');
 const windows=new Set();
 for(const g of plan.glazing){
  if(!exact(g,['bayId','side','offsetZ','spanZ','sillY','height'])||
   !ids.has(g.bayId)||!['west','east'].includes(g.side)||
   !int(g.offsetZ,2,s.bayLength-8)||
   !int(g.spanZ,6,10)||g.offsetZ+g.spanZ>s.bayLength-2||
   !int(g.sillY,9,14)||!int(g.height,3,6)||
   windows.has(g.side))fail('GLAZING_CONTRACT');
  windows.add(g.side);
  const bay=b.find(v=>v.id===g.bayId);
  const crest=g.side==='west'?bay.westRidgeY:bay.eastRidgeY;
  if(g.sillY+g.height>=crest-2)fail('GLAZING_ROOF_COLLISION');
  const door=plan.portals.find(p=>p.side===g.side&&p.bayId===g.bayId);
  if(door&&g.offsetZ<door.offsetZ+door.spanZ&&
   door.offsetZ<g.offsetZ+g.spanZ&&g.sillY<8)
   fail('GLAZING_DOOR_COLLISION');
 }
 if(windows.size!==2)fail('WINDOW_SIDE_DIVERSITY');
 return true;
}

export function compileV4DSweptShell(input){
 const p=structuredClone(input);
 validateV4DSweptShell(p);
 const s=p.site,m=p.materials,L=s.bayLength,zStart=s.frontZ;
 const el=[],bayRects=[];
 let maxX=0;
 for(const [i,b] of p.bays.entries()){
  const z=zStart+i*L,CL=b.centerX,CR=CL+11;
  const wl=CL-b.westWidth,wi=CL-1,ei=CR+1,er=CR+b.eastWidth;
  const roofRepeat={count:L/3,offset:[0,0,3]};
  // A physical broad civic axis, with occupied wing floors but no fake roof
  // overhead. The axis gently kinks as the AUTHOR shifts successive bays.
  el.push(box('west-floor-'+i,'add',[wl,1,z],[b.westWidth,1,L],m.floor));
  el.push(box('axis-floor-'+i,'add',[CL,1,z],[12,1,L],m.public));
  el.push(box('east-floor-'+i,'add',[ei,1,z],[b.eastWidth,1,L],m.floor));
  // The tilted outer walls and two genuinely inclined roof surfaces are BEAMS
  // repeated along the long axis, not flat roof boxes with small CUTs.
  el.push(beam('west-tilted-wall-'+i,[wl+2,2,z],
   [wl+8,b.westEaveY,z],m.wall,roofRepeat));
  el.push(beam('west-rising-roof-'+i,[wl+8,b.westEaveY,z],
   [wi,b.westRidgeY,z],m.roof,roofRepeat));
  el.push(beam('east-falling-roof-'+i,[ei,b.eastRidgeY,z],
   [er-8,b.eastEaveY,z],m.roof,roofRepeat));
  el.push(beam('east-tilted-wall-'+i,[er-8,b.eastEaveY,z],
   [er-2,2,z],m.wall,roofRepeat));
  el.push(box('west-inner-civic-facade-'+i,'add',
   [wi,2,z],[1,b.westRidgeY-2,L],m.wall));
  el.push(box('east-inner-civic-facade-'+i,'add',
   [ei,2,z],[1,b.eastRidgeY-2,L],m.wall));
  bayRects.push({id:b.id,z,CL,CR,wl,wi,ei,er,
   wEave:b.westEaveY,eEave:b.eastEaveY,
   wRidge:b.westRidgeY,eRidge:b.eastRidgeY});
  maxX=Math.max(maxX,er+3);
 }
 const first=bayRects[0],last=bayRects.at(-1);
 // First and last inhabited wings have SOURCE enclosure at the ends. This
 // study does NOT certify weather proofing, structural loads, or upper floors.
 for(const [tag,r,b] of [['north',first,p.bays[0]],['south',last,p.bays.at(-1)]]){
  const z=tag==='north'?r.z:r.z+L-1;
  el.push(box(tag+'-west-gable','add',[r.wl+9,2,z],
   [b.westWidth-10,b.westEaveY-2,1],m.wall));
  el.push(box(tag+'-east-gable','add',[r.ei+1,2,z],
   [b.eastWidth-10,b.eastEaveY-2,1],m.wall));
 }
 // Public arrival and an actual portal cut in an authored facing screen.
 el.push(box('public-forecourt','add',
  [first.CL-6,1,zStart-s.forecourtDepth],
  [24,1,s.forecourtDepth],m.public));
 el.push(box('arrival-civic-screen','add',
  [first.CL-4,2,zStart],[20,9,1],m.wall));
 const entryX=first.CL+s.entryOffset;
 el.push(box('exterior-entrance','cut',[entryX,2,zStart],[2,7,1]));
 // Real broad interior connections. The two distinct AUTHOR decisions
 // connect separately to western/eastern programmable covered wings.
 for(const [i,portal] of p.portals.entries()){
  const q=bayRects.find(r=>r.id===portal.bayId);
  const west=portal.side==='west';
  el.push(box('authored-wing-door-'+i,'cut',
   [west?q.wi-2:q.ei-1,2,q.z+portal.offsetZ],
   [4,6,portal.spanZ]));
 }
 for(const [i,g] of p.glazing.entries()){
  const q=bayRects.find(r=>r.id===g.bayId);
  const x=g.side==='west'?q.wi:q.ei;
  const origin=[x,g.sillY,q.z+g.offsetZ],size=[1,g.height,g.spanZ];
  el.push(box('civic-glazing-cut-'+i,'cut',origin,size));
  el.push(box('civic-real-glass-'+i,'add',origin,size,'glass'));
 }
 if(el.length>160)fail('ELEMENT_BUDGET');
 const maxRidge=Math.max(...p.bays.flatMap(b=>[b.westRidgeY,b.eastRidgeY]));
 const design={schema:B143,id:p.id,title:p.title,brief:p.brief,
  bounds:{width:maxX+1,height:maxRidge+5,
   depth:zStart+L*p.bays.length+4},
  elements:el,designOnly:true};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_DRIFT');
 const occupied=new Map(compiled.primitives.map(c=>[k(c[0],c[1],c[2]),c[3]]));
 const has=(x,y,z)=>occupied.has(k(x,y,z));
 // Extract witness from the FINAL B143 voxels; the 8-wide sky core cannot
 // be represented by a fake painted roof void in any bay.
 let trueSkyPads=0;
 for(const q of bayRects)for(let z=q.z+3;z<q.z+L-3;z++)
  for(let x=q.CL+3;x<=q.CL+8;x++){
   if(!has(x,1,z))fail('REAL_AXIS_FLOOR_MISSING');
   for(let y=2;y<design.bounds.height;y++)
    if(has(x,y,z))fail('CENTRAL_SKY_VOID_OCCUPIED');
   if(x<=q.CL+7)trueSkyPads++;
  }
 // Explicitly check sloped roof endpoints exist at high and low physical Y,
 // including every AUTHOR-chosen station/bay instead of only shape hashes.
 for(const q of bayRects){
  const z=q.z+6;
  if(!has(q.wl+8,q.wEave,z)||!has(q.wi,q.wRidge,z)||
   !has(q.ei,q.eRidge,z)||!has(q.er-8,q.eEave,z))
   fail('REAL_SWEPT_ROOF_DISCONTINUITY');
 }
 const actualGlass=compiled.primitives.filter(c=>c[3]===MATERIALS.indexOf('glass')).length;
 if(actualGlass<50)fail('REAL_GLAZING_INSUFFICIENT');
 const wDoor=p.portals.find(x=>x.side==='west');
 const eDoor=p.portals.find(x=>x.side==='east');
 const wr=bayRects.find(q=>q.id===wDoor.bayId);
 const er=bayRects.find(q=>q.id===eDoor.bayId);
 const mid=bayRects[1];
 const program=[{level:0,standingFloorY:2,zones:[
  {id:'public-civic-axis',purpose:'Outdoors, fully open pedestrian and public approach',
   range:{x:[mid.CL+3,mid.CL+8],z:[mid.z+4,mid.z+L-5]}},
  {id:'west-usable-wing',purpose:p.bays.find(b=>b.id===wDoor.bayId).purpose,
   range:{x:[wr.wl+11,wr.wi-2],z:[wr.z+4,wr.z+L-5]}},
  {id:'east-usable-wing',purpose:p.bays.find(b=>b.id===eDoor.bayId).purpose,
   range:{x:[er.ei+2,er.er-11],z:[er.z+4,er.z+L-5]}}
 ]}];
 const evidence={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 const routes=auditR125SourceRoutes(evidence);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||routes.zones.length!==3||
  routes.zones.some(zone=>!zone.reachedFromEntrance))
  fail('TWO_WIDE_WING_AND_AXIS_ACCESS_HOLD');
 return {
  schema:'r125-v4d-civic-swept-shell-source-study-v1',authorIR:p,
  originalPlanSha256:sha(p),sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,design,compiled,program,
  sourceRoutes:routes,
  sourceProof:{bayCount:p.bays.length,
   authoredAxisCenters:p.bays.map(b=>b.centerX),
   authoredWestRoofRidges:p.bays.map(b=>b.westRidgeY),
   authoredEastRoofRidges:p.bays.map(b=>b.eastRidgeY),
   realOpenSkySupportedTwoWidePads:trueSkyPads,
   realGlassVoxels:actualGlass,
   twoAccessibleDistinctCoveredWings:true,
   realInclinedRoofEndpointsVerified:true,
   roofWaterproofing:'NOT_TESTED',structuralSafety:'NOT_TESTED',
   gamePhysics:'NOT_TESTED'},
  provenance:'SYNTHETIC_AUTHOR_SUPPLIED_NOT_REAL_QWEN',
  authorIsRealModel:'NOT_ATTESTED',
  architecturalArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0
 };
}
