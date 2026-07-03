const { redisClient } = require('../config/redis')

/**
 * Gets an array from Redis or returns an empty array if not found
 * @param {string} key 
 * @returns {Promise<Array>}
 */
const getArrayFromRedis = async (key) => {
  const value = await redisClient.get(key)
  return value ? JSON.parse(value) : []
}

/**
 * Saves an array to Redis
 * @param {string} key 
 * @param {Array} array 
 * @returns {Promise<void>}
 */
const saveArrayToRedis = async (key, array) => {
  await redisClient.set(key, JSON.stringify(array))
}

module.exports = {
  getArrayFromRedis,
  saveArrayToRedis,
}
