/** Synthetic AUTHOR fixture only; NEVER a new Qwen/Gemma response. */
import {makeV4DSyntheticCivicStudy} from './r125-v4d-synthetic-fixture.mjs';
import {V4D_RELIEF_SCHEMA} from '../source/ai/r125-v4d-void-relief.mjs';

export function makeV4DVoidReliefFixture(){
 const base=makeV4DSyntheticCivicStudy();
 base.id='civic-void-spine-base';
 base.title='SYNTHETIC AUTHOR alternate civic sculpture, not real Qwen';
 base.glazing={bandId:'atelier-wing',side:'west',
  offsetZ:4,length:8,sillY:7,height:2};
 return {
  schema:V4D_RELIEF_SCHEMA,id:'civic-void-spine-relief',
  base,
  publicVoid:{bandId:'high-forum',offsetZ:6,spanZ:9,
   purpose:'Real open-to-sky transverse civic gallery for crossing'},
  edgeRelief:{bandId:'atelier-wing',side:'east',offsetZ:2,
   insets:[0,1,2,3,4,5,6,6,5,4,3,2,1,0],
   purpose:'Author specified stepped diagonal perimeter and roof edge'}
 };
}
