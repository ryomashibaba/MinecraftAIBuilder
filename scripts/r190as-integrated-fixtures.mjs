/** R190-AS: two human-authored original study compositions, NEVER LLM output. */
import {R190AQ_SCHEMA} from '../source/ai/r190aq-architectural-parti.mjs';
import {R190AS_SCHEMA} from '../source/ai/r190as-integrated-architecture.mjs';
const addBox=(id,material,origin,size)=>({id,shape:'box',mode:'add',material,origin,size});
const beam=(id,material,start,end,thickness)=>({id,shape:'beam',mode:'add',material,start,end,thickness});
const shell=(id,material,center,radii,thickness)=>({
 id,shape:'ellipsoid',mode:'add',material,center,radii,shell:thickness});
const cut=(id,origin,size)=>({id,shape:'box',mode:'cut',origin,size});
const site={width:76,height:32,depth:64};
const anchors=[
 {id:'arrival',purpose:'Public entrance and walkable low promenade',x:8,z:30},
 {id:'daylight-court',purpose:'Sky-exposed civic court and public axis',x:37,z:30},
 {id:'gallery',purpose:'Destination for gathering and exhibitions',x:64,z:30}
];
const voids=[
 {role:'open-sky',intent:'A substantial civic fissure remains sky-open over the supported pedestrian ground',
  geometry:cut('civic-sky-cleft',[32,2,25],[12,30,14])},
 {role:'passage',intent:'A long unobstructed public pathway is cut explicitly through every designed form',
  geometry:cut('public-axial-walkway',[7,2,29],[62,8,6])}
];
const mk=(id,title,brief,concept,masses,supportPairs,thesis)=>({
 schema:R190AS_SCHEMA,
 parti:{schema:R190AQ_SCHEMA,id,title,brief,site,concept,
  masses,voids,programAnchors:anchors},
 structureIntent:{designThesis:thesis,supportPairs,
  arrivalAnchorId:'arrival',civicAnchorId:'daylight-court',
  destinationAnchorId:'gallery'}
});
export const R190AS_CO_DESIGNED_CASES=[
 mk('r190as-folded-dual-vault',
 'Civic sky cleft framed by two grounded unequal vaults',
 'A pair of asymmetric raised shells and integrated primary grounded folds surround a real public canyon.',
 {thesis:'Two differently rising shells are inseparable from their diagonal ribs and occupy different civic horizon levels.',
  experientialSequence:'A low public promenade bends between two grounded folding canopy masses and enters the sky-open civic cleft.',
  whyThisVoid:'The public exposed sky separates opposing primary folded volumes and organizes their support footprints.'},
 [
  addBox('axial-path-base','stone',[6,0,27],[64,2,10]),
  // The authored sky cleft is 12x14: the original narrow spine did not support its full floor.
  addBox('entire-civic-sky-ground','stone',[32,0,25],[12,2,14]),
  addBox('west-north-footing','stone',[8,0,17],[11,2,10]),
  addBox('west-south-footing','stone',[8,0,37],[11,2,10]),
  addBox('east-north-footing','stone',[55,0,17],[12,2,10]),
  addBox('east-south-footing','stone',[55,0,37],[12,2,10]),
  shell('west-low-bonded-shell','concrete',[22,16,30],[17,14,13],3),
  shell('east-cantilever-shell','concrete',[55,19,32],[16,12,14],3),
  beam('west-north-principal-fold','stone',[14,3,22],[20,22,21],3),
  beam('west-south-principal-fold','stone',[14,3,42],[22,20,41],3),
  beam('east-north-principal-fold','stone',[61,3,22],[55,25,21],3),
  beam('east-south-principal-fold','stone',[62,3,43],[58,23,43],3),
  beam('north-connecting-spine','metal',[20,22,21],[56,25,21],2),
  beam('south-connecting-spine','metal',[22,20,42],[58,23,43],2)
 ],
 [
  {supportId:'west-north-principal-fold',envelopeId:'west-low-bonded-shell'},
  {supportId:'west-south-principal-fold',envelopeId:'west-low-bonded-shell'},
  {supportId:'east-north-principal-fold',envelopeId:'east-cantilever-shell'},
  {supportId:'east-south-principal-fold',envelopeId:'east-cantilever-shell'}
 ],
 'Two main shells start with four diagonal primary folds, each physically spanning from its own ground footing to its envelope. The open-air cleft is primary, not a post-design decoration.'),
 mk('r190as-offset-hollow-arcade',
 'Two offset anchored civic vaults and a strong asymmetric open court',
 'An asymmetric northern and southern gallery pair spans a publicly accessible canyon with co-designed inclined ribs.',
 {thesis:'An offset pair of differently high curved halls gains mass hierarchy from their original canted foundations.',
  experientialSequence:'Two broad galleries flank an unobstructed axial path, extending attention toward an open-air urban fissure.',
  whyThisVoid:'The deliberate sky opening organizes the northern and southern massing and reveals the inclined structural folds.'},
 [
  addBox('continuous-pedestrian-spine','stone',[6,0,27],[64,2,10]),
  addBox('entire-civic-sky-ground','stone',[32,0,25],[12,2,14]),
  addBox('north-foothold-low','stone',[8,0,16],[24,2,11]),
  addBox('north-foothold-high','stone',[38,0,16],[18,2,11]),
  addBox('south-foothold-low','stone',[18,0,37],[19,2,11]),
  addBox('south-foothold-high','stone',[48,0,37],[22,2,11]),
  shell('swept-northern-hall','concrete',[25,16,23],[20,14,10],3),
  shell('rising-southern-hall','concrete',[51,20,43],[17,11,9],3),
  beam('north-low-fold-1','stone',[13,3,20],[26,23,18],3),
  beam('north-low-fold-2','stone',[45,3,20],[37,25,19],3),
  beam('south-rising-fold-1','stone',[59,3,44],[52,25,43],3),
  beam('south-rising-fold-2','stone',[25,3,43],[37,23,44],3),
  beam('north-ridge-spine','metal',[26,23,18],[52,26,19],2),
  beam('south-ridge-spine','metal',[25,23,45],[52,25,43],2),
  beam('west-edge-fin','metal',[12,2,22],[20,26,25],2),
  beam('east-edge-fin','metal',[63,2,41],[59,29,39],2)
 ],
 [
  {supportId:'north-low-fold-1',envelopeId:'swept-northern-hall'},
  {supportId:'north-low-fold-2',envelopeId:'swept-northern-hall'},
  {supportId:'south-rising-fold-1',envelopeId:'rising-southern-hall'},
  {supportId:'south-rising-fold-2',envelopeId:'rising-southern-hall'}
 ],
 'The two separated galleries are each planted by two canted structural folds from the beginning, without synthetic post-approval supports or auto-generated repairs.')
];
