import {R190_SCHEMA} from '../source/ai/r190-semantic-massing.mjs';
const S=(id,purpose,width,depth,height,parentId,side,privacy)=>
 ({id,purpose,width,depth,height,parentId,side,privacy});
const common=(id,spaces)=>({schema:R190_SCHEMA,id,title:'Semantic spatial composition',
 brief:'Real source-volume experiment, caller IR only, not genuine model architecture',
 site:{width:76,depth:76,height:24},entrySpaceId:spaces[0].id,spaces,
 materials:{floor:'wood',wall:'concrete',roof:'metal'}});
const cases=[
 common('r190-home',[
  S('living','Shared day room',13,14,8,null,null,'shared'),
  S('sleeping','Private bedroom',12,11,7,'living','north','private'),
  S('cooking','Food preparation',9,10,8,'living','east','shared'),
  S('storage','Service storage',7,9,7,'cooking','north','private')]),
 common('r190-shop',[
  S('showroom','Public display and customer arrival',17,13,10,null,null,'public'),
  S('workshop','Workshop for making goods',13,14,9,'showroom','north','shared'),
  S('receiving','Stock receiving',10,12,7,'workshop','east','private'),
  S('office','Staff bookkeeping',8,9,8,'showroom','west','private')]),
 common('r190-lab',[
  S('commons','Small communal arrival hall',12,11,8,null,null,'public'),
  S('analysis','Analysis and shared instruments',11,13,10,'commons','west','shared'),
  S('wetlab','Experimental bench area',12,12,9,'analysis','north','private'),
  S('archives','Documentation storage',9,12,7,'commons','north','private')])
];
export const R190_STATIC_SYNTHETIC_CASES=cases;
