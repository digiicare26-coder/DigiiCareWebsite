// src/controllers/subAccountController.js
const {
  createSubAccount,
  findSubAccountsByParent,
} = require('../repositories/identityRepository');
const notificationService = require('../services/notificationService'); // 🆕 Notifications

const VALID_RELATIONS = ['child', 'spouse'];

/**
 * POST /api/family
 * body: { fullName, relation }   // relation: 'child' | 'spouse'
 *
 * Called by an already logged-in father/husband (req.user.patientId
 * comes from his JWT). No separate signup for the wife/kid — their
 * row is FK-linked to his patient_id and gets a sub-uid derived from
 * his uid (e.g. his uid "1" -> "1_1", "1_2", "1_3", ...).
 */
async function addFamilyMember(req, res) {
  try {
    const { patientId } = req.user;
    const { fullName, relation } = req.body;

    if (!patientId) {
      return res.status(401).json({ success: false, error: 'Only a logged-in patient can add family members.' });
    }

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ success: false, error: 'fullName is required.' });
    }

    if (!relation || !VALID_RELATIONS.includes(relation)) {
      return res.status(400).json({ success: false, error: `relation must be one of: ${VALID_RELATIONS.join(', ')}.` });
    }

    const { subAccountId, uid, linkToken } = await createSubAccount(patientId, fullName.trim(), relation);

    // 🆕 Notify the parent patient: family member linked
    notificationService.notifyFamilyMemberAdded(patientId, fullName.trim(), relation);

    return res.status(201).json({
      success: true,
      message: 'Family member linked successfully.',
      subAccount: { subAccountId, uid, fullName: fullName.trim(), relation, parentPatientId: patientId },
      linkToken,
    });
  } catch (err) {
    const statusCode = err.statusCode || (err.message.includes('No patient found') ? 404 : 500);
    return res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/family
 * Lists every wife/kid sub-account linked under the logged-in
 * father/husband's patient_id.
 */
async function listFamilyMembers(req, res) {
  try {
    const { patientId } = req.user;

    if (!patientId) {
      return res.status(401).json({ success: false, error: 'Only a logged-in patient can view family members.' });
    }

    const subAccounts = await findSubAccountsByParent(patientId);

    return res.status(200).json({
      success: true,
      data: subAccounts.map((s) => ({
        subAccountId: s.patientId,
        uid: s.uid,
        fullName: s.fullName,
        relation: s.relation,
        parentPatientId: s.parentPatientId,
      })),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

module.exports = { addFamilyMember, listFamilyMembers };
