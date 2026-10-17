// ARK-LITE-P0: intentionally independent, deterministic Minecraft Education prototype.
// Local coordinates; NO world origin or approval is embedded in this source.
import {createHash} from 'node:crypto';
export const SIZE=Object.freeze({width:48,depth:40,maxY:29});
export const MATERIALS=Object.freeze([
  'minecraft:quartz_block','minecraft:iron_block',
  'minecraft:glass','minecraft:glowstone','minecraft:stone'
]);
const k=(x,y,z)=>[x,y,z].join(',');
export function makeArkLite(){
  const map=new Map();
  const put=(x,y,z,block)=>{
    if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z)||
       x<0||x>=48||z< -4||z>=40||y<0||y>29||!MATERIALS.includes(block))
      throw Error('P0_INVALID_VOXEL');
    map.set(k(x,y,z),{x,y,z,block});
  };
  const box=(x1,y1,z1,x2,y2,z2,b)=>{
    for(let y=y1;y<=y2;y++)for(let z=z1;z<=z2;z++)
      for(let x=x1;x<=x2;x++)put(x,y,z,b);
  };
  const white='minecraft:quartz_block',metal='minecraft:iron_block',
    glass='minecraft:glass',light='minecraft:glowstone',
    foundation='minecraft:stone';
  // Continuous traversable ground floor and an exterior approach.
  box(0,0,0,47,0,39,foundation);
  box(14,0,-4,33,0,-1,white);
  box(1,0,1,46,0,38,white);
  // 16-block-high glazed terminal envelope with 12-wide front entry.
  for(let y=1;y<=15;y++){
    for(let x=0;x<48;x++)for(const z of [0,39]){
      if(z===0&&x>=18&&x<=29&&y<=7)continue;
      const frame=y<=2||y>=14||x%8===0||x===47;
      put(x,y,z,frame?white:glass);
    }
    for(let z=1;z<39;z++)for(const x of [0,47]){
      const frame=y<=2||y>=14||z%8===0;
      put(x,y,z,frame?white:glass);
    }
  }
  // Entire roof is weather-covered; glass atrium skylight in the middle.
  box(0,16,0,47,16,39,white);
  box(13,16,9,34,16,30,glass);
  for(const x of [12,23,35])box(x,17,0,x,17,39,metal);
  for(const z of [8,20,31])box(0,17,z,47,17,z,metal);
  // Corner observation pylons with strongly legible outer silhouette.
  for(const [ax,az] of [[1,1],[40,1],[1,32],[40,32]]){
    for(const dx of [0,6])for(const dz of [0,6])
      box(ax+dx,16,az+dz,ax+dx,26,az+dz,metal);
    for(const y of [19,23,26]){
      box(ax,y,az,ax+6,y,az,white);
      box(ax,y,az+6,ax+6,y,az+6,white);
      box(ax,y,az,ax,y,az+6,white);
      box(ax+6,y,az,ax+6,y,az+6,white);
    }
    box(ax+2,26,az+2,ax+4,26,az+4,light);
  }
  // Front flying gateway: raised arch and prominent luminaires.
  for(let x=9;x<=38;x++){
    const height=18+Math.round(7*(1-Math.abs(x-23.5)/14.5));
    for(const z of [-3,-2])put(x,height,z,metal);
  }
  for(const x of [12,35])box(x,1,-2,x+1,16,-2,metal);
  for(const x of [13,16,31,34])put(x,16,-3,light);
  // Central rooftop needle. No interior floor-space is cleared.
  for(const x of [21,26])for(const z of [17,22])
    box(x,17,z,x,27,z,metal);
  for(const y of [20,24,27]){
    box(21,y,17,26,y,17,white);box(21,y,22,26,y,22,white);
    box(21,y,18,21,y,21,white);box(26,y,18,26,y,21,white);
  }
  box(23,28,19,24,29,20,light);
  // Sparse lobby lighting, preserving the clear 12-wide entrance.
  for(const x of [9,38])for(const z of [9,30]){
    box(x,1,z,x,6,z,metal);put(x,7,z,light);
  }
  const voxels=[...map.values()].sort((a,b)=>a.y-b.y||a.z-b.z||a.x-b.x);
  // Greedy homogenous XY/XZ/XYZ cuboids: fewer world writes than X-only RLE.
  // Every compressed cuboid is at most 2048 cells (Bedrock fill limit margin).
  const remaining=new Map(map);
  const at=(x,y,z,b)=>remaining.get(k(x,y,z))?.block===b;
  const runs=[];
  for(const p of voxels){
    if(!remaining.has(k(p.x,p.y,p.z)))continue;
    const b=p.block,x1=p.x,y1=p.y,z1=p.z;
    let x2=x1,y2=y1,z2=z1;
    while(x2<47&&at(x2+1,y1,z1,b)&&x2-x1+2<=2048)x2++;
    let layer=(x2-x1+1);
    zloop:while(z2<39&&layer+(x2-x1+1)<=2048){
      for(let x=x1;x<=x2;x++)if(!at(x,y1,z2+1,b))break zloop;
      z2++;layer+=(x2-x1+1);
    }
    yloop:while(y2<29&&layer*2<=2048){
      for(let z=z1;z<=z2;z++)for(let x=x1;x<=x2;x++)
        if(!at(x,y2+1,z,b))break yloop;
      y2++;
      layer=(x2-x1+1)*(z2-z1+1)*(y2-y1+1);
    }
    for(let y=y1;y<=y2;y++)for(let z=z1;z<=z2;z++)
      for(let x=x1;x<=x2;x++)remaining.delete(k(x,y,z));
    runs.push({x1,x2,y1,y2,z1,z2,block:b});
  }
  if(remaining.size)throw Error('P0_COMPRESSION_FAILED');
  const serialized=JSON.stringify(voxels.map(p=>[p.x,p.y,p.z,p.block]));
  const sha256=createHash('sha256').update(serialized).digest('hex');
  const counts=Object.fromEntries(MATERIALS.map(m=>[m,voxels.filter(p=>p.block===m).length]));
  return {schema:'minecraftaibuilder-prototype-ark-lite-p0',size:SIZE,
    footprint:{minX:0,maxX:47,minZ:-4,maxZ:39,minY:0,maxY:29},
    voxels,runs,sha256,counts,placementCount:voxels.length};
}
export function validateOrigin(o){
  if(!o||!['x','y','z'].every(k=>Number.isSafeInteger(o[k])))
    throw Error('P0_ORIGIN_THREE_INTEGERS_REQUIRED');
  if(o.y< -40||o.y+29>300||Math.abs(o.x)>29999940||
     Math.abs(o.z)>29999940)throw Error('P0_ORIGIN_OUT_OF_BOUNDS');
  return o;
}
export function absolute(p,o){return {x:p.x+o.x,y:p.y+o.y,z:p.z+o.z};}
