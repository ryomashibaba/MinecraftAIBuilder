/**
 * Local read-only comparison for actual B143 source scenes.
 * Never interprets SOURCE or distinct hashes as aesthetic certification.
 * All model/user strings are HTML-escaped and no external resources loaded.
 */
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const print=value=>typeof value==='object'?JSON.stringify(value):String(value);
export function renderR125BatchComparison(briefs,report){
 const sections=report.completed.map(row=>{
  const brief=briefs.find(b=>b.id===row.id)?.prompt??'';
  const program=(row.authoredProgram??[]).map((l,i)=>
   '<li>Level '+(i+1)+' ('+esc(l.splitAxis)+'): '+
    l.spaces.map(s=>esc(s.purpose)+
    (s.fixtures?.length?' ['+esc(s.fixtures.join(', '))+']':
     s.fixture?' ['+esc(s.fixture)+']':'')+
    (s.fixtureDetail?' ('+esc(s.fixtureDetail)+')':'')+
    (s.daylight?' {daylight '+esc(s.daylight)+'}':'')).join(' / ')+'</li>').join('');
  const authored=row.authoredForm?Object.entries(row.authoredForm)
   .map(([key,value])=>esc(key)+': '+esc(print(value))).join(' · '):
   'No validated original ArchitecturePlan';
  const findings=[row.failureReason,...(row.sourceIssues??[])]
   .filter(Boolean).map(x=>esc(print(x))).join(' | ');
  const hasViewer=row.review3d==='TRUE_B143_HTML_GENERATED_ART_PENDING';
  const rooms=row.authoredProgram?.reduce((n,l)=>n+l.spaces.length,0)??null;
  const withoutEquipment=(row.authoredProgram??[])
   .flatMap(level=>level.spaces.filter(s=>
    !(s.fixture||(Array.isArray(s.fixtures)&&s.fixtures.length>0)))
    .map(s=>s.purpose));
  const sourceEvidence=row.sourceVerified===true?
   '<p class="muted"><strong>True SOURCE evidence, not ART:</strong> '+
   'rooms '+esc(rooms)+' · equipment '+esc(row.modelChosenFixtures??0)+
   ' · reached service '+esc(row.fixtureServiceReached??0)+'/'+
   esc(row.fixtureServiceTotal??0)+' · voxels '+esc(row.occupiedVoxels??'?')+'</p>'+
   '<p class="muted">Routes '+esc(row.sourceRouteStatus??'UNKNOWN')+
   ' · circulation '+esc(row.circulationStatus??'UNKNOWN')+
   ' · floors '+esc(row.programFloorStatus??'UNKNOWN')+
   ' · static risk flags '+esc(row.visualHighRiskCount??'?')+
   ' (not human art judgement)</p>'+
   '<p class="muted">Rooms without authored equipment: '+
   esc(withoutEquipment.length)+(withoutEquipment.length?
    ' ('+withoutEquipment.map(esc).join(' / ')+')':'')+
   ' — may be intentional, not an automatic failure.</p>':
   '<p class="issue">No verified SOURCE building: equipment/access quality NOT DETERMINED.</p>';
  // ids are regex-validated BEFORE any local model POST or filesystem work.
  const relative='./'+row.id+'/B143_SOURCE_3D_REVIEW_ONLY.html';
  return '<section><h2>'+esc(row.id)+'</h2><p><strong>'+
   esc(row.status)+'</strong></p><p>'+esc(brief)+'</p>'+
   '<p class="muted">'+authored+'</p><ul>'+program+'</ul>'+sourceEvidence+
   (findings?'<p class="issue">'+findings+'</p>':'')+
   (hasViewer?'<iframe class="mab-review" sandbox="allow-scripts" loading="lazy" src="'+
     relative+'" title="'+esc(row.id)+' true B143 3D"></iframe>'+
     '<p><a href="'+relative+'">Open full-size true B143 3D</a></p>':
     '<p class="issue">No 3D scene (HOLD)</p>')+
   '<p class="muted">Model-selected real daylight: '+esc(row.modelChosenDaylight??0)+
   ' — '+(row.daylightSourceWindows??[]).map(x=>
    esc(x.kind+' on '+x.face+' exterior')).join(' / ')+'</p>'+
   '<p class="muted">Education export: '+esc(row.makeCodeStatus??'NOT_ATTEMPTED')+
   (row.makeCodeReason?' — '+esc(row.makeCodeReason):'')+'</p>'+
   (row.makeCodeStatus==='OFFLINE_CODE_GENERATED_ONLY'?
    '<p><a href="./'+row.id+'/MAKECODE_EDUCATION_SOURCE_ONLY.ts">'+
    'Open B143-derived test-world MakeCode (not executed)</a></p>':'')+
   '<p class="muted">Source SHA: '+esc(row.sourceSha256??'HOLD')+
   ' · Geometry SHA: '+esc(row.geometrySha256??'HOLD')+'</p></section>';
 }).join('');
 const untried=briefs.filter(x=>!report.completed.some(y=>y.id===x.id))
  .map(x=>'<p>NOT ATTEMPTED: '+esc(x.id)+' — '+esc(x.prompt)+'</p>').join('');
 const form=report.modelAuthoredFormFamiliesDistinct===false?
  'REPEATED model-authored form families. Architectural diversity NOT CERTIFIED.':
  report.modelAuthoredFormFamiliesDistinct===true?
  'Distinct model-authored form families. Artistic quality still NOT CERTIFIED.':
  'Model-authored form diversity NOT DETERMINED.';
 return '<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>MAB V11 — Real B143 compare</title><style>'+
 'body{margin:0;font:15px system-ui,sans-serif;color:#eaf3fa;background:#0b1725}'+
 'header{padding:18px 24px;background:#17283b}h1{font-size:1.25rem}'+
 'main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:12px;padding:16px}'+
 '.review-controls{display:flex;flex-wrap:wrap;gap:8px;padding:8px 0}'+
 '.review-controls button{border:1px solid #647b8d;background:#203950;color:#fff;border-radius:7px;padding:9px 13px;cursor:pointer}'+
 '.review-controls button[aria-pressed=true]{border-color:#a6e2eb;background:#24536b}'+
 'section{border:1px solid #3f596e;border-radius:9px;min-width:0;padding:12px}'+
 'iframe{width:100%;height:470px;border:1px solid #647b8d;background:#162739}'+
 'a{color:#96d6fd}.muted{font-size:.82rem;color:#bacbd9;overflow-wrap:anywhere}'+
 '.issue{color:#f9c5a5}li{margin:4px 0}footer{padding:16px 24px}</style></head><body>'+
 '<header><h1>MinecraftAIBuilder V11 — TRUE B143 three-brief review</h1>'+
 '<p>MODEL '+esc(report.model)+' · Attempts '+esc(report.attempted)+
 '/'+esc(report.planned)+' · All SOURCE verified: '+
 esc(report.allSourceVerified)+'</p><p>'+esc(form)+'</p>'+
 '<p>Original model semantics above; actual HOST geometry below. '+
 'Human ART NOT REVIEWED · Minecraft walking NOT TESTED · No world construction.</p>'+
 '<p>Experiment: '+esc(report.experimentOutcome??'NOT_STARTED')+
 ' · SOURCE passes '+esc(report.sourcePassCount??0)+
 '/'+esc(report.planned)+' · Original responses '+
 esc(report.originalResponseCount??0)+
 '/'+esc(report.planned)+'</p>'+
 '<p>Transport stop: '+esc(report.stopReason??'none')+'</p>'+
 '<div class="review-controls"><button type="button" id="allExterior" aria-pressed="true">3棟の外観</button>'+
 '<button type="button" id="allInterior" aria-pressed="false">3棟の断面・内部</button></div>'+
 '<p>表示切替は3Dカメラのみを変更します。SOURCEや実ワールドは変更しません。</p></header>'+
 '<main>'+sections+'</main><footer>'+untried+'</footer>'+
 '<script>(function(){ "use strict";'+
 'let selected="exterior";'+
 'const frames=Array.from(document.querySelectorAll("iframe.mab-review"));'+
 'function send(frame){if(frame.contentWindow)frame.contentWindow.postMessage({type:"mab-r125-review-v1",mode:selected},"*");}'+
 'function choose(mode){selected=mode;document.getElementById("allExterior").setAttribute("aria-pressed",String(mode==="exterior"));'+
 'document.getElementById("allInterior").setAttribute("aria-pressed",String(mode==="interior"));'+
 'frames.forEach(send);}'+
 'frames.forEach(frame=>frame.addEventListener("load",()=>send(frame)));'+
 'document.getElementById("allExterior").addEventListener("click",()=>choose("exterior"));'+
 'document.getElementById("allInterior").addEventListener("click",()=>choose("interior"));'+
 '})();</script></body></html>';
}
