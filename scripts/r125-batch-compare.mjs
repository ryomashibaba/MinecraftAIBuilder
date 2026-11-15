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
    (s.fixture?' ['+esc(s.fixture)+']':'')).join(' / ')+'</li>').join('');
  const authored=row.authoredForm?Object.entries(row.authoredForm)
   .map(([key,value])=>esc(key)+': '+esc(print(value))).join(' · '):
   'No validated original ArchitecturePlan';
  const findings=[row.failureReason,...(row.sourceIssues??[])]
   .filter(Boolean).map(x=>esc(print(x))).join(' | ');
  const hasViewer=row.review3d==='TRUE_B143_HTML_GENERATED_ART_PENDING';
  // ids are regex-validated BEFORE any local model POST or filesystem work.
  const relative='./'+row.id+'/B143_SOURCE_3D_REVIEW_ONLY.html';
  return '<section><h2>'+esc(row.id)+'</h2><p><strong>'+
   esc(row.status)+'</strong></p><p>'+esc(brief)+'</p>'+
   '<p class="muted">'+authored+'</p><ul>'+program+'</ul>'+
   (findings?'<p class="issue">'+findings+'</p>':'')+
   (hasViewer?'<iframe sandbox="allow-scripts" loading="lazy" src="'+
     relative+'" title="'+esc(row.id)+' true B143 3D"></iframe>'+
     '<p><a href="'+relative+'">Open full-size true B143 3D</a></p>':
     '<p class="issue">No 3D scene (HOLD)</p>')+
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
 '<p>Batch stop: '+esc(report.stopReason??'none')+'</p></header>'+
 '<main>'+sections+'</main><footer>'+untried+'</footer></body></html>';
}
