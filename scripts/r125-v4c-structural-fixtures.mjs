/** Three hand-authored structural TEST FIXTURES. NOT independent Qwen output.
 * Their actual mass link topology differs. No genre labels as evidence.
 */
import {V4C_SCHEMA} from '../source/ai/r125-void-massing-v4c.mjs';

export const STRUCTURE_IDS=Object.freeze(['east-south-court','west-north-court','serial-court']);
const materials={floor:'stone',wall:'concrete',roof:'metal',plaza:'accent'};
export const makeStructurePlan=i=>{
 if(!Number.isInteger(i)||i<0||i>2)throw Error('V4C_FIXTURE_ID');
 const common={schema:V4C_SCHEMA,id:'study-'+STRUCTURE_IDS[i],
  title:'SYNTHETIC authored spatial prototype '+STRUCTURE_IDS[i],
  brief:'Test whether distinct mass relationships create a usable full scale public void',
  materials:{...materials}};
 if(i===0)return {...common,masses:[
  {id:'main-hall',purpose:'Generous public reception and circulation',
   x:12,z:14,width:30,depth:28,roofY:11},
  {id:'east-laboratory',purpose:'Separate technical and fabrication rooms',
   x:41,z:20,width:12,depth:12,roofY:9},
  {id:'south-workroom',purpose:'Quiet support spaces and logistics',
   x:20,z:41,width:13,depth:12,roofY:10}],
  links:[
   {from:'main-hall',to:'east-laboratory',side:'east',offset:3},
   {from:'main-hall',to:'south-workroom',side:'south',offset:3}],
  entry:{massId:'main-hall',side:'north',offset:8},
  court:{ownerId:'main-hall',purpose:'Real open-air shared civic court',
   offsetX:10,offsetZ:9,width:10,depth:10,gateSide:'north',gateOffset:2},
  plaza:{x:14,width:14,depth:8,purpose:'Public gathering and approach'}};
 if(i===1)return {...common,masses:[
  {id:'entry-commons',purpose:'Public entrance and communal services',
   x:24,z:17,width:34,depth:30,roofY:12},
  {id:'west-archive',purpose:'Protected collections and staff resources',
   x:11,z:26,width:14,depth:11,roofY:10},
  {id:'north-observatory',purpose:'Independent display and study wing',
   x:45,z:6,width:11,depth:12,roofY:9}],
  links:[
   {from:'entry-commons',to:'west-archive',side:'west',offset:3},
   {from:'entry-commons',to:'north-observatory',side:'north',offset:3}],
  entry:{massId:'entry-commons',side:'north',offset:8},
  court:{ownerId:'entry-commons',purpose:'Open roof court for public observation',
   offsetX:11,offsetZ:10,width:12,depth:11,gateSide:'south',gateOffset:3},
  plaza:{x:29,width:14,depth:8,purpose:'Unroofed entrance and public forecourt'}};
 return {...common,masses:[
  {id:'large-gallery',purpose:'Main hall for continuous public movement',
   x:15,z:18,width:34,depth:32,roofY:13},
  {id:'south-atelier',purpose:'Collective fabrication and workshops',
   x:31,z:49,width:14,depth:12,roofY:11},
  {id:'east-study',purpose:'Secondary learning and service facilities',
   x:44,z:53,width:12,depth:10,roofY:9}],
  links:[
   {from:'large-gallery',to:'south-atelier',side:'south',offset:3},
   {from:'south-atelier',to:'east-study',side:'east',offset:3}],
  entry:{massId:'large-gallery',side:'north',offset:9},
  court:{ownerId:'large-gallery',purpose:'Generous open public cloister garden',
   offsetX:9,offsetZ:11,width:13,depth:12,gateSide:'south',gateOffset:5},
  plaza:{x:19,width:18,depth:10,purpose:'Outdoor approach and event spillover'}};
};
