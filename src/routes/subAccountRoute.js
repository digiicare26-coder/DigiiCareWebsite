// src/routes/subAccountRoute.js
const express = require('express');
const router = express.Router();
const { addFamilyMember, listFamilyMembers } = require('../controllers/subAccountController');
const authMiddleware = require('../middleware/auth');

// 🔥 All routes protected — the parent (father/husband) must already
// be logged in; wife/kids are linked under his patientId, never via
// a separate signup.
router.use(authMiddleware);

router.post('/', addFamilyMember);
router.get('/', listFamilyMembers);

module.exports = router;
