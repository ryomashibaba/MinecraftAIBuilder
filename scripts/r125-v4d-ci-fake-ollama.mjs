/**
 * NEVER A REAL MODEL. Used exclusively by GitHub Windows CI to prove the
 * one-click user path over actual loopback HTTP without Qwen, APIs or worlds.
 * Deliberately returns an invalid architecture; no ART/SOURCE promotion.
 */
import http from 'node:http';
import fs from 'node:fs';
import {makeV4DCompactSynthetic} from './r125-v4d-compact-model-fixture.mjs';

if(process.env.CI!=='true'||process.env.MAB_V4D_TEST_DOUBLE_MODE!=='1'||
 !process.env.MAB_V4D_FAKE_READY_FILE||
 !process.env.MAB_V4D_FAKE_POST_LOG){
 throw Error('V4D_FAKE_SERVER_GITHUB_CI_EXPLICIT_TEST_ONLY');
}
const invalid=makeV4DCompactSynthetic();
invalid.spaces[1].attach.to='nonexistent-parent';
const raw=JSON.stringify(invalid);
function send(res,body){
 res.writeHead(200,{'Content-Type':'application/json'});
 res.end(JSON.stringify(body));
}
const server=http.createServer((req,res)=>{
 if(req.method==='GET'&&req.url==='/api/tags'){
  send(res,{models:[{name:'qwen3:14b'}]});return;
 }
 if(req.method==='POST'&&req.url==='/v1/chat/completions'){
  let body='';
  req.on('data',part=>{body+=part;if(body.length>1000000)req.destroy();});
  req.on('end',()=>{
   let request;
   try{request=JSON.parse(body)}catch{res.writeHead(400).end();return;}
   if(request.model!=='qwen3:14b'||request.stream!==false||
    !Array.isArray(request.messages)||request.messages.length!==2){
    res.writeHead(400).end();return;
   }
   fs.appendFileSync(process.env.MAB_V4D_FAKE_POST_LOG,'ONE_TEST_DOUBLE_POST\n');
   send(res,{model:'qwen3:14b',choices:[{
    finish_reason:'stop',message:{role:'assistant',content:raw}
   }]});
  });
  return;
 }
 res.writeHead(404).end();
});
server.listen(11434,'127.0.0.1',()=>{
 fs.writeFileSync(process.env.MAB_V4D_FAKE_READY_FILE,
  'GITHUB_CI_ONLY_FAKE_OLLAMA_READY\n');
 console.log('GITHUB_CI_ONLY_FAKE_OLLAMA_READY. NEVER AUTHENTIC QWEN.');
});
