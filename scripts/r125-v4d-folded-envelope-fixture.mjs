/** One synthetic AUTHOR IR. Not a new Qwen/Gemma completion. */
import {V4D_FOLDED_SCHEMA} from '../source/ai/r125-v4d-folded-envelope.mjs';
export function makeV4DFoldedEnvelopeFixture(){
 return {
  schema:V4D_FOLDED_SCHEMA,id:'sectioned-civic-roof-gallery',
  title:'SYNTHETIC: urban forum with sculpted continuous folded canopy',
  brief:'Three civic wings with continuous folded roof plates and a connected open public passage',
  materials:{floor:'stone',wall:'concrete',roof:'metal',public:'accent'},
  site:{frontZ:19,sectionLength:20,approachDepth:10,entryOffset:7},
  sections:[
   {id:'arrival',purpose:'Exhibition foyer and shared library reception',
    centerX:48,courtWidth:16,westSpan:28,eastSpan:27,
    westRoof:{eaveY:10,kneeY:15,crestY:22,kneePercent:45},
    eastRoof:{eaveY:12,kneeY:20,crestY:25,kneePercent:55}},
   {id:'forum',purpose:'Performances and civic learning commons',
    centerX:52,courtWidth:18,westSpan:34,eastSpan:28,
    westRoof:{eaveY:13,kneeY:21,crestY:27,kneePercent:48},
    eastRoof:{eaveY:10,kneeY:17,crestY:21,kneePercent:55}},
   {id:'workshops',purpose:'Public production and technology laboratories',
    centerX:49,courtWidth:16,westSpan:27,eastSpan:34,
    westRoof:{eaveY:9,kneeY:14,crestY:19,kneePercent:53},
    eastRoof:{eaveY:14,kneeY:23,crestY:28,kneePercent:48}}
  ],
  doors:[
   {sectionId:'arrival',side:'west',offsetZ:7,width:5},
   {sectionId:'workshops',side:'east',offsetZ:7,width:5}
  ]
 };
}
