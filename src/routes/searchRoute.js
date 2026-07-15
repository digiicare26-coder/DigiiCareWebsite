// src/routes/searchRoute.js
const express = require('express');
const router = express.Router();
const { searchScans } = require('../controllers/searchController');
const authMiddleware = require('../middleware/auth');
const deidentifyMiddleware = require('../middleware/deidentify');

router.use(authMiddleware);
router.use(deidentifyMiddleware);
router.get('/scans', searchScans);

module.exports = router;