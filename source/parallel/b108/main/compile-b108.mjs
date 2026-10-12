/** B108 repairs exported B107 visual review without changing original stages.
 * Render-only annotations; no Minecraft world or block commands.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assembleB107,writeB107Review,validateB107Report} from '../../b107/main/compile-b107.mjs';
import {improveB108Scene,validateB108Scene,B108_LAYERS,B108_COLORS} from './b108-fidelity.mjs';
function swap(html,a,b){
 if(!html.includes(a))throw Error('B108_TEMPLATE_MISMATCH:'+a.slice(0,30));
 return html.replace(a,b);
}
export function compileB108(){
 const bundle=assembleB107();
 if(!validateB107Report(bundle.report))throw Error('B108_PARENT_INVALID');
 const refined=bundle.baseScenes.map((s,i)=>improveB108Scene(s,bundle.polishScenes[i]));
 for(let i=0;i<refined.length;i++)
  if(!validateB108Scene(refined[i],bundle.baseScenes[i],bundle.polishScenes[i]))
   throw Error('B108_INVALID_REFINED_SCENE');
 const total=(field)=>refined.reduce((n,s)=>n+s.stats[field],0);
 const report={schema:'minecraftaibuilder-b108-browser-review-v1',
  typologies:5,variants:15,conceptualFloors:66,conceptualRooms:279,
  roofCells:total('roofSculptCells'),lowerWallCells:total('facadeLowerBands'),
  upperWallCells:total('facadeUpperBands'),
  visualOnlyShapes:total('totalReviewOnlyShapes'),
  previousB107HashIds:bundle.polishScenes.map(p=>p.integritySha256),
  safety:'NOT_PREPARED',nineGates:bundle.report.gates.map(x=>({...x})),
  physicalRoofCertified:false,humanAestheticsReviewed:false,
  certifiedEducationStates:0,createdWorldBlocks:0,worldContacts:0,
  constructionApproved:false,worldCoordinates:null,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB108Report(report))throw Error('B108_REPORT_VALIDATION_FAILED');
 return {bundle,refined,report};
}
export function validateB108Report(r){
 return r?.schema==='minecraftaibuilder-b108-browser-review-v1'&&
 r.typologies===5&&r.variants===15&&r.conceptualFloors===66&&r.conceptualRooms===279&&
 r.roofCells===9203&&r.lowerWallCells>0&&r.upperWallCells>0&&
 r.visualOnlyShapes===r.roofCells+r.lowerWallCells+r.upperWallCells&&
 r.previousB107HashIds?.length===15&&r.safety==='NOT_PREPARED'&&
 r.nineGates?.length===9&&r.nineGates.every(g=>g.status==='BLOCKED')&&
 r.physicalRoofCertified===false&&r.humanAestheticsReviewed===false&&
 r.certifiedEducationStates===0&&r.createdWorldBlocks===0&&r.worldContacts===0&&
 r.constructionApproved===false&&r.worldCoordinates===null&&
 r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0&&
 r.BuildPlan.commandCount===0&&r.BuildPlan.worldCoordinates===null;
}
export function enhanceB108HTML(html,bundle){
 if(!validateB108Report(bundle?.report)||bundle.refined?.length!==15)throw Error('B108_BAD_EXPORT');
 const marker='const payload=',start=html.indexOf(marker),
  end=html.indexOf(';\nconst scenes=payload.scenes;',start);
 if(start<0||end<0)throw Error('B108_MISSING_PAYLOAD');
 const payload=JSON.parse(html.slice(start+marker.length,end));
 if(payload.scenes?.length!==15||payload.polish?.length!==15)throw Error('B108_MISSING_PARENT_SCENES');
 for(let i=0;i<15;i++)if(payload.scenes[i].sceneSha256!==bundle.bundle.baseScenes[i].sceneSha256||
 payload.polish[i].integritySha256!==bundle.bundle.polishScenes[i].integritySha256)
  throw Error('B108_TAMPERED_PARENT_HTML');
 payload.refinements=bundle.refined;
 payload.refinementColors=B108_COLORS;
 html=html.slice(0,start)+marker+JSON.stringify(payload).replaceAll('<','\\u003c')+html.slice(end);
 html=swap(html,'B107 3D Architecture Review','B108 Browser-Reviewed Architecture');
 html=swap(html,'B107 建物全体3Dレビュー・外装/内装造形','B108 建物全体の外観・内部レビュー');
 html=swap(html,'B105/B106の実測ローカル形状とB107の追加設計形状を描画。',
  'ソース位置を保った外壁・屋根の表示補正と実ブラウザーQA。');
 const root='<label class="toggle"><input type="checkbox" data-layer="CORE_RAILING" checked> 概念的な手すり</label>';
 const names={'FACADE_LOWER_BAND':'階の下端の連続外壁','FACADE_UPPER_BAND':'階の上端の連続外壁',
  'SCULPTED_ROOF':'立体的な屋根輪郭'};
 const toggles=B108_LAYERS.map(k=>'<label class="toggle"><input type="checkbox" data-layer="'+k+
  '" checked> '+names[k]+'</label>').join('\n');
 html=swap(html,root,root+'\n'+toggles);
 html=swap(html,'const polishColors=payload.colors;','const polishColors=payload.colors;\n'+
  'const refined=payload.refinements;\nconst refinementColors=payload.refinementColors;');
 html=swap(html,' const extent=scene.bounds;',
  ' for(const b of refined[idx].shapes){if(b.level>cutoff||!options[b.kind]?.checked)continue;\n'+
  ' active.push({p:[b.x,b.y,b.z,-1,b.level],kind:b.kind,shape:b});}\n const extent=scene.bounds;');
 html=swap(html,
  'const depth=p=>{const q=p.p;return (q[0]+q[2])*Math.sin(yaw+0.1)+(q[1]+0.5)*Math.cos(pitch);};',
  'const depth=item=>{const q=item.p,b=item.shape;'+
  'const x=q[0]+(b?.w??1)/2,y=q[1]+(b?.h??1)/2,z=q[2]+(b?.d??1)/2;'+
  'return y*Math.sin(pitch)+(x*Math.sin(yaw)+z*Math.cos(yaw))*Math.cos(pitch);};');
 html=swap(html,'if(v.shape)color=polishColors[v.shape.material]||color;',
  'if(v.shape)color=refinementColors[v.shape.material]||polishColors[v.shape.material]||color;');
 html=swap(html,'function draw(){',
  'let b108LastFrameMs=0;\nconst b108TintCache=new Map();\n'+
  'function b108Tint(hex,m){const k=hex+m;if(b108TintCache.has(k))return b108TintCache.get(k);'+
  'const n=parseInt(hex.slice(1),16),c=i=>Math.round(Math.min(255,((n>>i)&255)*m));'+
  'const v="rgb("+c(16)+","+c(8)+","+c(0)+")";b108TintCache.set(k,v);return v;}\n'+
  'function draw(){const b108Start=performance.now();');
 html=swap(html,'ctx.closePath();ctx.fillStyle=color;ctx.fill();',
  'ctx.closePath();ctx.fillStyle=b108Tint(color,f===faces[0]?1.11:f===faces[1]?.82:f===faces[2]?.94:.75);ctx.fill();');
 html=swap(html,
  'active.length+" / "+scene.primitives.length+" 個のローカル概念セル',
  'active.length+" / "+(scene.primitives.length+upgrade.visualShapes.length+refined[idx].shapes.length)+" 個のローカル概念セル');
 html=swap(html,' ctx.globalAlpha=1;\n el("renderInfo")',
  ' ctx.globalAlpha=1;\n b108LastFrameMs=performance.now()-b108Start;\n el("renderInfo")');
 html=swap(html,'+" 面描画。実Minecraftブロック',
  '+" 面描画 ｜ 描画 "+b108LastFrameMs.toFixed(1)+"ms。実Minecraftブロック');
 // Deliberately default to readable exterior, not interior debug overlays.
 html=swap(html,
  'options.ROOF_CAP_PROXY.checked=false;\noptions.FURNITURE_PLACEHOLDER.checked=false;\n'+
  'options.WINDOW_GLAZING_PROXY.checked=false;\nsetScene();',
  'options.ROOF_CAP_PROXY.checked=false;\noptions.FURNITURE_PLACEHOLDER.checked=false;\n'+
  'options.WINDOW_GLAZING_PROXY.checked=false;\n'+
  'for(const k of ["ROOM_FLOOR_TRACE","GALLERY_FLOOR_TRACE","CORE_LANDING_TRACE",'+
  '"EXTERIOR_PORTAL_VOID_PROXY","STAIR_DIAGRAM","CORE_RAILING","FACADE_RHYTHM"])options[k].checked=false;\n'+
  'window.__B108_QA={snapshot:()=>({id:current().id,idx,cutoff:Number(floor.value),'+
  'allFloors:allLevels.checked,yaw,pitch,zoom,frameMs:b108LastFrameMs,'+
  'status:el("renderInfo").textContent,visible:Object.keys(options).filter(k=>options[k].checked)}),'+
  'data:()=>({count:scenes.length,refinements:refined.length,constructionApproved:false,worldContacts:0})};\n'+
  'setScene();');
 html=swap(html,
  'options.ROOF_CAP_PROXY.checked=true;options.FACADE_PANEL_PROXY.checked=true;',
  'options.ROOF_CAP_PROXY.checked=false;options.FACADE_PANEL_PROXY.checked=true;'+
  'options.SCULPTED_ROOF.checked=true;options.FACADE_LOWER_BAND.checked=true;'+
  'options.FACADE_UPPER_BAND.checked=true;options.WINDOW_GLASS.checked=true;'+
  'options.WINDOW_FRAME.checked=true;'+
  'for(const k of ["ROOM_FLOOR_TRACE","GALLERY_FLOOR_TRACE","CORE_LANDING_TRACE",'+
  '"EXTERIOR_PORTAL_VOID_PROXY","STAIR_DIAGRAM","CORE_RAILING"])options[k].checked=false;');
 html=swap(html,
  'options.ROOF_CAP_PROXY.checked=false;options.ROOM_FLOOR_TRACE.checked=true;',
  'options.ROOF_CAP_PROXY.checked=false;options.SCULPTED_ROOF.checked=false;'+
  'options.ROOF_FORM.checked=false;options.FACADE_PANEL_PROXY.checked=false;'+
  'options.FACADE_LOWER_BAND.checked=false;options.FACADE_UPPER_BAND.checked=false;'+
  'options.WINDOW_GLASS.checked=false;options.WINDOW_FRAME.checked=false;'+
  'options.INTERIOR_FURNITURE.checked=true;options.STAIR_DIAGRAM.checked=true;'+
  'options.CORE_RAILING.checked=true;options.ROOM_FLOOR_TRACE.checked=true;');
 if(html.includes('fetch(')||html.includes('<script src=')||
  html.includes('__B106_SCENE_PAYLOAD__'))throw Error('B108_HTML_NETWORK_UNSAFE');
 return html;
}
export function writeB108(bundle,outDir){
 if(!validateB108Report(bundle?.report))throw Error('B108_UNSAFE_EXPORT');
 const parent=path.join(outDir,'temporary-b107'),files=writeB107Review(bundle.bundle,parent);
 const html=enhanceB108HTML(fs.readFileSync(files.htmlPath,'utf8'),bundle);
 fs.mkdirSync(outDir,{recursive:true});
 const htmlPath=path.join(outDir,'B108_Improved_3D_Review_15_Buildings.html');
 const reportPath=path.join(outDir,'B108_Source_Anchored_Visual_QA.json');
 fs.writeFileSync(htmlPath,html);
 fs.writeFileSync(reportPath,JSON.stringify(bundle.report,null,2)+'\n');
 fs.rmSync(parent,{force:true,recursive:true});
 return {htmlPath,reportPath,bytes:Buffer.byteLength(html),buildings:15};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const b=compileB108(),output=process.argv.includes('--write-preview')?
  writeB108(b,path.resolve('b108-preview-output')):null;
 console.log(JSON.stringify({totals:b.report,output},null,2));
}
