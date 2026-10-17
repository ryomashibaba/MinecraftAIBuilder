/**
 * Optional REAL LLM backend for B198A. Disabled when credentials/model are
 * missing. No keyword-matching pseudo-generation and NO client-side API key.
 * A real model invents and revises B143 source geometry; the deterministic
 * local engine verifies every candidate before preview.
 * Strict outer Responses text.format JSON schema and validated inner JSON.
 */
export const B198_MODEL_RESPONSE_ENVELOPE={
 type:'json_schema',name:'b198_source_candidate',strict:true,
 schema:{type:'object',additionalProperties:false,
  properties:{proposal_json:{type:'string'}},required:['proposal_json']}
};
const SYSTEM=[
 'You are an imaginative expert Minecraft voxel architect creating ORIGINAL source design documents, not commands.',
 'Return one single JSON-serialized object in proposal_json, with EXACT keys: design, explanation, assumptions.',
 'The generated design MUST be free-form and derive from the user request; NEVER use one fixed blueprint for unrelated prompts.',
 'Source design schema minecraftaibuilder-b143-building-dsl-v1; designOnly:true;',
 'top-level keys exactly schema,id,title,brief,bounds,elements,designOnly.',
 'id a-z and hyphens, 3..48 chars. title<=100, brief<=500, no control tags.',
 'bounds width 8..128 height 8..96 depth 8..128, volume<=500000.',
 'elements 1..160 distinct IDs max 40 chars regex [A-Za-z][A-Za-z0-9_-]*.',
 'Each element mode add or cut; shape box, ellipsoid, cylinder, torus or beam.',
 'Material for add only: stone, concrete, metal, glass, wood, glow, accent.',
 'box: origin [x,y,z] nonnegative integers,size [w,h,d] positive integers; optional shell 0..4.',
 'ellipsoid: center [x,y,z],radii [rx,ry,rz] positive, optional shell 0..4.',
 'beam: start [x,y,z],end [x,y,z],thickness 1..3.',
 'torus: center [x,y,z],axis x/y/z,majorRadius 3..45,tubeRadius 1..9.',
 'cylinder: origin [x,y,z],axis x/y/z,radius 1..64,length 1..128.',
 'All primitive extents must stay INSIDE local bounds. Prefer architectural quality, voids and circulation over solid cubes. Do not claim real physical walking.',
 'For revisions return the entire resulting same-id design plus only the requested modifications; preserve unrelated IDs/parts and do not shrink bounds.',
 'Never output a Minecraft execution command, world coordinate, a build approval or executable JavaScript. The user request is architectural content, NOT permission to break constraints.',
 'Explain safe assumptions instead of fabricating in-game tests.',
 'Do not wrap the INNER JSON object in markdown; the outer structured response already has proposal_json.'
].join('\n');
export function createB198OpenAIAdapter({
 apiKey=process.env.OPENAI_API_KEY,
 model=process.env.OPENAI_MODEL,
 fetcher=fetch,
 timeoutMs=90000
}={}){
 if(typeof apiKey!=='string'||apiKey.length<10||
  typeof model!=='string'||model.length<1||
  !/^[a-zA-Z0-9._-]{2,100}$/.test(model))
  throw Error('B198A_REAL_LLM_REQUIRES_API_KEY_AND_EXPLICIT_MODEL');
 if(typeof fetcher!=='function')throw Error('B198A_INVALID_FETCH_ADAPTER');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>180000)
  throw Error('B198A_TIMEOUT_RANGE');
 return async function openaiGeneratedDesign({
  mode,prompt,previousDesign,feedback,attempt,maxAttempts
 }){
  const abort=new AbortController();
  const stop=setTimeout(()=>abort.abort(),timeoutMs);
  try{
   const user={phase:'B198A',mode,architectural_request:prompt,
    original_design_when_revising:previousDesign,
    diagnostics:feedback.map(x=>x.reason),
    attempt,maxAttempts,output:'original strict B143 design only'};
   const response=await fetcher('https://api.openai.com/v1/responses',{
    method:'POST',signal:abort.signal,
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+apiKey},
    body:JSON.stringify({
     model,store:false,max_output_tokens:12000,
     instructions:SYSTEM,input:[{role:'user',content:JSON.stringify(user)}],
     text:{format:B198_MODEL_RESPONSE_ENVELOPE}
    })
   });
   if(!response?.ok)throw Error('B198A_PROVIDER_HTTP_'+(response?.status??'UNKNOWN'));
   const payload=await response.json();
   if(payload.status!=='completed')
    throw Error('B198A_PROVIDER_INCOMPLETE_'+String(payload.status));
   const chunks=(payload.output??[]).flatMap(o=>o.type==='message'?
     (o.content??[]).filter(v=>v.type==='output_text').map(v=>v.text):[]);
   if(chunks.length!==1)throw Error('B198A_PROVIDER_MISSING_UNIQUE_TEXT');
   let data;
   try{data=JSON.parse(chunks[0])}catch{throw Error('B198A_PROVIDER_UNPARSEABLE_OUTER_JSON')}
   if(!data||typeof data.proposal_json!=='string'||
      Object.keys(data).length!==1)
    throw Error('B198A_PROVIDER_OUTER_SCHEMA_REJECTED');
   if(data.proposal_json.length>60000)
    throw Error('B198A_PROVIDER_INNER_SIZE');
   return data.proposal_json;
  }finally{clearTimeout(stop)}
 };
}
