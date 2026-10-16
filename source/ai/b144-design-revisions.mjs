/**
 * B144: authenticated-by-source-hash, bounded design edit protocol.
 * This is an input grammar for ChatGPT-written JSON proposals; NOT a natural
 * language parser or a Minecraft build instruction interpreter.
 */
import {compileDesign,validateDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const validKeys=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k));
const ok=(x,why)=>{if(!x)throw Error('B144_'+why);};
const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,47}$/.test(x);
const name=x=>typeof x==='string'&&x.length>0&&x.length<=100&&!/[\u0000-\u001f<>]/.test(x);
const note=x=>typeof x==='string'&&x.length>0&&x.length<=500&&!/[\u0000-\u001f<>]/.test(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const key=p=>p[0]+','+p[1]+','+p[2];
function diffGeometry(before,after){
 const lhs=new Map(before.primitives.map(p=>[key(p),p[3]]));
 const rhs=new Map(after.primitives.map(p=>[key(p),p[3]]));
 let added=0,removed=0,repainted=0;
 for(const [k,v] of rhs){
  if(!lhs.has(k))added++;
  else if(lhs.get(k)!==v)repainted++;
 }
 for(const k of lhs.keys())if(!rhs.has(k))removed++;
 return {added,removed,repainted,totalChanged:added+removed+repainted};
}
export const REVISION_SCHEMA='minecraftaibuilder-b144-design-revision-v1';

export function applyRevision(base,proposal){
 validateDesign(base);
 ok(validKeys(proposal,['schema','revisionId','targetId','baseSourceSha256','request','edits']),'PROPOSAL_FIELDS');
 ok(proposal.schema===REVISION_SCHEMA&&id(proposal.revisionId)&&
  proposal.revisionId!==base.id&&proposal.targetId===base.id,'IDENTITY');
 const baseJsonBefore=sha(base);
 const baseline=compileDesign(base);
 ok(/^[a-f0-9]{64}$/.test(proposal.baseSourceSha256||'')&&
    proposal.baseSourceSha256===baseline.sourceSha256,'STALE_OR_FORGED_BASE');
 ok(note(proposal.request),'REQUEST');
 ok(Array.isArray(proposal.edits)&&proposal.edits.length>=1&&proposal.edits.length<=14,'EDIT_COUNT');
 const next=clone(base);
 const ids=new Set(next.elements.map(e=>e.id));
 const changed=new Set();
 for(const [index,edit] of proposal.edits.entries()){
  ok(validKeys(edit,['action','target','element','material','value']),'EDIT_FIELDS');
  ok(['addElement','replaceElement','removeElement','setMaterial','setTitle','setBrief'].includes(edit.action),'UNKNOWN_ACTION');
  const itemActions=['addElement','replaceElement','removeElement','setMaterial'];
  if(itemActions.includes(edit.action)){
   ok(typeof edit.target==='string'&&edit.target.length<=40,'MISSING_TARGET');
   const at=next.elements.findIndex(e=>e.id===edit.target);
   if(edit.action==='addElement'){
    ok(at<0&&edit.element?.id===edit.target&&edit.material===undefined&&edit.value===undefined,'ADD_CONFLICT');
    next.elements.push(clone(edit.element));
    ids.add(edit.target);
   }else{
    ok(at>=0,'TARGET_NOT_FOUND');
    if(edit.action==='replaceElement'){
     ok(edit.element?.id===edit.target&&edit.material===undefined&&edit.value===undefined,'REPLACE_CONFLICT');
     next.elements[at]=clone(edit.element);
    }else if(edit.action==='removeElement'){
     ok(edit.element===undefined&&edit.material===undefined&&edit.value===undefined,'REMOVE_FIELDS');
     next.elements.splice(at,1);ids.delete(edit.target);
    }else{
     ok(edit.element===undefined&&edit.value===undefined&&typeof edit.material==='string','MATERIAL_FIELDS');
     next.elements[at].material=edit.material;
    }
   }
   ok(!changed.has('element:'+edit.target),'DUPLICATE_ELEMENT_CHANGE');
   changed.add('element:'+edit.target);
  }else{
   ok(edit.target===undefined&&edit.element===undefined&&edit.material===undefined&&
     (edit.action==='setTitle'?name(edit.value):note(edit.value)),'TEXT_FIELDS');
   const k=edit.action==='setTitle'?'title':'brief';
   ok(!changed.has(k),'DUPLICATE_TEXT_CHANGE');
   next[k]=edit.value;changed.add(k);
  }
  ok(index<14,'EDIT_BOUND');
 }
 next.id=proposal.revisionId;
 validateDesign(next);
 const after=compileDesign(next);
 ok(verifyCompiled(next,after),'COMPILED_UNSAFE');
 const delta=diffGeometry(baseline,after);
 ok(delta.totalChanged>=25,'NOT_MEANINGFUL_GEOMETRY_CHANGE');
 ok(after.geometrySha256!==baseline.geometrySha256,'NO_GEOMETRY_CHANGE');
 // Persist a compact, verifiable review of a copy; never alter the original.
 return {design:next,comparison:{
  schema:'minecraftaibuilder-b144-revision-evidence-v1',
  source:base.id,revisionId:next.id,request:proposal.request,
  sourceSha256:baseline.sourceSha256,
  revisionSourceSha256:after.sourceSha256,
  beforeGeometrySha256:baseline.geometrySha256,
  afterGeometrySha256:after.geometrySha256,
  beforeCells:baseline.primitives.length,afterCells:after.primitives.length,
  changes:delta,edits:proposal.edits.map(e=>({action:e.action,target:e.target??null})),
  sourceUnchanged:sha(base)===baseJsonBefore, // no mutation of the input design
  designOnly:true,readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,worldContacts:0,worldCoordinates:null,
  gateStatuses:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 }};
}
export function verifyRevision(base,proposal,review){
 try{
  const computed=applyRevision(base,proposal);
  return sha(computed.design)===sha(review?.design)&&
    sha(computed.comparison)===sha(review?.comparison)&&
    review?.comparison?.gateStatuses?.length===9&&
    review.comparison.gateStatuses.every(s=>s==='BLOCKED')&&
    review.comparison.BuildPlan.operations.length===0;
 }catch{return false;}
}
