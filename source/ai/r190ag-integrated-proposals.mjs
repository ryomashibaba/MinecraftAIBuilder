/** Offline integration of AF intent; no new model contract or adoption path. */
import {createHash} from 'node:crypto';
import {inspectR190AFIntent} from './r190af-program-intent.mjs';
import {auditR190AHMeaning} from './r190ah-meaning-audit.mjs';
import {R190_SCHEMA,R190_LAYOUT_STRATEGIES,compileR190SemanticPlan,
 r190GlazingCells} from './r190-semantic-massing.mjs';
import {verifyCompiled} from './b143-building-dsl.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const json=x=>JSON.stringify(x);
const copy=x=>structuredClone(x);
const key=q=>[q.x,q.y,q.z].join(',');
const safe=()=>({modelCalls:0,worldContacts:0,worldWrites:0,
 readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},art:'ART_HOLD'});
// Structural normalization only. Every authored choice is retained verbatim.
export function r190AGSemanticProjection(p){
 const model={schema:R190_SCHEMA,id:p.id,title:p.title,brief:p.brief,
  site:copy(p.site),entrySpaceId:p.root.id,materials:copy(p.materials),
  spaces:[{...copy(p.root),parentId:null,side:null},...copy(p.children)]};
 for(const k of ['formIntent','roofFormIntent'])if(Object.hasOwn(p,k))model[k]=copy(p[k]);
 if(p.additionalPassages)model.crossConnections=copy(p.additionalPassages);
 return model;
}
/** Enumerate bounded coordinates, preserving room, face, width and height. */
function options(intent,baseline){
 const room=baseline.layout.spaces.find(s=>s.id===intent.spaceId);
 const occupied=new Set(baseline.compiled.primitives.map(v=>v.slice(0,3).join(',')));
 const has=q=>occupied.has(key(q));
 const along=['north','south'].includes(intent.face),span=along?room.w:room.d;
 const maxOffset=span-2-intent.width,maxBase=room.h-1-intent.height;
 const offsets=Array.from({length:Math.max(0,maxOffset-1)},(_,i)=>i+2)
  .sort((a,b)=>Math.abs(a-(2+maxOffset)/2)-Math.abs(b-(2+maxOffset)/2)||a-b);
 const candidates=[];
 for(const offset of offsets)for(let baseY=5;baseY<=maxBase;baseY++){
  const g={...intent,offset,baseY},cells=r190GlazingCells(room,g),frame=[];
  let valid=true;
  for(const q of cells){
   const outside={...q,x:q.x+q.dx,z:q.z+q.dz};
   const inside={...q,x:q.x-q.dx,z:q.z-q.dz};
   if(!has(q)||has(outside)||has(inside)||baseline.layout.spaces.some(s=>
    s.id!==room.id&&outside.x>=s.x&&outside.x<s.x+s.w&&
    outside.z>=s.z&&outside.z<s.z+s.d)){valid=false;break;}
   const u=along?q.x-room.x:q.z-room.z;
   if(q.y===baseY)frame.push({...q,y:q.y-1});
   if(q.y===baseY+g.height-1)frame.push({...q,y:q.y+1});
   if(u===offset)frame.push({...q,x:q.x-(along?1:0),z:q.z-(along?0:1)});
   if(u===offset+g.width-1)frame.push({...q,x:q.x+(along?1:0),z:q.z+(along?0:1)});
  }
  if(valid&&frame.every(has))candidates.push({g,cells:new Set(cells.map(key)),frame:new Set(frame.map(key))});
 }
 return candidates;
}
const intersects=(a,b)=>{for(const k of a)if(b.has(k))return true;return false;};
const geometricLayout=x=>{const {sourcePlanSha256,...geometry}=x.layout;return geometry;};
const sameLayout=(a,b)=>json(geometricLayout(a))===json(geometricLayout(b));
/** A proposal contains true source voxels but NEVER supersedes the baseline. */
export function studyR190AG(raw,{maxSearchStates=5000,maxCompileAttempts=32}={}){
 const report={schema:'minecraftaibuilder-r190ag-integrated-study-v1',
  status:'HOLD_INVALID_INTENT',originalRawSha256:typeof raw==='string'?sha(raw):null,
  originalUnmodified:true,provenance:'CALLER_IR_UNVERIFIED_NO_MODEL_INFERENCE',
  proposalAutoApplied:false,proposalApproved:false,modelAuthoredB143:false,
  independentJapaneseRequirements:'NOT_CERTIFIED',minecraftWalking:'NOT_TESTED',
  levels:1,verticalRoutes:'NOT_SUPPORTED',weatherPerformance:'NOT_TESTED',
  alternatives:[],error:null,...safe()};
 const result={report,baseline:null,proposals:[]};
 if(!Number.isSafeInteger(maxSearchStates)||maxSearchStates<1||maxSearchStates>5000||
    !Number.isSafeInteger(maxCompileAttempts)||maxCompileAttempts<1||maxCompileAttempts>32){
  report.error='R190AG_SEARCH_BUDGET';return result;
 }
 // Reuse the frozen AF contract validation. Its provisional windows are
 // diagnostic only; AG solves a separate joint set without changing AF.
 const af=inspectR190AFIntent(raw);
 report.afComparison={status:af.status,error:af.error,
  originalNoGlassGeometrySha256:af.sourcePreview?.geometrySha256??null};
 if(af.error||!af.sourcePreview){report.error=af.error;return result;}
 const p=JSON.parse(raw),model=r190AGSemanticProjection(p),intents=p.daylightIntents??[];
 report.preservedAuthoredProgramSha256=sha(json(p));
 report.representationMapping={rootNullRelationsAdded:true,
  additionalPassagesRenamedToCrossConnections:true,authoredValuesChanged:[]};
 for(const strategy of R190_LAYOUT_STRATEGIES){
  const entry={strategy,status:'HOLD_NO_JOINT_CANDIDATE',searchStates:0,
   compileAttempts:0,rejectedCompilations:[],candidateCounts:[],proposal:null};
  report.alternatives.push(entry);
  let baseline;
  try{baseline=compileR190SemanticPlan(model,{layoutStrategy:strategy});}
  catch(e){entry.status='HOLD_BASELINE_GEOMETRY';entry.error=e.message;continue;}
  if(!result.baseline)result.baseline=baseline;
  entry.baselineGeometrySha256=baseline.compiled.geometrySha256;
  entry.programMeaningAudit=auditR190AHMeaning(model,baseline.layout,
   {sourceRoutesVerified:baseline.audit.allProgramSpacesReachable===true});
  entry.unapprovedHostPlacement={spaces:copy(baseline.layout.spaces),
   portals:copy(baseline.layout.portals),sitePlacement:copy(baseline.layout.sitePlacement),
   adopted:false,authoredRoomDimensionsOrRelationsChanged:false};
  const choices=intents.map(i=>options(i,baseline));
  entry.candidateCounts=choices.map(c=>c.length);
  if(!intents.length){entry.status='BASELINE_ONLY_NO_INVENTED_FEATURES';continue;}
  let exhausted=false,solved=null;
  const selected=[];
  function search(at){
   if(at===choices.length){
    if(entry.compileAttempts>=maxCompileAttempts){exhausted=true;return false;}
    entry.compileAttempts++;
    const windows=selected.map(s=>copy(s.g));
    try{
     const trial=compileR190SemanticPlan({...model,glazedOpenings:windows},{layoutStrategy:strategy});
     const required=intents.reduce((s,i)=>s+i.width*i.height,0);
     if(!sameLayout(baseline,trial)||!verifyCompiled(trial.design,trial.compiled)||
        trial.audit.realGlazingCells!==required||trial.audit.glazedOpenings.length!==intents.length||
        !trial.audit.allProgramSpacesReachable||trial.audit.witnesses.length!==model.spaces.length)
      throw Error('R190AG_SOURCE_OR_PROGRAM_MISMATCH');
     // No non-window primitive may change (including roof, form and portals).
     const glass=new Set(selected.flatMap(s=>[...s.cells]));
     const unaffected=x=>x.compiled.primitives.filter(v=>!glass.has(v.slice(0,3).join(',')));
     if(json(unaffected(baseline))!==json(unaffected(trial)))throw Error('R190AG_UNDECLARED_GEOMETRY_CHANGE');
     solved={trial,windows,required};return true;
    }catch(e){entry.rejectedCompilations.push(String(e.message).slice(0,180));return false;}
   }
   for(const candidate of choices[at]){
    if(entry.searchStates>=maxSearchStates){exhausted=true;return false;}
    entry.searchStates++;
    if(selected.some(s=>intersects(s.cells,candidate.cells)||intersects(s.cells,candidate.frame)||
      intersects(s.frame,candidate.cells)))continue;
    selected.push(candidate);
    if(search(at+1))return true;
    selected.pop();if(exhausted)return false;
   }
   return false;
  }
  search(0);
  if(!solved){entry.status=exhausted?'HOLD_SEARCH_BUDGET_EXHAUSTED':'HOLD_NO_JOINT_CANDIDATE_WITHIN_FIXED_LAYOUT';continue;}
  const {trial,windows,required}=solved;
  entry.status='UNAPPROVED_INTEGRATED_SOURCE_PROPOSAL';
  entry.proposal={originalRawSha256:report.originalRawSha256,
   hostDerivedSourceSha256:trial.compiled.sourceSha256,
   hostDerivedGeometrySha256:trial.compiled.geometrySha256,
   windows:windows.map((g,i)=>({intentPath:'daylightIntents['+i+']',
    requested:copy(intents[i]),hostProposed:copy(g),approved:false})),
   sourceGlassCells:required,allProgramSpacesReachable:true,
   originalBaselineOverwritten:false,authoredValuesChanged:[],
   geometryChange:'ONLY_REQUESTED_WINDOW_CELLS_WALL_TO_GLASS',
   programMeaningAudit:auditR190AHMeaning(model,trial.layout,
    {sourceRoutesVerified:trial.audit.allProgramSpacesReachable===true}),
   roofForm:trial.audit.roofForm,facetedEnvelope:trial.audit.facetedEnvelope,
   outdoorCourtCount:trial.audit.outdoorCourtCount,nonTreePortalCount:trial.audit.nonTreePortalCount,
   independentUseAndArtEvaluation:'NOT_CERTIFIED_ART_HOLD'};
  result.proposals.push({strategy,baseline,trial});
 }
 report.status=result.proposals.length?'HOLD_PROPOSALS_REQUIRE_SEPARATE_REVIEW':
  intents.length?'HOLD_NO_INTEGRATED_PROPOSAL':'PROVISIONAL_BASELINE_ONLY_ART_HOLD';
 return result;
}
