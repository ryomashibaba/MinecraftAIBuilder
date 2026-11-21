/** AUTHOR-supplied single SOURCE test. This is NOT any Qwen/Gemma response. */
import {V4D_SCHEMA} from '../source/ai/r125-sculpted-spine-v4d.mjs';

export function makeV4DSyntheticCivicStudy(){
 return {
  schema:V4D_SCHEMA,id:'study-civic-lantern-spine',
  title:'SYNTHETIC stepped public gallery with street loggia',
  brief:'A stepped civic hall, lateral public loggia and deep covered entrance',
  materials:{floor:'stone',wall:'concrete',roof:'metal',public:'accent'},
  bands:[
   {id:'arrival-hall',purpose:'Continuous sheltered public reception',
    x:22,z:24,width:28,depth:16,roofY:10},
   {id:'high-forum',purpose:'Double height public forum and shared learning floor',
    x:14,z:39,width:36,depth:20,roofY:18},
   {id:'atelier-wing',purpose:'Adaptable workshop and community studio',
    x:28,z:58,width:31,depth:18,roofY:12}
  ],
  portals:[
   {from:'arrival-hall',to:'high-forum',offset:10},
   {from:'high-forum',to:'atelier-wing',offset:8}
  ],
  entry:{bandId:'arrival-hall',offset:10},
  forecourt:{x:18,width:28,depth:10,
   purpose:'Accessible civic gathering and public arrival square'},
  canopy:{x:24,z:17,width:20,depth:8,roofY:7},
  loggia:{bandId:'high-forum',side:'west',apronWidth:5,
   purpose:'Open side gallery and sheltered connection to civic exterior',
   bays:[{offsetZ:2,width:4},{offsetZ:8,width:4},{offsetZ:14,width:4}]},
  glazing:{bandId:'high-forum',side:'east',
   offsetZ:4,length:10,sillY:9,height:5}
 };
}
