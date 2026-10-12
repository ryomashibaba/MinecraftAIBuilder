#!/usr/bin/env node
/** B50 static-only replay: never imports/runs the real planner or writes without --export. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB49FromSource} from '../../b49/main/run-b49.mjs';
import {compileB50,verifyB50} from './compile-b50.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const SRC=path.resolve(ROOT,'../../../');
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourcePins={planner:'23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8'};
/** Only the callsite is present in the freeze archive. No function-body parity inferred. */
export function inspectB50SourceEvidence(){
 const p=path.join(SRC,'dev/reference-engine-general-building-planner.js');
 const buf=fs.readFileSync(p),text=buf.toString('utf8'),h=hash(buf);
 if(h!==sourcePins.planner)throw Error('B50_PLANNER_SOURCE_PIN');
 const facadeCallsites=[...text.matchAll(/\bcomposeFacade\(c, quality, e, f, base, top, line,/g)].length;
 const qualityCompositionCallsites=[...text.matchAll(/\bqualityComposition\(c\)/g)].length;
 if(facadeCallsites!==1||qualityCompositionCallsites!==1)throw Error('B50_PLANNER_CALLSITE_DRIFT');
 const missingSources=['dev/architectural-quality.js','modules/architectural-library.js','dev/building-grammar.js'];
 // Note: building-grammar is a pinned reference in B47, but its executable sibling is absent.
 if(missingSources.some(s=>fs.existsSync(path.join(SRC,s))))throw Error('B50_SOURCE_AVAILABILITY_CHANGED');
 return {plannerSha256:h,facadeCallsites,qualityCompositionCallsites,
  realComposeFacadeImplementationPresent:false,realQualityCompositionImplementationPresent:false,
  moduleLibraryImplementationPresent:false,missingSources,
  plannerExecuted:false,status:'CALLSITE_ONLY_NOT_IMPLEMENTATION_PARITY'};
}
export function buildB50FromSource(){
 const {report:b49,b48,b47,b46,b45,structure,main}=buildB49FromSource();
 const evidence=inspectB50SourceEvidence();
 const report=compileB50(b49,b48,b47,b46,b45,structure,main,evidence);
 verifyB50(report,b49,b48,b47,b46,b45,structure,main,evidence);
 return {report,b49,b48,b47,b46,b45,structure,main,evidence};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length===1&&args[0]!=='--export'))throw Error('B50_EXPORT_FLAG_ONLY');
 const {report}=buildB50FromSource();
 if(args.length)fs.writeFileSync(path.join(ROOT,'B50_FACADE_DESIGN_REVIEW.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log('B50_FACADE_REVIEW_PASS',JSON.stringify(report.totals));
}
