/** Explicit SYNTHETIC caller-authored architecture; NOT a Qwen response. */
import {SCHEMA as B143} from '../source/ai/b143-building-dsl.mjs';
import {E2_SCHEMA} from '../source/ai/r190-e2-architecture.mjs';

export function e2SyntheticResearchFacility(){
 return {
  schema:E2_SCHEMA,
  sourceDesign:{
   schema:B143,id:'research-prototype-e2',title:'Laboratory with authored roof cylinder',
   brief:'Explicit source-only independent research layout, not an actual AI proposal.',
   designOnly:true,bounds:{width:36,height:16,depth:36},
   elements:[
    {id:'main-envelope',shape:'box',mode:'add',material:'stone',
     origin:[8,1,8],size:[18,9,18],shell:1},
    {id:'entrance-path',shape:'box',mode:'add',material:'stone',
     origin:[15,1,0],size:[2,1,9]},
    {id:'partition',shape:'box',mode:'add',material:'wood',
     origin:[17,2,9],size:[1,6,15]},
    {id:'entrance-door-cut',shape:'box',mode:'cut',
     origin:[15,2,8],size:[2,3,1]},
    {id:'internal-door-cut',shape:'box',mode:'cut',
     origin:[17,2,14],size:[1,3,3]},
    {id:'window-cut',shape:'box',mode:'cut',
     origin:[11,4,8],size:[2,2,1]},
    {id:'window-glass',shape:'box',mode:'add',material:'glass',
     origin:[11,4,8],size:[2,2,1]},
    {id:'model-authored-curved-roof',shape:'cylinder',mode:'add',
     material:'wood',origin:[20,10,16],axis:'y',radius:3,length:2}
   ]
  },
  programSpaces:[
   {id:'welcome-lobby',purpose:'来客受付と案内',zone:[10,9,7,14],witness:[12,13]},
   {id:'science-lab',purpose:'研究と試験作業',zone:[18,9,6,14],witness:[20,14]}
  ],
  entrance:{spaceId:'welcome-lobby',face:'south',
   approachPad:[15,0],arrivalPad:[14,10]},
  glazedOpenings:[{spaceId:'welcome-lobby',face:'south',
   origin:[11,4,8],width:2,height:2}]
 };
}
