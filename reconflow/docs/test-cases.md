# Test Cases

| ID | Scenario | Expected result |
|---|---|---|
| TC01 | Valid payment with settlement | Matched |
| TC02 | 31 Oct payment settled 1 Nov | Timing difference, not missing |
| TC03 | 31 Oct payment settled 2 Nov | Timing difference when within T+2 |
| TC04 | Three one-paise bank gross variances | Explicit rounding variance records and aggregate drift |
| TC05 | Duplicate bank settlement reference | Duplicate excluded from corrected bank export; raw preserved |
| TC06 | Refund references nonexistent payment | Orphan refund, manual investigation |
| TC07 | Payment without settlement | Missing settlement |
| TC08 | Same amount, different transaction IDs | No amount-only matching |
| TC09 | Valid refund references existing payment | Not classified as orphan |
| TC10 | CSV missing required headers | Upload rejected with clear message |
| TC11 | INR decimal amounts | Converted to integer paise for comparisons |
| TC12 | Re-run same sample data | Same deterministic issue classification |

Run with `npm test`. These tests validate the reconciliation core. Browser UI interactions should also be manually smoke-tested before submission.
