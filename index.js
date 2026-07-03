require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { connectRedis, disconnectRedis, redisClient } = require('./config/redis')
const { errorHandler } = require('./middleware/error')
const seedSwitches = require('./data/switches')
const { REDIS_KEYS } = require('./utils/constants')

// Route Imports
const authRoutes = require('./routes/authRoutes')
const switchRoutes = require('./routes/switchRoutes')
const alertRoutes = require('./routes/alertRoutes')
const analyticsRoutes = require('./routes/analyticsRoutes')

const PORT = process.env.PORT || 3000

async function startServer() {
  const app = express()

  // Connect to Redis
  await connectRedis()

  // Seed initial switches if empty
  const cachedSwitches = await redisClient.get(REDIS_KEYS.SWITCHES)
  if (!cachedSwitches) {
    await redisClient.set(REDIS_KEYS.SWITCHES, JSON.stringify(seedSwitches))
  }

  // Seed default admin user if empty
  const cachedUsers = await redisClient.get(REDIS_KEYS.USERS)
  if (!cachedUsers) {
    const { hashPassword } = require('./utils/auth')
    const crypto = require('crypto')
    const adminPassword = await hashPassword('admin123')
    const defaultAdmin = [{
      id: crypto.randomUUID(),
      name: 'Admin User',
      email: 'admin@network.local',
      password: adminPassword,
      role: 'Admin'
    }]
    await redisClient.set(REDIS_KEYS.USERS, JSON.stringify(defaultAdmin))
  }

  // Middleware
  app.use(cors())
  app.use(express.json())

  // Health Check
  app.get('/health', (_request, response) => {
    response.json({ ok: true })
  })

  // Routes
  app.use('/api/auth', authRoutes)
  app.use('/api/switches', switchRoutes)
  app.use('/api/alerts', alertRoutes)
  app.use('/api/analytics', analyticsRoutes)

  // Error Handling Middleware (must be last)
  app.use(errorHandler)

  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`)
  })

  process.on('SIGINT', async () => {
    await disconnectRedis()
    process.exit(0)
  })
}

startServer().catch((error) => {
  console.error('Failed to start backend server:', error)
  process.exit(1)
})