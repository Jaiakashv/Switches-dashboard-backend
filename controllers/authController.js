const { getArrayFromRedis, saveArrayToRedis } = require('../utils/redisHelpers')
const { REDIS_KEYS } = require('../utils/constants')
const { generateToken, hashPassword, matchPassword } = require('../utils/auth')
const crypto = require('crypto')

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

module.exports = {
  registerUser,
  loginUser,
  getMe,
}
