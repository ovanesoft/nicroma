const { Resend } = require('resend');

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Template base de emails
const getEmailTemplate = (content, title = 'NicRoma') => `
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
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 32px;
      margin: 0;
      font-family: 'Pinyon Script', cursive, serif;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #ffffff !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
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
      border-radius: 8px;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 14px;
      color: #92400e;
    }
    h2 {
      color: #1e293b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>NicRoma</h1>
    </div>
    ${content}
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} NicRoma. Todos los derechos reservados.</p>
      <p>Este es un email automático, por favor no responda.</p>
    </div>
  </div>
</body>
</html>
`;

// Enviar email de verificación
const sendVerificationEmail = async (email, firstName, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const content = `
    <h2>¡Hola ${firstName}!</h2>
    <p>Gracias por registrarte en NicRoma. Para completar tu registro, por favor verifica tu dirección de email haciendo clic en el botón de abajo:</p>
    <p style="text-align: center;">
      <a href="${verificationUrl}" class="button">Verificar Email</a>
    </p>
    <p>O copia y pega este enlace en tu navegador:</p>
    <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
    <div class="warning">
      ⚠️ Este enlace expira en 24 horas. Si no solicitaste este registro, puedes ignorar este email.
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'NicRoma <noreply@nicroma.com>',
      to: [email],
      subject: 'Verifica tu email - NicRoma',
      html: getEmailTemplate(content, 'Verificación de Email')
    });

    if (error) {
      console.error('Error enviando email de verificación:', error);
      throw error;
    }

    console.log(`📧 Email de verificación enviado a: ${email} (ID: ${data.id})`);
    return true;
  } catch (error) {
    console.error('Error enviando email de verificación:', error);
    throw error;
  }
};

// Enviar email de reset de contraseña
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const content = `
    <h2>Hola ${firstName},</h2>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en NicRoma.</p>
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

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'NicRoma <noreply@nicroma.com>',
      to: [email],
      subject: 'Restablecer contraseña - NicRoma',
      html: getEmailTemplate(content, 'Restablecer Contraseña')
    });

    if (error) {
      console.error('Error enviando email de reset:', error);
      throw error;
    }

    console.log(`📧 Email de reset enviado a: ${email} (ID: ${data.id})`);
    return true;
  } catch (error) {
    console.error('Error enviando email de reset:', error);
    throw error;
  }
};

// Enviar email de invitación
const sendInvitationEmail = async (email, inviterName, tenantName, inviteToken, role) => {
  const inviteUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${inviteToken}`;
  
  const roleNames = {
    admin: 'Administrador',
    manager: 'Manager',
    user: 'Usuario'
  };

  const content = `
    <h2>¡Has sido invitado!</h2>
    <p>${inviterName} te ha invitado a unirte a <strong>${tenantName}</strong> en NicRoma como <strong>${roleNames[role] || role}</strong>.</p>
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

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'NicRoma <noreply@nicroma.com>',
      to: [email],
      subject: `${inviterName} te invita a ${tenantName} - NicRoma`,
      html: getEmailTemplate(content, 'Invitación a NicRoma')
    });

    if (error) {
      console.error('Error enviando email de invitación:', error);
      throw error;
    }

    console.log(`📧 Email de invitación enviado a: ${email} (ID: ${data.id})`);
    return true;
  } catch (error) {
    console.error('Error enviando email de invitación:', error);
    throw error;
  }
};

// Enviar email de bienvenida
const sendWelcomeEmail = async (email, firstName) => {
  const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

  const content = `
    <h2>¡Bienvenido a NicRoma, ${firstName}!</h2>
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

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'NicRoma <noreply@nicroma.com>',
      to: [email],
      subject: '¡Bienvenido a NicRoma!',
      html: getEmailTemplate(content, 'Bienvenido')
    });

    if (error) {
      console.error('Error enviando email de bienvenida:', error);
      return false;
    }

    console.log(`📧 Email de bienvenida enviado a: ${email} (ID: ${data.id})`);
    return true;
  } catch (error) {
    console.error('Error enviando email de bienvenida:', error);
    return false;
  }
};

// Enviar notificación de cambio de contraseña
const sendPasswordChangedEmail = async (email, firstName) => {
  const content = `
    <h2>Hola ${firstName},</h2>
    <p>Tu contraseña ha sido cambiada exitosamente.</p>
    <p>Si no realizaste este cambio, por favor contacta inmediatamente con nuestro equipo de soporte.</p>
    <div class="warning">
      ⚠️ Por seguridad, todas tus sesiones activas han sido cerradas. Deberás iniciar sesión nuevamente.
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'NicRoma Security <noreply@nicroma.com>',
      to: [email],
      subject: 'Contraseña cambiada - NicRoma',
      html: getEmailTemplate(content, 'Seguridad')
    });

    if (error) {
      console.error('Error enviando email de cambio de contraseña:', error);
      return false;
    }

    console.log(`📧 Email de cambio de contraseña enviado a: ${email} (ID: ${data.id})`);
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
