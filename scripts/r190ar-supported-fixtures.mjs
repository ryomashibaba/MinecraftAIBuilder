/** R190-AR: human-authored mass revision, NOT an LLM completion.
 * Six deliberately placed diagonal load-path proxies connect existing volumes.
 * Voxel contact is verified later and does not prove engineering safety.
 */
import {R190AQ_AUTHOR_CASES} from './r190aq-parti-fixtures.mjs';
const brace=(id,start,end)=>({
 id,shape:'beam',mode:'add',material:'stone',start,end,thickness:2});
const braces=[
 brace('west-bound-ground-rib',[18,2,20],[24,16,24]),
 brace('east-bound-ground-rib',[56,2,44],[52,17,40]),
 brace('south-beam-support-a',[16,2,43],[17,22,46]),
 brace('south-beam-support-b',[59,2,43],[59,22,46]),
 brace('west-bridge-to-ground',[26,2,38],[26,19,36]),
 brace('east-bridge-to-ground',[48,2,38],[48,19,36])
];
export const R190AR_ORIGINAL_TWIN=structuredClone(R190AQ_AUTHOR_CASES[0]);
export const R190AR_AUTHOR_SUPPORTED_TWIN=(()=>{
 const p=structuredClone(R190AR_ORIGINAL_TWIN);
 p.id='r190ar-supported-dual-vault';
 p.title='Dual vault with grounded diagonal structure';
 p.brief='Unequal curved architectural bodies linked to the ground by explicit inclined ribs while preserving the public sky cleft and walkable axis.';
 p.concept={
  thesis:'The original twin curving volumes gain six visible physical connections from the masses and suspended edges to the supported ground.',
  experientialSequence:'The existing low axial gallery remains unobstructed while visitors experience diagonal supports at the canyon edges.',
  whyThisVoid:'The open-air cleft and its clear pedestrian crossing stay unchanged while the structural mass hierarchy is revised.'
 };
 p.masses.push(...structuredClone(braces));
 return p;
})();
