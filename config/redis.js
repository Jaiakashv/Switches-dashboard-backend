const { createClient } = require('redis')

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

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

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect()
    }
  } catch (error) {
    console.error('Redis connection failed:', error)
    throw error
  }
}

const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.quit()
  }
}

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
}
