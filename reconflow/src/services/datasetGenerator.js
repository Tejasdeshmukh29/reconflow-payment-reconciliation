// Deterministic demo data. All amounts are INR; settlement net = gross - fee.
export function generateSampleData() {
  const platform = [];
  const bank = [];
  for (let i = 1; i <= 100; i++) {
    const id = `TXN${String(i).padStart(5, "0")}`;
    const day = 1 + ((i * 7) % 28);
    const amount = (125 + ((i * 137) % 18750) / 100).toFixed(2);
    platform.push({
      transaction_id: id, customer_id: `CUS${String((i % 37) + 1).padStart(3, "0")}`,
      transaction_date: `2026-10-${String(day).padStart(2, "0")}`,
      transaction_amount: amount, transaction_type: "PAYMENT",
      payment_status: "SUCCESS", original_transaction_id: "", currency: "INR"
    });
    // A 0.02 fee and exact matching gross for ordinary records.
    bank.push({
      settlement_id: `STL${String(i).padStart(5, "0")}`, transaction_id: id,
      settlement_date: `2026-10-${String(Math.min(day + 1, 30)).padStart(2, "0")}`,
      gross_amount: amount, settlement_fee: "0.02",
      net_amount: (Number(amount) - 0.02).toFixed(2),
      settlement_status: "SETTLED", currency: "INR"
    });
  }

  // Timing: October 31 transaction settled November 1.
  platform.push({
    transaction_id: "TXN-MONTH-END", customer_id: "CUS099",
    transaction_date: "2026-10-31", transaction_amount: "2500.00",
    transaction_type: "PAYMENT", payment_status: "SUCCESS",
    original_transaction_id: "", currency: "INR"
  });
  bank.push({
    settlement_id: "STL-MONTH-END", transaction_id: "TXN-MONTH-END",
    settlement_date: "2026-11-01", gross_amount: "2500.00",
    settlement_fee: "0.02", net_amount: "2499.98",
    settlement_status: "SETTLED", currency: "INR"
  });

  // Rounding: each bank gross has a 1-paise rounding delta; aggregate drift is 3 paise.
  ["TXN00010", "TXN00020", "TXN00030"].forEach((id, idx) => {
    const row = bank.find(x => x.transaction_id === id);
    row.gross_amount = (Number(row.gross_amount) + 0.01).toFixed(2);
    row.net_amount = (Number(row.gross_amount) - Number(row.settlement_fee)).toFixed(2);
  });

  // Duplicate settlement row.
  bank.push({ ...bank.find(x => x.transaction_id === "TXN00040"), settlement_id: "STL-DUP-00040" });

  // Orphan refund in platform log, with a nonexistent original payment.
  platform.push({
    transaction_id: "REF-ORPHAN-001", customer_id: "CUS404",
    transaction_date: "2026-10-22", transaction_amount: "-450.00",
    transaction_type: "REFUND", payment_status: "SUCCESS",
    original_transaction_id: "TXN-DOES-NOT-EXIST", currency: "INR"
  });

  // A valid refund to prove that not all refunds are orphaned.
  platform.push({
    transaction_id: "REF-VALID-001", customer_id: "CUS005",
    transaction_date: "2026-10-24", transaction_amount: "-100.00",
    transaction_type: "REFUND", payment_status: "SUCCESS",
    original_transaction_id: "TXN00005", currency: "INR"
  });
  bank.push({
    settlement_id: "STL-REF-VALID-001", transaction_id: "REF-VALID-001",
    settlement_date: "2026-10-25", gross_amount: "-100.00",
    settlement_fee: "0.00", net_amount: "-100.00",
    settlement_status: "SETTLED", currency: "INR"
  });
  return { platform, bank };
}