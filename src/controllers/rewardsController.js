// src/controllers/rewardsController.js
const clinicalRepository = require('../repositories/clinicalRepository');

async function getBalance(req, res) {
  try {
    const { linkToken } = req.user;
    const pointsBalance = await clinicalRepository.getRewardBalance(linkToken);
    return res.status(200).json({ success: true, data: { pointsBalance } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getHistory(req, res) {
  try {
    const { linkToken } = req.user;
    const history = await clinicalRepository.getRewardHistory(linkToken);
    return res.status(200).json({ success: true, data: history });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// TEMPORARY test-only endpoint — in production, points are awarded
// automatically by other features (profile completed, vitals logged,
// etc.), never directly by the patient calling an API. This exists
// so the earn/duplicate-prevention logic can be verified end-to-end
// via Postman before those integrations exist.
async function testEarnPoints(req, res) {
  try {
    const { linkToken } = req.user;
    const { points, reason } = req.body;

    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ success: false, error: 'points must be a positive number.' });
    }
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ success: false, error: 'reason is required.' });
    }

    const actionKey = `${linkToken}_${reason}`;
    const result = await clinicalRepository.earnPoints(linkToken, points, reason, actionKey);

    if (!result) {
      return res.status(409).json({ success: false, error: 'Points already awarded for this action.' });
    }

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function redeem(req, res) {
  try {
    const { linkToken } = req.user;
    const { points, reason } = req.body;

    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ success: false, error: 'points must be a positive number.' });
    }
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ success: false, error: 'reason is required.' });
    }

    const actionKey = `${linkToken}_redeem_${Date.now()}`;
    const result = await clinicalRepository.redeemPoints(linkToken, points, reason, actionKey);

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ success: false, error: 'Insufficient points balance.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function createRedemptionRequest(req, res) {
  try {
    const { linkToken } = req.user;
    const { points, reason } = req.body;

    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ success: false, error: 'points must be a positive number.' });
    }

    const request = await clinicalRepository.createRedemptionRequest(linkToken, points, reason);
    return res.status(201).json({ success: true, data: request });
  } catch (err) {
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ success: false, error: 'Insufficient points balance.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getMyRedemptionRequests(req, res) {
  try {
    const { linkToken } = req.user;
    const requests = await clinicalRepository.getRedemptionRequestsByToken(linkToken);
    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Admin action — no admin panel/auth exists yet, same situation as
// Doctor's approveDoctor endpoint. Stays open (no auth) until an
// admin auth system is built. See doctorController.js for the
// identical pattern already in use.
async function approveRedemptionRequest(req, res) {
  try {
    const { redemptionId } = req.params;
    const result = await clinicalRepository.approveRedemption(redemptionId);

    if (result.count === 0) {
      return res.status(404).json({ success: false, error: 'Request not found or already reviewed.' });
    }
    const request = await clinicalRepository.getRedemptionRequestById(redemptionId);
    return res.status(200).json({ success: true, data: request });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function rejectRedemptionRequest(req, res) {
  try {
    const { redemptionId } = req.params;
    const request = await clinicalRepository.rejectRedemption(redemptionId);

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found or already reviewed.' });
    }
    return res.status(200).json({ success: true, data: request, message: 'Request rejected and points refunded.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getBalance,
  getHistory,
  testEarnPoints,
  redeem,
  createRedemptionRequest,
  getMyRedemptionRequests,
  approveRedemptionRequest,
  rejectRedemptionRequest,
};