const { getArrayFromRedis, saveArrayToRedis } = require('../utils/redisHelpers')
const { REDIS_KEYS } = require('../utils/constants')
const crypto = require('crypto')

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await getArrayFromRedis(REDIS_KEYS.AUDIT_LOGS)
    res.json(logs)
  } catch (error) {
    next(error)
  }
}

const createAuditLog = async (switchId, previousStatus, newStatus, updatedBy) => {
  try {
    const logs = await getArrayFromRedis(REDIS_KEYS.AUDIT_LOGS)
    const newLog = {
      id: crypto.randomUUID(),
      switchId,
      previousStatus,
      newStatus,
      timestamp: new Date().toISOString(),
      updatedBy,
    }
    logs.push(newLog)
    await saveArrayToRedis(REDIS_KEYS.AUDIT_LOGS, logs)
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

module.exports = {
  getAuditLogs,
  createAuditLog,
}
