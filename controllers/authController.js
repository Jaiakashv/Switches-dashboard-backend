const { getArrayFromRedis, saveArrayToRedis } = require('../utils/redisHelpers')
const { REDIS_KEYS } = require('../utils/constants')
const { generateToken, hashPassword, matchPassword } = require('../utils/auth')
const crypto = require('crypto')
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService')

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      res.status(400)
      throw new Error('Please add all fields')
    }

    const users = await getArrayFromRedis(REDIS_KEYS.USERS)
    const userExists = users.some((u) => u.email === email)

    if (userExists) {
      res.status(400)
      throw new Error('User already exists')
    }

    const hashedPassword = await hashPassword(password)
    const id = crypto.randomUUID()

    const newUser = {
      id,
      name,
      email,
      password: hashedPassword,
      role: 'Admin', // Defaulting to Admin as per requirements
    }

    users.push(newUser)
    await saveArrayToRedis(REDIS_KEYS.USERS, users)

    // Send Welcome Email in background (non-blocking)
    sendWelcomeEmail(newUser.email, newUser.name).catch((err) =>
      console.error('Welcome email failed:', err)
    )

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      token: generateToken(newUser.id),
    })
  } catch (error) {
    next(error)
  }
}

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const users = await getArrayFromRedis(REDIS_KEYS.USERS)
    const user = users.find((u) => u.email === email)

    if (user && (await matchPassword(password, user.password))) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      })
    } else {
      res.status(401)
      throw new Error('Invalid credentials')
    }
  } catch (error) {
    next(error)
  }
}

const getMe = async (req, res, next) => {
  try {
    res.status(200).json(req.user)
  } catch (error) {
    next(error)
  }
}

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    const users = await getArrayFromRedis(REDIS_KEYS.USERS)
    const user = users.find((u) => u.email === email)

    if (!user) {
      // Return success anyway to prevent email enumeration
      return res.status(200).json({ message: 'If an account exists, a reset link was sent.' })
    }

    const resetToken = crypto.randomUUID()
    
    // In a real app, save this token to Redis with an expiration time
    const tokens = await getArrayFromRedis(REDIS_KEYS.RESET_TOKENS)
    tokens.push({ email, token: resetToken, expiresAt: Date.now() + 3600000 }) // 1 hour
    await saveArrayToRedis(REDIS_KEYS.RESET_TOKENS, tokens)

    await sendPasswordResetEmail(user.email, resetToken)

    res.status(200).json({ message: 'If an account exists, a reset link was sent.' })
  } catch (error) {
    next(error)
  }
}

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    // User is extracted from the JWT token via the protect middleware
    const users = await getArrayFromRedis(REDIS_KEYS.USERS)
    const userIndex = users.findIndex((u) => u.id === req.user.id)
    
    if (userIndex === -1) {
      res.status(404)
      throw new Error('User not found')
    }
    
    const user = users[userIndex]
    
    // Verify current password
    if (!(await matchPassword(currentPassword, user.password))) {
      res.status(401)
      throw new Error('Incorrect current password')
    }
    
    // Hash new password and save
    const hashedNewPassword = await hashPassword(newPassword)
    users[userIndex].password = hashedNewPassword
    
    await saveArrayToRedis(REDIS_KEYS.USERS, users)
    
    res.status(200).json({ message: 'Password updated successfully' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  changePassword
}
