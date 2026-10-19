/** B198Z-R2: genre-neutral architecture quality instructions, not a building template.
 * Supplemental system-level advice only: existing B143 JSON grammar is unchanged.
 * Never treated as evidence of actual model improvement until a separate real run.
 */
export const R2_FREEFORM_QUALITY_GUIDE=[
 'Architectural geometry must be FUNCTIONAL, not merely schema-valid. Invent the building based on the actual user request; DO NOT choose from building-type templates or hard-code library-specific parts.',
 'Keep an expressive coherent exterior silhouette with scale variation and a legible entrance. Make external gestures structurally intelligible, not gratuitous extreme cantilevers.',
 'For each intended occupied level, model walkable floors with at least two blocks of clear headroom and a CONTINUOUS route to the entrance; an upright pillar/cylinder is not a staircase.',
 'If several levels are connected by stairs, show successive nearby horizontal steps with a realistic landing and one-block maximum conceptual rise. Source voxel walkability still needs independent checking.',
 'For atria, courtyards, tunnels, rooms and apertures, preserve the empty interior in the FINAL geometry; a cut followed by later floors or walls can accidentally refill the void. Sequence ADD then the required final protected CUT.',
 'A transparent exterior is not a giant filled glass ellipsoid; use supported shell geometry or explicit cuts. Separate shelves, desks, equipment and furniture into believable thin components and preserve human approach aisles.',
 'Before returning JSON, mentally recheck exact bounding extents, inter-floor collisions, final empty air, entrances, landings, supports and functional connections. Source compile success alone is not aesthetic or Minecraft physical certification.',
 'Keep every claim as design intent only. No world coordinates, Minecraft block ID/state, executable BuildPlan, real-world write, or construction approval.'
].join('\\n');
