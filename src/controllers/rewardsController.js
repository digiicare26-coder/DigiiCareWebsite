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

module.exports = { getBalance, getHistory, testEarnPoints, redeem };