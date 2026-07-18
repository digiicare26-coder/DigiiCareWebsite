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
const deidentifyMiddleware = require('../middleware/deidentify');

router.use(authMiddleware);
router.use(deidentifyMiddleware);

router.get('/balance', getBalance);
router.get('/history', getHistory);
router.post('/test-earn', testEarnPoints);
router.post('/redeem', redeem);

router.post('/redemption-requests', createRedemptionRequest);
router.get('/redemption-requests', getMyRedemptionRequests);
router.patch('/redemption-requests/:redemptionId/approve', approveRedemptionRequest);
router.patch('/redemption-requests/:redemptionId/reject', rejectRedemptionRequest);

module.exports = router;