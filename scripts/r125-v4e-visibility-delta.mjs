/**
 * Compare ACTUAL B143 final voxels from the SAME authored design before/after.
 * Unlike material-only SVG, changes in roof height are visible even when
 * Minecraft floor and roof share a material. No ART/real LLM/world certification.
 */
const fail=s=>{throw Error('R125_V4E_VISIBILITY_'+s);};
const FACE=['roof','north','south','west','east'];
function project(vox,face){
 if(!Array.isArray(vox)||vox.length<100)fail('REAL_B143_REQUIRED');
 const out=new Map(),seen=new Set();
 for(const p of vox){
  if(!Array.isArray(p)||p.length!==5||!p.every(Number.isSafeInteger))
   fail('INVALID_PRIMITIVE');
  const [x,y,z,m]=p,id=x+','+y+','+z;
  if(seen.has(id))fail('DUPLICATE_REAL_CELL');seen.add(id);
  const u=face==='east'||face==='west'?z:x,v=face==='roof'?z:-y;
  const depth=face==='roof'?y:face==='north'?-z:
   face==='south'?z:face==='west'?-x:x;
  const key=u+','+v,prior=out.get(key);
  if(prior===undefined||depth>prior.depth)out.set(key,{u,v,depth,m});
 }
 return out;
}
function cells(before,after){
 return FACE.map(face=>{
  const a=project(before,face),b=project(after,face),
   union=new Set([...a.keys(),...b.keys()]);
  let changed=0,silhouette=0,depth=0,material=0;
  const pixels=[];
  for(const key of union){
   const x=a.get(key),y=b.get(key),c=y??x;
   const kind=!x?'added':!y?'removed':
    x.depth!==y.depth?'depth':x.m!==y.m?'material':'unchanged';
   if(kind!=='unchanged')changed++;
   if(kind==='added'||kind==='removed')silhouette++;
   if(kind==='depth')depth++;
   if(kind==='material')material++;
   pixels.push({u:c.u,v:c.v,kind});
  }
  return {face,baselineCells:a.size,finalCells:b.size,
   unionCells:union.size,changedCells:changed,
   silhouetteChangedCells:silhouette,depthChangedCells:depth,
   materialChangedCells:material,
   changeFraction:Math.round(changed/union.size*1000000)/1000000,
   pixels};
 });
}
export function auditB143ProjectedVisibility(before,after){
 return {schema:'r125-v4e-actual-b143-projection-depth-audit-v1',
  provenance:'TRUE_B143_COMPILED_VOXEL_ARRAYS',
  humanArchitecturalArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  certifiedImprovement:false,
  views:cells(before,after).map(({pixels,...v})=>v)};
}
export function renderB143ProjectedVisibilityDelta(before,after,
 {sourceKind='SYNTHETIC_AUTHOR'}={}){
 if(!['SYNTHETIC_AUTHOR','PRIVATE_SINGLE_MODEL_ATTEMPT_UNATTESTED'].includes(sourceKind))
  fail('INVALID_PROVENANCE');
 const palette={unchanged:'#425665',added:'#52caa2',removed:'#f56e75',
  depth:'#ffd26a',material:'#71c7e8'};
 const out=['<svg xmlns="http://www.w3.org/2000/svg" width="1270" height="770" viewBox="0 0 1270 770">',
 '<rect width="1270" height="770" fill="#102638"/>',
 '<text x="20" y="30" fill="white" font-family="sans-serif" font-size="20">ACTUAL B143 VISIBLE DELTA — NOT ART PASS</text>',
 '<text x="20" y="50" fill="#c9d6e2" font-family="sans-serif" font-size="12">'+
 (sourceKind==='SYNTHETIC_AUTHOR'?'SYNTHETIC AUTHOR':'PRIVATE UNATTESTED MODEL')+
 ' | RED removed / GREEN added / AMBER depth or height / BLUE material / GRAY unchanged</text>'];
 for(const [i,f] of cells(before,after).entries()){
  const p=f.pixels;
  const minU=Math.min(...p.map(x=>x.u)),minV=Math.min(...p.map(x=>x.v));
  const maxU=Math.max(...p.map(x=>x.u)),maxV=Math.max(...p.map(x=>x.v));
  const wide=maxU-minU+1,high=maxV-minV+1;
  const sc=Math.min(4.2,365/wide,260/high),px=16+(i%3)*420,
   py=75+Math.floor(i/3)*343;
  const left=px+(388-wide*sc)/2,top=py+37+(270-high*sc)/2;
  out.push('<rect x="'+px+'" y="'+py+'" width="405" height="325" rx="8" fill="#244154"/>',
   '<text x="'+(px+12)+'" y="'+(py+23)+'" fill="white" font-family="sans-serif" font-size="14">'+
   f.face.toUpperCase()+' — changed '+f.changedCells+'/'+f.unionCells+'</text>');
  for(const x of p)out.push('<rect x="'+(left+(x.u-minU)*sc).toFixed(2)+
   '" y="'+(top+(x.v-minV)*sc).toFixed(2)+
   '" width="'+sc.toFixed(2)+'" height="'+sc.toFixed(2)+
   '" fill="'+palette[x.kind]+'"/>');
 }
 return out.join('\n')+'\n</svg>\n';
}
