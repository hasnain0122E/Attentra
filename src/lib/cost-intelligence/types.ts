export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ModelPricing {
  inputPricePer1k: number;
  outputPricePer1k: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface CostIntelligenceResult {
  actualCost: number;
  baselineCost: number;
  savings: number;
  savingsPercentage: number;
}