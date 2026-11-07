/**
 * B198Z-R21 next-probe *advisory*. No live inference can be invoked through
 * this module. The frozen R11 source is immutable; a future separately
 * approved capture requires a NEW opt-in profile and separate integration.
 */
import {createHash} from 'node:crypto';
import {R11_COMPACT_GUIDE,R11_GUIDE_SHA256}
 from './b198zr11-compact-r4-output.mjs';
export const R21_GUIDE_PROFILE='r21-future-proposal-not-enabled';
export const R21_ADDITIONAL_GUIDE=[
 'BEFORE sending the final one-shot JSON, silently check every ADD element (including staircase, cylinder and all columns) has material set to ONE of stone/concrete/metal/glass/wood/glow/accent. Every CUT MUST omit material. This is required by the actual DSL, regardless of shape.',
 'Check the FULL outer extent of every box, cylinder, stair, torus, ellipsoid, beam and EVERY repeat instance stays within width/height/depth; valid grid coordinates are 0 to bound-1. A box landing at y=height is outside and INVALID.',
 'Never refill an advertised protectedVoid with a later ADD floor/roof/lounge: after ALL ordered ADD/CUT operations it must meet the actual maxOccupiedCells requirement. Position occupied lounges NEXT TO or ABOVE the void, not inside its claimed air volume.',
 'The entrance standing cell must have solid LOCAL floor support BELOW it (normally y>=1), clear headroom, and a connected usable path to each declared destination. Do not confuse a CUT doorway with solid walking support.',
 'Place stairs and REAL upper-floor landing cells at elevations that match; stairs that end 10 blocks below the lounge do NOT demonstrate access. Avoid floating reading zones made from bookshelf solids.',
 'For a requested curved or futuristic outer form, make large primary masses geometrically curved using supported ellipsoid or torus elements where architecturally appropriate; beams can connect masses but straight beams alone are NOT curves. Do not claim curves in explanation while using only rectangular boxes and tiny round pillars.',
 'Only use repeat where it genuinely reduces duplicated source, with all translated copies inside bounds. Repeat is optional; architectural intent and final circulation outrank decorative repetition.',
 'Output the SAME four JSON keys and SAME B143/R4 schema as R11. Never provide commentary or a second draft. Keep the geometry intentionally simple enough to be correct, but design an ORIGINAL silhouette and a usable program specific to the user request.'
].join('\n');
export const R21_FUTURE_GUIDE=R11_COMPACT_GUIDE+'\n'+R21_ADDITIONAL_GUIDE;
export const R21_FUTURE_GUIDE_SHA256=createHash('sha256')
 .update(R21_FUTURE_GUIDE).digest('hex');
export const FROZEN_R11_PROVENANCE_SHA256=R11_GUIDE_SHA256;
export const R21_REAL_MODEL_CALLS_AUTHORIZED_BY_MODULE=0;
