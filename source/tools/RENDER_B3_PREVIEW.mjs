// SVG-only static/offline HTML preview generator: never loads engine, never executes JS in HTML.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const htmlSafe=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cellMasks=(rects,w,d,f)=>{const out=new Uint8Array(w*d);
 for(const r of rects)if(f>=r.start&&f<r.end)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)out[z*w+x]=1;
 return out;
};
const svg=(c,f)=>{const w=c.dimensions.width,d=c.dimensions.depth;
 const a=cellMasks(c.conceptOriginalLocalRectangles,w,d,f),b=cellMasks(c.sourcePredictedUnorientedRectangles,w,d,f);
 const step=7,pad=12,rects=[];
 for(let z=0;z<d;z++)for(let x=0;x<w;x++){
  const idx=z*w+x,cl=a[idx]&&b[idx]?'#36c0ae':a[idx]?'#f16b83':b[idx]?'#efb761':'#172239';
  rects.push(`<rect x="${pad+x*step}" y="${pad+z*step}" width="${step-1}" height="${step-1}" fill="${cl}"/>`);
 }
 return `<svg role="img" aria-label="Concept vs engine source pinned footprint; floor ${f+1}" viewBox="0 0 ${w*step+pad*2} ${d*step+pad*2}" xmlns="http://www.w3.org/2000/svg">${rects.join('')}</svg>`;
};
function valid(o){const {reportSha256,...content}=o;
 if(o.schema!=='minecraftaibuilder-step8b-b3-geometry-preview-v1'||sha(JSON.stringify(content))!==reportSha256||
    o.BuildPlan?.status!=='NOT_PREPARED'||o.BuildPlan.operations.length!==0||o.BuildPlan.commandCount!==0||
    o.safety.executionAllowed!==false||o.safety.constructionApproved!==false||o.deploymentGate!=='BLOCKED')
  throw Error('UNTRUSTED_REPORT_OR_CONSTRUCTION_RISK');
 for(const c of o.candidates)if(c.BuildPlan?.status!=='NOT_PREPARED'||c.BuildPlan?.commandCount!==0||c.BuildPlan?.operations?.length!==0||c.worldAnchor!==null||c.worldCoordinates!==null)throw Error('UNSAFE_CANDIDATE');
}
function generate(o){valid(o);
 const sections=o.candidates.map(c=>{const f0=0,fTop=c.dimensions.floors-1,delta=c.comparison;
  return `<section class="panel"><div><span class="tag">${htmlSafe(c.program)}</span><span class="tag">${htmlSafe(c.massing)}</span><span class="tag">${htmlSafe(c.orientation)}</span></div>
  <h2>${htmlSafe(c.id)} · ${delta.match?'Concept occupancy matches':'Occupancy delta detected'}</h2>
  <p>Style: ${htmlSafe(c.style)} · ${c.dimensions.width} × ${c.dimensions.depth} · ${c.dimensions.floors} floors · Wing ${c.variation.wing} · Setback ${c.variation.setback}</p>
  <div class="views"><div><h3>Ground floor · F1</h3>${svg(c,f0)}</div><div><h3>Top floor · F${c.dimensions.floors}</h3>${svg(c,fTop)}</div></div>
  <p class="delta">New source-only cells (all floors): ${delta.newlyOccupiedCellsByFloor.reduce((a,b)=>a+b,0)}. Concept-only cells (all floors): ${delta.noLongerOccupiedCellsByFloor.reduce((a,b)=>a+b,0)}.</p>
  <p class="small">Predicted pre-anchor geometry; style/seed variation applied from pinned source. Not an executed engine or world blueprint.</p></section>`;
 }).join('');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><title>MinecraftAIBuilder B3 – offline footprint preview</title><style>
 :root{color-scheme:dark}body{margin:0;background:#0a1020;color:#e8f0ff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.55}.wrap{max-width:1080px;margin:auto;padding:24px 18px 50px}.intro{padding:20px 0 10px}h1{font-size:clamp(1.5rem,3vw,2.3rem);margin:0 0 6px}h2{font-size:1.13rem;margin:12px 0 6px}h3{font-size:.88rem;font-weight:600;color:#adbfde;margin:0 0 9px}.small{font-size:.8rem;color:#9baac9}.meta{color:#b9cae7}.panel{border:1px solid #33405e;border-radius:14px;padding:20px;margin:16px 0;background:#141e33}.tag{border:1px solid #4b5d7e;color:#cfdcf7;border-radius:20px;padding:3px 9px;font-size:.76rem;margin:0 6px 0 0}.views{display:grid;grid-template-columns:1fr 1fr;gap:18px}.views>div{min-width:0}.views svg{display:block;width:100%;max-height:290px;object-fit:contain;border:1px solid #25314b;border-radius:10px;background:#10182b}.legend{display:flex;flex-wrap:wrap;gap:18px;align-items:center;padding:12px 0}.legend span{font-size:.83rem}.square{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px}.delta{color:#e1edff;font-size:.9rem}footer{border-top:1px solid #303e59;margin-top:22px;padding-top:18px;color:#acbad2;font-size:.85rem}@media(max-width:680px){.views{grid-template-columns:1fr}}
 </style></head><body><main class="wrap"><header class="intro"><h1>Step 8B / B3 · Geometry compatibility preview</h1><p class="meta">Read-only static source prediction • ${o.candidates.length} candidate(s) • 8 massings × 4 orientations × 3 seeds × 3 styles = ${o.styleSeedCases} cross checks</p><p><strong>NOT PREPARED</strong> · No material IDs, world coordinates, commands or construction.</p></header><nav class="legend" aria-label="color legend"><span><i class="square" style="background:#36c0ae"></i>Overlap</span><span><i class="square" style="background:#f16b83"></i>Concept only</span><span><i class="square" style="background:#efb761"></i>Source prediction only</span><span><i class="square" style="background:#172239"></i>Vacant</span></nav>${sections}<footer>Source manifest SHA-256: ${htmlSafe(o.sourceManifestSha256)}<p>These are pure comparisons of schematic floor occupancy, not verified Minecraft voxel construction. Deployment gate: BLOCKED. Actual engine runtime identity, site anchor and Education material IDs are unverified.</p></footer></main></body></html>`;
}
const a=process.argv.slice(2);
if(a.length!==2){console.error('Usage: node tools/RENDER_B3_PREVIEW.mjs <B3_report.json> <NEW_preview.html>');process.exitCode=2;}
else try{const r=JSON.parse(fs.readFileSync(a[0],'utf8')),out=generate(r);if(!fs.existsSync(path.dirname(path.resolve(a[1]))))throw Error('OUTPUT_DIR_MISSING');fs.writeFileSync(a[1],out,{flag:'wx',mode:0o600});console.log('B3_HTML_PREVIEW_CREATED',a[1]);}
catch(e){console.error('B3_PREVIEW_BLOCKED',e.message);process.exitCode=1;}
