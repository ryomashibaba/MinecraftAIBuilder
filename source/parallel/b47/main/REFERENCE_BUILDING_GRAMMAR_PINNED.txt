import { composePalette, normalizeMaterialRequirements } from './palette-composer.js';
import fs from "node:fs";

// Registries contain executable rules, not just labels. New programs and rules
// can be registered before planning without changing the planner or Builder.
export class RuleRegistry {
  #rules = new Map();
  register(name, rule) {
    if (!/^[a-z][a-z0-9_]*$/i.test(name) || !rule || this.#rules.has(name)) throw new Error(`Invalid or duplicate rule: ${name}`);
    this.#rules.set(name, rule);
    return this;
  }
  get(name) {
    if (!this.#rules.has(name)) throw new Error(`Unsupported rule: ${name}`);
    return this.#rules.get(name);
  }
  names() { return [...this.#rules.keys()]; }
}

export const programs = new RuleRegistry();
programs.register("office", { massings: ["slab", "tower_on_podium", "asymmetric_block", "stepped"], facades: ["curtain_wall", "vertical_bays"], ground: "recessed_lobby", roof: "mechanical_crown", floorHeight: 4 });
programs.register("apartment", { massings: ["L_shape", "slab", "twin_bar", "courtyard"], facades: ["punched_windows", "horizontal_bands"], ground: "solid_base", roof: "flat_parapet", floorHeight: 4 });
programs.register("hotel", { massings: ["stepped", "U_shape", "tower_on_podium", "asymmetric_block"], facades: ["vertical_bays", "punched_windows"], ground: "arcade", roof: "terrace", floorHeight: 5 });

export const palettes = new RuleRegistry();
palettes.register("modern_office", JSON.parse(fs.readFileSync(new URL("../../palettes/modern_office.json", import.meta.url), "utf8").replace(/^\uFEFF/, "")).materials);
export const styles = new RuleRegistry();
for (const name of ["modern", "urban_japanese", "industrial", "minimal", "premium", "traditional"]) {
  styles.register(name, JSON.parse(fs.readFileSync(new URL(`../../styles/${name}.json`, import.meta.url), "utf8")));
}

// Rectangles use inclusive coordinates and a half-open floor interval.
const rect = (x, z, w, d, start, end) => ({ x, z, width: w, depth: d, start, end });
export const massings = new RuleRegistry();
massings.register("slab", (c) => {
  const { width: w, depth: d } = c.dimensions;
  // width/depth describe the requested site envelope. A slab's primary mass
  // occupies the full envelope; other massings may create voids/setbacks.
  return [rect(0, 0, w, d, 0, c.floorCount)];
});
massings.register("L_shape", (c) => {
  const { width: w, depth: d } = c.dimensions, t = c.variation.wing;
  return [rect(0, 0, w, t, 0, c.floorCount), rect(0, t, t, d - t, 0, c.floorCount)];
});
massings.register("tower_on_podium", (c) => {
  const { width: w, depth: d } = c.dimensions, s = c.variation.setback;
  const podium = Math.max(1, Math.floor(c.floorCount / 3));
  return [rect(0, 0, w, d, 0, podium), rect(s, s + 1, w - 2 * s, d - 2 * s - 1, podium, c.floorCount)];
});
massings.register("stepped", (c) => {
  const { width: w, depth: d } = c.dimensions, s = c.variation.setback;
  const levels = Math.min(3, c.floorCount);
  return Array.from({ length: levels }, (_, i) => rect(i * s, i * s, w - i * s * 2, d - i * s * 2, Math.floor(i * c.floorCount / levels), Math.floor((i + 1) * c.floorCount / levels)));
});
massings.register("asymmetric_block", (c) => {
  const { width: w, depth: d } = c.dimensions, t = c.variation.wing;
  const split = Math.floor(w * .55);
  return [rect(0, 0, split, d - t, 0, c.floorCount), rect(split - 2, t, w - split + 2, d - t, 0, Math.max(1, c.floorCount - c.variation.heightDrop))];
});
massings.register("U_shape", (c) => {
  const { width: w, depth: d } = c.dimensions, t = c.variation.wing;
  return [rect(0, d - t, w, t, 0, c.floorCount), rect(0, 0, t, d - t, 0, c.floorCount), rect(w - t, 0, t, d - t, 0, c.floorCount)];
});
massings.register("courtyard", (c) => {
  const { width: w, depth: d } = c.dimensions, t = c.variation.wing;
  return [...massings.get("U_shape")(c), rect(t, 0, w - 2 * t, t, 0, c.floorCount)];
});
massings.register("twin_bar", (c) => {
  const { width: w, depth: d } = c.dimensions, t = c.variation.wing;
  return [rect(0, 0, w, t, 0, c.floorCount), rect(0, d - t, w, t, 0, c.floorCount), rect(Math.floor(w / 2) - 1, t, 3, d - 2 * t, 0, Math.max(1, c.floorCount - 1))];
});

export const facades = new RuleRegistry();
// Bay dimensions and vertical offsets are applied to actual exposed walls.
facades.register("punched_windows", { bay: 4, gap: 2, bottom: 2, top: 1 });
facades.register("curtain_wall", { bay: 4, gap: 1, bottom: 1, top: 1 });
facades.register("vertical_bays", { bay: 3, gap: 1, bottom: 1, top: 0 });
facades.register("horizontal_bands", { bay: 8, gap: 1, bottom: 2, top: 1 });
facades.register("mixed_panels", { bay: 5, gap: 2, bottom: 1, top: 1, alternate: true });
facades.register("service_core_expression", { bay: 4, gap: 1, bottom: 1, top: 0, service: true });
export const grounds = new RuleRegistry();
grounds.register("recessed_lobby", { inset: 1, glazing: true });
grounds.register("arcade", { inset: 2, glazing: true });
grounds.register("retail_glazing", { inset: 0, glazing: true });
grounds.register("solid_base", { inset: 0, glazing: false });
grounds.register("podium", { inset: 0, glazing: true, band: true });
export const roofs = new RuleRegistry();
roofs.register("flat_parapet", { parapet: 1 });
roofs.register("stepped", { parapet: 2 });
roofs.register("mechanical_crown", { parapet: 1, mechanical: true });
roofs.register("terrace", { parapet: 1, terrace: true });

export function createComposition(input) {
  if (!input || typeof input !== "object") throw new Error("parameters must be an object");
  const program = input.buildingType ?? "office", p = programs.get(program);
  const integer = (key, fallback, min, max) => {
    const n = input[key] ?? fallback;
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${key} must be an integer between ${min} and ${max}`);
    return n;
  };
  const width = integer("width", 24, 15, 48), depth = integer("depth", 20, 12, 40);
  const floorCount = integer("floors", 6, 2, 10), floorHeight = integer("floorHeight", p.floorHeight, 4, 5);
  const variationSeed = integer("seed", 0, 0, 2147483647);
  const style = input.style ?? "modern", styleRule = styles.get(style);
  const palette = input.palette ?? null;
  if (palette) palettes.get(palette);
  if(palette&&Object.keys(normalizeMaterialRequirements(input.materialRequirements)).length) throw new Error('materialRequirements cannot be combined with an explicit legacy palette');
  const quality = input.quality ?? "standard";
  if (!["compact", "standard", "premium"].includes(quality)) throw new Error("Unsupported quality");
  const orientation = input.orientation ?? "north";
  if (!["north", "east", "south", "west"].includes(orientation)) throw new Error("Unsupported orientation");
  // Seed selects discrete architectural decisions, never random blocks.
  const candidates = p.massings.filter((name) => name !== "tower_on_podium" || floorCount >= 4);
  const preferred = width >= depth * 2 ? "slab" : candidates[variationSeed % candidates.length];
  const massing = input.massing ?? preferred;
  massings.get(massing);
  const facadeStrategy = input.facadeStrategy ?? p.facades[(variationSeed + styleRule.facadeOffset) % p.facades.length];
  const groundFloorStrategy = input.groundFloorStrategy ?? p.ground;
  const roofStrategy = input.roofStrategy ?? p.roof;
  facades.get(facadeStrategy); grounds.get(groundFloorStrategy); roofs.get(roofStrategy);
  return {
    version: 1, program, massing, facadeStrategy, groundFloorStrategy, roofStrategy,
    materialRequirements: normalizeMaterialRequirements(input.materialRequirements),
    ...(!palette ? { materialPalette: composePalette({program,style,massing,quality,seed:variationSeed,materialRequirements:input.materialRequirements}) } : {}),
    dimensions: { width, depth }, floorCount, floorHeight, orientation, palette, style, variationSeed, quality,
    forward: integer("forward", 7, 7, 32),
    variation: { wing: Math.min(Math.floor((Math.min(width, depth)-3)/2), Math.max(3, Math.floor(Math.min(width, depth) / 4)) + variationSeed % 2 + (styleRule.architecture?.proportion??0)),
      setback: 1 + variationSeed % 2, heightDrop: 1 + variationSeed % Math.max(1, floorCount - 1), bayShift: variationSeed % 3 }
  };
}
