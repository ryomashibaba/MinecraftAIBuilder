import test from 'node:test';
import assert from 'node:assert/strict';
import {compileDesign,SCHEMA as B143} from '../source/ai/b143-building-dsl.mjs';
import {generateArchitectureWithFeedback,inspectInheritedSource}
  from '../source/ai/b198g-autonomous-quality.mjs';

// These are deterministic TEST DOUBLES, never billed/provider-backed LLM runs.
const source={
  schema:B143,id:'b198g-test-architecture',title:'Independent design test',
  brief:'Three same-elevation source islands requiring authentic connection',
  bounds:{width:36,height:16,depth:16},designOnly:true,
  elements:[2,13,24].map((x,i)=>({
    id:'sourceIsland'+i,mode:'add',shape:'box',material:'stone',
    origin:[x,2,2],size:[6,1,6]
  }))
};
const validProposal=design=>({
  design:structuredClone(design),
  explanation:'The supplied source makes independently compiled geometry.',
  assumptions:[]
});
const joined=()=>{
  const d=structuredClone(source);
  d.elements.push({id:'sourcePromenade',mode:'add',shape:'box',
    material:'stone',origin:[7,2,4],size:[19,1,2]});
  return d;
};
const damaged=()=>{
  const d=joined();
  d.elements.push({id:'ceilingIntrusion',mode:'add',shape:'box',
    material:'wood',origin:[3,3,3],size:[3,2,3]});
  return d;
};
const sourcePrompt='三つの離れた床を安全な幅２の回廊でつなぎ、元の部材を残す。';

test('fails closed without an actual injected generator or with invalid budgets',async()=>{
  await assert.rejects(generateArchitectureWithFeedback({prompt:sourcePrompt}),
    /B198G_REAL_GENERATOR_REQUIRED/);
  await assert.rejects(generateArchitectureWithFeedback({
    prompt:sourcePrompt,generator:async()=>validProposal(source),maxRepairRounds:4
  }),/B198G_REPAIR_ROUND_CAP/);
});

test('a model-proposed new source bridge improves actual independent 2wide topology',async()=>{
  const calls=[];
  const output=await generateArchitectureWithFeedback({
    prompt:sourcePrompt,
    generator:async request=>{
      calls.push({mode:request.mode,prompt:request.prompt});
      return validProposal(request.mode==='creation'?source:joined());
    }
  });
  assert.equal(output.report.status,'SOURCE_CANDIDATE_REVIEW_REQUIRED');
  assert.equal(output.report.initialHighRiskCount,1);
  assert.equal(output.report.finalHighRiskCount,0);
  assert(output.report.finalLargestConnectedFloor>
    output.report.initialLargestConnectedFloor);
  assert(output.report.finalSupportedFloors>=output.report.initialSupportedFloors);
  assert.equal(output.report.attempts.length,1);
  assert.equal(output.report.attempts[0].decision,
    'IMPROVED_SOURCE_PROPOSAL_RETAINED');
  assert.equal(output.report.attempts[0].inheritedGeometryProof
    .damagedTwoWideOpenFloorSquares,0);
  assert.deepEqual(calls.map(x=>x.mode),['creation','revision']);
  assert(calls[1].prompt.includes('FRAGMENTED_PUBLIC_SOURCE_FLOORS'));
  assert.equal(output.report.sourceSha256,compileDesign(output.design).sourceSha256);
  assert.equal(output.report.generatorProvenance,
    'CALLER_SUPPLIED_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(output.report.designSemanticQuality,'UNREVIEWED');
  assert.equal(output.report.aestheticQuality,'UNREVIEWED');
  assert.equal(output.report.world.readiness,'NOT_PREPARED');
  assert.equal(output.report.world.worldWrites,0);
  assert.equal(output.report.world.BuildPlan.operations.length,0);
  assert(output.report.world.gates.every(x=>x==='BLOCKED'));
});

test('source-identical parts cannot be made unusable by newly added ceiling solids',async()=>{
  const proof=inspectInheritedSource({
    beforeDesign:source,beforeCompiled:compileDesign(source),
    afterCompiled:compileDesign(damaged())
  });
  assert.equal(proof.lostSourceVoxels,0);
  assert.equal(proof.alteredMaterialVoxels,0);
  assert(proof.damagedTwoWideOpenFloorSquares>0);
  assert.equal(proof.exactOriginalGeometryAndClearancePreserved,false);
  let round=0;
  const out=await generateArchitectureWithFeedback({
    prompt:sourcePrompt,
    generator:async req=>{
      if(req.mode==='creation')return validProposal(source);
      round++;
      return validProposal(round===1?damaged():joined());
    }
  });
  assert.equal(round,2);
  assert.equal(out.report.attempts[0].decision,
    'REJECTED_DESTRUCTIVE_OR_NO_SOURCE_IMPROVEMENT');
  assert.equal(out.report.attempts[1].decision,'IMPROVED_SOURCE_PROPOSAL_RETAINED');
  assert.equal(out.design.elements.some(e=>e.id==='ceilingIntrusion'),false);
  assert.equal(out.report.finalHighRiskCount,0);
});

test('no measurable fix leaves original source intact and topology claim on HOLD',async()=>{
  let revisionCount=0;
  const result=await generateArchitectureWithFeedback({
    prompt:sourcePrompt,
    generator:async req=>{
      if(req.mode==='creation')return validProposal(source);
      revisionCount++;
      const copy=structuredClone(source);
      copy.elements.push({id:'decorativeSign',mode:'add',shape:'box',
        material:'glow',origin:[2,9,2],size:[2,1,2]});
      return validProposal(copy);
    }
  });
  assert.equal(revisionCount,2);
  assert.equal(result.report.status,'HOLD_SOURCE_TOPOLOGY');
  assert.equal(result.report.finalHighRiskCount,1);
  assert.equal(result.report.sourceSha256,compileDesign(source).sourceSha256);
  assert.equal(result.report.attempts.every(x=>x.decision===
    'REJECTED_DESTRUCTIVE_OR_NO_SOURCE_IMPROVEMENT'),true);
  assert.deepEqual(result.design,source);
});

test('existing adequate topology is not force-repaired to generate cosmetic volume',async()=>{
  const base=joined();
  const requests=[];
  const result=await generateArchitectureWithFeedback({
    prompt:sourcePrompt,
    generator:async req=>{
      requests.push(req);
      return validProposal(base);
    }
  });
  assert.equal(requests.length,1);
  assert.equal(result.report.attempts.length,0);
  assert.equal(result.report.finalHighRiskCount,0);
  assert.equal(result.report.designSemanticQuality,'UNREVIEWED');
});
