/**
 * R190-AT: contrasting architectural theses, all masses authored manually.
 * No ellipse/cylinder/pod. Both share functional constraints and walkable
 * central canyon, while their envelope shapes are materially different.
 */
import {R190AQ_SCHEMA} from '../source/ai/r190aq-architectural-parti.mjs';
import {R190AT_SCHEMA} from '../source/ai/r190at-functional-zones.mjs';
const box=(id,material,origin,size)=>({id,shape:'box',mode:'add',material,origin,size});
const beam=(id,material,start,end,thickness)=>({id,shape:'beam',mode:'add',material,start,end,thickness});
const cut=(id,origin,size)=>({id,shape:'box',mode:'cut',origin,size});
const zones=[
 {id:'entrance-gathering-hall',kind:'sheltered',anchorId:'arrival',origin:[8,27],size:[12,9],headroom:7},
 {id:'open-air-civic-forum',kind:'open-sky',anchorId:'civic-court',origin:[34,27],size:[8,10],headroom:7},
 {id:'covered-exhibition-workshop',kind:'sheltered',anchorId:'exhibition',origin:[54,27],size:[14,9],headroom:7}
];
const anchors=[
 {id:'arrival',purpose:'Arrival hall with real overhead weather shelter and long free public route',x:9,z:30},
 {id:'civic-court',purpose:'Fully exposed civic forum at the centre of the traversable sky fissure',x:37,z:30},
 {id:'exhibition',purpose:'Sheltered flexible gallery and workshop with actual source roof',x:62,z:30}
];
const site={width:76,height:32,depth:64};
const voids=[
 {role:'open-sky',intent:'Open to full sky from floor level in the middle, not artificial glass enclosure',
  geometry:cut('author-civic-sky-void',[32,2,25],[12,30,14])},
 {role:'passage',intent:'Clear true human walking path through west wing, civic canyon and east wing',
  geometry:cut('author-continuous-promenade',[7,2,29],[62,8,6])}
];
const shared=[
 // Author-provided joined civic section, truthfully CSG-cut by the full sky void.
 // The unapproved original had a void cutting zero occupied cells (AQ contract FAIL).
 box('civic-primary-composite-mass','concrete',[29,12,24],[18,4,16]),
 box('source-pedestrian-and-forum-ground','stone',[6,0,23],[64,2,18]),
 box('court-west-cliff-pier','concrete',[29,2,24],[3,23,16]),
 box('court-east-cliff-pier','concrete',[44,2,24],[3,25,16]),
 box('court-north-open-frame','stone',[30,18,39],[17,3,2]),
 box('court-south-open-frame','stone',[30,17,23],[17,3,2])
];
const mk=(id,title,brief,thesis,sequence,rationale,extra)=>({
 schema:R190AT_SCHEMA,
 parti:{schema:R190AQ_SCHEMA,id,title,brief,site,
  concept:{thesis,experientialSequence:sequence,whyThisVoid:rationale},
  masses:[...shared,...extra],
  voids,programAnchors:anchors},
 functionalZones:zones
});
export const R190AT_AUTHOR_CASES=[
 mk('r190at-strata-canyon',
  'Stratified canyon of inhabitable stepped cliffs',
  'Two asymmetric stepped covered civic wings frame the deliberate public canyon in one walkable source level.',
  'Two unequal inhabited terraces step upward from an open civic canyon, the cliff buttresses and weather roofs belonging to the initial mass rather than added decorative ribs.',
  'Enter the sheltered long-span west hall, cross the wide open-sky forum, emerge into the higher stepped east exhibition hall.',
  'An actual large roofless civic fissure interrupts the heavy terraces, providing direct public daylight and a spatial focus.',
  [
   box('west-public-roof','concrete',[8,14,24],[23,3,15]),
   box('west-north-bearing-cliff','stone',[8,2,23],[23,16,3]),
   box('west-south-bearing-cliff','stone',[8,2,38],[23,16,3]),
   box('west-raised-stratum','concrete',[12,17,21],[17,3,9]),
   box('west-upper-terrace','stone',[17,20,20],[12,3,8]),
   box('east-workshop-higher-roof','concrete',[47,17,24],[22,3,15]),
   box('east-north-bearing-cliff','stone',[47,2,23],[22,19,3]),
   box('east-south-bearing-cliff','stone',[47,2,38],[22,19,3]),
   box('east-terraced-crest','concrete',[49,20,21],[17,3,9]),
   box('east-crest-rise','stone',[51,23,20],[13,3,8]),
   beam('descending-west-fore-edge','metal',[9,16,22],[29,20,22],2),
   beam('east-splayed-attic-line','metal',[48,23,22],[66,26,23],2)
  ]),
 mk('r190at-interlocked-fins',
  'Folded civic galleries with interlocking inclined planes',
  'Two gallery wings form dissimilar folded planes and crisscross structural screens around a fully open public canyon.',
  'Long planar canopies and asymmetrically folded supporting screens form the roofs and ground connection together, unlike enclosed ellipsoid pods.',
  'Move beneath a low folded west arcade, cross a large lit court, and enter the taller ridged exhibition hall by one clear axis.',
  'Two angled roof fields and adjacent vertical fins turn the open sky canyon into the most legible organizing void.',
  [
   box('west-folded-public-roof','metal',[8,14,24],[23,3,15]),
   box('west-north-long-screen','concrete',[8,2,23],[23,15,3]),
   box('west-south-long-screen','concrete',[8,2,38],[23,15,3]),
   box('east-folded-public-roof','metal',[47,18,24],[22,3,15]),
   box('east-north-long-screen','concrete',[47,2,23],[22,19,3]),
   box('east-south-long-screen','concrete',[47,2,38],[22,19,3]),
   beam('west-high-diagonal-plane','metal',[9,16,21],[29,24,21],3),
   beam('west-opposing-swept-edge','metal',[12,17,41],[30,23,41],3),
   beam('east-rising-tapered-plane','metal',[47,20,21],[67,29,21],3),
   beam('east-returned-folded-spine','metal',[47,21,41],[66,24,41],3),
   box('west-planar-overlap','stone',[17,19,21],[12,3,7]),
   box('east-planar-overlap','stone',[53,23,21],[13,3,7]),
   beam('court-north-directed-fin','stone',[30,19,39],[44,25,39],2)
  ])
];
