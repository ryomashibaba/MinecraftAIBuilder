/** Explicit HOST study, never an author-plan rewrite or a world operation.
 * A roof-following entrance court removes volume from the actual envelope.
 * All coordinates derive from the existing doorway, room and roof geometry.
 */
export function packR125AdjacentBoxes(elements){
 const out=[];
 for(let i=0;i<elements.length;){
  const a=elements[i],b=elements[i+1];
  const compatible=e=>e&&a.shape==='box'&&e.shape==='box'&&
   a.mode==='add'&&e.mode==='add'&&!a.repeat&&!e.repeat&&
   !a.shell&&!e.shell&&
   a.material===e.material&&a.size.every((v,k)=>v===e.size[k]);
  if(!compatible(b)){out.push(a);i++;continue;}
  const offset=b.origin.map((v,k)=>v-a.origin[k]);
  if(!offset.some(v=>v!==0)||offset.some(v=>Math.abs(v)>128)){
   out.push(a);i++;continue;
  }
  let count=2;
  while(count<32&&compatible(elements[i+count])&&
   elements[i+count].origin.every((v,k)=>v===a.origin[k]+count*offset[k]))count++;
  // No intervening operations are crossed: exact operation-order parity.
  out.push({...a,repeat:{count,offset}});i+=count;
 }
 return out;
}
export function detailR125Envelope(elements,plan,program,
 {requireAuthoredCourt=false}={}){
 const entry=elements.find(e=>e.id==='exterior-entrance');
 if(!entry||plan.expression?.facadeLanguage==='recessed-portico')
  throw Error('R125_DETAIL_EXISTING_ENTRY_NOT_SUPPORTED');
 const {width:w,depth:d}=plan.footprint,count=plan.levels.length;
 const top=1+5*count,ex=entry.origin[0],front=entry.origin[2];
 const zone=program[0].zones.find(z=>ex>=z.range.x[0]&&ex+1<=z.range.x[1]);
 const left=ex-2,right=ex+3,back=front+3;
 const box=(id,mode,material,origin,size,repeat)=>elements.push({
  id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size,
  ...(repeat?{repeat}:{})});
 const courtFits=Boolean(zone)&&left>=zone.range.x[0]&&
  right<=zone.range.x[1]&&back+2<=zone.range.z[1]&&
  // The lower stair occupies x=3..4, z=3..7 on two-storey plans.
  // An entry-court cut must never remove those actual stair voxels.
  (count===1||left>4);
 if(!courtFits){
  // A model-selected full entry court is an all-or-hold request. Never
  // substitute the historical shallow HOST-only threshold for it.
  if(requireAuthoredCourt)
   throw Error('R125_DETAIL_AUTHORED_ENTRY_COURT_DOES_NOT_FIT');
  // A real one-block-deep covered public threshold is a bounded
  // alternative when the six-wide, three-deep volume would erase stairs
  // or enter another authored room. It touches ONLY exterior z=0:
  // leave all entrance, inner walls, roof, rooms and stair voxels intact.
  // This is an explicit HOST-derived ART study, not a model-authored court.
  if(front!==1||ex<2||ex+1>w-3)
   throw Error('R125_DETAIL_ENTRY_COURT_DOES_NOT_FIT');
  const awningLeft=Math.max(1,ex-4);
  const awningRight=Math.min(w-2,ex+5);
  if(awningLeft>=ex||awningRight<=ex+1)
   throw Error('R125_DETAIL_ENTRY_COURT_DOES_NOT_FIT');
  const span=awningRight-awningLeft+1;
  box('detail-covered-entry-landing','add',plan.materials.floor,
   [awningLeft,1,0],[span,1,1]);
  box('detail-covered-entry-canopy','add',plan.materials.roof,
   [awningLeft,5,0],[span,1,1]);
  for(const x of [awningLeft,awningRight])
   box('detail-covered-entry-pier-'+x,'add',plan.materials.wall,
    [x,2,0],[1,3,1]);
  elements.splice(0,elements.length,...packR125AdjacentBoxes(elements));
  return {policy:'spatial-v1',owner:'HOST',authorPlanEdited:false,
   massing:'covered-threshold-fallback',originalEntry:[ex,2,front],
   recessedEntry:null,canopy:{left:awningLeft,right:awningRight,z:0},
   roofProfilePreserved:plan.expression.roofProfile,
   equipmentAdded:0,worldWrites:0};
 }
 // Query only genuine roof skins, including B143 repeats. No guessed roof
 // silhouette and no conversion of the author-selected family. Hip bands,
 // their central ridge and existing pitched/monitor roofs use the SAME
 // final-top query. Explicit hip eaves are excluded: they are not the
 // enclosing roof skin and must never raise a reconstructed entrance wall.
 const skins=elements.filter(e=>e.mode==='add'&&e.shape==='box'&&
  /^(roof-raised-skin-|roof-profile-|roof-base$|roof-monitor-(low|high)$|roof-hip-(?:[0-9]+-(?:front|rear|west|east)|inner-(?:front|rear|west|east)|ridge)$)/.test(e.id));
 const roofAt=(x,z)=>{
  let y=top;
  for(const e of skins)for(let n=0;n<(e.repeat?.count??1);n++){
   const a=e.origin.map((v,i)=>v+n*(e.repeat?.offset[i]??0));
   if(x>=a[0]&&x<a[0]+e.size[0]&&z>=a[2]&&z<a[2]+e.size[2])
    y=Math.max(y,a[1]+e.size[1]-1);
  }
  return y;
 };
 // One-cell real roof projection beyond the external wall. Equal-height
 // strips become repeated boxes; their material/elevation follow the roof.
 if(!requireAuthoredCourt&&!plan.expression.roofOverhang){
  for(const [face,axis,limit] of [['front',0,w-2],['rear',0,w-2],
    ['west',2,d-2],['east',2,d-2]]){
   const groups=new Map();
   for(let k=1;k<=limit;k++){
    const x=axis===0?k:(face==='west'?1:w-2);
    const z=axis===2?k:(face==='front'?1:d-2),y=roofAt(x,z);
    if(!groups.has(y))groups.set(y,[]);groups.get(y).push(k);
   }
   for(const [y,positions] of groups){
    // Encode only truly arithmetic runs; no skipped or invented eave cells.
    for(let i=0;i<positions.length;){
     const stride=positions[i+1]-positions[i],start=positions[i];
     let end=i+1;
     if(stride)while(end<positions.length&&end-i<32&&positions[end]===start+(end-i)*stride)end++;
     const origin=axis===0?[start,y,face==='front'?0:d-1]:
      [face==='west'?0:w-1,y,start];
     const offset=[0,0,0];offset[axis]=stride||1;
     box('detail-eave-'+face+'-'+start,'add',plan.materials.roof,origin,[1,1,1],
      end-i>1?{count:end-i,offset}:null);
     i=end;
    }
   }
  }
 }
 entry.id='detail-former-entry';
 // A full-height notch, including upper slab and roof, creates a real
 // forecourt rather than drawing trim on the existing rectangular wall.
 box('detail-entry-volume','cut',null,[left,2,0],[6,5*count+6,back]);
 box('detail-entry-paving','add',plan.materials.floor,[left,1,0],[6,1,back+1]);
 for(const x of [left,right])
  box('detail-entry-return-'+x,'add',plan.materials.wall,[x,2,front],
   [1,roofAt(x,back)-1,back-front+1]);
 for(let x=left+1;x<right;x++)
  box('detail-entry-back-'+x,'add',plan.materials.wall,[x,2,back],
   [1,roofAt(x,back)-1,1]);
 box('exterior-entrance','cut',null,[ex,2,back],[2,3,1]);
 // Side lights flank the actual doorway; solid sill and lintel remain.
 box('detail-entry-light-cut','cut',null,[left+1,3,back],[1,2,1],
  {count:2,offset:[3,0,0]});
 box('detail-entry-light','add','glass',[left+1,3,back],[1,2,1],
  {count:2,offset:[3,0,0]});
 if(count===2){
  box('detail-upper-light-cut','cut',null,[left+1,8,back],[4,2,1]);
  box('detail-upper-light','add','glass',[left+1,8,back],[4,2,1]);
 }
 box('detail-entry-canopy','add',plan.materials.roof,[left,5,0],
  [6,1,back+(requireAuthoredCourt?1:0)]);
 elements.splice(0,elements.length,...packR125AdjacentBoxes(elements));
 return {policy:requireAuthoredCourt?'model-selected-entry-court':'spatial-v1',
  owner:'HOST',authorPlanEdited:false,
  ...(requireAuthoredCourt?{massing:'model-selected-six-wide-three-deep-entry'}:{}),
  originalEntry:[ex,2,front],recessedEntry:[ex,2,back],
  court:{left,right,front:0,back},roofProfilePreserved:plan.expression.roofProfile,
  equipmentAdded:0,worldWrites:0};
}
