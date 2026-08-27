/**
 * Attentra — Routing Policies
 *
 * Phase 6 / Step 1 — Pipeline Skeleton
 *
 * Predefined routing policies that determine scoring weights.
 *
 * Policies are the user/operator's way of expressing routing preferences:
 * - "balanced" — equal weight to cost, latency, and capability
 * - "cost_optimized" — prioritize lower cost
 * - "quality_first" — prioritize capability/quality match
 * - "speed_first" — prioritize low latency
 *
 * Policies do NOT contain provider-specific logic or hardcoded prices.
 * They only express relative weights for the scoring engine.
 */

import type { RoutingPolicy } from "./types";

/**
 * Predefined routing policies.
 */
export const ROUTING_POLICIES: Record<string, RoutingPolicy> = {
  balanced: {
    name: "balanced",
    costWeight: 0.33,
    latencyWeight: 0.34,
    capabilityWeight: 0.33,
  },
  cost_optimized: {
    name: "cost_optimized",
    costWeight: 0.60,
    latencyWeight: 0.15,
    capabilityWeight: 0.25,
  },
  quality_first: {
    name: "quality_first",
    costWeight: 0.15,
    latencyWeight: 0.15,
    capabilityWeight: 0.70,
  },
  speed_first: {
    name: "speed_first",
    costWeight: 0.15,
    latencyWeight: 0.60,
    capabilityWeight: 0.25,
  },
};

/**
 * Resolve a policy by name.
 * Falls back to "balanced" if the name is not recognized.
 *
 * @param name  Policy name (case-insensitive)
 * @returns     The resolved routing policy
 */
export function resolvePolicy(name?: string): RoutingPolicy {
  if (!name) return ROUTING_POLICIES.balanced;
  const key = name.toLowerCase();
  return ROUTING_POLICIES[key] ?? ROUTING_POLICIES.balanced;
}

/**
 * List all available policy names.
 */
export function listPolicyNames(): string[] {
  return Object.keys(ROUTING_POLICIES);
}
