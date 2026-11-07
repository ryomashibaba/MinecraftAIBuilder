/** R190-BM: explicitly authorized, two requests total, no retry or geometry repair.
 * Reuses BF -> BE/BG -> BK/BL. No Minecraft modules or remote LLM endpoints.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {captureR190BFSide,compareR190BFPair} from './r190bf-controlled-pair.mjs';
import {runR190Local} from './r190-local-semantic-run.mjs';
import {buildR190BKOffline} from './r190bk-evidence-stage-review.mjs';

const args=process.argv.slice(2);
if(args.length!==3||args[0]!=='--root'||args[2]!=='--confirm-a-and-b-once')
 throw Error('Explicit --root DIR --confirm-a-and-b-once required; no calls made');
const root=path.resolve(args[1]),preparedDir=path.join(root,'user-prepared-bj'),
 protocolDir=path.join(root,'user-protocol'),outDir=path.join(root,'comparison');
const H=b=>createHash('sha256').update(b).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(root,name),
 JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const readJson=name=>JSON.parse(fs.readFileSync(path.join(root,name)));
const protocol=readJson('user-protocol/R190BF_PROTOCOL.json');
const environment=readJson('LOCAL_ENVIRONMENT.json');
const expected=environment.httpReads.find(x=>x.url.endsWith('/api/tags'))
 .response.models.find(x=>x.name===protocol.model);
for(const name of ['A','B','comparison','BM_EXECUTION.json'])
 if(fs.existsSync(path.join(root,name)))throw Error('Existing attempt: '+name+'; never retry');
if(!expected||protocol.model!=='qwen3:14b')throw Error('Pinned installed model required');
async function metadata(route){
 const response=await fetch('http://127.0.0.1:11434/api/'+route,
  {redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Metadata HTTP '+response.status);
 return response.json();
}
const before={at:new Date().toISOString(),tags:await metadata('tags'),
 version:await metadata('version'),ps:await metadata('ps')};
if(before.tags.models.find(x=>x.name===protocol.model)?.digest!==expected.digest)
 throw Error('Installed model digest changed; no inference');
write('BM_EXECUTION.json',{startedAt:before.at,userExplicitApproval:true,
 approvalSource:'Human reply authorizing A/B and further work; experiment remains A=1,B=1',
 originalBriefSha256:protocol.briefSha256,model:protocol.model,
 installedModelDigestObserved:expected.digest,modelIdentityCryptographicallyVerified:false,
 requestedTemperature:protocol.temperature,seed:protocol.seed,maxTokens:protocol.maxTokens,
 requestTimeoutMs:900000,automaticRetries:0,perSideMaximumRequests:1,
 proposedLibraryBriefWasNeverSubmitted:true,worldContacts:0,worldWrites:0,
 constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},art:'ART_HOLD',officialArtAdoptions:0});
write('BM_RUNTIME_BEFORE.json',before);
for(const side of ['A','B']){
 let observedRequests=0;
 const startedAt=new Date().toISOString(),start=performance.now();
 // Native HTTP avoids a separate hidden fetch headers timeout. No redirects,
 // fallback, retry, or request rewriting; BF records the exact transmitted body.
 const fetcher=(url,init)=>new Promise((resolve,reject)=>{
  if(url!=='http://127.0.0.1:11434/v1/chat/completions'||++observedRequests!==1)
   return reject(Error('Only one local provider request per side'));
  const request=http.request(url,{method:init.method,headers:init.headers,
   signal:init.signal},response=>{
   const chunks=[];
   response.on('data',chunk=>chunks.push(chunk));
   response.on('error',reject);
   response.on('end',()=>{
    try{
     const bytes=Buffer.concat(chunks),file=side+'/PROVIDER_HTTP_RESPONSE.json';
     fs.writeFileSync(path.join(root,file),bytes,{flag:'wx'});
     write(side+'/BM_HTTP_RECEIPT.json',{startedAt,finishedAt:new Date().toISOString(),
      elapsedMs:performance.now()-start,httpStatus:response.statusCode,
      responseFile:file,responseSha256:H(bytes),responseBytes:bytes.length,
      requestCount:observedRequests,automaticRetries:0});
     resolve({ok:response.statusCode===200,status:response.statusCode,
      json:async()=>JSON.parse(bytes.toString('utf8'))});
    }catch(error){reject(error)}
   });
  });
  request.on('error',reject);request.end(init.body);
 });
 const result=await captureR190BFSide({protocolDir,preparedDir,side,
  outDir:path.join(root,side),approved:true},
  {fetcher,modelRunner:(options,deps)=>runR190Local({...options,timeoutMs:900000},deps)});
 console.log(JSON.stringify({side,status:result.status,capture:result.capture,
  error:result.runnerError,requestCount:observedRequests,elapsedMs:performance.now()-start}));
 try{write(side+'/BM_RUNTIME_AFTER.json',{at:new Date().toISOString(),
  ps:await metadata('ps')});}catch(error){write(side+'/BM_RUNTIME_AFTER.json',{error:String(error)})}
}
const comparison=compareR190BFPair({protocolDir,preparedDir,
 aDir:path.join(root,'A'),bDir:path.join(root,'B'),outDir});
const review=buildR190BKOffline({comparisonDir:outDir});
console.log(JSON.stringify({comparisonStatus:comparison.comparisonStatus,
 reviewStatus:review.status,directory:review.directory}));
