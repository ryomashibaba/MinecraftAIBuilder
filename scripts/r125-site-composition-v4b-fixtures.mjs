/** Model TEST DOUBLE geometry. These five IRs are NOT Qwen outputs. */
import {SITE_SCHEMA} from '../source/ai/r125-site-composition-v4b.mjs';
export const SYNTHETIC_GENRES=['home','retail','laboratory','gallery','station'];
export const makeSyntheticV4BSite=i=>{
 if(!Number.isInteger(i)||i<0||i>=SYNTHETIC_GENRES.length)throw Error('INVALID_SYNTHETIC_INDEX');
 const w=16+i%3,d=13+i%2,roofY=9+i%3;
 return {
  schema:SITE_SCHEMA,id:'v4b-'+SYNTHETIC_GENRES[i],
  title:'SYNTHETIC shared-layout '+SYNTHETIC_GENRES[i]+' SOURCE only',
  brief:'Synthetic common topology for real B143 geometry testing; NOT independent Qwen design',
  materials:{floor:i===0?'wood':'stone',wall:'concrete',roof:'metal'},
  masses:[
   {id:'primary',purpose:'Visitors enter a coherent public program',
    x:2,z:2,width:w,depth:d,roofY},
   {id:'east-wing',purpose:'Specialized services and enclosed operating space',
    x:w+1,z:4,width:8+i%2,depth:9,roofY:8+i%2},
   {id:'south-wing',purpose:'Separate support and back of house work',
    x:4,z:d+1,width:8,depth:8,roofY:8}
  ],
  links:[
   {from:'primary',to:'east-wing',side:'east',doorOffset:3},
   {from:'primary',to:'south-wing',side:'south',doorOffset:3}
  ],
  approach:{massId:'primary',offset:4,width:5,depth:2},
  court:{massId:'primary',offsetX:6,offsetZ:5,
   width:4+i%2,depth:3,doorSide:'north'},
  glazing:[
   {massId:'primary',side:'west',offset:4,width:2},
   {massId:'east-wing',side:'east',offset:2,width:2},
   {massId:'south-wing',side:'south',offset:2,width:2}
  ]
 };
};
