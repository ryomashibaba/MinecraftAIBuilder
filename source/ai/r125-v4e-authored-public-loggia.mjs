/**
 * Optional architectural-section RESEARCH: an AUTHOR-selected corner recess
 * makes a genuine non-rectangular wall envelope and sheltered outdoor loggia.
 * The underlying R125/V4E/Education route is untouched. Never any world I/O.
 *
 * Only NORTH-WEST or NORTH-EAST, single-storey, 5..6 cells, and no existing
 * linked or glazed face conflicts. This is NOT a general contour compiler.
 */
import {compileRankedExteriorIntent} from './r125-v4e-ranked-exterior-ir.mjs';
import {compileDesign,verifyCompiled,MATERIALS}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const fail=s=>{throw Error('R125_V4E_SECTION_'+s);};
const only=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===keys.slice().sort().join('|');
const opposite={north:'south',south:'north',east:'west',west:'east'};
const key=(x,y,z)=>x+','+y+','+z;
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
const maxX=n=>n.x+n.width-1;
function checkAuthorSelection(plan,section){
 if(!only(section,['spaceId','corner','recessDepth'])||
  typeof section.spaceId!=='string'||!['NW','NE'].includes(section.corner)||
  !Number.isSafeInteger(section.recessDepth)||
  section.recessDepth<5||section.recessDepth>6)fail('AUTHOR_SECTION_CONTRACT');
 const n=plan.nodes.find(x=>x.id===section.spaceId),r=section.recessDepth;
 if(!n||n.kind!=='covered'||n.width<r*2+8||n.depth<r*2+8)
  fail('ENVELOPE_NOT_LARGE_ENOUGH');
 const directions=['north',section.corner==='NW'?'west':'east'];
 const linked=plan.links.some(l=>
  l.from===n.id&&directions.includes(l.side)||
  l.to===n.id&&directions.includes(opposite[l.side]));
 if(linked)fail('RECESS_ON_SHARED_WALL');
 for(const w of plan.windows.filter(w=>w.nodeId===n.id)){
  if(!directions.includes(w.side))continue;
  if(w.side==='north'){
   if(section.corner==='NW'&&w.offset<r+1||
      section.corner==='NE'&&w.offset+w.span>n.width-r-1)
    fail('RECESS_CLASHES_WINDOW');
  }else if(w.offset<r+1)fail('RECESS_CLASHES_WINDOW');
 }
 if(n.id===plan.entry.nodeId){
  const entry=plan.entry;
  if(section.corner==='NW'&&entry.offset<r+1||
     section.corner==='NE'&&entry.offset+4>n.width-r-2)
   fail('RECESS_CLASHES_ENTRANCE');
 }
 return n;
}
export function compileAuthoredPublicLoggia(originalAuthor,authoredSection){
 const author=structuredClone(originalAuthor);
 const request=structuredClone(authoredSection);
 const base=compileRankedExteriorIntent(author);
 const n=checkAuthorSelection(base.plan,request),r=request.recessDepth;
 const src=base.b143.design;
 const elements=src.elements.map(e=>structuredClone(e));
 const wallMaterial=base.plan.materials.wall;
 // All cuts after the frozen design, before their new diagonal closing wall.
 // The original floor at y=1 and the original weathering roof are preserved.
 for(let i=0;i<r;i++){
  const x=request.corner==='NW'?n.x+i:maxX(n)-i;
  const z=n.z;
  elements.push(box('slog-cut-'+i,'cut',[x,2,z],[1,n.roof.eaveY-3,r-i]));
 }
 for(let i=0;i<r;i++){
  const x=request.corner==='NW'?n.x+i:maxX(n)-i;
  const z=n.z+r-i-1;
  elements.push(box('slog-close-'+i,'add',
   [x,2,z],[1,n.roof.eaveY-3,1],wallMaterial));
 }
 if(elements.length>160)fail('B143_ELEMENT_BUDGET');
 const design={...src,elements};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_COMPILE_OR_HASH_DRIFT');
 if(compiled.geometrySha256===base.b143.geometrySha256)
  fail('NO_REAL_ENVELOPE_CHANGE');
 const occupied=new Map(compiled.primitives.map(p=>[key(p[0],p[1],p[2]),p[3]]));
 const originalOccupied=new Set(base.b143.compiled.primitives.map(p=>
  key(p[0],p[1],p[2])));
 const floorCells=new Set(),diagonalCells=new Set(),recessedAirCells=new Set();
 for(let i=0;i<r;i++){
  const x=request.corner==='NW'?n.x+i:maxX(n)-i;
  for(let dz=0;dz<r-i;dz++){
   const z=n.z+dz;
   if(!occupied.has(key(x,1,z)))fail('RECESS_FLOOR_NOT_SUPPORTED');
   floorCells.add(key(x,1,z));
   for(let y=2;y<=n.roof.eaveY-2;y++){
    const k=key(x,y,z);
    if(dz===r-i-1){
     if(occupied.get(k)!==MATERIALS.indexOf(wallMaterial))
      fail('DIAGONAL_CLOSURE_NOT_PHYSICAL');
     diagonalCells.add(k);
    }else{
     if(occupied.has(k))fail('OUTDOOR_RECESS_NOT_OPEN');
     if(originalOccupied.has(k))recessedAirCells.add(k);
    }
   }
  }
 }
 if(recessedAirCells.size<12||diagonalCells.size<30)
  fail('NOT_SUBSTANTIVE_NONRECT_VOLUME');
 const featureTargets=base.plan.fixtures.map(f=>{
  const z=base.plan.nodes.find(n=>n.id===f.nodeId);
  return {id:f.id,zoneId:z.id,origin:[z.x+f.offsetX,2,z.z+f.offsetZ],
   size:[f.width,f.height,f.depth]};
 });
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:base.b143.program,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    routes.zones.some(z=>!z.reachedFromEntrance)||
    routes.featureAccess.some(f=>!f.reachableFromEntrance))
  fail('SOURCE_ROUTES_REJECTED');
 if(base.worldWrites!==0||base.constructionApproved!==false||
    base.gates.length!==9||base.gates.some(x=>x!=='BLOCKED'))
  fail('ORIGINAL_SAFETY_DRIFT');
 return {
  schema:'r125-v4e-authored-corner-loggia-source-only-v1',
  authoredSection:request,unchangedV4EBaseGeometrySha256:base.b143.geometrySha256,
  finalGeometrySha256:compiled.geometrySha256,
  sectionedB143Design:design,sectionedCompiled:compiled,
  sectionedRoutes:routes,
  trueSectionSourceWitness:{
   shelteredSemiOutdoorFootprintCells:floorCells.size,
   actualDiagonalWallCells:diagonalCells.size,
   physicallyRemovedOldWallCells:recessedAirCells.size,
   originalRoofPreservedByDesign:true,
   generalIrregularFloorplate:'NOT_SUPPORTED',
   roofWeatherproofing:'NOT_TESTED',
   structuralEngineering:'NOT_TESTED',humanArt:'NOT_REVIEWED',
   realModelAuthorship:'NOT_ATTESTED'
  },
  provenance:'EXPLICIT_AUTHOR_SECTION_SYNTHETIC_OR_UNATTESTED',
  art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0
 };
}
