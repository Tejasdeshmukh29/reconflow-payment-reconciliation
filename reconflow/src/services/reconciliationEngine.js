import { toPaise } from "./currency.js";

const key = x => String(x || "").trim();
const dateOf = x => new Date(`${x}T00:00:00Z`);
const daysBetween = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 86400000);

export function reconcile(platformRows, bankRows, tolerancePaise = 1) {
  const issues = [], audit = [];
  const platform = platformRows.map((r, index) => ({ ...r, _index: index }));
  const bank = bankRows.map((r, index) => ({ ...r, _index: index }));
  const duplicateBankIndexes = new Set();
  const seen = new Map();

  bank.forEach(row => {
    const id = key(row.transaction_id);
    if (seen.has(id)) {
      duplicateBankIndexes.add(row._index);
      issues.push({ type: "DUPLICATE", id, source: "Bank", amountPaise: toPaise(row.gross_amount), detail: `Repeated transaction reference in bank data (${row.settlement_id || "no settlement ID"}).`, action: "Exclude duplicate from confirmed settlement totals; preserve raw row." });
      audit.push({ id, action: "Duplicate identified", reason: "Repeated bank transaction reference", from: "Included", to: "Excluded from totals" });
    } else seen.set(id, row._index);
  });

  const platformById = new Map(platform.map(r => [key(r.transaction_id), r]));
  const bankById = new Map();
  bank.filter(r => !duplicateBankIndexes.has(r._index)).forEach(r => {
    const id = key(r.transaction_id);
    if (!bankById.has(id)) bankById.set(id, []);
    bankById.get(id).push(r);
  });

  const matched = [], timing = [], missing = [], orphanRefunds = [];
  platform.forEach(p => {
    if (String(p.transaction_type).toUpperCase() === "REFUND") {
      if (!platformById.has(key(p.original_transaction_id))) {
        orphanRefunds.push(p);
        issues.push({ type: "ORPHAN REFUND", id: p.transaction_id, source: "Platform", amountPaise: toPaise(p.transaction_amount), detail: `Original transaction ${p.original_transaction_id || "(blank)"} does not exist in platform log.`, action: "Flag for manual investigation; do not fabricate or delete the original." });
        audit.push({ id: p.transaction_id, action: "Orphan refund flagged", reason: "Original payment not found", from: "Unreviewed", to: "Investigation required" });
        return;
      }
    }
    const candidates = bankById.get(key(p.transaction_id)) || [];
    if (!candidates.length) {
      if (String(p.transaction_type).toUpperCase() !== "REFUND") {
        missing.push(p);
        issues.push({ type: "MISSING SETTLEMENT", id: p.transaction_id, source: "Platform", amountPaise: toPaise(p.transaction_amount), detail: "No bank settlement record found in the imported bank data.", action: "Keep outstanding; verify later settlement files." });
      }
      return;
    }
    const b = candidates[0];
    const diff = Math.abs(toPaise(p.transaction_amount) - toPaise(b.gross_amount));
    const dayGap = daysBetween(p.transaction_date, b.settlement_date);
    const isCrossMonth = p.transaction_date.slice(0, 7) !== b.settlement_date.slice(0, 7);
    const item = { platform: p, bank: b, diffPaise: toPaise(b.gross_amount) - toPaise(p.transaction_amount), dayGap };
    if (isCrossMonth && dayGap >= 0 && dayGap <= 2) {
      timing.push(item);
      issues.push({ type: "TIMING DIFFERENCE", id: p.transaction_id, source: "Cross-month", amountPaise: item.diffPaise, detail: `Payment on ${p.transaction_date} settled on ${b.settlement_date} (T+${dayGap}).`, action: "Link to next-period settlement; retain as an October cutoff timing item." });
      audit.push({ id: p.transaction_id, action: "Cross-month settlement matched", reason: `Settlement arrived T+${dayGap}`, from: "Unmatched at month-end", to: "Timing difference" });
    } else {
      matched.push(item);
      if (diff > 0) {
        issues.push({ type: "ROUNDING DIFFERENCE", id: p.transaction_id, source: "Amount comparison", amountPaise: item.diffPaise, detail: `Platform gross ${p.transaction_amount}; bank gross ${b.gross_amount}.`, action: "Record explicit variance; do not overwrite source amounts." });
        audit.push({ id: p.transaction_id, action: "Rounding variance recorded", reason: `${item.diffPaise} paise gross variance`, from: "Amount mismatch", to: "Explicit adjustment required" });
      }
    }
  });

  const duplicateCount = duplicateBankIndexes.size;
  const roundingItems = issues.filter(x => x.type === "ROUNDING DIFFERENCE");
  const roundingTotalPaise = roundingItems.reduce((s, x) => s + x.amountPaise, 0);
  const platformGrossPaise = platform.reduce((s, r) => s + toPaise(r.transaction_amount), 0);
  const bankGrossPaise = bank.reduce((s, r, i) => s + (duplicateBankIndexes.has(i) ? 0 : toPaise(r.gross_amount)), 0);
  const safeBankNetPaise = bank.filter((r, i) => !duplicateBankIndexes.has(i)).reduce((s, r) => s + toPaise(r.net_amount), 0);

  return {
    issues, audit, matched, timing, missing, orphanRefunds, duplicateBankIndexes: [...duplicateBankIndexes],
    summary: {
      platformCount: platform.length, bankCount: bank.length, matchedCount: matched.length,
      timingCount: timing.length, duplicateCount, orphanRefundCount: orphanRefunds.length,
      missingCount: missing.length, roundingCount: roundingItems.length,
      platformGrossPaise, bankGrossPaise, safeBankNetPaise, grossDifferencePaise: bankGrossPaise - platformGrossPaise,
      roundingTotalPaise, tolerancePaise
    }
  };
}

export function applySafeCorrections(platformRows, bankRows, result) {
  const duplicate = new Set(result.duplicateBankIndexes);
  const correctedBank = bankRows.filter((_, i) => !duplicate.has(i)).map(r => ({ ...r }));
  const correctedPlatform = platformRows.map(r => ({ ...r }));
  const report = result.issues.map(x => ({
    transaction_id: x.id, discrepancy_type: x.type, source: x.source,
    difference_inr: (x.amountPaise / 100).toFixed(2), explanation: x.detail,
    recommended_action: x.action, status: x.type === "ORPHAN REFUND" || x.type === "MISSING SETTLEMENT" ? "INVESTIGATION REQUIRED" : "CLASSIFIED"
  }));
  return { correctedPlatform, correctedBank, report };
}