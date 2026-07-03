const nodemailer = require('nodemailer')

// Standard SMTP configuration - optimized for cloud platforms
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 465, // Use 465 (SSL) instead of 587 (TLS) for better cloud compatibility
  secure: true, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 30000, // Increased from 10s to 30s for cloud environments
  greetingTimeout: 15000,
  socketTimeout: 15000,
  tls: {
    rejectUnauthorized: false,
  },
})

// Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter configuration error:', error)
  } else {
    console.log('✅ Email transporter is ready to send emails')
  }
})

const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log('Attempting to send email to:', to)
    console.log('Email config:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER ? '***' : 'NOT SET',
      pass: process.env.EMAIL_PASS ? '***' : 'NOT SET',
    })
    
    const info = await transporter.sendMail({
      from: `"NMS Alerts" <${process.env.EMAIL_USER || 'test@gmail.com'}>`,
      to,
      subject,
      html,
    })
    console.log('✅ Email sent successfully:', info.messageId)
    return info
  } catch (error) {
    console.error('❌ Error sending email:', error.message)
    console.error('Full error:', error)
    throw error // Re-throw to allow caller to handle the error
  }
}

const sendWelcomeEmail = async (email, name) => {
  console.log('📧 sendWelcomeEmail called for:', email, name)
  const subject = 'Welcome to Network Management System'
  const html = `
    <h1>Welcome, ${name}!</h1>
    <p>Your account has been created successfully. You can now access the dashboard.</p>
  `
  await sendEmail({ to: email, subject, html })
}

const sendPasswordResetEmail = async (email, resetToken) => {
  const subject = 'Password Reset Request'
  // Mock link for development
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`
  const html = `
    <h1>Password Reset</h1>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetLink}">${resetLink}</a>
  `
  await sendEmail({ to: email, subject, html })
}

const sendClusterAlertEmail = async (email, alert) => {
  const subject = `[${alert.severity.toUpperCase()}] Alert on Cluster: ${alert.clusterName}`
  const html = `
    <h1>Cluster Alert</h1>
    <p><strong>Severity:</strong> ${alert.severity}</p>
    <p><strong>Cluster:</strong> ${alert.clusterName}</p>
    <p><strong>Switch ID:</strong> ${alert.switchId}</p>
    <p><strong>Status:</strong> ${alert.status}</p>
    <p><strong>Timestamp:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
  `
  await sendEmail({ to: email, subject, html })
}

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendClusterAlertEmail,
}
