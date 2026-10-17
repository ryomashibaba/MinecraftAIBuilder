/**
 * Offline CI fixtures are fixed MOCK outputs, not model inference.
 * Their purpose is to test the real renderer pipeline with unrelated
 * forms and a revision. Genuine natural language intelligence requires
 * supplying a real LLM adapter in b198a-architect.mjs.
 */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeArchitecture} from '../source/ai/b198-natural-language-design.mjs';
import {fixtureAmphitheater,fixtureLighthouse,candidate} from './b198a-fixtures.mjs';
import {compileB143Gallery,renderB143Html,verifyB143Payload} from './build-b143-site.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../b198a-evidence');
const samples=[
 {name:'AMPHITHEATER',prompt:'三段客席を持つ空中劇場と舞台のガラスドームを設計',source:fixtureAmphitheater()},
 {name:'OBSERVATORY',prompt:'球形の展望デッキがある科学観測灯台を設計',source:fixtureLighthouse()}
];
fs.mkdirSync(dir,{recursive:true});
const proofs=[];
const template=fs.readFileSync(path.join(dir,'../source/ai/b143-viewer-template.html'),'utf8');
for(const sample of samples){
 const data=await proposeArchitecture({
  prompt:sample.prompt,generator:async()=>candidate(sample.source)});
 const payload=compileB143Gallery([data.design]);
 if(!verifyB143Payload(payload))throw Error('B198A_FIXTURE_SOURCE_RENDER_REJECTED');
 const rendered=renderB143Html(payload,template).replace(
  '<body>', '<body><div style="padding:14px 20px;background:#402612;color:#fff2da;font-weight:700">'+
  'B198A CI TEST FIXTURE ONLY — この建築は人間が用意したテスト用形状です。'+
  'AIが自然言語を理解して生成した結果ではありません。 Minecraft施工は禁止。</div>');
 const folder=path.join(dir,sample.name);fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'index.html'),rendered);
 fs.writeFileSync(path.join(folder,'source-design.json'),
  JSON.stringify(data.design,null,2)+'\n');
 fs.writeFileSync(path.join(folder,'source-proof.json'),
  JSON.stringify(data.review,null,2)+'\n');
 proofs.push({name:sample.name,sourceOriginal:sample.source.id,
  sourceVoxelCount:data.review.voxels,
  exteriorVoxelCount:payload.scenes[0].surface.length,
  gallerySourceDigest:data.review.geometrySha256,
  inferenceType:'FIXTURE_INJECTED_NOT_A_REAL_LANGUAGE_MODEL',
  semanticComplianceNotAutomaticallyCertified:true,
  worldContacts:0,worldWrites:0});
}
const original=fixtureAmphitheater(),revised=structuredClone(original);
revised.elements[5].majorRadius=11;
revised.elements.push({id:'glow-portal-extension',shape:'box',mode:'add',
 origin:[18,26,34],size:[24,1,6],material:'glow'});
const edited=await proposeArchitecture({
 prompt:'環状ステージ照明を拡大し、光る空中デッキを新設して',
 generator:async()=>candidate(revised),
 baseDesign:original,
 expectedBaseSha256:compileDesign(original).sourceSha256,
 protectedElementIds:['main-limestone-court']});
const changed=compileB143Gallery([edited.design]);
if(!verifyB143Payload(changed))throw Error('B198A_CHANGED_FIXTURE_NOT_RENDERABLE');
fs.mkdirSync(path.join(dir,'REVISION'),{recursive:true});
fs.writeFileSync(path.join(dir,'REVISION/index.html'),
 renderB143Html(changed,template).replace('<body>',
 '<body><div style="padding:14px 20px;background:#402612;color:#fff2da;font-weight:700">'+
 'B198A TEST-ONLY REVISION — テスト用の設計差分であり実モデル推論結果ではありません。 Minecraft施工禁止。</div>'));
fs.writeFileSync(path.join(dir,'REVISION/source-proof.json'),JSON.stringify(edited.review,null,2)+'\n');
const summary={schema:'b198a-fixture-only-qa-v1',genuineLLMInferenceTested:false,
 realMinecraftConstructionTested:false,semanticUnderstandingProven:false,
 originalHistorical21BuildingSourceModulesUntouched:true,
 fixtures:proofs,revisionSourceDiff:edited.review.revisionDiff,
 sourceOnly:true,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED')};
fs.writeFileSync(path.join(dir,'B198A_MOCK_ONLY_QA.json'),JSON.stringify(summary,null,2)+'\n');
console.log('B198A_SOURCE_PIPELINE_MOCK_QA_PASS',JSON.stringify(summary));
