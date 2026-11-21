/**
 * Actual B143 x-constant Z/Y cut section, not a conceptual infographic.
 * Exterior 5-view projections legitimately hide occupied interior levels.
 * Make the public elevated landing and staircase independently inspectable.
 */
const fail=s=>{throw Error('R125_V4H_ACTUAL_SECTION_'+s);};
const key=(x,y,z)=>x+','+y+','+z;
export function actualB143MezzanineSectionSvg(compiled,{x,zStart,zEnd,yMax,
 caption='SYNTHETIC_AUTHOR_SOURCE_NOT_MINECRAFT_OR_ART'}={}){
 if(!Array.isArray(compiled?.primitives)||compiled.primitives.length<100||
  ![x,zStart,zEnd,yMax].every(Number.isSafeInteger)||
  zStart<0||zEnd-zStart<9||zEnd-zStart>32||yMax<12||yMax>80||
  typeof caption!=='string'||caption.length>120||/[<>&"']/.test(caption))
  fail('INPUT_CONTRACT');
 const cells=new Map();
 for(const p of compiled.primitives){
  if(!Array.isArray(p)||p.length!==5||!p.every(Number.isSafeInteger))
   fail('REAL_B143_REQUIRED');
  const k=key(p[0],p[1],p[2]);
  if(cells.has(k))fail('DUPLICATE_VOXEL');
  cells.set(k,p[3]);
 }
 const colors=['#abb5bf','#c7cccf','#8c9aa8','#71d7de','#c6a16c','#f1dd8c','#cc8297'];
 const step=12,margin=34,titleHeight=60;
 const W=(zEnd-zStart+1)*step+2*margin,
  H=(yMax+1)*step+titleHeight+margin;
 const svg=['<svg xmlns="http://www.w3.org/2000/svg" width="'+W+
  '" height="'+H+'" viewBox="0 0 '+W+' '+H+'">',
  '<rect width="'+W+'" height="'+H+'" fill="#112231"/>',
  '<text x="16" y="22" fill="#f3f5f8" font-family="sans-serif" font-size="14">ACTUAL B143 INTERIOR STAIR SECTION</text>',
  '<text x="16" y="43" fill="#b7cdd8" font-family="sans-serif" font-size="10">'+caption+'</text>'];
 for(let z=zStart;z<=zEnd;z++)for(let y=0;y<=yMax;y++){
  const m=cells.get(key(x,y,z));if(m===undefined)continue;
  if(m<0||m>=colors.length)fail('ACTUAL_B143_MATERIAL_UNKNOWN');
  const px=margin+(z-zStart)*step,py=titleHeight+(yMax-y)*step;
  svg.push('<rect x="'+px+'" y="'+py+'" width="'+step+
   '" height="'+step+'" fill="'+colors[m]+'" stroke="#253846" stroke-width=".5"/>');
 }
 svg.push('<text x="'+margin+'" y="'+(H-10)+
  '" fill="#bacbd5" font-family="sans-serif" font-size="10">X = '+x+
  ' · Z = '+zStart+' to '+zEnd+' · true B143 occupied voxel columns only · y 0..'+yMax+'</text>');
 svg.push('</svg>');
 return svg.join('\n');
}
