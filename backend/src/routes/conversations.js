const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const conversationController = require('../controllers/conversationController');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener mis conversaciones
router.get('/my', conversationController.getMyConversations);

// Obtener conteo de no leídas
router.get('/unread-count', conversationController.getUnreadCount);

// Obtener una conversación
router.get('/:id', conversationController.getConversation);

// Crear nueva conversación
router.post('/', conversationController.createConversation);

// Agregar mensaje a conversación
router.post('/:id/messages', conversationController.addMessage);

// Cambiar estado de conversación
router.patch('/:id/status', conversationController.updateStatus);

module.exports = router;
