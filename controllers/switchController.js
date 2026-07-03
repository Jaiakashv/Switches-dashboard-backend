const { getArrayFromRedis, saveArrayToRedis } = require('../utils/redisHelpers')
const { REDIS_KEYS, STATUS_OPTIONS } = require('../utils/constants')
const { createAuditLog } = require('./auditLogController')

const getSwitches = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const offset = parseInt(req.query.offset) || 0
    const search = req.query.search?.trim().toLowerCase() || ''

    let switches = await getArrayFromRedis(REDIS_KEYS.SWITCHES)

    if (search) {
      switches = switches.filter((device) =>
        device.model.toLowerCase().includes(search) ||
        device.id.toLowerCase().includes(search)
      )
    }

    const total = switches.length
    const paginatedSwitches = switches.slice(offset, offset + limit)

    res.json({
      data: paginatedSwitches,
      total,
      limit,
      offset
    })
  } catch (error) {
    next(error)
  }
}

const createSwitch = async (req, res, next) => {
  try {
    const payload = req.body
    
    // Express validator should have checked required fields before getting here
    if (!STATUS_OPTIONS.includes(payload.status)) {
      res.status(400)
      throw new Error('Invalid status value.')
    }

    const switches = await getArrayFromRedis(REDIS_KEYS.SWITCHES)

    if (switches.some((device) => device.id === payload.id)) {
      res.status(409)
      throw new Error('A switch with this ID already exists.')
    }

    const newSwitch = {
      model: payload.model.trim(),
      physicalDevice: payload.physicalDevice.trim(),
      id: payload.id.trim(),
      config: payload.config.trim(),
      status: payload.status,
    }

    switches.push(newSwitch)
    await saveArrayToRedis(REDIS_KEYS.SWITCHES, switches)

    res.status(201).json(newSwitch)
  } catch (error) {
    next(error)
  }
}

const updateSwitchStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!STATUS_OPTIONS.includes(status)) {
      res.status(400)
      throw new Error('Invalid status value.')
    }

    const switches = await getArrayFromRedis(REDIS_KEYS.SWITCHES)
    const index = switches.findIndex((device) => device.id === id)

    if (index === -1) {
      res.status(404)
      throw new Error('Switch not found.')
    }

    const previousStatus = switches[index].status
    const updatedSwitch = {
      ...switches[index],
      status,
    }

    switches[index] = updatedSwitch

    await saveArrayToRedis(REDIS_KEYS.SWITCHES, switches)

    // Create Audit Log asynchronously
    const userEmail = req.user ? req.user.email : 'system'
    createAuditLog(id, previousStatus, status, userEmail)

    res.json(updatedSwitch)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getSwitches,
  createSwitch,
  updateSwitchStatus,
}
