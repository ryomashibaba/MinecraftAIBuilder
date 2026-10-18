/**
 * B198S intentional TEST DOUBLE — deterministic JSON, never actual AI.
 * Binds only 127.0.0.1. Used solely to validate Windows user operation.
 */
import http from 'node:http';
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--port'||!/^\d{2,5}$/.test(args[1])||
 Number(args[1])<1||Number(args[1])>65535){
 throw Error('B198S_MOCK_PORT_REQUIRED');
}
export const mockModel='B198S_FIXTURE_NOT_REAL_LLM';
export function mockDesign(){
 return {
  schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'b198s-frozen-library-fixture',
  title:'TEST_DOUBLE_LIBRARY_TITLE_WITH_LONG_TEXT_'.repeat(4),
  brief:'This is a fake local-model response for B198T metadata-only repair verification. '.repeat(8),
  bounds:{width:48,height:40,depth:44},designOnly:true,
  elements:[
   {id:'ground-public-floor',shape:'box',mode:'add',material:'stone',
    origin:[3,3,3],size:[42,1,38]},
   {id:'west-library-wing',shape:'box',mode:'add',material:'wood',
    origin:[4,12,4],size:[16,1,36]},
   {id:'east-library-wing',shape:'box',mode:'add',material:'wood',
    origin:[28,12,4],size:[15,1,36]},
   {id:'glass-roof',shape:'ellipsoid',mode:'add',material:'glass',
    center:[24,31,22],radii:[21,7,19],shell:2},
   {id:'high-observation-deck',shape:'box',mode:'add',material:'metal',
    origin:[12,31,9],size:[25,1,26]},
   {id:'public-atrium',shape:'box',mode:'cut',
    origin:[20,4,15],size:[8,30,14]},
   {id:'left-beam',shape:'beam',mode:'add',material:'accent',
    start:[5,4,5],end:[5,32,5],thickness:2},
   {id:'right-beam',shape:'beam',mode:'add',material:'accent',
    start:[41,4,5],end:[41,32,5],thickness:2}
  ]
 };
}
const source=JSON.stringify({
 design:mockDesign(),
 explanation:'Deterministic CI sample source, never real model authorship.',
 assumptions:[]
});
http.createServer(async(req,res)=>{
 try{
  if(req.url!=='/api/chat'||req.method!=='POST'){
   res.writeHead(404);res.end('{}');return;
  }
  let raw='';for await(const x of req){raw+=String(x);}
  const data=JSON.parse(raw);
  if(data.model!==mockModel||data.stream!==false||
   data.think!==false||data.format!=='json'||
   data.options?.num_predict!==3072||
   data.options?.num_ctx!==6144||
   data.keep_alive!=='10m'){
   res.writeHead(400,{'Content-Type':'application/json'});
   res.end(JSON.stringify({error:'B198S_MOCK_PROTOCOL_INVALID'}));return;
  }
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({
   model:mockModel,done:true,done_reason:'stop',
   message:{role:'assistant',content:source},
   total_duration:2100000000,load_duration:200000000,
   prompt_eval_duration:350000000,prompt_eval_count:256,
   eval_duration:1550000000,eval_count:160
  }));
 }catch(e){
  res.writeHead(400,{'Content-Type':'application/json'});
  res.end(JSON.stringify({error:'B198S_FIXTURE_FAILURE'}));
 }
}).listen(Number(args[1]),'127.0.0.1',()=>{
 console.log('B198S_FAKE_NATIVE_OLLAMA_READY_NO_MODEL_INFERENCE');
});
