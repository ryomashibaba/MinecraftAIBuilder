/** A synthetic small-model author example, not a real Qwen/Gemma output. */
import {COMPACT_SCHEMA} from '../source/ai/r125-v4d-compact-model-ir.mjs';
export function makeV4DCompactSynthetic(){
 return {
  schema:COMPACT_SCHEMA,
  id:'author-compact-civic-probe',
  title:'SYNTHETIC community learning courtyard',
  brief:'A public arrival, a useful workshop and an outdoor civic garden with coherent connections',
  materials:{floor:'wood',wall:'concrete',roof:'metal',public:'accent'},
  spaces:[
   {id:'welcome',purpose:'Reception lobby and visitor information',
    kind:'covered',width:24,depth:24,roof:'ridgeX',height:'medium',
    facade:'glass',windowSide:'east',
    feature:'Entry reception and event notices',featureMaterial:'wood',
    attach:null},
   {id:'learning',purpose:'Open workshop and shared reading',
    kind:'covered',width:22,depth:22,roof:'shedZ',height:'low',
    facade:'wall',windowSide:'west',
    feature:'Shared work surface and library desk',featureMaterial:'metal',
    attach:{to:'welcome',side:'west',shift:0}},
   {id:'garden',purpose:'Public gathering and daylight garden',
    kind:'sky',width:22,depth:22,roof:null,height:null,facade:null,
    windowSide:null,
    feature:'Seating for outdoor group events',featureMaterial:'wood',
    attach:{to:'welcome',side:'south',shift:0}}
  ]
 };
}
