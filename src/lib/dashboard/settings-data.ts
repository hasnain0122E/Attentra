export type RequestPriority =
  | "BALANCED"
  | "COST"
  | "QUALITY"
  | "LATENCY";

export type DefaultEnvironment =
  | "DEVELOPMENT"
  | "PRODUCTION";

export type CostPrecision =
  | "STANDARD"
  | "DETAILED";

export interface DashboardSettings {
  workspaceName: string;

  defaultEnvironment: DefaultEnvironment;

  requestPriority: RequestPriority;

  automaticFallback: boolean;

  maxExecutionAttempts: number;

  includeRoutingMetadata: boolean;

  costPrecision: CostPrecision;
}

export const initialDashboardSettings: DashboardSettings = {
  workspaceName: "Personal workspace",

  defaultEnvironment: "DEVELOPMENT",

  requestPriority: "BALANCED",

  automaticFallback: true,

  maxExecutionAttempts: 3,

  includeRoutingMetadata: true,

  costPrecision: "DETAILED",
};