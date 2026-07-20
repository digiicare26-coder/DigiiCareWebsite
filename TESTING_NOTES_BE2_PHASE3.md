# BE-2 Phase 3 — Integration Testing Notes

**Tested by:** Wajeeha
**Date:** 18 Jul 2026

## Scope
End-to-end integration test covering Consent, Patient Profile, Doctor Portal, Consultation, and Rewards/Redemption — using one patient and two doctors (one approved, one not).

## Flow Tested
1. Patient signup → OTP → login
2. Consent: blocked before consenting, works after (403 → 201)
3. Patient Profile CRUD: create, read, update, delete — all working
4. Doctor signup/login for two doctors; one approved, one left unapproved
5. Consultation: rejected for unapproved doctor (403), succeeds for approved doctor (201)
6. Doctor's patient list reflects the new consultation
7. Rewards: earn points, duplicate action rejected (409), balance updates correctly
8. Redemption: request deducts points immediately, insufficient balance rejected (400),
   approve/reject both work, rejection refunds points, double-review attempt rejected (404)
9. Regression: Patient Profile delete still works after all the above
10. Sanity check: health check, BE-1 auth, BE-3 recommender all pass

## Result
34/35 checks passed.

## Issue Found (Not BE-2's Code)
`GET /api/search/scans?q=<text>` returns 500 (for valid `q` >= 2 chars) — `src/controllers/searchController.js` (BE-4) calls
`clinicalRepo.searchScansByText`, which is not implemented in
`src/repositories/clinicalRepository.js`. Reported to BE-4 directly.

## Test Data
All test accounts/records created during this pass have been cleaned up
from the local database (not persisted).