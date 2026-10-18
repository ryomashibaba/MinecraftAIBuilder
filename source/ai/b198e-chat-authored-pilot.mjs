/**
 * B198E — source-original architecture authored by GPT-6 in this CHAT
 * in direct response to the actual frozen B198B Japanese design briefs.
 *
 * This is not a production natural-language model inference adapter.
 * The code expresses one-off design decisions with exact geometric
 * coordinates rather than keywords/templates or injected fake fixtures.
 * Independent adversarial geometry/criterion audits still required.
 *
 * Scope: c01 library, c03 port, c05 temple, c08 sky-transit; r01-04 edits.
 * The remaining eight B198B categories remain explicitly NOT_RUN.
 */
import {SCHEMA as DSL,validateDesign} from './b143-building-dsl.mjs';
export const PROVENANCE='GPT6_CHAT_AUTHORED_ON_2026_10_18_NOT_OPENAI_API';
const b=(id,x,y,z,w,h,d,material='concrete',shell=0)=>({
 id,shape:'box',mode:'add',origin:[x,y,z],size:[w,h,d],material,
 ...(shell?{shell}:{})});
const e=(id,x,y,z,rx,ry,rz,material='glass',shell=0)=>({
 id,shape:'ellipsoid',mode:'add',center:[x,y,z],radii:[rx,ry,rz],
 material,...(shell?{shell}:{})});
const t=(id,x,y,z,axis,radius,tube=1,material='glow')=>({
 id,shape:'torus',mode:'add',center:[x,y,z],axis,
 majorRadius:radius,tubeRadius:tube,material});
const g=(id,x1,y1,z1,x2,y2,z2,material='metal',thickness=1)=>({
 id,shape:'beam',mode:'add',start:[x1,y1,z1],end:[x2,y2,z2],
 thickness,material});
const cyl=(id,x,y,z,axis,radius,length,material='metal')=>({
 id,shape:'cylinder',mode:'add',origin:[x,y,z],axis,radius,length,material});
const cut=(id,x,y,z,w,h,d)=>({
 id,shape:'box',mode:'cut',origin:[x,y,z],size:[w,h,d]});
