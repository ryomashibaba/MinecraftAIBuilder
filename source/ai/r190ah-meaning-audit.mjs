/**
 * R190-AH: read-only meaning-to-circulation audit for already compiled layouts.
 * Uses authored room privacy and physically audited portal connections.
 * It NEVER changes a layout, decides a building type, or certifies privacy/art.
 */
export function auditR190AHMeaning(program, layout, {sourceRoutesVerified = false} = {}) {
 const spaces = program.spaces;
 const byId = new Map(spaces.map(s => [s.id, s]));
 const links = new Map(spaces.map(s => [s.id, new Set()]));
 if (!byId.has(program.entrySpaceId) || byId.size !== spaces.length)
  throw Error('R190AH_INVALID_PROGRAM');
 for (const p of layout.portals) {
  if (!links.has(p.a) || !links.has(p.b) || p.a === p.b)
   throw Error('R190AH_INVALID_PORTAL_GRAPH');
  links.get(p.a).add(p.b);
  links.get(p.b).add(p.a);
 }
 // A public/shared visitor cannot be required to enter a private room
 // merely to reach a different public/shared room. This is advisory,
 // not a universal architecture or building-code requirement.
 const entry = byId.get(program.entrySpaceId);
 const accessible = new Set();
 if (entry.privacy !== 'private') {
  const queue = [entry.id];
  accessible.add(entry.id);
  for (let i = 0; i < queue.length; i++) {
   for (const next of links.get(queue[i])) {
    if (!accessible.has(next) && byId.get(next).privacy !== 'private') {
     accessible.add(next);
     queue.push(next);
    }
   }
  }
 }
 const publicShared = spaces.filter(s => s.privacy !== 'private');
 const possiblePrivateTransit = publicShared.filter(s => !accessible.has(s.id))
  .map(s => s.id);
 return {
  schema: 'minecraftaibuilder-r190ah-meaning-audit-v1',
  originalRoomPurposes: spaces.map(s => ({id: s.id, purpose: s.purpose})),
  originalRoomPrivacy: spaces.map(s => ({id: s.id, privacy: s.privacy})),
  declaredValuesModified: false,
  geometryExpressesPurpose: 'NOT_CERTIFIED',
  geometryExpressesPrivacy: 'NOT_CERTIFIED',
  accessMethod: 'DECLARED_ROOM_PORTALS_ONLY',
  sourceRoutesVerified: sourceRoutesVerified === true,
  publicSharedAccess: {
   targetCount: publicShared.length,
   reachableWithoutPrivateTransit: publicShared
    .filter(s => accessible.has(s.id)).map(s => s.id),
   needsReview: possiblePrivateTransit,
  },
  status: possiblePrivateTransit.length
   ? 'REVIEW_PUBLIC_ACCESS_THROUGH_PRIVATE_OR_MISSING_ROUTE'
   : 'ADVISORY_NO_PRIVATE_TRANSIT_DETECTED',
  // Neither status is functional, privacy, model-authorship or art approval.
  functionalPrivacyCertified: false,
  artCertified: false,
 };
}
