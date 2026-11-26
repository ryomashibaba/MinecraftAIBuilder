/** Model-selected architectural relief on verified exterior wall faces.
 * Pilasters are attached full-block ornaments, not certified structural
 * columns. Framed bays connect two such piers with a projecting top band.
 * No building-type presets, world operations, or frozen B143 changes. */
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {resolveR125FinalOwners} from './r125-block-expression.mjs';
export const WALL_RELIEF_MODES=Object.freeze(['pilasters','framed-bays']);
const key=p=>p.slice(0,3).join(',');
const fail=m=>{throw Error('R125_WALL_RELIEF_'+m)};
const face=id=>/^(?:l\d+|space-\d+)-(front|rear|west|east)$/.exec(id)?.[1];
const offset=(p,i,d)=>p.map((v,j)=>v+(i===j?d:0));
export function addR125WallRelief(product,mode){
 if(!WALL_RELIEF_MODES.includes(mode))fail('MODE');
 const {design,compiled,program}=product;
 if(!verifyCompiled(design,compiled)||!Array.isArray(program))fail('SOURCE');
 const owners=resolveR125FinalOwners(design,compiled),byId=new Map(design.elements.map(e=>[e.id,e]));
 const old=new Map(compiled.primitives.map((p,i)=>[key(p),{p,owner:owners[i]}]));
 const occupied=new Set(old.keys()),protectedAir=new Set(),parts=[],placed=[],skipped=[];
 const dims=[design.bounds.width,design.bounds.height,design.bounds.depth];
 const inBounds=q=>q.every((v,i)=>v>=0&&v<dims[i]);
 const insideZone=(q,l)=>l.zones.some(z=>q[0]>=z.range.x[0]&&q[0]<=z.range.x[1]&&q[2]>=z.range.z[0]&&q[2]<=z.range.z[1]);
 // Protect air horizontally adjacent to any glazing and every explicit
 // doorway/cut used for entrance or room connections, including joints.
 for(const {p} of old.values())if(MATERIALS[p[3]]==='glass')
  for(const i of [0,2])for(const sign of [-1,1])protectedAir.add(key(offset(p.slice(0,3),i,sign)));
 const doors=design.elements.filter(e=>e.mode==='cut'&&e.shape==='box'&&/door|entrance|joint|access/i.test(e.id));
 const nearDoor=q=>doors.some(e=>{for(let n=0;n<(e.repeat?.count??1);n++){
  const a=e.origin.map((v,i)=>v+n*(e.repeat?.offset[i]??0));
  if(q.every((v,i)=>v>=a[i]-(i===1?0:1)&&v<a[i]+e.size[i]+(i===1?0:1)))return true;
 }return false});
 const levels=[...program].sort((a,b)=>a.standingFloorY-b.standingFloorY);
 for(const e of design.elements){
  const direction=face(e.id);
  if(!direction||e.mode!=='add'||e.shape!=='box'||e.repeat||e.shell||['glass','glow'].includes(e.material))continue;
  const axis=['front','rear'].includes(direction)?2:0,along=axis===0?2:0;
  const sign=['front','west'].includes(direction)?-1:1;
  const l=levels.find(v=>v.standingFloorY===e.origin[1]);
  const skip=reason=>skipped.push({face:e.id,reason});
  if(!l||e.size[axis]!==1||e.size[1]<3||e.size[along]<5){skip('FACE_TOO_SMALL_OR_UNSUPPORTED');continue}
  const low=e.origin[along],high=low+e.size[along]-1,top=e.origin[1]+e.size[1]-1;
  const point=(a,y)=>{const q=e.origin.slice();q[along]=a;q[1]=y;return q};
  const can=(a,y)=>{
   const q=point(a,y),out=offset(q,axis,sign),inn=offset(q,axis,-sign);
   const support=old.get(key(q));
   return support?.owner===e.id&&inBounds(out)&&insideZone(inn,l)&&!insideZone(out,l)&&
    !old.has(key([out[0],l.standingFloorY-1,out[2]]))&&!occupied.has(key(out))&&
    !protectedAir.has(key(out))&&!nearDoor(out);
  };
  const candidates=[];
  for(let a=low;a<=high;a++)if(Array.from({length:e.size[1]},(_,i)=>e.origin[1]+i).every(y=>can(a,y)))candidates.push(a);
  let selected=null;
  // Search maximum-width two-pier rhythm. Framed bays require a continuous
  // safely backed top band, not disconnected pieces or a silent downgrade.
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
   const a=candidates[i],b=candidates[j];if(b-a<3)continue;
   if(mode==='framed-bays'&&!Array.from({length:b-a+1},(_,k)=>a+k).every(x=>can(x,top)))continue;
   if(!selected||b-a>selected[1]-selected[0])selected=[a,b];
  }
  if(!selected){skip('NO_CLEAR_PIER_PAIR');continue}
  const [a,b]=selected,local=[],cells=new Set();
  const append=(name,at,size)=>{
   const origin=offset(at,axis,sign);
   for(let y=0;y<size[1];y++)for(let z=0;z<size[2];z++)for(let x=0;x<size[0];x++){
    const k=key([origin[0]+x,origin[1]+y,origin[2]+z]);
    if(cells.has(k)||occupied.has(k))fail('OVERLAPPING_PART');cells.add(k);
   }
   local.push({id:'wall-relief-'+placed.length+'-'+name,shape:'box',mode:'add',material:'accent',origin,size});
  };
  for(const [i,x] of [a,b].entries())append('pier-'+i,point(x,e.origin[1]),[1,e.size[1],1]);
  if(mode==='framed-bays'){
   const size=[1,1,1];size[along]=b-a-1;
   append('band',point(a+1,top),size);
  }
  if(design.elements.length+parts.length+local.length>160){skip('ELEMENT_BUDGET');continue}
  for(const k of cells)occupied.add(k);
  parts.push(...local);
  placed.push({face:e.id,mode,span:b-a+1,addedCells:cells.size,elementIds:local.map(v=>v.id)});
 }
 if(!parts.length)fail('NO_FEASIBLE_FACE');
 const nextDesign={...design,elements:[...design.elements,...parts]},next=compileDesign(nextDesign);
 if(!verifyCompiled(nextDesign,next))fail('COMPILE');
 const final=new Map(next.primitives.map(p=>[key(p),p]));
 const added=next.primitives.length-compiled.primitives.length;
 if(added!==placed.reduce((n,v)=>n+v.addedCells,0)||[...old].some(([k,v])=>JSON.stringify(v.p)!==JSON.stringify(final.get(k))))fail('BASELINE_CHANGED');
 return {...product,design:nextDesign,compiled:next,sourceSha256:next.sourceSha256,geometrySha256:next.geometrySha256,
  wallRelief:{mode,owner:'MODEL_SELECTED_GENERIC_GEOMETRY',baselineSourceSha256:compiled.sourceSha256,
   baselineGeometrySha256:compiled.geometrySha256,addedCells:added,faces:placed,skipped,
   existingCellsChanged:0,worldWrites:0,constructionApproved:false}};
}
