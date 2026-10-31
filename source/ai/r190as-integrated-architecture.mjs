/**
 * R190-AS — author-chosen structure, envelope, void, and circulation co-design.
 * Separate SOURCE ONLY research gate: no AF/AJ inference or Minecraft actions.
 * Support claims are verified from FINAL B143 cells after every source CUT.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {compileR190AQParti} from './r190aq-architectural-parti.mjs';
import {auditR190ARStructuralContinuity} from './r190ar-structure-audit.mjs';

export const R190AS_SCHEMA='minecraftaibuilder-r190as-co-designed-parti-v1';
const err=x=>{throw Error('R190AS_'+x);};
const ok=(c,x)=>{if(!c)err(x);};
const exact=(x,n)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===n.length&&n.every(k=>Object.hasOwn(x,k));
const id=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const K=(x,y,z)=>x+','+y+','+z;
const keyCell=p=>K(p[0],p[1],p[2]);
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,art:'ART_HOLD'});

export function validateR190ASCoDesign(q){
 ok(exact(q,['schema','parti','structureIntent'])&&q.schema===R190AS_SCHEMA,
   'TOP_LEVEL');
 const s=q.structureIntent;
 ok(exact(s,['designThesis','supportPairs','civicAnchorId','arrivalAnchorId',
    'destinationAnchorId'])&&
   typeof s.designThesis==='string'&&s.designThesis.length>=24&&
   s.designThesis.length<=700&&!/[\u0000-\u001f<>]/.test(s.designThesis),
   'STRUCTURAL_THESIS');
 ok(Array.isArray(s.supportPairs)&&s.supportPairs.length>=4&&
    s.supportPairs.length<=10,'SUPPORT_PAIRS');
 const seen=new Set(),perEnvelope=new Map();
 const masses=new Map((q.parti?.masses??[]).map(m=>[m.id,m]));
 for(const pair of s.supportPairs){
  ok(exact(pair,['supportId','envelopeId'])&&
   id(pair.supportId)&&id(pair.envelopeId)&&
   !seen.has(pair.supportId)&&pair.supportId!==pair.envelopeId,
   'SUPPORT_PAIR_ID');
  seen.add(pair.supportId);
  const support=masses.get(pair.supportId),envelope=masses.get(pair.envelopeId);
  ok(support&&envelope&&support.mode==='add'&&envelope.mode==='add'&&
   ['beam','box'].includes(support.shape)&&
   ['ellipsoid','cylinder','beam'].includes(envelope.shape),'SUPPORT_PAIR_SHAPE');
  perEnvelope.set(pair.envelopeId,(perEnvelope.get(pair.envelopeId)??0)+1);
 }
 ok(perEnvelope.size>=2&&[...perEnvelope.values()].every(v=>v>=2),
   'ENVELOPE_SUPPORT_REPETITION');
 const anchors=new Map((q.parti?.programAnchors??[]).map(v=>[v.id,v]));
 const anchorIds=[s.arrivalAnchorId,s.civicAnchorId,s.destinationAnchorId];
 ok(new Set(anchorIds).size===3&&anchorIds.every(id=>anchors.has(id)),'ANCHOR_REFERENCE');
 const sky=q.parti?.voids?.find(v=>v.role==='open-sky')?.geometry;
 ok(sky&&sky.shape==='box','EXPLICIT_SKY_MISSING');
 const [sx,,sz]=sky.origin,[sw,,sd]=sky.size;
 const civic=anchors.get(s.civicAnchorId),entry=anchors.get(s.arrivalAnchorId),
  destination=anchors.get(s.destinationAnchorId);
 ok(civic.x>=sx&&civic.x+1<sx+sw&&civic.z>=sz&&civic.z+1<sz+sd,
   'CIVIC_ANCHOR_NOT_IN_VOID');
 const alongX=(entry.x+1<sx&&destination.x>=sx+sw)||
   (destination.x+1<sx&&entry.x>=sx+sw);
 const alongZ=(entry.z+1<sz&&destination.z>=sz+sd)||
   (destination.z+1<sz&&entry.z>=sz+sd);
 ok(alongX||alongZ,'ARRIVAL_VOID_DESTINATION_NOT_SEQUENCED');
 return true;
}
function singleShapeSource(study,mass){
 // The exact original author shape is compiled on its own; never repaired.
 const d={...study.design,elements:[mass]};
 const result=compileDesign(d);
 ok(verifyCompiled(d,result),'INDIVIDUAL_SHAPE_NOT_REPRODUCIBLE');
 return new Set(result.primitives.map(keyCell));
}
export function reviewR190ASCoDesign(q){
 validateR190ASCoDesign(q);
 const plan=structuredClone(q);
 const compiled=compileR190AQParti(plan.parti);
 const structural=auditR190ARStructuralContinuity(compiled);
 ok(structural.status==='SOURCE_CONTACT_PASS_NOT_ENGINEERING'&&
    structural.detachedVoxelCount===0,'DETACHED_MACRO_MASS');
 ok(structural.elevatedComponents.every(c=>c.groundTouchCells>=32),
   'TINY_FOUNDATION_CONTACT');
 const walls=Object.values(structural.skyVoidAdjacentPhysicalFaceCells);
 ok(walls.filter(n=>n>=25).length>=3,'VOID_NOT_DEFINED_BY_MASS');
 const final=new Set(compiled.compiled.primitives.map(keyCell));
 const massLookup=new Map(compiled.inputParti.masses.map(m=>[m.id,m]));
 const shapeCache=new Map();
 const effective=id=>{
  if(!shapeCache.has(id)){
   const original=singleShapeSource(compiled,massLookup.get(id));
   shapeCache.set(id,new Set([...original].filter(k=>final.has(k))));
  }
  return shapeCache.get(id);
 };
 const supportEvidence=[];
 for(const pair of plan.structureIntent.supportPairs){
  const sup=effective(pair.supportId),env=effective(pair.envelopeId);
  let foundationContacts=0,envelopeOverlap=0;
  for(const k of sup){
   if(env.has(k))envelopeOverlap++;
   const [x,y,z]=k.split(',').map(Number);
   if(y===2&&final.has(K(x,1,z)))foundationContacts++;
  }
  ok(foundationContacts>=12,'SUPPORT_HAS_TOO_FEW_FOUNDATION_CELLS');
  ok(envelopeOverlap>=50,'SUPPORT_DOES_NOT_INTEGRATE_WITH_ENVELOPE');
  supportEvidence.push({...pair,foundationContacts,envelopeOverlap,
    effectiveSupportCells:sup.size,materialStrength:'NOT_CERTIFIED'});
 }
 const supportTypes=new Set(supportEvidence.map(v=>v.envelopeId));
 ok(supportTypes.size>=2,'SINGLE_ENVELOPE_TYPOLOGY');
 ok(compiled.audit.allAnchorsReachable&&compiled.audit.openSkyColumns>=100,
   'PUBLIC_VOID_OR_CIRCULATION_FAILED');
 const output={schema:'minecraftaibuilder-r190as-integrated-source-review-v1',
  partiInputSha256:compiled.inputSha256,coDesign:plan,
  actualB143Design:compiled.design,compiled:compiled.compiled,
  sourceAudit:compiled.audit,contactAudit:structural,
  supportedEnvelopePairs:supportEvidence,
  actualSupportsAuthored:true,hostInventedSupports:false,
  massVoidAndCirculation:'PHYSICAL_SOURCE_CONFIRMED',
  architectureMeaning:'NOT_CERTIFIED',
  supportEngineering:'NOT_CERTIFIED',
  operationalMinecraftWalking:'NOT_TESTED',
  actualAIOriginality:'NOT_TESTED',
  aestheticQuality:'ART_HOLD',
  modelCallsByReview:0,...safe()};
 return output;
}
