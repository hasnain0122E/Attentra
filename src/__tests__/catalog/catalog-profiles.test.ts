/**
 * Attentra — Catalog Eligibility & Family Classification Tests
 *
 * Phase 8 / Step 3 — Dynamic Model Catalog
 *
 * Tests the shared chat-family eligibility rules (the single source of
 * truth used by both catalog discovery and the pricing sources) and the
 * conservative family-profile classification that supplies metadata for
 * models whose listing API does not expose it.
 *
 * Pure rule tests — no database, no network.
 */

import { describe, it, expect } from "vitest";
import {
  isChatFamilyModelId,
  isEligibleCatalogModel,
  filterEligibleCatalogModels,
  classifyModelProfile,
  deriveDisplayName,
} from "@/lib/catalog/profiles";
import type { CatalogModelEntry } from "@/lib/catalog/types";

// ─────────────────────────────────────────────────────
// ELIGIBILITY RULES
// ─────────────────────────────────────────────────────

describe("Catalog eligibility — isChatFamilyModelId (OpenAI)", () => {
  it("admits chat / text-generation families, including latest-generation ids", () => {
    const admitted = [
      "gpt-5.2",
      "gpt-5.3",
      "gpt-4o",
      "gpt-4.1-mini",
      "gpt-3.5-turbo",
      "o3",
      "o4-mini",
      "chat-latest",
    ];
    for (const id of admitted) {
      expect(isChatFamilyModelId("openai", id), id).toBe(true);
    }
  });

  it("excludes non-chat workloads and dated snapshot aliases", () => {
    const excluded = [
      "text-embedding-3-small",   // embeddings
      "omni-moderation-latest",   // moderation
      "whisper-1",                // STT
      "gpt-4o-transcribe",        // transcription
      "gpt-4o-mini-tts",          // TTS
      "gpt-4o-audio-preview",     // audio
      "gpt-4o-realtime-preview",  // realtime audio
      "gpt-image-1",              // image generation
      "sora-2",                   // video generation
      "gpt-5.3-codex",            // codex family
      "gpt-5-search-api",         // search workload
      "davinci-002",              // legacy completions
      "babbage-002",              // legacy completions
      "gpt-4o-2024-05-13",        // dated snapshot alias
    ];
    for (const id of excluded) {
      expect(isChatFamilyModelId("openai", id), id).toBe(false);
    }
  });
});

describe("Catalog eligibility — isChatFamilyModelId (Anthropic)", () => {
  it("admits every claude-* id (dated Anthropic ids are the stable identifiers)", () => {
    for (const id of [
      "claude-sonnet-5",
      "claude-opus-4-5-20251101",
      "claude-haiku-4-5-20251001",
      "claude-fable-5",
    ]) {
      expect(isChatFamilyModelId("anthropic", id), id).toBe(true);
    }
  });

  it("rejects non-claude identifiers", () => {
    expect(isChatFamilyModelId("anthropic", "gpt-4o")).toBe(false);
    expect(isChatFamilyModelId("anthropic", "gemini-2.5-pro")).toBe(false);
  });
});

describe("Catalog eligibility — isChatFamilyModelId (Google)", () => {
  it("admits gemini / gemma text-generation families", () => {
    for (const id of [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-3-pro-preview",
      "gemma-3-27b-it",
    ]) {
      expect(isChatFamilyModelId("google", id), id).toBe(true);
    }
  });

  it("excludes specialized variants and non-gemini/gemma families", () => {
    const excluded = [
      "gemini-2.5-flash-image",        // image generation
      "gemini-2.5-flash-lite-tts",     // TTS
      "gemini-robotics-1.0",           // robotics
      "gemini-live-2.5-flash-preview", // live audio
      "veo-3.0-generate-preview",      // video generation
      "gemini-embedding-exp",          // embeddings
      "aqa",                           // question answering (legacy)
      "learnlm-1.5-palm256",           // non-gemini family
    ];
    for (const id of excluded) {
      expect(isChatFamilyModelId("google", id), id).toBe(false);
    }
  });
});

