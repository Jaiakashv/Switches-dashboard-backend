require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { createClient } = require('redis')
const seedSwitches = require('./data/switches')

const PORT = process.env.PORT || 3000
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const SWITCHES_KEY = 'switches'
const STATUS_OPTIONS = ['Online', 'Maintenance', 'Offline']
const REQUIRED_FIELDS = ['model', 'physicalDevice', 'id', 'config', 'status']

async function startServer() {
  const app = express()
  const redisClient = createClient({ url: REDIS_URL })

  redisClient.on('connect', () => {
    console.log('Redis connection starting...')
  })

  redisClient.on('ready', () => {
    console.log('Redis connected: yes')
  })

  redisClient.on('end', () => {
    console.log('Redis connection closed.')
  })

  redisClient.on('error', (error) => {
    console.error('Redis client error:', error)
  })

  try {
    await redisClient.connect()
  } catch (error) {
    console.error('Redis connected: no')
    throw error
  }

  const cachedSwitches = await redisClient.get(SWITCHES_KEY)
  if (!cachedSwitches) {
    await redisClient.set(SWITCHES_KEY, JSON.stringify(seedSwitches))
  }

  app.use(cors())
  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.json({ ok: true })
  })

  app.get('/api/switches', async (_request, response) => {
    try {
      const switches = await getSwitches(redisClient)
      response.json(switches)
    } catch (error) {
      response.status(500).json({ message: 'Failed to read switches from Redis.' })
    }
  })

  app.post('/api/switches', async (request, response) => {
    console.log('POST /api/switches body:', request.body)

    const payload = request.body

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      response.status(400).json({
        message: 'Send a JSON object body with Content-Type: application/json.',
      })
      return
    }

    const missingFields = REQUIRED_FIELDS.filter((field) => {
      return !Object.prototype.hasOwnProperty.call(payload, field) || String(payload[field]).trim() === ''
    })

    if (missingFields.length > 0) {
      response.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}.` })
      return
    }

    if (!STATUS_OPTIONS.includes(payload.status)) {
      response.status(400).json({ message: 'Invalid status value.' })
      return
    }

    try {
      const switches = await getSwitches(redisClient)

      if (switches.some((device) => device.id === payload.id)) {
        response.status(409).json({ message: 'A switch with this ID already exists.' })
        return
      }

      const newSwitch = {
        model: payload.model.trim(),
        physicalDevice: payload.physicalDevice.trim(),
        id: payload.id.trim(),
        config: payload.config.trim(),
        status: payload.status,
      }

      switches.push(newSwitch)
      await redisClient.set(SWITCHES_KEY, JSON.stringify(switches))

      response.status(201).json(newSwitch)
    } catch (error) {
      response.status(500).json({ message: 'Failed to create switch.' })
    }
  })

  app.patch('/api/switches/:id/status', async (request, response) => {
    const { id } = request.params
    const { status } = request.body

    if (!STATUS_OPTIONS.includes(status)) {
      response.status(400).json({ message: 'Invalid status value.' })
      return
    }

    try {
      const switches = await getSwitches(redisClient)
      const index = switches.findIndex((device) => device.id === id)

      if (index === -1) {
        response.status(404).json({ message: 'Switch not found.' })
        return
      }

      const updatedSwitch = {
        ...switches[index],
        status,
      }

      switches[index] = updatedSwitch

      await redisClient.set(SWITCHES_KEY, JSON.stringify(switches))
      response.json(updatedSwitch)
    } catch (error) {
      response.status(500).json({ message: 'Failed to update switch status.' })
    }
  })

  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`)
  })

  process.on('SIGINT', async () => {
    await redisClient.quit()
    process.exit(0)
  })
}

async function getSwitches(redisClient) {
  const value = await redisClient.get(SWITCHES_KEY)
  return value ? JSON.parse(value) : []
}

startServer().catch((error) => {
  console.error('Failed to start backend server:', error)
  process.exit(1)
})