const express = require('express');
const passport = require('../config/passport');
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

// Registro desde portal de clientes
router.post('/register-portal',
  registerLimiter,
  authController.registerPortalClient
);

// Login desde portal de clientes (busca por email + tenant del portal)
router.post('/login-portal',
  authLimiter,
  loginValidation,
  authController.loginPortalClient
);

// ===========================================
// Rutas OAuth
// ===========================================

// Google OAuth - Implementación manual para evitar bugs de passport-google-oauth20
router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  const scope = encodeURIComponent('profile email');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  
  res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  
  // Ignorar bots
  if (ua.includes('got') || ua.includes('Bot') || ua.includes('Crawl') || req.method === 'HEAD') {
    console.log('🛡️ Bot detectado y bloqueado en OAuth callback:', ua);
    return res.status(204).end();
  }

  const { code, error } = req.query;
  
  if (error) {
    console.log('Google OAuth error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_denied`);
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
  }

  try {
    // DEBUG: Ver exactamente qué código recibimos
    console.log('=== GOOGLE OAUTH DEBUG ===');
    console.log('Raw query string:', req.originalUrl);
    console.log('Parsed code:', code);
    console.log('Code length:', code.length);
    console.log('Redirect URI:', process.env.GOOGLE_CALLBACK_URL.trim());
    
    // Usar el código TAL CUAL viene en la URL original, sin decodificar
    const urlParams = new URL(req.originalUrl, `https://${req.headers.host}`).searchParams;
    const rawCode = urlParams.get('code');
    console.log('Raw code from URL:', rawCode);

    // Intercambiar código por tokens usando fetch nativo
    const bodyParams = new URLSearchParams({
      code: rawCode, // Usar el código sin modificar
      client_id: process.env.GOOGLE_CLIENT_ID.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET.trim(),
      redirect_uri: process.env.GOOGLE_CALLBACK_URL.trim(),
      grant_type: 'authorization_code',
    });
    
    console.log('Sending to Google:', bodyParams.toString().substring(0, 100) + '...');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams,
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('Google token error:', tokenData);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    // Obtener información del usuario
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userInfoResponse.json();
    console.log('Google user:', googleUser.email);

    // Buscar o crear usuario en nuestra base de datos
    const { query } = require('../config/database');
    const email = googleUser.email.toLowerCase();

    // Primero buscar por google_id (match más específico y confiable)
    let result = await query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleUser.id]
    );

    let user = result.rows[0];

    // Si no hay match por google_id, buscar por email
    if (!user) {
      result = await query(
        'SELECT * FROM users WHERE LOWER(email) = $1 ORDER BY is_active DESC, last_login DESC NULLS LAST LIMIT 1',
        [email]
      );
      user = result.rows[0];
    }

    if (user) {
      // Usuario existe, vincular google_id si no lo tiene
      if (!user.google_id) {
        try {
          await query(
            'UPDATE users SET google_id = $1, email_verified = true WHERE id = $2',
            [googleUser.id, user.id]
          );
          user.google_id = googleUser.id;
        } catch (linkError) {
          // Si falla por constraint unique, el google_id ya está en otro usuario
          // Continuar sin vincular, el login sigue funcionando
          console.warn('No se pudo vincular google_id al usuario (ya existe en otro registro):', linkError.message);
        }
      }
      
      // Pasar el usuario al controlador de OAuth
      req.user = user;
      return authController.oauthCallback(req, res);
    } else {
      // Usuario NO existe - redirigir al registro con datos de Google
      const registerData = encodeURIComponent(JSON.stringify({
        email,
        firstName: googleUser.given_name || '',
        lastName: googleUser.family_name || '',
        googleId: googleUser.id,
        provider: 'google'
      }));
      
      return res.redirect(`${process.env.FRONTEND_URL}/register?oauth=${registerData}`);
    }

  } catch (err) {
    console.error('Google OAuth error:', err);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(err.message)}`);
  }
});

// Facebook OAuth
router.get('/facebook',
  passport.authenticate('facebook', { 
    scope: ['email'],
    session: false
  })
);

router.get('/facebook/callback',
  (req, res, next) => {
    const ua = req.headers['user-agent'] || '';
    if (ua.includes('got') || ua.includes('Bot') || ua.includes('Crawl') || req.method === 'HEAD') {
      return res.status(204).end();
    }
    next();
  },
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

