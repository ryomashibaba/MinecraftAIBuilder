/** R178: caller-selected four-room height order. No identity or ART certification. */
import {validateR160TopologyIntent} from './r160-topology-intent.mjs';
export const R178_HEIGHT_SCHEMA='minecraftaibuilder-r178-four-room-height-order-ir-v1';
const exact=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
export function r178ToR160(ir){
 const {roomHeightOrder,...rest}=ir;
 return {...rest,schema:'minecraftaibuilder-r160-topology-ir-v1'};
}
export function validateR178HeightOrderIntent(ir){
 const keys=['schema','entryHierarchy','daylightStrategy','roofEdge','spatialTopology','roomHeightOrder'];
 if(!exact(ir,keys)||ir.schema!==R178_HEIGHT_SCHEMA)
  throw Error('R178_EXACT_ARCHITECTURE_FIELDS');
 const a=ir.roomHeightOrder;
 if(!Array.isArray(a)||a.length!==4||
  !a.every(x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(x))||
  new Set(a).size!==4)
  throw Error('R178_FOUR_UNIQUE_ROOM_IDS_LOW_TO_HIGH');
 validateR160TopologyIntent(r178ToR160(ir));
 return true;
}
export const R178_MODEL_INSTRUCTIONS=[
 'OPTIONAL R178: choose architecture {schema,entryHierarchy,daylightStrategy,roofEdge,spatialTopology,roomHeightOrder}.',
 'schema='+R178_HEIGHT_SCHEMA,
 'roomHeightOrder must list EXACTLY the four existing layout.spaces IDs, ordered LOWEST to HIGHEST.',
 'The B143 source HOST maps those ranks to bounded roof Y values 9,10,12,14.',
 'Never add coordinates or approvals. Unsupported choices must HOLD, no repair.'
].join('\n');
