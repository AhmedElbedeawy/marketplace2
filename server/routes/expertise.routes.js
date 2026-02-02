const express = require('express');
const router = express.Router();
const { getExpertise } = require('../controllers/expertiseController');

router.get('/', getExpertise);

module.exports = router;
