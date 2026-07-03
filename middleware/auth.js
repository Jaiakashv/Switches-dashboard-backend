const jwt = require('jsonwebtoken')
const { getArrayFromRedis } = require('../utils/redisHelpers')
const { REDIS_KEYS } = require('../utils/constants')

const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1]

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret')

      const users = await getArrayFromRedis(REDIS_KEYS.USERS)
      const user = users.find((u) => u.id === decoded.id)

      if (!user) {
        res.status(401)
        throw new Error('Not authorized, user not found')
      }

      req.user = { id: user.id, email: user.email, name: user.name, role: user.role }
      next()
    } catch (error) {
      console.error(error)
      res.status(401)
      next(new Error('Not authorized, token failed'))
    }
  }

  if (!token) {
    res.status(401)
    next(new Error('Not authorized, no token'))
  }
}

module.exports = { protect }
