import { describe, it, expect } from "vitest";
import { reconcile, applySafeCorrections } from "../services/reconciliationEngine.js";
import { generateSampleData } from "../services/datasetGenerator.js";

describe("ReconFlow sample reconciliation", () => {
  it("detects all four planted issue types", () => {
    const { platform, bank } = generateSampleData();
    const r = reconcile(platform, bank);
    const types = new Set(r.issues.map(x => x.type));
    expect(types.has("TIMING DIFFERENCE")).toBe(true);
    expect(types.has("ROUNDING DIFFERENCE")).toBe(true);
    expect(types.has("DUPLICATE")).toBe(true);
    expect(types.has("ORPHAN REFUND")).toBe(true);
  });
  it("does not classify a cross-month T+1 settlement as missing", () => {
    const { platform, bank } = generateSampleData();
    const r = reconcile(platform, bank);
    expect(r.timing.some(x => x.platform.transaction_id === "TXN-MONTH-END")).toBe(true);
    expect(r.missing.some(x => x.transaction_id === "TXN-MONTH-END")).toBe(false);
  });
  it("excludes duplicate bank row while preserving raw input", () => {
    const { platform, bank } = generateSampleData();
    const originalLength = bank.length;
    const r = reconcile(platform, bank);
    const fixed = applySafeCorrections(platform, bank, r);
    expect(fixed.correctedBank.length).toBe(originalLength - 1);
    expect(bank.length).toBe(originalLength);
  });
  it("flags orphan refund instead of inventing a payment", () => {
    const { platform, bank } = generateSampleData();
    const r = reconcile(platform, bank);
    expect(r.orphanRefunds[0].original_transaction_id).toBe("TXN-DOES-NOT-EXIST");
  });
  it("uses paise precision", () => {
    const { platform, bank } = generateSampleData();
    const r = reconcile(platform, bank);
    expect(Number.isInteger(r.summary.platformGrossPaise)).toBe(true);
  });
});