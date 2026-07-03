const nodemailer = require('nodemailer')

// Assuming Gmail SMTP during development
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'test@gmail.com',
    pass: process.env.EMAIL_PASS || 'password',
  },
})

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"NMS Alerts" <${process.env.EMAIL_USER || 'test@gmail.com'}>`,
      to,
      subject,
      html,
    })
    console.log('Message sent: %s', info.messageId)
  } catch (error) {
    console.error('Error sending email: ', error)
  }
}

const sendWelcomeEmail = async (email, name) => {
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
