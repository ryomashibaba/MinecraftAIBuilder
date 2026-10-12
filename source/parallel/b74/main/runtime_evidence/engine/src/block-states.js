import { lookupBlock, validateBlockStates } from './block-catalog.js';
const vectors={north:{x:0,y:0,z:-1},east:{x:1,y:0,z:0},south:{x:0,y:0,z:1},west:{x:-1,y:0,z:0},up:{x:0,y:1,z:0},down:{x:0,y:-1,z:0}};
const direction=['south','west','north','east'];
const stairs=['east','west','south','north'];
const facing=['down','up','north','south','west','east'];
export function transformBlockStates(id,states,transform) {
 validateBlockStates(id,states); const out={...states},connections={};
 const turn=name=> {const v=transform(vectors[name]);return Object.keys(vectors).find(k=>Object.keys(v).every(a=>v[a]===vectors[k][a]));};
 const determinant=transform(vectors.east).x*transform(vectors.south).z-transform(vectors.east).z*transform(vectors.south).x;
 for(const [key,value] of Object.entries(states)) {
  if(key==='minecraft:cardinal_direction'||key==='minecraft:facing_direction') out[key]=turn(value);
  else if(key==='direction'||key==='weirdo_direction'||key==='facing_direction') {const table=key==='direction'?direction:key==='weirdo_direction'?stairs:facing;out[key]=table.indexOf(turn(table[value]));}
  else if(key==='pillar_axis') {const v=transform({x:value==='x'?1:0,y:value==='y'?1:0,z:value==='z'?1:0});out[key]=['x','y','z'].find(a=>Math.abs(v[a])===1);}
  else if(key==='ground_sign_direction') {const angle=value*Math.PI/8,v=transform({x:-Math.sin(angle),y:0,z:Math.cos(angle)});out[key]=((Math.round(Math.atan2(-v.x,v.z)*8/Math.PI)%16)+16)%16;}
  else if(key==='door_hinge_bit'&&determinant<0) out[key]=!value;
  else if(key==='minecraft:corner'&&determinant<0) out[key]=value.replace(/left|right/g,s=>s==='left'?'right':'left');
  else if(/(?:connection_|wall_connection_type_)(north|east|south|west)$/.test(key)) {const name=key.match(/(north|east|south|west)$/)[0];delete out[key];connections[key.replace(name,turn(name))]=value;}
  else if(!['upside_down_bit','open_bit','upper_block_bit','door_hinge_bit','minecraft:vertical_half','minecraft:corner','wall_post_bit'].includes(key)) throw new Error(`Undefined state transform: ${key}`);
 }
 return validateBlockStates(id,{...out,...connections});
}
export function shapeStates(id,outward='north') {
 const b=lookupBlock(id),s={};
 if(b.form==='stairs') {s.weirdo_direction=stairs.indexOf(outward);s.upside_down_bit=false;}
 if(b.form==='slab') s['minecraft:vertical_half']='bottom';
 if(b.form==='pillar/log'&&b.states.pillar_axis) s.pillar_axis='y';
 if(b.form==='trapdoor') {s.direction=direction.indexOf(outward);s.open_bit=false;s.upside_down_bit=false;}
 return validateBlockStates(id,s);
}
export function serializeStates(id,states={}) {validateBlockStates(id,states);return Object.keys(states).length?` [${Object.entries(states).sort().map(([k,v])=>`${JSON.stringify(k)}=${JSON.stringify(v)}`).join(',')}]`:'';}
