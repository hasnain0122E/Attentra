export type RoutingPriority =
  | "BALANCED"
  | "QUALITY"
  | "LATENCY"
  | "COST";

export type RetentionPeriod =
  | "7_DAYS"
  | "30_DAYS"
  | "90_DAYS";

export interface BusinessSettingsState {
  organizationName: string;
  organizationSlug: string;

  routingPriority: RoutingPriority;

  fallbackEnabled: boolean;
  maxFallbackAttempts: number;

  requestRetention: RetentionPeriod;

  requireMemberAccess: boolean;
  auditLogging: boolean;
}