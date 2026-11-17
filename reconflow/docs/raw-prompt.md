# Raw prompt

This document is a faithful project brief summary supplied for the build. Keep the original user/Antigravity conversation separately for the mandatory unedited brainstorming and coding-tool execution-thread submissions.

The business problem: A payments company's books do not balance at month end. The platform knows every transaction it processed; the bank knows what arrived. Compare the two and show where the gaps are.

Generate test data containing: (1) a transaction on the 31st settling on the 1st or 2nd of the next month, (2) individual rounding differences that drift when summed, (3) a duplicate entry in one dataset, and (4) an orphan refund referencing a nonexistent platform transaction.

Build a frontend-only JavaScript application suitable for Vercel. Include explicit assumptions, raw and corrected CSV files, discrepancy analysis, reconciliation, auditability, tests, before/after output, and documentation for all assessment deliverables.
