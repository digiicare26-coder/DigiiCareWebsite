// src/routes/searchRoute.js
const express = require('express');
const router = express.Router();
const { searchScans } = require('../controllers/searchController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.get('/scans', searchScans);

module.exports = router;