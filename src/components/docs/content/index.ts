import type { ComponentType } from "react";

import {
  ApiChatCompletions,
  ApiErrors,
  ApiParameters,
  ApiRateLimits,
  ApiResponses,
  Limitations,
} from "./ApiReference";
import { ConceptFallback, ConceptModels, ConceptPolicies, ConceptRouting } from "./Concepts";
import { Authentication, Introduction, Quickstart } from "./GetStarted";
import {
  GuideChatbot,
  GuideContextOptimization,
  GuideConversationHistory,
  GuideUsageAndCosts,
} from "./Guides";
import { SdkCurl, SdkJavaScript, SdkPython } from "./Sdks";

/** Page content keyed by slug path ("" = /docs). Must cover every DOCS_PAGES entry. */
export const DOCS_CONTENT: Record<string, ComponentType> = {
  "": Introduction,
  quickstart: Quickstart,
  authentication: Authentication,
  "sdk/python": SdkPython,
  "sdk/javascript": SdkJavaScript,
  "sdk/curl": SdkCurl,
  "concepts/routing": ConceptRouting,
  "concepts/policies": ConceptPolicies,
  "concepts/fallback": ConceptFallback,
  "concepts/models": ConceptModels,
  "guides/conversation-history": GuideConversationHistory,
  "guides/context-optimization": GuideContextOptimization,
  "guides/usage-and-costs": GuideUsageAndCosts,
  "guides/build-a-chatbot": GuideChatbot,
  "api/chat-completions": ApiChatCompletions,
  "api/parameters": ApiParameters,
  "api/responses": ApiResponses,
  "api/errors": ApiErrors,
  "api/rate-limits": ApiRateLimits,
  limitations: Limitations,
};
