const express = require('express');
const passport = require('passport');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/security');
const { 
  registerValidation, 
  loginValidation, 
  resetPasswordValidation,
  changePasswordValidation,
  emailValidation,
  handleValidationErrors
} = require('../middleware/validation');

// ===========================================
// Rutas públicas (con rate limiting)
// ===========================================

// Registro
router.post('/register', 
  registerLimiter,
  registerValidation,
  authController.register
);

// Login
router.post('/login',
  authLimiter,
  loginValidation,
  authController.login
);

// Refresh token
router.post('/refresh',
  authController.refreshAccessToken
);

// Verificar email
router.get('/verify-email/:token',
  authController.verifyEmail
);

// Reenviar email de verificación
router.post('/resend-verification',
  authLimiter,
  [emailValidation, handleValidationErrors],
  authController.resendVerificationEmail
);

// Olvidé mi contraseña
router.post('/forgot-password',
  passwordResetLimiter,
  [emailValidation, handleValidationErrors],
  authController.forgotPassword
);

// Reset de contraseña
router.post('/reset-password',
  passwordResetLimiter,
  resetPasswordValidation,
  authController.resetPassword
);

// ===========================================
// Rutas OAuth
// ===========================================

// Google OAuth
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`,
    session: false
  }),
  authController.oauthCallback
);

// Facebook OAuth
router.get('/facebook',
  passport.authenticate('facebook', { 
    scope: ['email'],
    session: false
  })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=facebook_failed`,
    session: false
  }),
  authController.oauthCallback
);

// ===========================================
// Rutas protegidas (requieren autenticación)
// ===========================================

// Obtener usuario actual
router.get('/me',
  authenticateToken,
  authController.getCurrentUser
);

// Logout
router.post('/logout',
  authenticateToken,
  authController.logout
);

// Logout de todas las sesiones
router.post('/logout-all',
  authenticateToken,
  authController.logoutAll
);

// Cambiar contraseña
router.post('/change-password',
  authenticateToken,
  changePasswordValidation,
  authController.changePassword
);

module.exports = router;

