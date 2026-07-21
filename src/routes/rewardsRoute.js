// src/routes/rewardsRoute.js
const express = require('express');
const router = express.Router();
const {
  getBalance,
  getHistory,
  testEarnPoints,
  redeem,
  createRedemptionRequest,
  getMyRedemptionRequests,
  approveRedemptionRequest,
  rejectRedemptionRequest,
} = require('../controllers/rewardsController');
const authMiddleware = require('../middleware/auth');
const adminAuthMiddleware = require('../middleware/adminAuth');
const deidentifyMiddleware = require('../middleware/deidentify');

// Patient-facing routes — patient's own token only.
router.get('/balance', authMiddleware, deidentifyMiddleware, getBalance);
router.get('/history', authMiddleware, deidentifyMiddleware, getHistory);
router.post('/test-earn', authMiddleware, deidentifyMiddleware, testEarnPoints);
router.post('/redeem', authMiddleware, deidentifyMiddleware, redeem);
router.post('/redemption-requests', authMiddleware, deidentifyMiddleware, createRedemptionRequest);
router.get('/redemption-requests', authMiddleware, deidentifyMiddleware, getMyRedemptionRequests);

// Admin-only routes — now that the admin panel exists (see
// adminRoute.js), these require a real admin JWT instead of being
// reachable by any logged-in patient. Previously this file had a
// blanket router.use(authMiddleware) that covered these too, which
// meant any patient could approve/reject any redemption request.
router.patch('/redemption-requests/:redemptionId/approve', adminAuthMiddleware, approveRedemptionRequest);
router.patch('/redemption-requests/:redemptionId/reject', adminAuthMiddleware, rejectRedemptionRequest);

module.exports = router;