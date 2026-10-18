/**
 * B198M CI-only local HTTP TEST DOUBLE for Windows full-launcher validation.
 * NEVER call this a real language model. No model inference is performed.
 * Binds exclusively to 127.0.0.1 at a tester-selected numeric local port.
 */
import http from 'node:http';
import {SCHEMA as B143} from '../source/ai/b143-building-dsl.mjs';
import {PLAN_SCHEMA} from '../source/ai/b198i-design-director.mjs';
const input=process.argv.slice(2);
if(input.length!==2||input[0]!=='--port'||!/^\d{2,5}$/.test(input[1])||
 Number(input[1])<1||Number(input[1])>65535){
 console.error('B198M_TEST_DOUBLE_PORT_REQUIRED');process.exit(1);
}
const model='B198M_MOCK_NOT_REAL_LLM';
const d={
 schema:B143,id:'b198m-http-mock-test',title:'TEST DOUBLE ONLY',
 brief:'Test-only strict source output, never actual model authored.',
 bounds:{width:32,height:18,depth:32},designOnly:true,
 elements:[{id:'public-source-floor',shape:'box',mode:'add',material:'stone',
  origin:[3,2,3],size:[26,1,26]}]
};
const p={
 schema:PLAN_SCHEMA,id:d.id,title:'TEST DOUBLE plan',
 designIntent:'市民向け公共図書館の大きな床と開いた上層の吹き抜けを設計する。',
 visualDirection:'空気感のある上層と開放的な公共の床を組み合わせた未来建築。',
 bounds:d.bounds,
 zones:[
  {id:'left-room',name:'左閲覧室',purpose:'人が自由に移動できる公共閲覧床を作る'},
  {id:'right-room',name:'右閲覧室',purpose:'広い公共の回廊と閲覧床を作る'},
  {id:'upper-room',name:'吹き抜け空間',purpose:'上階の開放的な空気領域を残す'}
 ],
 anchors:[
  {id:'floor-left',zoneId:'left-room',point:[6,2,6],expect:'SUPPORTED_FLOOR',
   purpose:'閲覧床の二幅の足場を保持する'},
  {id:'floor-right',zoneId:'right-room',point:[18,2,18],expect:'SUPPORTED_FLOOR',
   purpose:'上階につながる閲覧床の足場を保持する'},
  {id:'solid',zoneId:'left-room',point:[5,2,5],expect:'SOLID',
   purpose:'石材の本物の床セルを保持する'},
  {id:'air',zoneId:'upper-room',point:[12,10,12],expect:'AIR',
   purpose:'吹き抜けの上層空気領域を保つ'},
  {id:'head',zoneId:'right-room',point:[18,4,18],expect:'AIR',
   purpose:'閲覧空間の頭上を十分に空けておく'}
 ]
};
http.createServer(async(req,res)=>{
 try{
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'){
   res.writeHead(404);res.end();return;
  }
  let body='';
  for await (const chunk of req)body+=String(chunk);
  const request=JSON.parse(body);
  if(request.model!==model)throw Error('INVALID_TEST_ONLY_MODEL');
  const user=JSON.parse(request.messages.find(x=>x.role==='user').content);
  const content=user.phase==='B198I_ARCHITECTURAL_PROGRAM'?p:
   {design:d,explanation:'Deterministic HTTP transport test fixture only',
    assumptions:[]};
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({choices:[{finish_reason:'stop',
   message:{content:JSON.stringify(content)}}]}));
 }catch(e){
  res.writeHead(400,{'Content-Type':'application/json'});
  res.end(JSON.stringify({error:'B198M_TEST_DOUBLE_'+e.message}));
 }
}).listen(Number(input[1]),'127.0.0.1',()=>{
 console.log('B198M_MOCK_LOCAL_HTTP_SERVER_READY_WITHOUT_INFERENCE');
});