describe("Catalog eligibility — isEligibleCatalogModel", () => {
  it("requires generateContent in Google's supportedGenerationMethods", () => {
    expect(
      isEligibleCatalogModel({
        providerName: "google",
        modelIdentifier: "gemini-2.5-pro",
        generationMethods: ["generateContent", "countTokens"],
      })
    ).toBe(true);

    expect(
      isEligibleCatalogModel({
        providerName: "google",
        modelIdentifier: "gemini-2.5-pro",
        generationMethods: ["countTokens", "embedContent"],
      })
    ).toBe(false);

    // No generation methods exposed → cannot verify chat compatibility
    expect(
      isEligibleCatalogModel({ providerName: "google", modelIdentifier: "gemini-2.5-pro" })
    ).toBe(false);
  });

  it("filterEligibleCatalogModels keeps only eligible chat models", () => {
    const models: CatalogModelEntry[] = [
      { providerName: "openai", modelIdentifier: "gpt-5.2", displayName: "GPT 5.2" },
      { providerName: "openai", modelIdentifier: "text-embedding-3-small", displayName: "Embedding" },
      { providerName: "google", modelIdentifier: "gemini-2.5-flash", displayName: "Flash",
        generationMethods: ["generateContent"] },
      { providerName: "google", modelIdentifier: "gemini-2.5-flash-image", displayName: "Image",
        generationMethods: ["generateContent"] },
    ];

    const eligible = filterEligibleCatalogModels(models);
    expect(eligible.map((m) => m.modelIdentifier)).toEqual(["gpt-5.2", "gemini-2.5-flash"]);
  });
});

// ─────────────────────────────────────────────────────
// FAMILY CLASSIFICATION
// ─────────────────────────────────────────────────────

describe("Family classification — classifyModelProfile (OpenAI)", () => {
  it("assigns tier, context window and latency by family rules", () => {
    const flagship = classifyModelProfile("openai", "gpt-5.2");
    expect(flagship.tier).toBe("HEAVY");
    expect(flagship.contextWindow).toBe(272_000);
    expect(flagship.capabilities).toContain("reasoning");

    const mini = classifyModelProfile("openai", "gpt-5.2-mini");
    expect(mini.tier).toBe("MID");
    expect(mini.contextWindow).toBe(272_000);

    const legacy = classifyModelProfile("openai", "gpt-4o-mini");
    expect(legacy.tier).toBe("LIGHT");
    expect(legacy.contextWindow).toBe(128_000);

    const reasoning = classifyModelProfile("openai", "o4-mini");
    expect(reasoning.tier).toBe("MID");
    expect(reasoning.contextWindow).toBe(200_000);

    // chat models listed outside the main families (specialized table)
    const chatLatest = classifyModelProfile("openai", "chat-latest");
    expect(chatLatest.tier).toBe("HEAVY");
    expect(chatLatest.contextWindow).toBe(128_000);
  });

  it("falls back to a conservative balanced profile for unknown families", () => {
    const unknown = classifyModelProfile("openai", "future-model-x");
    expect(unknown.tier).toBe("MID");
    expect(unknown.contextWindow).toBe(128_000);
    expect(unknown.capabilities).toContain("chat");
  });
});

describe("Family classification — classifyModelProfile (Anthropic)", () => {
  it("maps haiku → LIGHT, sonnet → MID, opus/fable → HEAVY", () => {
    expect(classifyModelProfile("anthropic", "claude-haiku-4-5-20251001").tier).toBe("LIGHT");
    expect(classifyModelProfile("anthropic", "claude-sonnet-5").tier).toBe("MID");
    expect(classifyModelProfile("anthropic", "claude-opus-5").tier).toBe("HEAVY");
    expect(classifyModelProfile("anthropic", "claude-fable-5").tier).toBe("HEAVY");

    const haiku = classifyModelProfile("anthropic", "claude-haiku-4-5-20251001");
    expect(haiku.contextWindow).toBe(200_000);
    expect(haiku.expectedLatencyMs).toBe(400);
  });
});

describe("Family classification — classifyModelProfile (Google)", () => {
  it("maps gemma/flash-lite → LIGHT, flash → light tier, pro → HEAVY", () => {
    expect(classifyModelProfile("google", "gemma-3-27b-it").tier).toBe("LIGHT");
    expect(classifyModelProfile("google", "gemma-3-27b-it").contextWindow).toBe(262_144);
    expect(classifyModelProfile("google", "gemini-2.5-flash-lite").tier).toBe("LIGHT");
    expect(classifyModelProfile("google", "gemini-2.5-flash").tier).toBe("LIGHT");
    expect(classifyModelProfile("google", "gemini-2.5-flash").capabilities).toContain("reasoning");
    expect(classifyModelProfile("google", "gemini-2.5-pro").tier).toBe("HEAVY");
    expect(classifyModelProfile("google", "gemini-2.5-pro").contextWindow).toBe(1_048_576);
  });
});

describe("Display name derivation", () => {
  it("maps known prefixes, keeps o-series lowercase, title-cases the rest", () => {
    expect(deriveDisplayName("gpt-4o")).toBe("GPT 4o");
    expect(deriveDisplayName("claude-sonnet-5")).toBe("Claude Sonnet 5");
    expect(deriveDisplayName("o3")).toBe("o3");
    expect(deriveDisplayName("o4-mini")).toBe("o4 Mini");
    expect(deriveDisplayName("gemini-2.5-pro")).toBe("Gemini 2.5 Pro");
  });
});
