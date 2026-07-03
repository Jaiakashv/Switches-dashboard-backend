const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  })
}

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

const matchPassword = async (enteredPassword, storedHash) => {
  return bcrypt.compare(enteredPassword, storedHash)
}

module.exports = {
  generateToken,
  hashPassword,
  matchPassword,
}
