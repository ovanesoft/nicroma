const nodemailer = require('nodemailer');

// Crear transporter de nodemailer
let transporter = null;

const initializeTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  return transporter;
};

// Template base de emails
const getEmailTemplate = (content, title = 'Nicroma') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #2563eb;
      font-size: 28px;
      margin: 0;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .warning {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🔷 Nicroma</h1>
    </div>
    ${content}
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Nicroma. Todos los derechos reservados.</p>
      <p>Este es un email automático, por favor no responda.</p>
    </div>
  </div>
</body>
</html>
`;

// Enviar email de verificación
const sendVerificationEmail = async (email, firstName, verificationToken) => {
  const transport = initializeTransporter();
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const content = `
    <h2>¡Hola ${firstName}!</h2>
    <p>Gracias por registrarte en Nicroma. Para completar tu registro, por favor verifica tu dirección de email haciendo clic en el botón de abajo:</p>
    <p style="text-align: center;">
      <a href="${verificationUrl}" class="button">Verificar Email</a>
    </p>
    <p>O copia y pega este enlace en tu navegador:</p>
    <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
    <div class="warning">
      ⚠️ Este enlace expira en 24 horas. Si no solicitaste este registro, puedes ignorar este email.
    </div>
  `;

  const mailOptions = {
    from: `"Nicroma" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verifica tu email - Nicroma',
    html: getEmailTemplate(content, 'Verificación de Email')
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`📧 Email de verificación enviado a: ${email}`);
    return true;
  } catch (error) {
    console.error('Error enviando email de verificación:', error);
    throw error;
  }
};

// Enviar email de reset de contraseña
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const transport = initializeTransporter();
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const content = `
    <h2>Hola ${firstName},</h2>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Nicroma.</p>
    <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
    </p>
    <p>O copia y pega este enlace en tu navegador:</p>
    <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
    <div class="warning">
      ⚠️ Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este email y tu contraseña permanecerá sin cambios.
    </div>
  `;

  const mailOptions = {
    from: `"Nicroma" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Restablecer contraseña - Nicroma',
    html: getEmailTemplate(content, 'Restablecer Contraseña')
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`📧 Email de reset enviado a: ${email}`);
    return true;
  } catch (error) {
    console.error('Error enviando email de reset:', error);
    throw error;
  }
};

// Enviar email de invitación
const sendInvitationEmail = async (email, inviterName, tenantName, inviteToken, role) => {
  const transport = initializeTransporter();
  const inviteUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${inviteToken}`;
  
  const roleNames = {
    admin: 'Administrador',
    manager: 'Manager',
    user: 'Usuario'
  };

  const content = `
    <h2>¡Has sido invitado!</h2>
    <p>${inviterName} te ha invitado a unirte a <strong>${tenantName}</strong> en Nicroma como <strong>${roleNames[role] || role}</strong>.</p>
    <p>Haz clic en el siguiente botón para aceptar la invitación:</p>
    <p style="text-align: center;">
      <a href="${inviteUrl}" class="button">Aceptar Invitación</a>
    </p>
    <p>O copia y pega este enlace en tu navegador:</p>
    <p style="word-break: break-all; color: #666; font-size: 14px;">${inviteUrl}</p>
    <div class="warning">
      ⚠️ Esta invitación expira en 7 días. Si no esperabas esta invitación, puedes ignorar este email.
    </div>
  `;

  const mailOptions = {
    from: `"Nicroma" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `${inviterName} te invita a ${tenantName} - Nicroma`,
    html: getEmailTemplate(content, 'Invitación a Nicroma')
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`📧 Email de invitación enviado a: ${email}`);
    return true;
  } catch (error) {
    console.error('Error enviando email de invitación:', error);
    throw error;
  }
};

// Enviar email de bienvenida
const sendWelcomeEmail = async (email, firstName) => {
  const transport = initializeTransporter();
  const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

  const content = `
    <h2>¡Bienvenido a Nicroma, ${firstName}!</h2>
    <p>Tu cuenta ha sido verificada exitosamente. Ya puedes comenzar a usar todas las funcionalidades de la plataforma.</p>
    <p style="text-align: center;">
      <a href="${dashboardUrl}" class="button">Ir al Dashboard</a>
    </p>
    <h3>¿Qué puedes hacer ahora?</h3>
    <ul>
      <li>Configura tu perfil</li>
      <li>Crea tu organización</li>
      <li>Invita a tu equipo</li>
    </ul>
    <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
  `;

  const mailOptions = {
    from: `"Nicroma" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '¡Bienvenido a Nicroma!',
    html: getEmailTemplate(content, 'Bienvenido')
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`📧 Email de bienvenida enviado a: ${email}`);
    return true;
  } catch (error) {
    console.error('Error enviando email de bienvenida:', error);
    // No lanzamos error aquí para no bloquear el flujo principal
    return false;
  }
};

// Enviar notificación de cambio de contraseña
const sendPasswordChangedEmail = async (email, firstName) => {
  const transport = initializeTransporter();

  const content = `
    <h2>Hola ${firstName},</h2>
    <p>Tu contraseña ha sido cambiada exitosamente.</p>
    <p>Si no realizaste este cambio, por favor contacta inmediatamente con nuestro equipo de soporte.</p>
    <div class="warning">
      ⚠️ Por seguridad, todas tus sesiones activas han sido cerradas. Deberás iniciar sesión nuevamente.
    </div>
  `;

  const mailOptions = {
    from: `"Nicroma Security" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Contraseña cambiada - Nicroma',
    html: getEmailTemplate(content, 'Seguridad')
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`📧 Email de cambio de contraseña enviado a: ${email}`);
    return true;
  } catch (error) {
    console.error('Error enviando email de cambio de contraseña:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail
};

