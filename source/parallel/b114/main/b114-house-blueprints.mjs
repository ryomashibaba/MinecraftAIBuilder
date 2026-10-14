/** Source-grounded SVG design drawings; NO world coordinates or placement operations. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {buildB114,validateB114} from './compile-b114.mjs';
import {inspectHouse} from './b114-house-v3-integrated.mjs';
import {buildHouseUnified3D,validateHouseUnified3D} from './b114-house-unified-3d.mjs';
import {auditHouseArchitecture} from './b114-house-architecture.mjs';
import {generateB105} from '../../b105/main/b105-building-volume.mjs';
import {K} from '../../b113/main/b113-geometry.mjs';
const COL={bg:'#0d1926',panel:'#152535',grid:'#33495d',floor:'#344b5d',
 empty:'#091523',text:'#eaf1fa',muted:'#aebfd2',hall:'#238395',
 bypass:'#ffe0a0',stair:'#edaa67',shaft:'#db7597',door:'#74e0b8',
 wall:'#dae7f3',window:'#89d0fa',fixture:'#b2a8ed',roof:'#7286ba',band:'#d6b280'};
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const r=(x,y,w,h,c,stroke='none',sw=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const t=(x,y,str,size=14,color=COL.text,weight=500)=>'<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'">'+esc(str)+'</text>';
const k=(x,z)=>x+','+z;
const mask=(f,x,z)=>f.footprintRows[z]?.[x]==='1';
const sheet=(title,sub,body,w,h)=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><title>'+esc(title)+'</title><desc>'+esc(sub)+'</desc>'+r(0,0,w,h,COL.bg)+t(38,52,title,25,COL.text,700)+t(40,80,sub,13,COL.muted)+r(36,100,w-72,h-164,COL.panel)+body+t(39,h-24,'READ-ONLY DESIGN DRAWING  /  NOT_PREPARED  /  9 GATES BLOCKED  /  worldContacts=0',12,COL.muted)+'</svg>\n';
function floorSheet(f,c113,c114,vol,house,arch){
 const cell=26,ox=112,oy=154,ww=f.footprintRows[0].length,hh=f.footprintRows.length;
 const W=Math.max(990,ox+ww*cell+94),H=Math.max(815,oy+hh*cell+132);
 const hall=new Set([...f.gallery,...c113.horizontalRoutes[f.level].repair.addedCells].map(K));
 const detour=new Set(house.gallery.twoWideDetours[f.level].addedCells);
 const stairs=new Set(c114.stairs.flatMap(s=>s.selected?.cells.map(K)??[]));
 const shaft=new Set(house.floorApertureProposals[f.level].cells);
 const partitions=new Set(arch.addedElements.filter(v=>v.role==='ROOM_PARTITION'&&v.y===f.level*5+1).map(K));
 const furnish=vol.voxels.filter(v=>v.level===f.level&&v.kind==='FURNITURE_PLACEHOLDER');
 const win=vol.voxels.filter(v=>v.level===f.level&&v.kind==='WINDOW_GLAZING_PROXY');
 let body='';
 for(let z=0;z<hh;z++)for(let x=0;x<ww;x++){
  const id=k(x,z);let fill=mask(f,x,z)?COL.floor:COL.empty;
  if(hall.has(id))fill=COL.hall;
  if(detour.has(id))fill=COL.bypass;
  if(stairs.has(id))fill=COL.stair;
  if(shaft.has(id))fill=COL.shaft;
  if(partitions.has(id))fill=COL.wall;
  body+=r(ox+x*cell,oy+z*cell,cell,cell,fill,COL.grid,.5);
 }
 for(const v of win)body+=r(ox+v.x*cell+8,oy+v.z*cell+8,cell-16,cell-16,COL.window);
 for(const v of furnish)body+=r(ox+v.x*cell+5,oy+v.z*cell+5,cell-10,cell-10,COL.fixture);
 for(const room of f.rooms){
  body+=r(ox+room.x*cell,oy+room.z*cell,room.width*cell,room.depth*cell,'none',COL.wall,1.5);
  body+=t(ox+room.x*cell+7,oy+room.z*cell+18,room.id,13,COL.text,700);
  const d=room.conceptualDoorOpening;
  body+=r(ox+d.x*cell+5,oy+d.z*cell+5,cell-10,cell-10,COL.door);
 }
 for(const [idx,s] of c114.stairs.entries()){
  const b=s.selected?.origin;
  if(b)body+=t(ox+b.x*cell,oy+b.z*cell-9,'STAIR '+idx,12,COL.stair,700);
 }
 for(const e of f.exits)body+=t(ox+e.edge[0].x*cell,oy+(e.edge[0].z+2)*cell+11,'EXIT',12,COL.door);
 for(let x=0;x<ww;x+=5)body+=t(ox+x*cell,oy-10,x,11,COL.muted);
 for(let z=0;z<hh;z+=5)body+=t(ox-35,oy+z*cell+16,z,11,COL.muted);
 const legend=[['SLAB',COL.floor],['GALLERY',COL.hall],['BYPASS',COL.bypass],
  ['STAIR',COL.stair],['SHAFT',COL.shaft],['PARTITION',COL.wall],
  ['DOOR',COL.door],['WINDOW',COL.window],['FURNITURE',COL.fixture]];
 const span=(W-105)/legend.length,y=H-94;
 legend.forEach(([s,c],i)=>{const xx=46+i*span;body+=r(xx,y,16,16,c)+t(xx+19,y+13,s,10);});
 body+=t(W-94,138,'N ↑',17,COL.text,700);
 return sheet('HOUSE_V3 / LEVEL '+f.level+' PLAN',
  'B104 room layout + B113 galleries + B114 staircase, detour and slab openings • coordinates are local',body,W,H);
}
function roofSheet(f,vol,arch){
 const cell=26,ox=112,oy=154,ww=f.footprintRows[0].length,hh=f.footprintRows.length;
 const W=Math.max(990,ox+ww*cell+90),H=Math.max(815,oy+hh*cell+132);
 const caps=new Set(vol.voxels.filter(v=>v.kind==='ROOF_CAP_PROXY'&&v.y===10).map(K));
 const depth=new Map();
 for(const p of arch.addedElements.filter(v=>v.role==='ROOF_STEPPED_MASSING')){
  const kk=K(p);depth.set(kk,Math.max(depth.get(kk)??0,p.y-10));
 }
 let body='';
 for(let z=0;z<hh;z++)for(let x=0;x<ww;x++){
  const kk=k(x,z),d=depth.get(kk)??0,colors=[COL.floor,'#526d99','#788fb6','#b0bfda'];
  body+=r(ox+x*cell,oy+z*cell,cell,cell,caps.has(kk)?colors[d]:COL.empty,COL.grid,.6);
  if(d)body+=t(ox+x*cell+8,oy+z*cell+18,d,11,COL.text,700);
 }
 body+=t(ox,oy+hh*cell+37,'Original B105 cap preserved: '+caps.size+' cells',14);
 body+=t(ox,oy+hh*cell+60,'Color/number indicates OPTIONAL decorative tier (1–3 blocks above cap); NOT weatherproof certified.',12,COL.muted);
 return sheet('HOUSE_V3 / STEPPED ROOF STUDY',
  'B105 source roof cap remains unchanged; B114 aesthetic tiers are unapproved and non-executable',body,W,H);
}
function sectionSheet(house,unified,arch){
 const size=28,w=1140,h=1040,ox=85;
 let body='';
 const all=[...unified.candidateSolids,...arch.addedElements.map(x=>({...x,types:[x.role]}))];
 for(let i=0;i<2;i++){
  const s=house.stairs[i],baseY=130+i*442,zz=s.origin.z;
  if(s.ascent.dx!==1||s.ascent.dz!==0)throw Error('B114_STAIR_SECTION_AXIS_UNSUPPORTED');
  const left=s.origin.x-2;
  const px=x=>ox+(x-left)*size,py=y=>baseY+(13-y)*size;
  body+=t(ox,baseY+16,'STAIR '+i+' / CUT z='+zz+' / EASTBOUND RISE',15,COL.text,700);
  for(let x=left;x<=left+10;x++)for(let y=-1;y<=12;y++)
   body+=r(px(x),py(y),size,size,COL.empty,COL.grid,.5);
  for(const v of all){
   if(v.z!==zz||v.x<left||v.x>left+10||v.y<0||v.y>12)continue;
   const a=v.types,col=a.includes('ROOF_CAP_PROXY')?COL.roof:
    a.includes('STAIR_SUPPORT_PROXY')?COL.band:
    a.includes('FLOOR_SLAB_PROXY')?COL.floor:
    a.includes('FURNITURE_PLACEHOLDER')?COL.fixture:
    a.includes('ROOM_PARTITION')?COL.wall:COL.grid;
   body+=r(px(v.x),py(v.y),size,size,col,COL.grid,.5);
  }
  for(const step of unified.stairHalfStepAABBs.filter(q=>q.stair===i)){
   const b=step.box;if(!(b.z<=zz&&zz<b.z+b.depth))continue;
   body+=r(px(b.x),py(b.y+b.height)+size*(1-b.height),
    size*b.width,size*b.height,COL.stair,COL.bg,.4);
  }
  for(const pt of s.aperture.filter(p=>p.z===zz))body+=r(px(pt.x),py(5),size,size,COL.shaft,COL.text,.6);
  body+=t(ox,baseY+402,'Landing body collision unverified • no Education player movement certified',12,COL.muted);
 }
 return sheet('HOUSE_V3 / VERTICAL STAIR SECTIONS',
  'Source B113 half-step AABB, B114 supports, upper shaft void • not Bedrock collision geometry',body,w,h);
}
function elevationSheet(vol,arch){
 const W=1540,H=1090,w=715,h=420,sideList=['N','S','E','W'];
 const bands=arch.addedElements.filter(p=>p.role==='FACADE_LINTEL_BAND');
 const roof=arch.addedElements.filter(p=>p.role==='ROOF_STEPPED_MASSING');
 let body='';
 for(let i=0;i<4;i++){
  const side=sideList[i],bx=48+(i%2)*748,by=132+Math.floor(i/2)*442;
  const axis=side==='N'||side==='S'?'x':'z';
  const faces=vol.facadeFaces.flatMap(f=>f.faces.filter(a=>a.sides.includes(side)));
  const projected=new Set(faces.map(K));
  const min=Math.min(...faces.map(p=>p[axis])),max=Math.max(...faces.map(p=>p[axis]));
  const scale=23,xx=v=>bx+35+(v-min)*scale,yy=y=>by+351-y*scale;
  body+=r(bx,by,w,h,COL.panel)+t(bx+16,by+27,side+' / EXTERIOR PROJECTION',16,COL.text,700);
  for(const p of vol.voxels){
   if(!projected.has(K(p))||p.kind==='ROOF_CAP_PROXY'||p.kind==='FURNITURE_PLACEHOLDER')continue;
   const fill=p.kind==='WINDOW_GLAZING_PROXY'?COL.window:
    p.kind==='EXTERIOR_PORTAL_VOID_PROXY'?COL.bg:COL.floor;
   body+=r(xx(p[axis]),yy(p.y),scale,scale,fill,COL.grid,.5);
  }
  for(const p of bands)if(projected.has(K(p)))
   body+=r(xx(p[axis]),yy(p.y),scale,scale,COL.band,COL.grid,.5);
  const roofByCol=new Map();
  for(const p of roof)roofByCol.set(p[axis],Math.max(roofByCol.get(p[axis])??10,p.y));
  for(const [col,top] of roofByCol)if(col>=min&&col<=max)
   for(let y=11;y<=top;y++)body+=r(xx(col),yy(y),scale,scale,COL.roof,COL.grid,.5);
  body+=t(bx+18,by+399,'Approximate side projection; no hidden-surface removal',12,COL.muted);
 }
 return sheet('HOUSE_V3 / FOUR FACADE ELEVATIONS',
  'B105 glazing + B114 fourth-layer eaves and proposed roof silhouette; visual quality NOT approved',
  body,W,H);
}
export function makeHouseBlueprints(parent,b113,b114,house,unified,arch,out){
 if(!validateB113(b113)||!validateB114(b114)||!validateHouseUnified3D(unified)||
  arch.sourceB114Integrity!==b114.integritySha256||
  arch.sourceUnifiedDigest!==unified.integritySha256||arch.buildingFinished!==false||
  arch.constructionApproved!==false||arch.executionAllowed!==false||
  arch.worldContacts!==0||arch.gates.length!==9||arch.gates.some(g=>g.status!=='BLOCKED'))
  throw Error('B114_BLUEPRINT_UNSAFE_PARENT');
 const design=parent.sourceDesigns.find(x=>x.candidateId==='HOUSE_V3'),
  c113=b113.cases.find(x=>x.id==='HOUSE_V3'),c114=b114.cases.find(x=>x.id==='HOUSE_V3');
 if(!design||!c113||!c114||design.plan.floors.length!==2||arch.protectedDoors.length!==3)
  throw Error('B114_BLUEPRINT_PROVENANCE_FAILED');
 const vol=generateB105(design);
 const list=[
  ['B114_HOUSE_V3_L0_Plan.svg',floorSheet(design.plan.floors[0],c113,c114,vol,house,arch)],
  ['B114_HOUSE_V3_L1_Plan.svg',floorSheet(design.plan.floors[1],c113,c114,vol,house,arch)],
  ['B114_HOUSE_V3_Roof_Plan.svg',roofSheet(design.plan.floors[1],vol,arch)],
  ['B114_HOUSE_V3_Stair_Sections.svg',sectionSheet(house,unified,arch)],
  ['B114_HOUSE_V3_Four_Elevations.svg',elevationSheet(vol,arch)]
 ];
 const files=[];
 fs.mkdirSync(out,{recursive:true});
 for(const [name,s] of list){
  if(!s.startsWith('<svg ')||!s.includes('NOT_PREPARED')||
    /<script|<foreignObject|(?:xlink:)?href=|javascript:/i.test(s))
   throw Error('B114_BLUEPRINT_UNSAFE_SVG');
  fs.writeFileSync(path.join(out,name),s);
  files.push({name,bytes:Buffer.byteLength(s)});
 }
 const md=[
  '# HOUSE_V3 — source-derived visual architecture review (B114)',
  '',
  'Five standalone SVG drawings are bundled. All coordinates are LOCAL DESIGN coordinates.',
  'Plans distinguish stairs, 16 optional floor apertures, 5 corridor bypass cells, doors and original furniture.',
  'The roof and elevation drawings are conceptual projections, not realistic renders or human-approved aesthetics.',
  'The 2 stair sections use B113 geometry; Minecraft Education collision is unverified.',
  '',
  ...files.map(f=>'- '+f.name),
  '',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / commandCount=0 / BuildPlan.operations=[]'
 ].join('\n');
 fs.writeFileSync(path.join(out,'B114_HOUSE_V3_Visual_Review_Index.md'),md+'\n');
 return {files,sourceB114Integrity:b114.integritySha256,
  sourceUnifiedDigest:unified.integritySha256,mode:'LOCAL_READ_ONLY_VISUAL_REVIEW',
  readiness:'NOT_PREPARED',worldContacts:0,commandCount:0,constructionApproved:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const parent=await assembleReferenceParent(),b113=buildB113(parent),b114=buildB114(parent,b113);
 const house=inspectHouse(parent,b113,b114),unified=buildHouseUnified3D(parent,b113,b114,house);
 const arch=auditHouseArchitecture(parent,b113,b114,house,unified);
 console.log(JSON.stringify(makeHouseBlueprints(parent,b113,b114,house,unified,arch,path.resolve('b114-review-output')),null,2));
}