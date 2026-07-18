// src/routes/rewardsRoute.js
const express = require('express');
const router = express.Router();
const {
  getBalance,
  getHistory,
  testEarnPoints,
  redeem,
} = require('../controllers/rewardsController');
const authMiddleware = require('../middleware/auth');
const deidentifyMiddleware = require('../middleware/deidentify');

// All routes require patient login.
router.use(authMiddleware);
router.use(deidentifyMiddleware);

router.get('/balance', getBalance);
router.get('/history', getHistory);
router.post('/test-earn', testEarnPoints); // TEMPORARY — see controller for why
router.post('/redeem', redeem);

module.exports = router;