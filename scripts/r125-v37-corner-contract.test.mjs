import {test} from 'node:test';
import assert from 'node:assert/strict';
import {R125_ARCHITECTURE_RESPONSE_SCHEMA as schema} from '../source/ai/b198g-local-model-adapter.mjs';
import {validateArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';

// Evaluate only the supported keywords used by the rear-corner sub-schema.
// This is not a general JSON Schema implementation or an Ollama test.
function accepts(s,x){
 if(s.anyOf&&!s.anyOf.some(v=>accepts(v,x)))return false;
 if(s.type==='object'){
  if(!x||typeof x!=='object'||Array.isArray(x))return false;
  if((s.required??[]).some(k=>!Object.hasOwn(x,k)))return false;
  if(s.additionalProperties===false&&Object.keys(x).some(k=>!Object.hasOwn(s.properties,k)))return false;
  return Object.keys(x).every(k=>!s.properties[k]||accepts(s.properties[k],x[k]));
 }
 if(s.enum&&!s.enum.includes(x))return false;
 if(s.type==='integer'&&(!Number.isInteger(x)||x<s.minimum||x>s.maximum))return false;
 return true;
}
const plan=(roof,cut)=>({
 schema:'minecraftaibuilder-r125-architecture-plan-v1',
 id:'synthetic-corner',title:'Synthetic geometry',brief:'Synthetic geometry test',
 footprint:{width:26,depth:26},
 levels:[{splitAxis:'z',splitPercent:50,spaces:[
  {id:'public-room',purpose:'Public space',access:'public'},
  {id:'staff-room',purpose:'Staff work',access:'staff'}]}],
 materials:{floor:'wood',wall:'stone',roof:'wood'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:roof,roofAxis:'x',
  facadeLanguage:'plain',...(roof==='ridge'?{roofVolume:'raised'}:{}),
  rearCornerCut:cut}
});
test('all rear corner combinations match actual Plan validation, preserving legal 3x3 unpaved cuts',()=>{
 const options=schema.anyOf[1].properties.expression.anyOf;
 let count=0;
 for(const roof of ['flat','ridge']){
  const corner=options.find(v=>v.properties.roofProfile.enum.includes(roof)&&
   v.properties.rearCornerCut).properties.rearCornerCut;
  for(let w=3;w<=8;w++)for(let d=3;d<=8;d++)
   for(const side of [undefined,'east','west'])for(const access of [undefined,'paved']){
    const cut={width:w,depth:d,...(side?{side}:{}),...(access?{access}:{})};
    let allowed=true;
    try{validateArchitecturePlan(plan(roof,cut))}
    catch(e){assert.match(e.message,/EXPRESSION_CORNER_CUT/);allowed=false;}
    assert.equal(accepts(corner,cut),allowed,JSON.stringify({roof,cut}));
    count++;
   }
 }
 assert.equal(count,432);
});
