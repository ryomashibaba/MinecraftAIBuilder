/**
 * Generic author-chosen four-sided stepped hip roof. Actual B143 voxels:
 * outer pitched masses, sealed center and genuine raised ceiling air.
 * No world operations, API calls or fixed building-type presets.
 */
export function addR125HipRoof(box,{upper,top,roof,wall,roofAxis,overhang=false}){
 if(typeof box!=='function'||!['x','z'].includes(roofAxis))
  throw Error('R125_HIP_ARGUMENTS');
 const dx=roofAxis==='x'?1:2,dz=roofAxis==='x'?2:1;
 const width=upper.x1-upper.x0+1,depth=upper.z1-upper.z0+1;
 const bands=Math.min(6,Math.floor((width-4)/(2*dx)),
  Math.floor((depth-4)/(2*dz)));
 if(bands<2)throw Error('R125_HIP_SPAN');
 for(let level=0;level<bands;level++){
  const x0=upper.x0+level*dx,x1=upper.x1-level*dx;
  const z0=upper.z0+level*dz,z1=upper.z1-level*dz;
  const w=x1-x0+1,d=z1-z0+1,height=level+1;
  // Four disjoint bands each tier; adjacent tiers share solid faces.
  box('roof-hip-'+level+'-front','add',roof,
   [x0,top,z0],[w,height,dz]);
  box('roof-hip-'+level+'-rear','add',roof,
   [x0,top,z1-dz+1],[w,height,dz]);
  box('roof-hip-'+level+'-west','add',roof,
   [x0,top,z0+dz],[dx,height,d-2*dz]);
  box('roof-hip-'+level+'-east','add',roof,
   [x1-dx+1,top,z0+dz],[dx,height,d-2*dz]);
 }
 const x0=upper.x0+bands*dx,x1=upper.x1-bands*dx;
 const z0=upper.z0+bands*dz,z1=upper.z1-bands*dz;
 const w=x1-x0+1,d=z1-z0+1;
 // Enclose raised ridge without inventing a flat lower ceiling.
 box('roof-hip-inner-front','add',wall,[x0,top,z0],[w,bands,1]);
 box('roof-hip-inner-rear','add',wall,[x0,top,z1],[w,bands,1]);
 box('roof-hip-inner-west','add',wall,[x0,top,z0+1],[1,bands,d-2]);
 box('roof-hip-inner-east','add',wall,[x1,top,z0+1],[1,bands,d-2]);
 box('roof-hip-ridge','add',roof,[x0,top+bands,z0],[w,1,d]);
 if(overhang)for(const [name,at,size] of [
  ['front',[upper.x0-1,top,upper.z0-1],[width+2,1,1]],
  ['rear',[upper.x0-1,top,upper.z1+1],[width+2,1,1]],
  ['west',[upper.x0-1,top,upper.z0],[1,1,depth]],
  ['east',[upper.x1+1,top,upper.z0],[1,1,depth]]
 ])box('roof-hip-eave-'+name,'add',roof,at,size);
 return {roofFamily:'hip',ridgeAxis:roofAxis,roofRise:bands,
  authorSelected:true,worldWrites:0};
}
