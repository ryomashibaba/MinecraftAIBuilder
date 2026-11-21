/**
 * Same three frozen synthetic source designs as the previous art rejection;
 * only AUTHOR envelope decisions are new. No real Qwen/Gemma outputs.
 */
import {makeV4DTopologyFixtures} from './r125-v4d-authored-topology-fixtures.mjs';
import {ENVELOPE_SCHEMA} from '../source/ai/r125-v4d-envelope-integration.mjs';
export function makeV4DEnvelopeIntegrationFixtures(){
 return makeV4DTopologyFixtures().map((plan,index)=>{
  const sky=plan.nodes.filter(n=>n.kind==='sky');
  const envelope={
   schema:ENVELOPE_SCHEMA,portalWidth:4,
   gables:plan.nodes.filter(n=>n.kind==='covered').map((n,i)=>({
    nodeId:n.id,upperFacade:i%2===index%2?'glass':'wall'
   })),
   publicShelters:sky.map(n=>({
    nodeId:n.id,
    edge:index===0?'west':'north',
    depth:4,roofY:8,material:plan.materials.roof
   }))
  };
  return {plan,envelope};
 });
}
