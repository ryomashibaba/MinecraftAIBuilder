/**
 * B198A test-only authored fixture designs.
 * These are NOT an NLP model, inference, keyword parser or prebuilt design
 * returned in production. They serve only as adversarial local QA samples.
 */
import {SCHEMA} from '../source/ai/b143-building-dsl.mjs';
const box=(id,origin,size,material)=>({id,shape:'box',mode:'add',origin,size,material});
const ell=(id,center,radii,material)=>({id,shape:'ellipsoid',mode:'add',center,radii,shell:1,material});
const tor=(id,center,majorRadius,material)=>({id,shape:'torus',mode:'add',center,majorRadius,tubeRadius:1,axis:'z',material});
export const fixtureAmphitheater=()=>({
 schema:SCHEMA,id:'crescent-amphitheater',
 title:'Crescent Amphitheater — Floating Music Forum',
 brief:'Three stepped viewing terraces and a hollow luminous music stage. Test-only source fixture.',
 bounds:{width:60,height:48,depth:46},designOnly:true,
 elements:[
  box('main-limestone-court',[4,3,4],[51,1,38],'stone'),
  box('lower-audience-deck',[7,7,8],[45,1,29],'wood'),
  box('middle-audience-deck',[10,12,10],[39,1,24],'concrete'),
  box('upper-audience-deck',[13,18,12],[33,1,20],'wood'),
  ell('crescent-sound-dome',[30,28,17],[14,11,11],'glass'),
  tor('stage-light-halo',[30,28,10],10,'glow'),
  box('staging-glow',[19,4,7],[23,1,4],'accent'),
  box('floating-upper-catwalk',[18,24,30],[24,1,5],'metal')
 ]});
export const fixtureLighthouse=()=>({
 schema:SCHEMA,id:'glass-observatory-tower',
 title:'Glass Observatory — Planetarium Beacon',
 brief:'A tall observatory with a transparent viewing sphere and orbital halo. Test-only source fixture.',
 bounds:{width:50,height:82,depth:50},designOnly:true,
 elements:[
  box('ground-granite-base',[11,3,11],[28,2,28],'stone'),
  box('tower-vertical-spine',[22,5,22],[6,58,6],'metal'),
  box('lower-science-terrace',[15,18,15],[20,1,20],'concrete'),
  box('upper-science-terrace',[11,43,11],[28,1,28],'wood'),
  box('top-viewer-gallery',[12,61,12],[26,1,26],'accent'),
  ell('planetarium-transparent-crown',[25,68,25],[12,11,12],'glass'),
  tor('outer-sky-orbital-ring',[25,62,25],15,'glow'),
  box('east-viewport-strip',[33,28,19],[2,22,13],'glass')
 ]});
export const candidate=d=>({
 design:d,explanation:'Independent architect-created geometry candidate for source review.',
 assumptions:['Source-only conceptual architecture','Human review required']
});
