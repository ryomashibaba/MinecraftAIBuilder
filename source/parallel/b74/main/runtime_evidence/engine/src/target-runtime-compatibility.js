import { createHash } from 'node:crypto';
import { blockCatalog, compatibility, educationProfile, lookupBlock } from './block-catalog.js';
import { evaluateCommandPlacementCompatibility, HARD_GLASS_COMMAND_EVIDENCE, HARD_GLASS_CANONICAL_IDS } from './command-placement-compatibility.js';
import {
  MATERIAL_VERIFICATION_POLICY_VERSION,
  compatibleVerifiedRecord,
  semanticMetadata,
  tierAVerificationCandidates
} from './material-intelligence.js';

export const TARGET_RUNTIME_COMPATIBILITY_POLICY_VERSION = 'target-runtime-compatibility-v2';

// These are explicit release-document mappings. The runtime's "v26.3" string is
// intentionally not parsed as a Bedrock version.
export const TARGET_RUNTIME_PROFILES = Object.freeze({
  'minecraft-education:v26.3': Object.freeze({
    environment: 'minecraft-education',
    runtimeVersion: 'v26.3',
    educationReleaseLine: 'v26.32',
    maximumConfirmedBedrockVersion: Object.freeze({ major: 26, minor: 30 }),
    evidence: Object.freeze({
      source: 'Minecraft Education v26.32 update notes',
      url: 'https://edusupport.minecraft.net/hc/en-us/articles/52137260012692-What-s-New-in-the-Learning-Cubed-Update-v26-32-0',
      retrievedAt: '2026-09-30',
      confidence: 'high'
    })
  })
});

const COLORS = Object.freeze([
  'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
  'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'
]);
const POPLAR_IDS = new Set([
  'minecraft:poplar_planks',
  'minecraft:poplar_wood',
  'minecraft:stripped_poplar_wood',
  'minecraft:poplar_log',
  'minecraft:stripped_poplar_log'
]);

const introducedVersionRules = Object.freeze([
  Object.freeze({
    family: 'poplar',
    introducedBedrockVersion: Object.freeze({ major: 26, minor: 50 }),
    evidence: Object.freeze({
      source: 'Bedrock 26.50 Wilderness Bound changelog',
      url: 'https://feedback.minecraft.net/hc/en-us/articles/48826825649933-Minecraft-Bedrock-Edition-26-50-Changelog-Wilderness-Bound',
      publishedAt: '2026-09-15',
      confidence: 'high'
    })
  }),
  Object.freeze({
    family: 'concrete',
    introducedBedrockVersion: Object.freeze({ major: 26, minor: 50 }),
    evidence: Object.freeze({
      source: 'Bedrock 26.50 Wilderness Bound changelog',
      url: 'https://feedback.minecraft.net/hc/en-us/articles/48826825649933-Minecraft-Bedrock-Edition-26-50-Changelog-Wilderness-Bound',
      publishedAt: '2026-09-15',
      confidence: 'high'
    })
  })
]);

// The v26.50 changelog names Concrete Slabs and Stairs. The versioned local
// block listing contains both *_concrete_slab and *_concrete_double_slab IDs;
// the existing Tier A state expander emits a vertical_half unit for each.
// Runtime diagnostics include those exact double-slab IDs in the unsupported set.

function versionTuple(version) {
  if (typeof version === 'string') {
    if (!/^\d+(?:\.\d+){1,2}$/.test(version)) return null;
    const [major, minor, patch = '0'] = version.split('.');
    return [Number(major), Number(minor), Number(patch)];
  }
  if (!version || !Number.isInteger(version.major) || !Number.isInteger(version.minor)) return null;
  return [version.major, version.minor, Number.isInteger(version.patch) ? version.patch : 0];
}

