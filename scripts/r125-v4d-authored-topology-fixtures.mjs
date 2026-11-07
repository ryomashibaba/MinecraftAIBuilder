/** THREE deliberately independent SYNTHETIC AUTHOR topology inputs. Not real Qwen. */
import {SCHEMA} from '../source/ai/r125-v4d-authored-topology.mjs';
const roof=(axis,type,eaveY,peakY,peakPercent=50)=>
 ({axis,type,eaveY,peakY,peakPercent});
const node=(id,purpose,kind,x,z,width,depth,r=null)=>
 ({id,purpose,kind,x,z,width,depth,roof:r});
const feature=(id,nodeId,purpose,material,offsetX=7,offsetZ=8)=>
 ({id,nodeId,purpose,offsetX,offsetZ,width:3,depth:2,height:2,material});
const window=(id,nodeId,side,offset=5,span=8)=>
 ({id,nodeId,side,offset,span,sillY:5,height:3});
const entry=(nodeId,offset)=>({
 nodeId,offset,plazaWidth:14,plazaDepth:10,canopyDepth:4
});
const materials={floor:'stone',wall:'concrete',roof:'metal',public:'accent'};

const serial={
 schema:SCHEMA,id:'civic-serial-route-probe',
 title:'SYNTHETIC serial forum and roofless public break',
 brief:'A linked series of education, fabrication and genuine sky lit public spaces',
 materials,
 nodes:[
  node('arrival','Information and welcoming reception room','covered',
   22,20,24,22,roof('x','shed',12,19)),
  node('court','Public open forum and daylight square','sky',45,20,23,22),
  node('research','Materials research and community teaching','covered',
   45,41,23,22,roof('z','ridge',11,18)),
  node('maker','Art and craft fabrication studio','covered',
   67,41,23,22,roof('z','shed',10,17))
 ],
 links:[
  {from:'arrival',to:'court',side:'east',offset:8},
  {from:'court',to:'research',side:'south',offset:8},
  {from:'research',to:'maker',side:'east',offset:8}
 ],
 entry:entry('arrival',7),
 windows:[
  window('arrival-window','arrival','west'),
  window('research-window','research','south'),
  window('maker-window','maker','east')
 ],
 fixtures:[
  feature('arrival-desk','arrival','Information reception desk','wood'),
  feature('research-table','research','Working laboratory bench','metal'),
  feature('maker-island','maker','Maker workshop island','stone'),
  feature('public-bench','court','Gathering bench','wood',6,8)
 ]
};

const star={
 schema:SCHEMA,id:'civic-star-concourse-probe',
 title:'SYNTHETIC three branch civic interchange and public garden',
 brief:'Three functionally distinct program branches from a central junction',
 materials:{...materials,roof:'wood',floor:'wood'},
 nodes:[
  node('concourse','Shared public information and interchange','covered',
   42,30,24,24,roof('x','ridge',12,19)),
  node('study','West reading and communal study hall','covered',
   19,31,24,22,roof('z','shed',11,18)),
  node('studio','East flexible design and workshop hall','covered',
   65,31,24,22,roof('z','ridge',12,18)),
  node('garden','Roofless public event garden and meeting space','sky',
   43,53,22,24)
 ],
 links:[
  {from:'concourse',to:'study',side:'west',offset:8},
  {from:'concourse',to:'studio',side:'east',offset:8},
  {from:'concourse',to:'garden',side:'south',offset:8}
 ],
 entry:entry('concourse',7),
 windows:[
  window('concourse-window','concourse','north',14,6),
  window('west-window','study','west'),
  window('east-window','studio','east')
 ],
 fixtures:[
  feature('concourse-kiosk','concourse','Public reception counter','wood',11,11),
  feature('study-desk','study','Shared reading desk','wood'),
  feature('design-table','studio','Collaborative design table','metal'),
  feature('garden-seat','garden','Outdoor gathering bench','wood')
 ]
};

const loop={
 schema:SCHEMA,id:'civic-loop-court-probe',
 title:'SYNTHETIC looped public exhibition and open courtyard',
 brief:'Four physical shared wall portals connect a traversable public loop',
 materials:{...materials,wall:'stone'},
 nodes:[
  node('lobby','Public arrival and visitor information','covered',
   24,24,22,22,roof('x','ridge',11,18)),
  node('gallery','Community art learning and exhibition gallery','covered',
   45,24,22,22,roof('z','shed',11,18)),
  node('court','Open event courtyard and public garden','sky',
   45,45,22,22),
  node('atelier','Participatory making and artistic workshops','covered',
   24,45,22,22,roof('z','ridge',10,17))
 ],
 links:[
  {from:'lobby',to:'gallery',side:'east',offset:7},
  {from:'gallery',to:'court',side:'south',offset:7},
  {from:'court',to:'atelier',side:'west',offset:7},
  {from:'atelier',to:'lobby',side:'north',offset:7}
 ],
 entry:entry('lobby',6),
 windows:[
  window('lobby-window','lobby','north',13,5),
  window('gallery-window','gallery','east'),
  window('atelier-window','atelier','west')
 ],
 fixtures:[
  feature('lobby-display','lobby','Public orientation desk','wood'),
  feature('gallery-plinth','gallery','Real exhibition plinth','stone'),
  feature('atelier-table','atelier','Collaborative project desk','wood'),
  feature('court-seat','court','Outdoor gathering furniture','wood')
 ]
};
export function makeV4DTopologyFixtures(){
 return [serial,star,loop].map(p=>structuredClone(p));
}
