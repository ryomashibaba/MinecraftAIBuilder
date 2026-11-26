/** Explicit authored roof finish. IDs are conceptual Bedrock candidates;
 * direction and half below are internal geometry, not Education block data. */
export const ROOF_SURFACE_MODES=Object.freeze(['stairs','stairs-and-slabs','slabs']);
export const ROOF_SURFACE_FAMILIES=Object.freeze(Object.fromEntries(
 Object.entries({
 oak_planks:['oak_stairs','oak_slab'],spruce_planks:['spruce_stairs','spruce_slab'],
 birch_planks:['birch_stairs','birch_slab'],dark_oak_planks:['dark_oak_stairs','dark_oak_slab'],
 stone_bricks:['stone_brick_stairs','stone_brick_slab'],
 deepslate_bricks:['deepslate_brick_stairs','deepslate_brick_slab'],
 deepslate_tiles:['deepslate_tile_stairs','deepslate_tile_slab'],
 sandstone:['sandstone_stairs','sandstone_slab'],quartz_block:['quartz_stairs','quartz_slab']
 }).map(([k,v])=>[k,Object.freeze(v)])));
export function validateR125RoofSurface(plan){
 if(!Object.hasOwn(plan??{},'roofSurface'))return true;
 if(!ROOF_SURFACE_MODES.includes(plan.roofSurface)||
    !Object.hasOwn(ROOF_SURFACE_FAMILIES,plan.blockPalette?.roof??''))
  throw Error('R125_ROOF_SURFACE_CONTRACT');
 return true;
}