const design=(id,title,brief,bounds,elements)=>{
 const output={schema:DSL,id,title,brief,bounds,
  designOnly:true,elements};
 validateDesign(output);return output;
};
function library(){
 const x=[];
 x.push(b('lib-seaside-grand-podium',9,4,9,66,2,50,'stone'));
 x.push(b('lib-main-entry-plaza',27,6,5,30,1,11,'concrete'));
 for(const [label,start] of [['west',12],['east',54]]){
  x.push(b('lib-'+label+'wing-ground',start,8,20,18,1,35,'wood'));
  x.push(b('lib-'+label+'wing-mezzanine',start,19,20,18,1,35,'concrete'));
  x.push(b('lib-'+label+'wing-research',start,32,21,18,1,33,'wood'));
  x.push(b('lib-'+label+'shelf-ridge-1',start+2,9,25,2,8,21,'wood'));
  x.push(b('lib-'+label+'shelf-ridge-2',start+13,20,30,2,8,17,'wood'));
  x.push(b('lib-'+label+'light-front',start,9,17,18,31,2,'glass'));
  for(let i=0;i<3;i++)x.push(g('lib-'+label+'roof-fin-'+i,
   start+i*7,38,18,start+i*7,49,48,'metal',1));
 }
 x.push(b('lib-atrium-west-bridge',28,20,30,8,1,6,'accent'));
 x.push(b('lib-atrium-east-bridge',49,20,30,7,1,6,'accent'));
 x.push(b('lib-public-bridge-crossing',34,39,41,16,1,4,'concrete'));
 x.push(b('lib-atrium-ringwalk-north',28,31,19,29,1,5,'wood'));
 x.push(b('lib-atrium-ringwalk-south',28,31,49,29,1,5,'wood'));
 x.push(b('lib-atrium-left-rail',31,32,21,2,4,31,'glass'));
 x.push(b('lib-atrium-right-rail',51,32,21,2,4,31,'glass'));
 x.push(e('lib-curved-translucent-roof',42,49,35,28,10,26,'glass',1));
 for(let i=0;i<4;i++)x.push(g('lib-outboard-fan-column-'+i,
   17+i*14,9,13,22+i*12,53,14,'metal',2));
 x.push(b('lib-skyroom-observation-floor',34,57,27,17,1,17,'concrete'));
 x.push(e('lib-skyroom-original-glass-dome',42,65,35,8,6,8,'glass',1));
 x.push(t('lib-dome-horizon-ring',42,62,35,'y',11,1,'glow'));
 x.push(b('lib-seaward-wave-gallery',21,12,58,42,1,6,'accent'));
 x.push(g('lib-coastal-spine-east',65,11,15,70,37,55,'metal',1));
 x.push(g('lib-coastal-spine-west',19,11,15,14,37,55,'metal',1));
 return design('b198e-seaside-atrium-library',
  'C01 | 海辺の多層アトリウム図書館',
  '両翼の閲覧フロア・中央吹抜け・放射状ガラス屋根・上層星見ラウンジを備えた独創的な公共図書館。設計座標のみ。',
  {width:84,height:76,depth:70},x);
}
function port(){
 const x=[];
 x.push(b('port-marshalling-foundation',5,3,6,92,2,51,'stone'));
 x.push(b('port-heavy-load-quay',8,7,13,62,2,23,'concrete'));
 x.push(b('port-container-stacking-yard',9,7,39,52,2,16,'metal'));
 x.push(b('port-passenger-promenade',8,11,59,89,1,5,'wood'));
 x.push(b('port-passenger-terminal',17,12,47,26,1,11,'concrete'));
 x.push(e('port-passenger-hall-canopy',29,20,52,17,8,10,'glass',1));
 x.push(b('port-portside-waterline-pier',9,5,3,79,2,7,'wood'));
 x.push(b('port-crane-base-west',66,8,20,7,3,7,'metal'));
 x.push(b('port-crane-base-east',88,8,20,7,3,7,'metal'));
 for(const [name,cx] of [['west',70],['east',91]]){
  x.push(g('port-crane-pylon-'+name,cx,10,23,cx,57,23,'metal',2));
  x.push(g('port-crane-rear-brace-'+name,cx,15,23,cx-5,43,37,'metal',1));
 }
 x.push(g('port-crane-upper-crossbeam',65,58,23,97,58,23,'metal',2));
 x.push(g('port-crane-cantilever-toward-water',82,57,5,82,57,45,'metal',2));
 x.push(g('port-crane-hanging-hoist',82,55,12,82,30,12,'accent',1));
 x.push(b('port-hoist-hook',80,29,10,5,3,5,'glow'));
 x.push(g('port-control-tower-axis',84,10,50,84,47,50,'metal',2));
 x.push(b('port-control-upper-floor',77,45,43,15,2,15,'concrete'));
 x.push(e('port-control-glass-eye',84,51,50,9,6,9,'glass',1));
 x.push(t('port-navigation-ring',84,52,50,'y',11,1,'glow'));
 for(let i=0;i<5;i++){
  x.push(b('port-yard-module-'+i,12+i*10,9,41,7,5+(i%2)*2,10,
   i%2?'wood':'accent'));
 }
 x.push(g('port-passenger-terminal-spine',20,16,48,41,28,57,'metal',1));
 return design('b198e-gantry-cargo-port',
  'C03 | 海上物流・旅客分離型メガポート',
  '大型ガントリークレーンと吊り荷、管制球体、貨物ヤードと旅客遊歩道が明確に分かれた産業港。設計座標のみ。',
  {width:104,height:70,depth:65},x);
}
function temple(){
 const x=[];
 x.push(b('temple-mountain-terrace',5,3,6,78,2,59,'stone'));
 x.push(b('temple-sacred-sando-walk',39,5,6,12,1,39,'wood'));
 for(const [id,z] of [['first',12],['second',25],['third',37]]){
  x.push(g('temple-gate-left-'+id,33,6,z,33,17,z,'wood',2));
  x.push(g('temple-gate-right-'+id,57,6,z,57,17,z,'wood',2));
  x.push(g('temple-gate-roof-'+id,30,18,z,60,18,z,'accent',2));
 }
 x.push(b('temple-main-hondo-foundation',21,8,42,48,2,24,'stone'));
 for(const [label,px,pz] of [['fl',26,46],['fr',64,46],['bl',26,61],['br',64,61]]){
  x.push(b('temple-hondo-wood-column-'+label,px,10,pz,3,23,3,'wood'));
 }
 x.push(b('temple-hondo-great-hall-floor',25,11,46,40,1,18,'wood'));
 x.push(b('temple-hondo-traditional-roof-1',17,31,38,55,3,30,'wood'));
 x.push(b('temple-hondo-upper-pagoda-floor',25,36,44,40,2,22,'stone'));
 x.push(b('temple-hondo-traditional-roof-2',22,42,42,45,3,25,'wood'));
 x.push(b('temple-hondo-tower-shrine',32,47,48,26,9,15,'wood',1));
 x.push(b('temple-hondo-traditional-roof-3',28,56,45,33,2,21,'accent'));
 for(let i=0;i<5;i++){
  x.push(g('temple-three-tier-roof-ridge-'+i,18+i*12,33,39,20+i*11,40,41,'accent',1));
 }
 x.push(b('temple-suspended-garden-west',7,29,42,14,1,20,'wood'));
 x.push(b('temple-suspended-garden-east',68,29,43,13,1,18,'wood'));
 x.push(g('temple-garden-skybridge-west',13,29,53,24,32,53,'metal',1));
 x.push(g('temple-garden-skybridge-east',65,32,52,74,29,52,'metal',1));
 x.push(cyl('temple-light-tower-core',75,14,28,'y',3,35,'glass'));
 x.push(e('temple-light-tower-beacon',75,53,28,6,7,6,'glass',1));
 x.push(t('temple-one-original-beacon-ring',75,46,28,'y',8,1,'glow'));
 return design('b198e-sky-garden-temple',
  'C05 | 三重屋根の未来和風寺院',
  '荘厳な参道と三つの門、本堂の三段屋根、左右の浮遊庭園、脇役に徹する光の観測塔を持つ和風寺院。設計座標のみ。',
  {width:90,height:70,depth:70},x);
}
function station(){
 const x=[];
 x.push(b('station-elevated-understructure',9,3,6,82,3,49,'stone'));
 for(let i=0;i<3;i++){
  const z=10+i*16;
  x.push(b('station-platform-'+i,11,16,z,78,2,9,'concrete'));
  x.push(b('station-platform-safety-line-'+i,12,18,z+1,76,1,1,'accent'));
  x.push(b('station-platform-long-glass-shield-'+i,17,19,z+7,68,3,1,'glass'));
  x.push(g('station-platform-hanging-strut-'+i,19,19,z+3,25,44,z+3,'metal',1));
 }
 x.push(b('station-upper-concourse-left',11,39,8,24,2,46,'wood'));
 x.push(b('station-upper-concourse-right',65,39,8,24,2,46,'wood'));
 x.push(b('station-upper-concourse-overpass',35,39,26,30,2,8,'concrete'));
 x.push(b('station-upper-concourse-gateway',33,43,21,34,3,18,'glass',1));
 for(let i=0;i<6;i++){
  const px=15+i*14;
  x.push(g('station-megaspan-left-'+i,px,8,6,px+5,60,28,'metal',1));
  x.push(g('station-megaspan-right-'+i,px,8,55,px+5,60,34,'metal',1));
 }
 x.push(b('station-largest-canopy-ribbon',7,62,12,86,2,42,'metal'));
 x.push(e('station-vaulted-lightroof',50,63,30,43,8,22,'glass',1));
 x.push(g('station-skycanopy-central-spine',8,68,29,91,68,29,'glow',2));
 x.push(b('station-hall-wayfinding-halo',43,46,24,15,4,14,'accent',1));
 x.push(g('station-aerial-approach',15,32,5,85,35,5,'wood',1));
 return design('b198e-megacity-aerial-terminal',
  'C08 | 吊り屋根の立体乗換駅',
  '三層横並びホーム、上層コンコース、巨大斜材・鋼製吊り屋根とガラスヴォールトから成る未来空中駅。設計座標のみ。',
  {width:100,height:80,depth:60},x);
}
const CREATE=Object.freeze({
 c01:library,c03:port,c05:temple,c08:station
});
function revise(id,source){
 const d=structuredClone(source);
 if(id==='r01'){
  // Non-destructive enlargement candidate: translucent orbital lounge
  // outside the original dome instead of enveloping/obstructing its roof.
  // This is visually an expanded circular glass observatory but DOES NOT
  // claim a fully enclosed enlarged sphere or accessible outer ring.
  d.elements.push(t('lib-skyroom-larger-glass-outer-halo',42,64,35,'y',14,1,'glass'));
  d.elements.push(t('lib-skyroom-higher-view-ring',42,69,35,'y',14,1,'glow'));
 }else if(id==='r02'){
  // A new high sloping crown raises the crane's silhouette WITHOUT
  // modifying the original horizontal gantry deck or its headroom.
  d.elements.push(g('port-upper-crane-west-lean',72,62,23,77,68,23,'metal',1));
  d.elements.push(g('port-upper-crane-east-lean',88,62,23,84,68,23,'metal',1));
  d.elements.push(g('port-upper-crane-raked-cap',77,67,23,84,68,23,'accent',1));
  d.elements.push(g('port-crane-high-cantilever',79,67,7,85,68,43,'metal',1));
 }else if(id==='r03'){
  d.elements.push(t('temple-new-sky-radiance-ring',75,57,28,'y',9,1,'glow'));
 }else if(id==='r04'){
  // Bold NEW highest broad-span canopy. The old shell, original beams,
  // platforms and their existing clear source floor/headroom are kept.
  d.elements.push(b('station-high-canopy-extended-skydeck',3,75,5,94,2,50,'metal'));
 }else throw Error('B198E_REVISION_CASE_NOT_IN_PILOT');
 validateDesign(d);return d;
}
export function getB198EChatAuthoredPilot(){
 const created=Object.fromEntries(Object.entries(CREATE).map(([k,fn])=>[k,fn()]));
 const revised={r01:revise('r01',created.c01),
  r02:revise('r02',created.c03),
  r03:revise('r03',created.c05),
  r04:revise('r04',created.c08)};
 const protectedIds={
  r01:['lib-seaside-grand-podium','lib-westwing-ground','lib-eastwing-ground'],
  r02:['port-marshalling-foundation','port-heavy-load-quay','port-passenger-promenade'],
  r03:['temple-sacred-sando-walk','temple-hondo-traditional-roof-1','temple-hondo-traditional-roof-2'],
  r04:['station-platform-0','station-platform-1','station-platform-2','station-upper-concourse-overpass']
 };
 return {provenance:PROVENANCE,created,revised,protectedIds,
  attemptedCreationCases:Object.keys(created),
  attemptedRevisionCases:Object.keys(revised),
  unattemptedCreationCases:['c02','c04','c06','c07','c09','c10','c11','c12'],
  liveAPIResponsesObserved:0,paidAPITokensConsumed:0};
}
