const express = require('express')
const router = express.Router()
const { registerUser, loginUser, getMe, forgotPassword, changePassword } = require('../controllers/authController')
const { protect } = require('../middleware/auth')
const { sendWelcomeEmail } = require('../services/emailService')

router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/forgot-password', forgotPassword)
router.patch('/password', protect, changePassword)
router.get('/me', protect, getMe)

// Welcome email endpoint
router.post('/send-welcome-email', async (req, res) => {
  try {
    const { email, name } = req.body
    console.log('📧 Welcome email endpoint called for:', email, name)
    await sendWelcomeEmail(email, name)
    res.json({ success: true, message: 'Welcome email sent' })
  } catch (error) {
    console.error('❌ Welcome email failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
