/**
 * B198R test-only Ollama protocol fixture. Returns deterministic canned JSON.
 * Does NOT run an LLM. Binds only 127.0.0.1.
 */
import http from 'node:http';
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--port'||!/^\d{2,5}$/.test(args[1])||
 Number(args[1])>65535||Number(args[1])<1){
 console.error('B198R_MOCK_SERVER_PORT_REQUIRED');process.exit(1);
}
const id='B198R_MOCK_NOT_REAL_LLM';
http.createServer(async(req,res)=>{
 try{
  const json=(status,content)=>{
   res.writeHead(status,{'Content-Type':'application/json'});
   res.end(JSON.stringify(content));
  };
  if(req.method==='GET'&&req.url==='/api/ps'){
   json(200,{models:[{name:id,model:id,size:17000000000,
    size_vram:14000000000,context_length:2048}]});
   return;
  }
  let raw='';for await(const c of req)raw+=String(c);
  const body=JSON.parse(raw);
  if(body.model!==id){json(404,{error:'B198R_FIXTURE_MODEL_MISMATCH'});return}
  if(req.url==='/api/show'&&req.method==='POST'){
   json(200,{thinking:{values:[true,false],default:true}});
   return;
  }
  if(req.url==='/api/chat'&&req.method==='POST'){
   if(body.stream!==false||body.think!==false||body.format!=='json'||
      body.options?.num_predict!==128){
    json(400,{error:'B198R_FIXTURE_BAD_PROBE_OPTIONS'});return;
   }
   json(200,{model:id,done:true,done_reason:'stop',
    message:{role:'assistant',content:'{"ready":true,"parts":["floor","wall","roof"]}'},
    total_duration:2300000000,load_duration:300000000,
    prompt_eval_count:35,prompt_eval_duration:500000000,
    eval_count:40,eval_duration:1500000000});
   return;
  }
  json(404,{error:'B198R_FIXTURE_PATH_NOT_ALLOWED'});
 }catch(e){
  res.writeHead(400,{'Content-Type':'application/json'});
  res.end(JSON.stringify({error:String(e.message).slice(0,100)}));
 }
}).listen(Number(args[1]),'127.0.0.1',()=>{
 console.log('B198R_FAKE_OLLAMA_READY_NOT_REAL_INFERENCE');
});
