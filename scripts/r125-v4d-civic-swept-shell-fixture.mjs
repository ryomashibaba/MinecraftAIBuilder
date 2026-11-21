/** AUTHOR-supplied synthetic civic shell study, NOT actual Qwen/Gemma. */
import {V4D_SHELL_SCHEMA} from '../source/ai/r125-v4d-civic-swept-shell.mjs';
export function makeV4DCivicSweptShellFixture(){
 return {
  schema:V4D_SHELL_SCHEMA,
  id:'civic-contrasting-swept-shells',
  title:'SYNTHETIC civic split-shell: two rising structural sails and public canyon',
  brief:'A long open public canyon between inhabitable diagonal roof wings',
  materials:{floor:'stone',wall:'concrete',roof:'metal',public:'accent'},
  site:{frontZ:18,bayLength:18,promenadeWidth:12,forecourtDepth:10,entryOffset:5},
  bays:[
   {id:'arrival',purpose:'West civic exhibition and open reception',
    centerX:54,westWidth:30,eastWidth:31,
    westEaveY:11,westRidgeY:21,eastRidgeY:25,eastEaveY:12},
   {id:'forum',purpose:'Shared city learning and performance',
    centerX:58,westWidth:34,eastWidth:28,
    westEaveY:14,westRidgeY:27,eastRidgeY:19,eastEaveY:10},
   {id:'garden',purpose:'East sheltered maker studios and workshop',
    centerX:55,westWidth:28,eastWidth:34,
    westEaveY:9,westRidgeY:19,eastRidgeY:27,eastEaveY:14}
  ],
  portals:[
   {bayId:'arrival',side:'west',offsetZ:6,spanZ:6},
   {bayId:'garden',side:'east',offsetZ:6,spanZ:6}
  ],
  glazing:[
   {bayId:'forum',side:'west',offsetZ:7,spanZ:8,sillY:11,height:5},
   {bayId:'garden',side:'east',offsetZ:9,spanZ:7,sillY:12,height:5}
  ]
 };
}
