const express = require('express')
const router = express.Router()
const { registerUser, loginUser, getMe, forgotPassword, changePassword } = require('../controllers/authController')
const { protect } = require('../middleware/auth')

router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/forgot-password', forgotPassword)
router.patch('/password', protect, changePassword)
router.get('/me', protect, getMe)

module.exports = router
