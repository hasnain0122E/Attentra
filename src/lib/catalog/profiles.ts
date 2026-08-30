/**
 * Attentra — Catalog Eligibility & Family Classification
 *
 * Phase 8 / Step 3 — Dynamic Model Catalog
 *
 * Maintainable classification RULES (not hardcoded model arrays):
 * the model listings themselves decide WHICH models exist; these rules
 * decide which families are eligible for Attentra's conversational /
 * text-generation routing path, and supply conservative capability /
 * tier / context-window metadata for families whose listing API does
 * not expose enough metadata (spec §3).
 *
 * Eligibility (spec §2): only text-generation/chat models may enter
 * the routing pool. Embeddings, moderation, TTS, STT, transcription,
 * realtime audio, image gen, video gen, robotics and other non-chat
 * workloads are excluded by family-level identifier rules.
 *
 * These rules never assign prices — pricing remains the exclusive
 * authority of the Phase 5 pricing sources and PricingSnapshots.
 */

import type { CatalogModelEntry, CatalogProviderName } from "./types";

// ─────────────────────────────────────────────────────
// ELIGIBILITY RULES
// ─────────────────────────────────────────────────────

/**
 * OpenAI: the Models API lists every workload type (embeddings,
 * moderation, audio, realtime, image, video, search, codex, legacy
 * completions). Only chat/text-generation families may route.
 * Dated snapshot aliases (e.g. gpt-4o-2024-05-13) are redundant with
 * the stable identifier and are excluded from the routing pool.
 */
const OPENAI_EXCLUDED_PATTERNS: RegExp[] = [
  /embedding/i,
  /moderation/i,
  /transcribe/i,
  /whisper/i,
  /realtime/i,
  /tts/i,
  /audio/i,
  /image/i,
  /sora/i,
  /codex/i,
  /search/i,
  /instruct/i,
  /^davinci/,
  /^babbage/,
  /-\d{4}-\d{2}-\d{2}$/,
];

/**
 * Anthropic: every model returned by the Models API is a Claude
 * text-generation model — a family prefix gate is sufficient.
 */
const ANTHROPIC_ALLOWED_PREFIX = /^claude-/;

/**
 * Google: chat candidates must belong to the Gemini/Gemma text
 * families, support generateContent, and not be a specialized
 * variant (TTS, image, live audio, robotics, research, video...).
 */
const GOOGLE_ALLOWED_PREFIX = /^(gemini|gemma)-/;
const GOOGLE_REQUIRED_METHOD = "generateContent";
const GOOGLE_EXCLUDED_PATTERNS: RegExp[] = [
  /tts/i,
  /image/i,
  /nano-banana/i,
  /robotics/i,
  /computer-use/i,
  /omni/i,
  /lyria/i,
  /transcribe/i,
  /deep-research/i,
  /antigravity/i,
  /native-audio/i,
  /live/i,
  /veo/i,
  /aqa/i,
  /embedding/i,
];

/**
 * Whether a model identifier belongs to a chat / text-generation
 * family for the given provider (identifier-level rules only).
 *
 * Used by both catalog discovery and the pricing sources so that
 * eligibility lives in exactly one place.
 */
export function isChatFamilyModelId(
  providerName: CatalogProviderName,
  modelIdentifier: string
): boolean {
  const id = modelIdentifier.toLowerCase();

  switch (providerName) {
    case "openai":
      return !OPENAI_EXCLUDED_PATTERNS.some((p) => p.test(id));
    case "anthropic":
      return ANTHROPIC_ALLOWED_PREFIX.test(id);
    case "google":
      return (
        GOOGLE_ALLOWED_PREFIX.test(id) &&
        !GOOGLE_EXCLUDED_PATTERNS.some((p) => p.test(id))
      );
    default:
      return false;
  }
}

/**
 * Whether a discovered catalog entry is eligible for Attentra's
 * text-generation routing path.
 *
 * Google additionally requires the listing to expose
 * `generateContent` among the model's supported generation methods
 * (spec §3).
 */
export function isEligibleCatalogModel(entry: {
  providerName: CatalogProviderName;
  modelIdentifier: string;
  generationMethods?: string[];
}): boolean {
  if (!isChatFamilyModelId(entry.providerName, entry.modelIdentifier)) {
    return false;
  }

  if (entry.providerName === "google") {
    const methods = entry.generationMethods ?? [];
    return methods.includes(GOOGLE_REQUIRED_METHOD);
  }

  return true;
}

/** Filter discovered entries down to eligible chat/text-generation models. */
export function filterEligibleCatalogModels(
  models: CatalogModelEntry[]
): CatalogModelEntry[] {
  return models.filter((m) => isEligibleCatalogModel(m));
}

// ─────────────────────────────────────────────────────
// FAMILY CLASSIFICATION (capability / tier / context metadata)
// ─────────────────────────────────────────────────────

/**
 * Capability presets shared by family classification. They mirror the
 * capability vocabulary already used by the routing engine
 * (TASK_TYPE_TO_CAPABILITIES).
 */
const FLAGSHIP_CAPS = [
  "chat",
  "reasoning",
  "coding",
  "extraction",
  "summarization",
  "translation",
  "creative_writing",
  "classification",
];
const BALANCED_CAPS = [
  "chat",
  "reasoning",
  "classification",
  "summarization",
  "extraction",
  "translation",
];
const LIGHT_CAPS = [
  "chat",
  "classification",
  "summarization",
  "extraction",
  "translation",
];

