/** Explicit author-selected ridge with a narrow crest. Legacy roofs are unchanged. */
export function taperedR125RidgeHeight(pos,span,cap=6){
 if(!Number.isSafeInteger(span)||span<3||!Number.isSafeInteger(pos)||
  pos<0||pos>=span||!Number.isSafeInteger(cap)||cap<1||cap>6)
  throw Error('R125_TAPERED_RIDGE_INPUT');
 const half=Math.floor((span-1)/2);
 const peak=Math.min(cap,half,Math.max(2,Math.round(span/4)));
 return Math.floor(Math.min(pos,span-1-pos)*peak/half);
}
