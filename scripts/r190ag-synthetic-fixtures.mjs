/** Authored synthetic research, never a saved model response. */
import {R190_STATIC_SYNTHETIC_CASES,R190_FACETED_STATIC_SYNTHETIC_CASE} from './r190-semantic-fixtures.mjs';
import {R190AF_INTENT_SCHEMA} from '../source/ai/r190af-program-intent.mjs';
export function asAF(src){
 const p=structuredClone(src),[root,...children]=p.spaces;
 delete root.parentId;delete root.side;
 const r={schema:R190AF_INTENT_SCHEMA,id:p.id,title:p.title,brief:p.brief,
  site:p.site,materials:p.materials,root:{...root,spatialRole:root.spatialRole??'enclosed'},
  children:children.map(s=>({...s,spatialRole:s.spatialRole??'enclosed'}))};
 for(const k of ['formIntent','roofFormIntent'])if(p[k])r[k]=p[k];
 if(p.crossConnections)r.additionalPassages=p.crossConnections;
 return r;
}
export function jointWindowFixture(){
 const p=asAF(R190_STATIC_SYNTHETIC_CASES[1]);
 p.daylightIntents=[0,1].map(()=>({spaceId:'workshop',face:'north',width:3,height:2}));
 p.roofFormIntent={spaceId:'workshop',profile:'sawtooth',axis:'x',rise:3,toothWidth:3};
 return p;
}
export function featuredFixture(){
 const p=asAF(R190_FACETED_STATIC_SYNTHETIC_CASE);
 p.roofFormIntent={spaceId:'studio',profile:'sawtooth',axis:'x',rise:3,toothWidth:3};
 p.daylightIntents=[{spaceId:'studio',face:'south',width:3,height:2}];
 return p;
}
export const plainFixtures=()=>R190_STATIC_SYNTHETIC_CASES.map(asAF);