/** Metadata assigned to a model family when the listing/pricing page
 *  does not expose it. Context windows are the documented standard
 *  input limits (kept conservative so the hard context filter never
 *  over-admits). */
export interface ModelFamilyProfile {
  displayName: string;
  capabilities: string[];
  tier: "LIGHT" | "MID" | "HEAVY";
  contextWindow: number;
  expectedLatencyMs: number;
}

/** Known display-name prefixes for deriving human-readable names. */
const DISPLAY_PREFIXES: Record<string, string> = {
  gpt: "GPT",
  claude: "Claude",
  gemini: "Gemini",
  gemma: "Gemma",
  chat: "Chat",
};

/** Derive a human-readable display name from a model identifier. */
export function deriveDisplayName(modelIdentifier: string): string {
  return modelIdentifier
    .split("-")
    .map((part) => {
      const mapped = DISPLAY_PREFIXES[part.toLowerCase()];
      if (mapped) return mapped;
      // o-series ids (o3, o4-mini) are conventionally lowercase
      if (/^o\d+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

/** OpenAI family classification (checked in order). */
function classifyOpenAI(id: string): ModelFamilyProfile {
  // — Legacy GPT-4 / GPT-3.5 families —
  if (id.startsWith("gpt-4.1-nano"))
    return profile(id, LIGHT_CAPS, "LIGHT", 1_047_576, 400);
  if (id.startsWith("gpt-4.1-mini"))
    return profile(id, BALANCED_CAPS, "MID", 1_047_576, 500);
  if (id.startsWith("gpt-4.1"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 1_047_576, 900);
  if (id.startsWith("gpt-4o-mini"))
    return profile(id, LIGHT_CAPS, "LIGHT", 128_000, 400);
  if (id.startsWith("gpt-4o"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 128_000, 800);
  if (id.startsWith("gpt-4-turbo"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 128_000, 900);
  if (id.startsWith("gpt-4"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 8_192, 1_000);
  if (id.startsWith("gpt-3.5-turbo"))
    return profile(id, LIGHT_CAPS, "LIGHT", 16_385, 600);

  // — Reasoning o-series —
  if (id.startsWith("o1-pro"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 200_000, 8_000);
  if (id.startsWith("o1"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 200_000, 5_000);
  if (/^o\d+-mini/.test(id))
    return profile(id, BALANCED_CAPS, "MID", 200_000, 2_250);
  if (/^o\d/.test(id))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 200_000, 3_000);

  // — GPT-5+ generation —
  if (id.endsWith("-pro"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 272_000, 6_000);
  if (id.endsWith("-luna"))
    return profile(id, LIGHT_CAPS, "LIGHT", 272_000, 800);
  if (id.endsWith("-terra"))
    return profile(id, BALANCED_CAPS, "MID", 272_000, 1_500);
  if (id.endsWith("-sol"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 272_000, 3_500);
  if (id.endsWith("-nano"))
    return profile(id, LIGHT_CAPS, "LIGHT", 272_000, 800);
  if (id.endsWith("-mini"))
    return profile(id, BALANCED_CAPS, "MID", 272_000, 1_500);
  if (id.endsWith("chat-latest"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 128_000, 3_000);
  if (id.startsWith("gpt-5") || id.startsWith("gpt-6"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 272_000, 3_500);

  return profile(id, BALANCED_CAPS, "MID", 128_000, 2_000);
}

/** Anthropic family classification. */
function classifyAnthropic(id: string): ModelFamilyProfile {
  if (id.includes("haiku"))
    return profile(id, LIGHT_CAPS, "LIGHT", 200_000, 400);
  if (id.includes("sonnet"))
    return profile(id, BALANCED_CAPS, "MID", 200_000, 800);
  if (id.includes("opus") || id.includes("fable") || id.includes("mythos"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 200_000, 1_200);
  return profile(id, BALANCED_CAPS, "MID", 200_000, 800);
}

/** Google family classification. */
function classifyGoogle(id: string): ModelFamilyProfile {
  if (id.startsWith("gemma-"))
    return profile(id, LIGHT_CAPS, "LIGHT", 262_144, 1_500);
  if (id.includes("flash-lite"))
    return profile(id, LIGHT_CAPS, "LIGHT", 1_048_576, 300);
  if (id.includes("flash"))
    return profile(id, BALANCED_CAPS, "LIGHT", 1_048_576, 500);
  if (id.includes("pro"))
    return profile(id, FLAGSHIP_CAPS, "HEAVY", 1_048_576, 1_000);
  return profile(id, BALANCED_CAPS, "MID", 1_048_576, 800);
}

function profile(
  id: string,
  capabilities: string[],
  tier: ModelFamilyProfile["tier"],
  contextWindow: number,
  expectedLatencyMs: number
): ModelFamilyProfile {
  return {
    displayName: deriveDisplayName(id),
    capabilities: [...capabilities],
    tier,
    contextWindow,
    expectedLatencyMs,
  };
}

/**
 * Classify a model identifier into a conservative family profile.
 *
 * The pricing sources use this for models newly recognized in the
 * official pricing tables, and catalog sync uses it for models the
 * listing exposes without capability metadata.
 */
export function classifyModelProfile(
  providerName: CatalogProviderName,
  modelIdentifier: string
): ModelFamilyProfile {
  const id = modelIdentifier.toLowerCase();
  switch (providerName) {
    case "openai":
      return classifyOpenAI(id);
    case "anthropic":
      return classifyAnthropic(id);
    case "google":
      return classifyGoogle(id);
    default:
      return profile(id, BALANCED_CAPS, "MID", 128_000, 2_000);
  }
}
