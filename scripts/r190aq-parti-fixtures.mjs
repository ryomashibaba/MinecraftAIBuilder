/** Manually written, synthetic architectural PARTI; never a Qwen/Gemma answer.
 * Two deliberately different abstract concepts, no typology dispatch.
 */
import {R190AQ_SCHEMA} from '../source/ai/r190aq-architectural-parti.mjs';
const box=(id,material,origin,size)=>({id,shape:'box',mode:'add',material,origin,size});
const shell=(id,material,center,radii,width=2)=>({
 id,shape:'ellipsoid',mode:'add',material,center,radii,shell:width});
const beam=(id,material,start,end,thickness=2)=>({
 id,shape:'beam',mode:'add',material,start,end,thickness});
const cut=(id,origin,size)=>({id,shape:'box',mode:'cut',origin,size});
const anchors=[
 {id:'arrival',purpose:'Arrival promenade beneath a continuous curved canopy',x:8,z:30},
 {id:'civic-void',purpose:'Open sky civic gathering point at the center',x:37,z:30},
 {id:'gallery',purpose:'Long axial route toward public exhibition halls',x:64,z:30}
];
const base={
 schema:R190AQ_SCHEMA,site:{width:76,height:32,depth:64},
 programAnchors:anchors
};
export const R190AQ_AUTHOR_CASES=[
 {...base,id:'r190aq-twin-vault',
  title:'Dual tilted vaults enclosing a narrow sky fissure',
  brief:'Two unequal arched bodies frame a real roofless public canyon with a walkable shared axis.',
  concept:{
   thesis:'Unequal monumental curving masses make a legible civic gap rather than a featureless solid box.',
   experientialSequence:'Enter beneath low curving mass, cross a tall daylight cut, continue to a taller opposing volume.',
   whyThisVoid:'The central open sky cleft is the primary public monument, not a decoration or tiny window.'
  },
  masses:[
   box('continuous-supported-ground','stone',[6,0,17],[64,2,30]),
   shell('west-elliptical-vault','concrete',[23,15,32],[17,13,13],3),
   shell('east-higher-vault','concrete',[52,17,32],[15,12,13],3),
   beam('north-arching-edge','metal',[16,22,19],[60,26,19],2),
   beam('south-arching-edge','metal',[12,23,46],[62,23,46],2),
   box('overhead-shared-bridge','metal',[23,18,27],[28,2,10])
  ],
  voids:[
   {role:'open-sky',intent:'An explicit twelve-column chasm all the way to open sky.',
    geometry:cut('authored-central-open-air-canyon',[32,2,26],[12,30,12])},
   {role:'passage',intent:'A real unobstructed broad human public movement corridor, not an automatically inferred path.',
    geometry:cut('authored-long-public-axis',[7,2,29],[62,8,6])}
  ]},
 {...base,id:'r190aq-diagonal-shell',
  title:'One curved canopy and an offset hollow cantilever',
  brief:'A giant unequal curved enclosure connects to an elevated angular span across a broad roofless canyon.',
  concept:{
   thesis:'One asymmetric orbital shell meets an overhanging beam field, creating a distinct massing hierarchy.',
   experientialSequence:'Arrive beneath the lower shell, pass the open void, continue toward the raised hollow barrel.',
   whyThisVoid:'A real sky-exposed cut reorganizes the volumes and the public axis, not a fake court label.'
  },
  masses:[
   box('continuous-supported-ground','stone',[6,0,17],[64,2,30]),
   shell('single-orbital-hall','concrete',[25,18,30],[19,13,15],2),
   {id:'east-hollow-barrel',shape:'cylinder',mode:'add',material:'metal',
    origin:[43,17,32],axis:'x',radius:12,length:25,shell:2},
   beam('rising-north-buttress','metal',[12,14,18],[59,27,19],2),
   beam('asym-south-spine','metal',[14,15,47],[67,23,43],2),
   box('sky-crossing-bridge','concrete',[21,20,24],[35,2,17]),
   box('west-low-support','stone',[9,2,17],[3,15,4])
  ],
  voids:[
   {role:'open-sky',intent:'A deliberately asymmetric true opening to the upper site boundary.',
    geometry:cut('author-open-sky-forum',[32,2,25],[12,30,14])},
   {role:'passage',intent:'Original authored passage has through-clearance along the full walkable low-level axis.',
    geometry:cut('author-low-axial-passage',[7,2,29],[62,8,6])}
  ]}
];
