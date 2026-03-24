const express = require('express');
const router = express.Router();
const { authenticateToken, requireTenant } = require('../middleware/auth');
const controller = require('../controllers/conceptoGastoController');

router.use(authenticateToken);
router.use(requireTenant);

router.get('/', controller.listar);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);
router.post('/seed', controller.seedConceptos);

module.exports = router;
