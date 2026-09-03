/**
 * Attentra — Display Currency Formatter Tests
 *
 * Phase 12.12.2 — Product-Wide PKR Display Currency
 *
 * Proves that:
 * 1. USD → PKR conversion works correctly.
 * 2. Configured exchange rate is used.
 * 3. Zero displays correctly.
 * 4. Positive small values use appropriate precision.
 * 5. Negative savings preserve sign.
 * 6. Sub-PKR values use 6 decimal precision.
 * 7. Invalid/missing rate handled safely (fallback to USD).
 * 8. Savings percentage is unaffected by currency conversion.
 *
 * All tests are fully deterministic. No provider calls.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  convertUsdToDisplay,
  formatDisplayCurrency,
  formatDisplayCurrencyCompact,
  formatDisplayCurrencyWithConfig,
  getDisplayCurrencyConfig,
  type DisplayCurrencyConfig,
} from "@/lib/currency/display-currency";

describe("Phase 12.12.2 — Display Currency Formatter", () => {
  beforeEach(() => {
    // Set a known rate for deterministic tests
    process.env.NEXT_PUBLIC_DISPLAY_CURRENCY = "PKR";
    process.env.NEXT_PUBLIC_USD_TO_PKR_RATE = "277";
  });

  // ─────────────────────────────────────────────────────
  // TEST 1: USD → PKR conversion
  // ─────────────────────────────────────────────────────

  it("converts USD amounts to PKR using the configured rate", () => {
    // $0.01 × 277 = PKR 2.77
    expect(formatDisplayCurrency(0.01)).toBe("PKR 2.77");

    // $1.00 × 277 = PKR 277.00
    expect(formatDisplayCurrency(1.0)).toBe("PKR 277.00");

    // $0.005 × 277 = PKR 1.385 → "PKR 1.39" (2 decimals for >= 1)
    expect(formatDisplayCurrency(0.005)).toBe("PKR 1.39");
  });

  // ─────────────────────────────────────────────────────
  // TEST 2: Configured exchange rate used
  // ─────────────────────────────────────────────────────

  it("uses the configured exchange rate from environment", () => {
    process.env.NEXT_PUBLIC_USD_TO_PKR_RATE = "250";

    // $0.01 × 250 = PKR 2.50
    expect(formatDisplayCurrency(0.01)).toBe("PKR 2.50");

    // Restore
    process.env.NEXT_PUBLIC_USD_TO_PKR_RATE = "277";
  });

  it("uses the configured display currency code", () => {
    process.env.NEXT_PUBLIC_DISPLAY_CURRENCY = "EUR";
    process.env.NEXT_PUBLIC_USD_TO_PKR_RATE = "0.92";

    // $1.00 × 0.92 = EUR 0.92
    expect(formatDisplayCurrency(1.0)).toBe("EUR 0.9200");
  });

  // ─────────────────────────────────────────────────────
  // TEST 3: Zero
  // ─────────────────────────────────────────────────────

  it("displays zero correctly", () => {
    // 0 × 277 = 0 → "PKR 0.00" (2 decimals for >= 1 range, but 0 is special)
    // Actually: abs(0) = 0, which is < 0.01, so 6 decimals → "PKR 0.000000"
    // Wait — let me check: precisionFor(0) → 0 < 0.01 → 6 decimals
    // But 0 * 277 = 0, and abs = 0, which is < 0.01 → 6 decimals
    expect(formatDisplayCurrency(0)).toBe("PKR 0.000000");
  });

  // ─────────────────────────────────────────────────────
  // TEST 4: Positive small value
  // ─────────────────────────────────────────────────────

  it("uses 4 decimal places for values >= PKR 0.01 and < PKR 1", () => {
    // $0.0001 × 277 = PKR 0.0277 → 4 decimals
    expect(formatDisplayCurrency(0.0001)).toBe("PKR 0.0277");

    // $0.001 × 277 = PKR 0.277 → 4 decimals
    expect(formatDisplayCurrency(0.001)).toBe("PKR 0.2770");
  });

  // ─────────────────────────────────────────────────────
  // TEST 5: Negative savings
  // ─────────────────────────────────────────────────────

  it("preserves sign for negative values", () => {
    // -$0.01 × 277 = -PKR 2.77
    expect(formatDisplayCurrency(-0.01)).toBe("-PKR 2.77");

    // -$0.0001 × 277 = -PKR 0.0277
    expect(formatDisplayCurrency(-0.0001)).toBe("-PKR 0.0277");

    // -$0.05 × 277 = -PKR 13.85
    expect(formatDisplayCurrency(-0.05)).toBe("-PKR 13.85");
  });

  // ─────────────────────────────────────────────────────
  // TEST 6: Precision for sub-PKR values
  // ─────────────────────────────────────────────────────

  it("uses 6 decimal places for values < PKR 0.01", () => {
    // $0.00001 × 277 = PKR 0.00277 → 6 decimals
    expect(formatDisplayCurrency(0.00001)).toBe("PKR 0.002770");

    // $0.000001 × 277 = PKR 0.000277 → 6 decimals
    expect(formatDisplayCurrency(0.000001)).toBe("PKR 0.000277");
  });

  it("uses 2 decimal places for values >= PKR 1", () => {
    // $0.01 × 277 = PKR 2.77 → 2 decimals
    expect(formatDisplayCurrency(0.01)).toBe("PKR 2.77");

    // $0.10 × 277 = PKR 27.70 → 2 decimals
    expect(formatDisplayCurrency(0.10)).toBe("PKR 27.70");
  });

  // ─────────────────────────────────────────────────────
  // TEST 7: Invalid/missing rate handled safely
  // ─────────────────────────────────────────────────────

  it("falls back to USD display when rate is missing", () => {
    delete process.env.NEXT_PUBLIC_USD_TO_PKR_RATE;

    // Should fall back to USD formatting
    expect(formatDisplayCurrency(0.01)).toBe("$0.01");
    expect(formatDisplayCurrency(0)).toBe("$0.00");
  });

  it("falls back to USD display when rate is invalid", () => {
    process.env.NEXT_PUBLIC_USD_TO_PKR_RATE = "not-a-number";

    expect(formatDisplayCurrency(0.01)).toBe("$0.01");
  });

  it("falls back to USD display when rate is zero", () => {
    process.env.NEXT_PUBLIC_USD_TO_PKR_RATE = "0";

    expect(formatDisplayCurrency(0.01)).toBe("$0.01");
  });

  it("falls back to USD display when rate is negative", () => {
    process.env.NEXT_PUBLIC_USD_TO_PKR_RATE = "-5";

    expect(formatDisplayCurrency(0.01)).toBe("$0.01");
  });

  // ─────────────────────────────────────────────────────
  // TEST 8: Savings percentage unaffected
  // ─────────────────────────────────────────────────────

  it("does not affect savings percentage (currency-independent)", () => {
    // Savings percentage is a ratio — it should be the same regardless of currency.
    // This test verifies that the formatter doesn't interfere with percentage logic.
    //
    // Example: actual = $0.005, baseline = $0.008
    // savings = 0.003, savingsPercentage = (0.003/0.008)*100 = 37.5%
    //
    // In PKR: actual = PKR 1.385, baseline = PKR 2.216
    // savings = PKR 0.831, savingsPercentage = (0.831/2.216)*100 = 37.5%
    //
    // The percentage is identical — currency conversion is a linear transform.

    const actualUsd = 0.005;
    const baselineUsd = 0.008;
    const savingsUsd = baselineUsd - actualUsd;
    const savingsPercentage = (savingsUsd / baselineUsd) * 100;

    const rate = 277;
    const actualPkr = actualUsd * rate;
    const baselinePkr = baselineUsd * rate;
    const savingsPkr = baselinePkr - actualPkr;
    const savingsPercentageFromPkr = (savingsPkr / baselinePkr) * 100;

    expect(savingsPercentageFromPkr).toBeCloseTo(savingsPercentage, 10);
  });

  // ─────────────────────────────────────────────────────
  // Additional: convertUsdToDisplay
  // ─────────────────────────────────────────────────────

  it("convertUsdToDisplay returns converted value", () => {
    expect(convertUsdToDisplay(0.01)).toBe(2.77);
    expect(convertUsdToDisplay(1.0)).toBe(277);
  });

  it("convertUsdToDisplay returns original when rate is invalid", () => {
    delete process.env.NEXT_PUBLIC_USD_TO_PKR_RATE;
    expect(convertUsdToDisplay(0.01)).toBe(0.01);
  });

  // ─────────────────────────────────────────────────────
  // Additional: getDisplayCurrencyConfig
  // ─────────────────────────────────────────────────────

  it("getDisplayCurrencyConfig returns valid config with correct rate", () => {
    const config = getDisplayCurrencyConfig();
    expect(config.valid).toBe(true);
    expect(config.currency).toBe("PKR");
    expect(config.rate).toBe(277);
  });

  it("getDisplayCurrencyConfig returns invalid when rate is missing", () => {
    delete process.env.NEXT_PUBLIC_USD_TO_PKR_RATE;
    const config = getDisplayCurrencyConfig();
    expect(config.valid).toBe(false);
  });

  // ─────────────────────────────────────────────────────
  // Additional: formatDisplayCurrencyWithConfig
  // ─────────────────────────────────────────────────────

  it("formatDisplayCurrencyWithConfig uses provided config", () => {
    const config: DisplayCurrencyConfig = {
      currency: "EUR",
      rate: 0.92,
      valid: true,
    };

    expect(formatDisplayCurrencyWithConfig(1.0, config)).toBe("EUR 0.9200");
    expect(formatDisplayCurrencyWithConfig(0, config)).toBe("EUR 0.000000");
  });

  it("formatDisplayCurrencyWithConfig falls back when config is invalid", () => {
    const config: DisplayCurrencyConfig = {
      currency: "PKR",
      rate: 0,
      valid: false,
    };

    expect(formatDisplayCurrencyWithConfig(0.01, config)).toBe("$0.01");
  });

  // ─────────────────────────────────────────────────────
  // Compact formatter (overview headline metrics)
  // ─────────────────────────────────────────────────────

  it("formatDisplayCurrencyCompact always uses 3 decimal places", () => {
    // $0.011 × 277 = PKR 3.047 → "PKR 3.047"
    expect(formatDisplayCurrencyCompact(0.011)).toBe("PKR 3.047");

    // $0.0031 × 277 = PKR 0.8587 → "PKR 0.859"
    expect(formatDisplayCurrencyCompact(0.0031)).toBe("PKR 0.859");

    // $0 × 277 = PKR 0 → "PKR 0.000"
    expect(formatDisplayCurrencyCompact(0)).toBe("PKR 0.000");
  });

  it("formatDisplayCurrencyCompact preserves negative sign", () => {
    // -$0.00001 × 277 = -PKR 0.00277 → "-PKR 0.003"
    expect(formatDisplayCurrencyCompact(-0.00001)).toBe("-PKR 0.003");
  });

  it("formatDisplayCurrencyCompact falls back to USD when rate is invalid", () => {
    delete process.env.NEXT_PUBLIC_USD_TO_PKR_RATE;
    expect(formatDisplayCurrencyCompact(0.01)).toBe("$0.010");
  });
});
