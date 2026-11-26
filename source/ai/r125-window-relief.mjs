/** Opt-in model-authored external window relief. Frozen B143 is unchanged.
 * Adds only full cubes, preserving every existing final voxel and pane. */
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {resolveR125FinalOwners,r125ElementRole} from './r125-block-expression.mjs';
export const WINDOW_RELIEF_MODES=Object.freeze(['hoods','surrounds']);
const key=p=>p.slice(0,3).join(',');
const fail=m=>{throw Error('R125_WINDOW_RELIEF_'+m)};
const paneId=id=>/^(?:l\d+-window-|daylight-|glaze-\d+(?:-\d+)?-glass$)/.test(id);
const faceId=id=>/^(?:l\d+-(?:front|rear|west|east)|space-\d+-(?:front|rear|west|east))$/.test(id);
const add=(p,axis,delta)=>p.map((v,i)=>v+(i===axis?delta:0));
const rect=(origin,size)=>{const out=[];for(let y=0;y<size[1];y++)for(let z=0;z<size[2];z++)for(let x=0;x<size[0];x++)out.push([origin[0]+x,origin[1]+y,origin[2]+z]);return out};
export function addR125WindowRelief(product,mode){
 if(!WINDOW_RELIEF_MODES.includes(mode))fail('MODE');
 const {design,compiled,program,plan}=product;
 if(!verifyCompiled(design,compiled)||!Array.isArray(program)||!plan)fail('SOURCE');
 const owners=resolveR125FinalOwners(design,compiled),elements=new Map(design.elements.map(e=>[e.id,e]));
 const old=new Map(compiled.primitives.map((p,i)=>[key(p),{p,owner:elements.get(owners[i])}]));
 const occupied=new Set(old.keys()),protectedAir=new Set(),newParts=[],windows=[],skipped=[];
 for(const {p} of old.values())if(MATERIALS[p[3]]==='glass')
  for(const axis of [0,2])for(const sign of [-1,1])protectedAir.add(key(add(p.slice(0,3),axis,sign)));
 const door=design.elements.find(e=>e.id==='exterior-entrance'&&e.mode==='cut'&&e.shape==='box');
 const doorNear=q=>door&&q[0]>=door.origin[0]-1&&q[0]<=door.origin[0]+door.size[0]&&q[2]>=door.origin[2]-1&&q[2]<=door.origin[2]+door.size[2]&&q[1]>=door.origin[1]&&q[1]<door.origin[1]+door.size[1];
 const dims=[design.bounds.width,design.bounds.height,design.bounds.depth];
 const inside=q=>q.every((v,i)=>v>=0&&v<dims[i]);
 const inZone=(q,level)=>level.zones.some(z=>q[0]>=z.range.x[0]&&q[0]<=z.range.x[1]&&q[2]>=z.range.z[0]&&q[2]<=z.range.z[1]);
 const levels=[...program].sort((a,b)=>a.standingFloorY-b.standingFloorY);
 const levelAt=y=>levels.filter(l=>l.standingFloorY<=y).at(-1);
 const candidates=design.elements.filter(e=>e.mode==='add'&&e.material==='glass'&&paneId(e.id)&&e.shape==='box'&&!e.repeat);
 for(const e of candidates){
  const omit=reason=>skipped.push({window:e.id,reason});
  const axis=e.size[0]===1&&e.size[2]>1?0:e.size[2]===1&&e.size[0]>1?2:null;
  if(axis===null){omit('AMBIGUOUS_PLANE');continue}
  const along=axis===0?2:0,panes=rect(e.origin,e.size),level=levelAt(e.origin[1]);
  if(!level||panes.some(q=>old.get(key(q))?.owner.id!==e.id)){omit('NOT_FINAL_RECTANGULAR_PANE');continue}
  // Exterior side must be evidenced by actual room ranges and empty air.
  // No supported outside floor: avoid terraces, paved courts and walkways.
  const signs=[-1,1].filter(s=>panes.every(q=>{
   const out=add(q,axis,s),inn=add(q,axis,-s);
   return inZone(inn,level)&&!inZone(out,level)&&!occupied.has(key(out))&&
    !old.has(key([out[0],level.standingFloorY-1,out[2]]));
  }));
  if(signs.length!==1){omit('EXTERIOR_SIDE_NOT_PROVEN');continue}
  const sign=signs[0],top=add(e.origin,1,e.size[1]),row=e.size.map((n,i)=>i===1?1:n);
  const strips=[{origin:top,size:row,part:'head'}];
  if(mode==='surrounds'){
   strips.push({origin:add(e.origin,1,-1),size:row,part:'sill'});
   const side=e.size.map((n,i)=>i===along?1:n);
   strips.push({origin:add(e.origin,along,-1),size:side,part:'left'},
    {origin:add(e.origin,along,e.size[along]),size:side,part:'right'});
  }
  const parts=[],candidateCells=new Set();
  for(const strip of strips){
   const support=rect(strip.origin,strip.size);
   if(support.some(q=>{const w=old.get(key(q))?.owner;return !w||!faceId(w.id)||r125ElementRole(w)!=='wall'||w.shape!=='box'||w.size[axis]!==1}))break;
   const origin=add(strip.origin,axis,sign),cells=rect(origin,strip.size);
   if(cells.some(q=>!inside(q)||q[1]<level.standingFloorY||occupied.has(key(q))||protectedAir.has(key(q))||
      inZone(q,level)||old.has(key([q[0],level.standingFloorY-1,q[2]]))||doorNear(q)||candidateCells.has(key(q))))break;
   for(const q of cells)candidateCells.add(key(q));
   parts.push({id:'relief-window-'+windows.length+'-'+strip.part,shape:'box',mode:'add',material:'accent',origin,size:strip.size});
  }
  // Atomic per window, never replace surrounds with hoods. Skip unsafe
  // placements with evidence, but reject a wholly unrealized request.
  if(parts.length!==strips.length){omit('SUPPORT_OR_CLEARANCE');continue}
  if(design.elements.length+newParts.length+parts.length>160){omit('ELEMENT_BUDGET');continue}
  for(const k of candidateCells)occupied.add(k);
  newParts.push(...parts);
  windows.push({window:e.id,axis:axis===0?'x':'z',sign,addedCells:candidateCells.size,elementIds:parts.map(p=>p.id)});
 }
 if(!newParts.length)fail('NO_FEASIBLE_WINDOW');
 const nextDesign={...design,elements:[...design.elements,...newParts]},next=compileDesign(nextDesign);
 if(!verifyCompiled(nextDesign,next))fail('COMPILE');
 const final=new Map(next.primitives.map(p=>[key(p),p]));
 const added=next.primitives.length-compiled.primitives.length;
 if(added!==windows.reduce((n,w)=>n+w.addedCells,0)||[...old].some(([k,v])=>JSON.stringify(v.p)!==JSON.stringify(final.get(k))))fail('BASELINE_CHANGED');
 return {...product,design:nextDesign,compiled:next,sourceSha256:next.sourceSha256,geometrySha256:next.geometrySha256,
  windowRelief:{mode,owner:'MODEL_SELECTED_GENERIC_GEOMETRY',baselineSourceSha256:compiled.sourceSha256,
   baselineGeometrySha256:compiled.geometrySha256,addedCells:added,windows,skipped,
   existingCellsChanged:0,worldWrites:0,constructionApproved:false}};
}
