/**
 * Attentra — Display Currency Configuration & Formatting
 *
 * Phase 12.12.2 — Product-Wide PKR Display Currency
 *
 * All internal monetary values (provider pricing, model pricing, routing
 * projected costs, actualCost, baselineCost, savings) remain stored and
 * calculated in USD.
 *
 * This module provides presentation-only conversion and formatting for
 * user-facing displays. The internal USD semantics are never changed.
 *
 * Configuration (NEXT_PUBLIC_ prefixed for client-component access):
 *   NEXT_PUBLIC_DISPLAY_CURRENCY  — target display currency code (default: "PKR")
 *   NEXT_PUBLIC_USD_TO_PKR_RATE   — numeric exchange rate (must be > 0)
 *
 * If the exchange rate is missing or invalid, the formatter falls back
 * to displaying USD values so the product never shows broken output.
 */

// ─────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────

export interface DisplayCurrencyConfig {
  /** Display currency code (e.g. "PKR"). */
  currency: string;
  /** USD → display currency exchange rate. */
  rate: number;
  /** Whether the configuration is valid and usable. */
  valid: boolean;
}

/**
 * Read the display currency configuration from environment variables.
 *
 * Returns a validated config. If the rate is missing, non-numeric,
 * zero, or negative, `valid` is false and the formatter falls back
 * to USD display.
 */
export function getDisplayCurrencyConfig(): DisplayCurrencyConfig {
  const currency = (process.env.NEXT_PUBLIC_DISPLAY_CURRENCY ?? "PKR").trim().toUpperCase();
  const rawRate = process.env.NEXT_PUBLIC_USD_TO_PKR_RATE;

  if (!rawRate) {
    return { currency, rate: 0, valid: false };
  }

  const rate = Number(rawRate);

  if (!Number.isFinite(rate) || rate <= 0) {
    return { currency, rate: 0, valid: false };
  }

  return { currency, rate, valid: true };
}

// ─────────────────────────────────────────────────────
// Conversion
// ─────────────────────────────────────────────────────

/**
 * Convert a USD amount to the display currency.
 *
 * Returns the original amount when the configuration is invalid
 * (safe fallback — never returns NaN or Infinity).
 */
export function convertUsdToDisplay(usdAmount: number): number {
  const config = getDisplayCurrencyConfig();

  if (!config.valid) {
    return usdAmount;
  }

  return usdAmount * config.rate;
}

// ─────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────

/**
 * Determine the appropriate decimal precision for a display-currency
 * amount based on its magnitude.
 *
 * >= 1       → 2 decimal places  (e.g. PKR 217.50)
 * >= 0.01    → 4 decimal places  (e.g. PKR 0.3700)
 * < 0.01     → 6 decimal places  (e.g. PKR 0.001800)
 */
function precisionFor(absValue: number): number {
  if (absValue >= 1) return 2;
  if (absValue >= 0.01) return 4;
  return 6;
}

/**
 * Format a USD amount as a display-currency string.
 *
 * Examples (PKR, rate = 277):
 *
 *   formatDisplayCurrency(0.005)   → "PKR 1.39"
 *   formatDisplayCurrency(0.0001)  → "PKR 0.0277"
 *   formatDisplayCurrency(0.00001) → "PKR 0.002770"
 *   formatDisplayCurrency(-0.003)  → "-PKR 0.83"
 *   formatDisplayCurrency(0)       → "PKR 0.00"
 *
 * When the exchange rate is not configured, falls back to USD
 * formatting with the "$" prefix so the product remains usable.
 */
export function formatDisplayCurrency(usdAmount: number): string {
  const config = getDisplayCurrencyConfig();

  if (!config.valid) {
    return formatUsdFallback(usdAmount);
  }

  const converted = usdAmount * config.rate;
  const sign = converted < 0 ? "-" : "";
  const abs = Math.abs(converted);
  const decimals = precisionFor(abs);

  return `${sign}${config.currency} ${abs.toFixed(decimals)}`;
}

/**
 * Format a USD amount as a display-currency string, accepting an
 * optional pre-fetched config to avoid repeated env reads when
 * formatting many values in a single render pass.
 */
export function formatDisplayCurrencyWithConfig(
  usdAmount: number,
  config: DisplayCurrencyConfig,
): string {
  if (!config.valid) {
    return formatUsdFallback(usdAmount);
  }

  const converted = usdAmount * config.rate;
  const sign = converted < 0 ? "-" : "";
  const abs = Math.abs(converted);
  const decimals = precisionFor(abs);

  return `${sign}${config.currency} ${abs.toFixed(decimals)}`;
}

// ─────────────────────────────────────────────────────
// Compact overview formatter (3 decimal places)
// ─────────────────────────────────────────────────────

/**
 * Format a USD amount as a compact display-currency string for
 * overview headline metrics (Actual Spend, Baseline, Savings, Avg).
 *
 * Always uses exactly 3 decimal places regardless of magnitude,
 * producing compact, visually aligned values in dashboard cards.
 *
 * Examples (PKR, rate = 277):
 *
 *   formatDisplayCurrencyCompact(0.011)  → "PKR 3.060"
 *   formatDisplayCurrencyCompact(0.0031) → "PKR 0.870"
 *   formatDisplayCurrencyCompact(-0.00001) → "-PKR 0.002"
 *   formatDisplayCurrencyCompact(0)      → "PKR 0.000"
 *
 * When the exchange rate is not configured, falls back to USD
 * with 3 decimal places.
 */
export function formatDisplayCurrencyCompact(usdAmount: number): string {
  const config = getDisplayCurrencyConfig();

  if (!config.valid) {
    return formatUsdCompactFallback(usdAmount);
  }

  const converted = usdAmount * config.rate;
  const sign = converted < 0 ? "-" : "";
  const abs = Math.abs(converted);

  return `${sign}${config.currency} ${abs.toFixed(3)}`;
}

function formatUsdCompactFallback(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}$${abs.toFixed(3)}`;
}

// ─────────────────────────────────────────────────────
// Fallback (USD display when rate is not configured)
// ─────────────────────────────────────────────────────

function formatUsdFallback(value: number): string {
  if (value === 0) return "$0.00";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs < 0.0001) {
    return `${sign}$${abs.toFixed(6)}`;
  }

  if (abs < 0.01) {
    return `${sign}$${abs.toFixed(4)}`;
  }

  return `${sign}$${abs.toFixed(2)}`;
}
