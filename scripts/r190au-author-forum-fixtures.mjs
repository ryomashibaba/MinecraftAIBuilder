/**
 * R190-AU: authored subtraction of the two walkable exterior bypasses.
 * Author adds a ground-level bypass and a real return door in a comparison
 * reference, then explicitly closes both north and south crossings in AU.
 * All author-defined negative volumes are source-only; no Minecraft contact.
 * The entire 12 x 14 sky court remains solid floor and open above.
 */
import {R190AU_SCHEMA} from '../source/ai/r190au-mandatory-forum.mjs';
import {R190AT_AUTHOR_CASES} from './r190at-functional-fixtures.mjs';
const cut=(id,origin,size)=>({role:'spatial-relief',
 intent:'Explicit ground-negative edge trench blocks an unintended covered detour, so the exposed central forum is the necessary public crossing.',
 geometry:{id,shape:'box',mode:'cut',origin,size}});
export const R190AU_AUTHOR_CASES=R190AT_AUTHOR_CASES.map((old,index)=>{
 const design=structuredClone(old);
 design.parti.id='r190au-mandatory-civic-'+(index===0?'strata':'folds');
 design.parti.title=(index===0?'Civic strata crossing':'Folded civic crossing')+' with deliberate forum threshold';
 design.parti.brief='Source-authored public crossing forces the protected hall to exposed open-air civic forum to gallery sequence, with no walkable ground bypass.';
 design.parti.concept={
  thesis:'Public movement deliberately crosses the full open-air civic void: the open sky and two inhabitable wings are necessary to the architectural experience.',
  experientialSequence:'Enter a physically sheltered hall; leave its roof through a forced exposed civic crossing; reach a differently sheltered exhibition wing.',
  whyThisVoid:'The exposed civic court is a necessary spatial hinge on every supported two-width walking route, not a bypassable ornamental slot.'
 };
 const sky=design.parti.voids.find(v=>v.role==='open-sky').geometry;
 design.functionalZones.find(z=>z.kind==='open-sky').origin=[sky.origin[0],sky.origin[2]];
 design.functionalZones.find(z=>z.kind==='open-sky').size=[sky.size[0],sky.size[2]];
 // Both original walking bypasses are beside the y>=2 sky cut, at z23/24 and z39/40.
 // Only these authored ground strips are removed; roof/canyon supports remain intact.
 // SOURCE-only, deliberately authorized counterfactual: a public northern
 // perimeter bypass connected to a real door into the destination wing.
 // The reference case retains it; the revised case removes its crossing floor.
 design.parti.masses.push({
  id:'author-exterior-bypass-ground',shape:'box',mode:'add',
  material:'stone',origin:[6,0,17],size:[64,2,8]
 });
 design.parti.voids.push({
  role:'passage',
  intent:'Explicit exterior-to-east-gallery access opening, creating a genuine route around the sky forum in the comparison reference.',
  geometry:{id:'author-east-return-door',shape:'box',mode:'cut',
   origin:[60,2,23],size:[6,8,5]}
 });
 design.parti.voids.push(
  cut('south-forum-ground-threshold',[32,0,17],[12,2,8]),
  cut('north-forum-ground-threshold',[32,0,39],[12,2,2])
 );
 return {schema:R190AU_SCHEMA,design,
  sequence:{arrival:'arrival',forum:'civic-court',destination:'exhibition'}};
});
