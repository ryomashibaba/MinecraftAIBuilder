/** B198E optional truly HUMAN score capture in offline source reviewer.
 * No automatic scores, no default scores and no network: explicit user
 * observation + 0–4 rating + textual evidence for EACH original criterion.
 * The downloaded JSON reports SELF-REPORTED, NOT independently certified.
 */
export function makeHumanRubricUI(report){
 const entries=[...report.creations,...report.revisions];
 const data=Object.fromEntries(entries.map(v=>[
  v.caseId,{
   caseId:v.caseId,sourceSha256:v.sourceSha256,
   criteria:v.humanSemanticRubric.rubric.map(r=>({
    criterionId:r.criterionId,description:r.description}))
  }
 ]));
 const safe=JSON.stringify(data).replaceAll('<','\\u003c')
  .replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
 const panel='<section class="info" id="b198e-human-review">'+
  '<strong>建築の意味・美しさを人間が評価（任意）</strong>'+
  '<p>各設計を3Dで見て、未評価の項目を0〜4点で採点し、'+
  'なぜそう判断したかを各15字以上で記録してください。'+
  'AIは自分の建築へ勝手に点数を付けません。</p>'+
  '<div id="b198e-review-fields"></div>'+
  '<button id="b198e-export-score" disabled type="button">'+
  '評価をJSONで保存（全項目の根拠が必要）</button>'+
  '<p id="b198e-review-status" aria-live="polite">未評価</p>'+
  '<p>この操作はローカルでJSONを生成するだけで、評価は自動認証されません。'+
  'サーバーへの送信・Minecraft施工はありません。</p></section>';
 const script=[
  '<script id="b198e-human-review-script">',
  '"use strict";',
  '(function(){',
  'const cases='+safe+';',
  'const sceneCases=["c01","r01","c03","r02","c05","r03","c08","r04"];',
  'const E=id=>document.getElementById(id);',
  'let lastCase=null;',
  'const content=E("b198e-review-fields"),submit=E("b198e-export-score");',
  'function collect(){',
  'const spec=cases[lastCase];const values=[];',
  'for(let i=0;i<spec.criteria.length;i++){',
  'const score=content.querySelector("[data-score-index=\\""+i+"\\"]");',
  'const reason=content.querySelector("[data-evidence-index=\\""+i+"\\"]");',
  'if(!score||score.value===""||!reason||reason.value.trim().length<15)return null;',
  'values.push({criterionId:spec.criteria[i].criterionId,',
  ' score:Number(score.value),evidence:reason.value.trim()});',
  '}return values;',
  '}',
  'function refreshValidity(){',
  'const valid=collect()!==null;submit.disabled=!valid;',
  'E("b198e-review-status").textContent=valid?',
  '"全項目に根拠付きで入力されています。評価データを保存できます。":',
  '"UNREVIEWED：全ての項目に0〜4点と15字以上の説明が必要です。";',
  '}',
  'function render(){',
  'const current=sceneCases[Number(document.getElementById("building").value)||0];',
  'if(current===lastCase)return;lastCase=current;',
  'content.replaceChildren();',
  'for(const [i,c] of cases[current].criteria.entries()){',
  'const section=document.createElement("div");section.className="info";',
  'const title=document.createElement("strong");title.textContent=c.description;',
  'const select=document.createElement("select");select.dataset.scoreIndex=String(i);',
  'const absent=document.createElement("option");absent.value="";absent.textContent="未評価";select.append(absent);',
  'for(let n=0;n<=4;n++){const opt=document.createElement("option");',
  'opt.value=String(n);opt.textContent=n+" / 4";select.append(opt);}',
  'const explanation=document.createElement("textarea");',
  'explanation.dataset.evidenceIndex=String(i);',
  'explanation.placeholder="3D形状で確認した根拠（最低15字）";',
  'explanation.style.cssText="width:100%;min-height:66px;background:#102c3f;color:#fff;padding:8px;margin-top:7px";',
  'section.append(title,select,explanation);content.append(section);',
  'select.addEventListener("change",refreshValidity);',
  'explanation.addEventListener("input",refreshValidity);',
  '}refreshValidity();',
  '}',
  'submit.addEventListener("click",()=>{',
  'const values=collect();if(!values)return;',
  'const active=cases[lastCase];',
  'const output={schema:"b198e-human-observed-source-score-v1",',
  'caseId:lastCase,sourceSha256:active.sourceSha256,',
  'originalRubricResponses:values,',
  'modelAutomaticRating:false,',
  'humanIdentityIndependentlyVerified:false,',
  'visualJudgmentSelfReported:true,',
  'actualMinecraftWalkingCertified:false,worldWrites:0};',
  'const file=new Blob([JSON.stringify(output,null,2)+"\\n"],{type:"application/json"});',
  'const url=URL.createObjectURL(file),link=document.createElement("a");',
  'link.href=url;link.download="B198E_HUMAN_RUBRIC_"+lastCase+".json";',
  'document.body.append(link);link.click();link.remove();',
  'setTimeout(()=>URL.revokeObjectURL(url),1000);',
  '});',
  'document.addEventListener("b198e-sample-changed",render);',
  'document.getElementById("building").addEventListener("change",render);',
  'render();',
  '})();',
  '</script>'
 ].join('\n');
 return {panel,script};
}
