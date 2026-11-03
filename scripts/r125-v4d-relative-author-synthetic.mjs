/**
 * Single SYNTHETIC compact author fixture for bridge/network tests only.
 * It is NOT a successful AI-generated building or approved architectural ART.
 */
import {RELATIVE_SCHEMA} from '../source/ai/r125-v4d-relative-author-ir.mjs';
const rf=(axis,type,eaveY,peakY,peakPercent=50)=>
 ({axis,type,eaveY,peakY,peakPercent});
const fn=(id,purpose,material,offsetX=7,offsetZ=8)=>({
 id,purpose,material,offsetX,offsetZ,width:3,depth:2,height:2
});
const win=(side,offset=5,span=8)=>({side,offset,span,sillY:5,height:3});
const space=(id,purpose,kind,width,depth,roof,facade,shelter,windows,fixture,attach)=>
 ({id,purpose,kind,width,depth,roof,facade,shelter,windows,fixture,
  ...(attach?{attach}: {})});
export function makeV4DRelativeAuthorSynthetic(){
 return {
  schema:RELATIVE_SCHEMA,id:'synthetic-civic-branch-bridge',
  title:'SYNTHETIC source-only relative author model response',
  brief:'A shared interior hub with study and workshop rooms linked to a real open garden',
  materials:{floor:'wood',wall:'concrete',roof:'metal',public:'accent'},
  spaces:[
   space('concourse','Public reception and shared civic interchange',
    'covered',24,24,rf('x','ridge',12,19), 'glass',null,
    [win('north',14,6)],fn('civic-counter','Information and reception counter','wood',11,11)),
   space('reading','Community reading and learning room',
    'covered',24,22,rf('z','shed',11,18),'wall',null,
    [win('west')],fn('reading-table','Public shared reading table','wood'),
    {to:'concourse',side:'west',shift:0,doorOffset:8}),
   space('makers','Collaborative public workshop hall',
    'covered',24,22,rf('z','ridge',12,18),'glass',null,
    [win('east')],fn('work-bench','Workshop service bench','metal'),
    {to:'concourse',side:'east',shift:0,doorOffset:8}),
   space('garden','Public open-air garden and event assembly',
    'sky',22,24,null,null,
    {edge:'north',depth:4,roofY:8,material:'metal'},[],
    fn('outdoor-bench','Public shaded gathering bench','wood'),
    {to:'concourse',side:'south',shift:0,doorOffset:8})
  ],
  entry:{offset:7,plazaWidth:14,plazaDepth:10,canopyDepth:4},
  extraLinks:[]
 };
}
