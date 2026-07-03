const { getArrayFromRedis, saveArrayToRedis } = require('../utils/redisHelpers')
const { REDIS_KEYS } = require('../utils/constants')
const crypto = require('crypto')
const { sendClusterAlertEmail } = require('../services/emailService')

// Fetch all alerts
const getAlerts = async (req, res, next) => {
  try {
    const alerts = await getArrayFromRedis(REDIS_KEYS.ALERTS)
    res.json(alerts)
  } catch (error) {
    next(error)
  }
}

// Generate a mock alert (for testing/demonstration)
const generateMockAlert = async (req, res, next) => {
  try {
    const alerts = await getArrayFromRedis(REDIS_KEYS.ALERTS)
    
    const severities = ['Low', 'Medium', 'High', 'Critical']
    
    const newAlert = {
      id: crypto.randomUUID(),
      clusterName: `Cluster-${Math.floor(Math.random() * 10) + 1}`,
      switchId: `SW-${Math.floor(Math.random() * 100) + 1}`,
      severity: severities[Math.floor(Math.random() * severities.length)],
      status: 'Open',
      timestamp: new Date().toISOString(),
      acknowledgedState: false,
    }

    alerts.push(newAlert)
    await saveArrayToRedis(REDIS_KEYS.ALERTS, alerts)

    // Trigger email if Critical or High
    if (newAlert.severity === 'Critical' || newAlert.severity === 'High') {
      const users = await getArrayFromRedis(REDIS_KEYS.USERS)
      const admins = users.filter((u) => u.role === 'Admin')
      for (const admin of admins) {
        await sendClusterAlertEmail(admin.email, newAlert)
          .then(() => console.log('✅ Alert email sent successfully to:', admin.email))
          .catch((err) => console.error('❌ Alert email failed for', admin.email, ':', err.message))
      }
    }

    res.status(201).json(newAlert)
  } catch (error) {
    next(error)
  }
}

// Acknowledge alert
const acknowledgeAlert = async (req, res, next) => {
  try {
    const { id } = req.params
    const alerts = await getArrayFromRedis(REDIS_KEYS.ALERTS)
    
    const index = alerts.findIndex((a) => a.id === id)
    if (index === -1) {
      res.status(404)
      throw new Error('Alert not found')
    }

    alerts[index].acknowledgedState = true
    alerts[index].status = 'Resolved'

    await saveArrayToRedis(REDIS_KEYS.ALERTS, alerts)
    res.json(alerts[index])
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAlerts,
  generateMockAlert,
  acknowledgeAlert
}
