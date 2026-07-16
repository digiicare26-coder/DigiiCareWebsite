// src/routes/recommendRoute.js
const express = require('express');
const router = express.Router();
const { recommend, searchMedicine } = require('../controllers/recommendController');
const doctorAuthMiddleware = require('../middleware/doctorAuth');
const deidentifyMiddleware = require('../middleware/deidentify');

// BE-3's medicine recommender — symptom-based.
router.post('/', doctorAuthMiddleware, deidentifyMiddleware, recommend);

// Name autocomplete — "type P, see medicines starting with P".
// GET /api/recommend/search?q=P
router.get('/search', doctorAuthMiddleware, deidentifyMiddleware, searchMedicine);

module.exports = router;