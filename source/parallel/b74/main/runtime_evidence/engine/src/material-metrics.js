import { replayGeometry } from './geometry-quality.js';
import { lookupBlock, compatibility } from './block-catalog.js';
export function measureMaterials(plan) {
 const {cells}=replayGeometry(plan),counts=new Map(),survivingOperations=new Set();let shapes=0;
 for(const i of cells) {if(i<0)continue;const o=plan.operations[i];if(o.block==='air')continue;survivingOperations.add(i);const b=lookupBlock(o.block);counts.set(b?.id??o.block,(counts.get(b?.id??o.block)??0)+1);if(b&&!['full_block','light','other'].includes(b.form))shapes++;}
 const usedBlocks=[...new Map(plan.operations.filter(o=>o.block!=='air').map(o=>{const item={id:lookupBlock(o.block)?.id??o.block,states:o.blockStates??{}};return [JSON.stringify(item),item];})).values()];
 const final=[...new Map([...survivingOperations].map(i=>{const o=plan.operations[i],item={id:lookupBlock(o.block)?.id??o.block,states:o.blockStates??{}};return [JSON.stringify(item),item];})).values()];
 const verified=final.filter(b=>compatibility(b.id,b.states)==='verified');
 return {materialCount:counts.size,shapeBlockCount:shapes,materialFamilies:[...new Set([...counts.keys()].map(id=>lookupBlock(id)?.family??'unknown'))].sort(),paletteSummary:plan.composition.materialPalette?.summary??'Legacy explicit palette',verifiedMaterialRatio:final.length?verified.length/final.length:0,usedBlockIds:[...counts.keys()].sort(),usedBlocks:final,verificationRequired:usedBlocks.filter(b=>compatibility(b.id,b.states)!=='verified')};
}
