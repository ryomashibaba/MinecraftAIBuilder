/**
 * Rotate 1x1 Minecraft voxel grid cells into a stair local 3D AABB.
 *
 * The stair origin is the INDEX of the first block, not a continuous-space
 * pivot.  A negative basis vector requires a +1 grid-boundary offset;
 * without it, south/west/north-oriented player sweeps can be displaced into
 * neighboring exterior walls, creating false 3D collision diagnoses.
 *
 * Geometry evidence only. This does NOT certify Education stair physics.
 */
export const STAIR_GRID_FRAME_VERSION='B114_SIGNED_VOXEL_FRAME_V2';
const isFinite=n=>typeof n==='number'&&Number.isFinite(n);
export function stairGridOffsets(ascent) {
 const {dx,dz}=ascent??{};
 if(!Number.isInteger(dx)||!Number.isInteger(dz)||Math.abs(dx)+Math.abs(dz)!==1)
  throw Error('B114_GRID_FRAME_NON_CARDINAL_ASCENT');
 return {x:Math.max(0,-dx)+Math.max(0,dz),
  z:Math.max(0,-dz)+Math.max(0,-dx)};
}
export function transformStairBox(box,link) {
 const {origin,ascent,fromLevel}=link??{};
 if(!origin||!Number.isInteger(origin.x)||!Number.isInteger(origin.z)||
  !Number.isInteger(fromLevel)||fromLevel<0||
  !box||!['x','y','z','width','height','depth'].every(k=>isFinite(box[k]))||
  box.width<=0||box.height<=0||box.depth<=0)
  throw Error('B114_GRID_FRAME_INVALID_BOX_OR_STAIR');
 const {dx,dz}=ascent??{},offset=stairGridOffsets(ascent);
 const corners=[
  [box.x,box.z],[box.x+box.width,box.z],
  [box.x,box.z+box.depth],[box.x+box.width,box.z+box.depth]
 ].map(([u,v])=>[origin.x+dx*u-dz*v+offset.x,
  origin.z+dz*u+dx*v+offset.z]);
 const xs=corners.map(c=>c[0]),zs=corners.map(c=>c[1]);
 return {x:Math.min(...xs),y:fromLevel*5+1+box.y,z:Math.min(...zs),
  width:Math.max(...xs)-Math.min(...xs),
  height:box.height,depth:Math.max(...zs)-Math.min(...zs)};
}