// src/routes/consultationRoute.js
const express = require('express');
const router = express.Router();
const { createConsultation } = require('../controllers/consultationController');
const authMiddleware = require('../middleware/auth'); // Patient ka auth
const deidentifyMiddleware = require('../middleware/deidentify');

router.post('/', authMiddleware, deidentifyMiddleware, createConsultation);

module.exports = router;