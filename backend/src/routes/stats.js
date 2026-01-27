const express = require('express');
const router = express.Router();
const { authenticateToken, requireTenant } = require('../middleware/auth');
const statsController = require('../controllers/statsController');

router.use(authenticateToken);
router.use(requireTenant);

router.get('/', statsController.getStats);

module.exports = router;
