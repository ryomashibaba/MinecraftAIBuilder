/**
 * Leaf-only model instruction vocabulary.
 * Deliberately must not import R134/R135/R139 parsers. Those parsers already
 * depend on one another; importing this text must never evaluate them.
 */
export const RELATIONAL_INSTRUCTIONS=[
 'Also output exactly one extra top-level key: relations.',
 'relations has EXACTLY entryFacingZoneId and directAdjacencies.',
 'entryFacingZoneId is an existing room id chosen for the entrance-facing row.',
 'directAdjacencies is an array of 1 or 2 pairs of distinct existing room ids.',
 'Your new design must demonstrate at least one genuine direct connection.',
 'These pairs mean DIRECT 2-wide openings between rooms, not connections via hall.',
 'Pairs must not share a room. With three rooms choose at most one pair.',
 'Do not use genre templates, coordinates, hidden code or Minecraft commands.',
 'The host validates feasible geometry and will reject incompatible graphs.'
].join('\n');
