import { replayGeometry } from './geometry-quality.js';
import { lookupBlock } from './block-catalog.js';
// Intersecting thin wings can overwrite a screen's backing. Drop that entire
// optional module instead of emitting a detached shape or inventing support.
export function pruneUnsupportedScreens(operations,bounds) {
 let removed=0;
 while(true) {
  const {cells,key,sx,sz,sy,origin:a}=replayGeometry({operations,bounds}),bad=new Set();
  const solid=(x,y,z)=>{if(x<a.x||x>=a.x+sx||y<a.y||y>=a.y+sy||z<a.z||z>=a.z+sz)return false;const i=cells[key(x,y,z)];return i>=0&&['full_block','pillar/log'].includes(lookupBlock(operations[i].block)?.form);};
  for(let k=0;k<cells.length;k++) {
   const i=cells[k];if(i<0||operations[i].phase!=='facade_screen')continue;
   const x=k%sx+a.x,z=Math.floor(k/sx)%sz+a.z,y=Math.floor(k/(sx*sz))+a.y;
   if(![[x-1,y,z],[x+1,y,z],[x,y,z-1],[x,y,z+1]].some(p=>solid(...p))) bad.add(operations[i].moduleInstance);
  }
  if(!bad.size)return removed;
  for(let i=operations.length-1;i>=0;i--) if(bad.has(operations[i].moduleInstance)&&['facade_screen','screen_support'].includes(operations[i].phase)) {operations.splice(i,1);removed++;}
 }
}