export function compareBedrockVersions(left, right) {
  const a = versionTuple(left), b = versionTuple(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

export function introducedVersionEvidence(blockId) {
  if (POPLAR_IDS.has(blockId)) return introducedVersionRules[0];
  const short = blockId?.startsWith('minecraft:') ? blockId.slice('minecraft:'.length) : '';
  const concrete = new RegExp(`^(?:${COLORS.join('|')})_concrete_(?:slab|double_slab|stairs)$`);
  return concrete.test(short) ? introducedVersionRules[1] : null;
}

function targetRuntimeProfile(environment, runtimeVersion) {
  return TARGET_RUNTIME_PROFILES[`${environment}:${runtimeVersion}`] ?? null;
}

export function evaluateTargetRuntimeCompatibility(unit, profile = educationProfile, runtimeVersion = profile.educationVersion) {
  const block = lookupBlock(unit?.blockId);
  const sourceAvailability = block ? 'documented' : 'unknown';
  const target = targetRuntimeProfile(profile?.environment, runtimeVersion);
  const introduced = introducedVersionEvidence(unit?.blockId);
  const recordStatus = block ? compatibility(unit.blockId, unit.states ?? {}, { ...profile, educationVersion: runtimeVersion }) : 'unknown';

  if (introduced && target) {
    const comparison = compareBedrockVersions(introduced.introducedBedrockVersion, target.maximumConfirmedBedrockVersion);
    if (comparison > 0) {
      return {
        sourceAvailability,
        targetRuntimeAvailability: 'target_version_unavailable',
        introducedBedrockVersion: introduced.introducedBedrockVersion,
        compatibilityProfile: target,
        evidence: introduced.evidence
      };
    }
    if (comparison !== null) {
      return {
        sourceAvailability,
        targetRuntimeAvailability: 'available',
        introducedBedrockVersion: introduced.introducedBedrockVersion,
        compatibilityProfile: target,
        evidence: introduced.evidence
      };
    }
  }

  const commandEvidence = evaluateCommandPlacementCompatibility(unit, target, profile);
  if (commandEvidence.runtimeAvailability === 'available' && commandEvidence.commandPlacementAvailability === 'unavailable') {
    return { sourceAvailability, targetRuntimeAvailability: 'available', compatibilityProfile: target, evidence: commandEvidence.evidence };
  }

  if (recordStatus === 'verified' && compatibleVerifiedRecord(
    (profile.records ?? []).find(record => record.id === unit.blockId && record.status === 'verified' && record.educationVersion === runtimeVersion && JSON.stringify(record.states ?? {}) === JSON.stringify(unit.states ?? {})),
    unit,
    runtimeVersion
  )) {
    return { sourceAvailability, targetRuntimeAvailability: 'available', evidence: 'exact verified runtime identity/state evidence' };
  }

  return {
    sourceAvailability,
    targetRuntimeAvailability: 'unknown',
    introducedBedrockVersion: introduced?.introducedBedrockVersion ?? null,
    compatibilityProfile: target,
    evidence: target ? 'No introduced-version or exact verified evidence; no version was inferred' : 'No explicit target-runtime profile is configured'
  };
}

function identityForCandidateSet(target, candidates, profile, runtimeVersion) {
  const payload = {
    candidatePolicy: TARGET_RUNTIME_COMPATIBILITY_POLICY_VERSION,
    targetRuntime: target ? {
      environment: target.environment,
      runtimeVersion: target.runtimeVersion,
      maximumConfirmedBedrockVersion: target.maximumConfirmedBedrockVersion
    } : { environment: profile.environment, runtimeVersion, requiresRevalidation: true },
    verificationPolicy: MATERIAL_VERIFICATION_POLICY_VERSION,
    targetVersionRules: introducedVersionRules,
    commandPlacementRules: HARD_GLASS_COMMAND_EVIDENCE,
    candidates
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function hardGlassUnsupportedUnits(candidates, profile, runtimeVersion) {
  return candidates.filter(unit => HARD_GLASS_CANONICAL_IDS.includes(unit.blockId) &&
    compatibility(unit.blockId, unit.states ?? {}, { ...profile, educationVersion: runtimeVersion }) === 'unsupported');
}

/** New, target-aware candidate construction. Historical Phase 6B.3 builders remain untouched. */
export function buildTargetAwareMaterialVerificationSnapshot(profile = educationProfile, runtimeVersion = profile.educationVersion) {
  const target = targetRuntimeProfile(profile?.environment, runtimeVersion);
  const sourceCandidates = tierAVerificationCandidates(profile, runtimeVersion, { includeTerminal: true });
  const classified = sourceCandidates.map(unit => ({
    unit,
    compatibility: evaluateTargetRuntimeCompatibility(unit, profile, runtimeVersion),
    commandCompatibility: evaluateCommandPlacementCompatibility(unit, target, profile)
  }));
  const unavailable = classified.filter(row => row.compatibility.targetRuntimeAvailability === 'target_version_unavailable');
  const targetEligible = classified.filter(row => row.compatibility.targetRuntimeAvailability !== 'target_version_unavailable');
  const commandUnavailable = targetEligible.filter(row => row.commandCompatibility.commandPlacementAvailability === 'unavailable');
  const candidates = targetEligible.filter(row => row.commandCompatibility.commandPlacementAvailability !== 'unavailable').map(row => row.unit);
  const poplarUnavailable = unavailable.filter(row => POPLAR_IDS.has(row.unit.blockId));
  const concreteUnavailable = unavailable.filter(row => introducedVersionEvidence(row.unit.blockId)?.family === 'concrete');
  const unresolvedHardGlass = hardGlassUnsupportedUnits(sourceCandidates, profile, runtimeVersion).filter(unit =>
    !commandUnavailable.some(row => row.unit === unit));
  const candidateSetHash = identityForCandidateSet(target, candidates, profile, runtimeVersion);
  const preview = {
    educationVersion: runtimeVersion,
    environment: profile.environment,
    candidatePolicyVersion: TARGET_RUNTIME_COMPATIBILITY_POLICY_VERSION,
    verificationPolicyVersion: MATERIAL_VERIFICATION_POLICY_VERSION,
    candidateSetHash,
    sourceCandidates: sourceCandidates.length,
    targetAwareCandidates: targetEligible.length,
    commandPlacementUnavailable: commandUnavailable.length,
    commandPlacementUnavailableByForm: {
      full_block: commandUnavailable.filter(row => semanticMetadata(lookupBlock(row.unit.blockId)).form === 'full_block').length,
      pane: commandUnavailable.filter(row => semanticMetadata(lookupBlock(row.unit.blockId)).form === 'pane').length
    },
    eligibleForCommandVerification: candidates.length,
    runtimePresentButCommandUnavailable: commandUnavailable.filter(row => row.commandCompatibility.runtimeAvailability === 'available').length,
    reconciled: unavailable.length + commandUnavailable.length + candidates.length === sourceCandidates.length,
    targetVersionUnavailable: unavailable.length,
    targetVersionUnavailableByFamily: { poplar: poplarUnavailable.length, concrete: concreteUnavailable.length },
    compatibilityUnknown: classified.filter(row => row.compatibility.targetRuntimeAvailability === 'unknown').length,
    hardGlassUnresolved: unresolvedHardGlass.length,
    hardGlassByForm: {
      full_block: unresolvedHardGlass.filter(unit => semanticMetadata(lookupBlock(unit.blockId)).form === 'full_block').length,
      pane: unresolvedHardGlass.filter(unit => semanticMetadata(lookupBlock(unit.blockId)).form === 'pane').length
    },
    targetRuntimeProfile: target,
    excludedByTargetVersion: unavailable.map(row => ({ blockId: row.unit.blockId, states: row.unit.states, ...row.compatibility })),
    excludedByCommandPlacement: commandUnavailable.map(row => ({ blockId: row.unit.blockId, states: row.unit.states, ...row.commandCompatibility }))
  };

  return { candidates, preview, compatibilityByCandidate: classified };
}
