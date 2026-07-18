const { getArrayFromRedis, saveArrayToRedis } = require('../utils/redisHelpers')
const { REDIS_KEYS } = require('../utils/constants')
const crypto = require('crypto')
const { sendClusterAlertEmail } = require('../services/emailService')

// Helper function to generate message based on severity
const generateMessageForSeverity = (severity) => {
  const failureMessages = {
    'Critical': [
      'Cluster node failure detected - immediate intervention required',
      'Critical service outage - all systems down',
      'Network partition detected - cluster unavailable',
      'Database connection lost - critical data at risk'
    ],
    'High': [
      'Service degradation detected - performance severely impacted',
      'High memory usage warning - potential memory leak',
      'CPU utilization exceeded 90% - system overload',
      'Disk space critically low - immediate cleanup required'
    ],
    'Medium': [
      'Performance degradation detected - response times increased',
      'Memory usage above threshold - monitor closely',
      'Connection pool exhaustion detected',
      'API rate limiting active - traffic spike detected'
    ],
    'Low': [
      'Minor performance fluctuation detected',
      'Scheduled maintenance window approaching',
      'Configuration drift detected - review recommended',
      'Resource utilization slightly elevated'
    ]
  }
  
  const messages = failureMessages[severity] || failureMessages['Low']
  return messages[Math.floor(Math.random() * messages.length)]
}

// Fetch all alerts
const getAlerts = async (req, res, next) => {
  try {
    let alerts = await getArrayFromRedis(REDIS_KEYS.ALERTS)
    
    // Migrate existing alerts to have messages
    let needsUpdate = false
    alerts = alerts.map(alert => {
      if (!alert.message) {
        needsUpdate = true
        return {
          ...alert,
          message: generateMessageForSeverity(alert.severity)
        }
      }
      return alert
    })
    
    // Save if any alerts were updated
    if (needsUpdate) {
      await saveArrayToRedis(REDIS_KEYS.ALERTS, alerts)
    }
    
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
    const clusterNum = Math.floor(Math.random() * 10) + 1
    const severity = severities[Math.floor(Math.random() * severities.length)]
    
    // Generate appropriate failure message based on severity
    const failureMessages = {
      'Critical': [
        'Cluster node failure detected - immediate intervention required',
        'Critical service outage - all systems down',
        'Network partition detected - cluster unavailable',
        'Database connection lost - critical data at risk'
      ],
      'High': [
        'Service degradation detected - performance severely impacted',
        'High memory usage warning - potential memory leak',
        'CPU utilization exceeded 90% - system overload',
        'Disk space critically low - immediate cleanup required'
      ],
      'Medium': [
        'Performance degradation detected - response times increased',
        'Memory usage above threshold - monitor closely',
        'Connection pool exhaustion detected',
        'API rate limiting active - traffic spike detected'
      ],
      'Low': [
        'Minor performance fluctuation detected',
        'Scheduled maintenance window approaching',
        'Configuration drift detected - review recommended',
        'Resource utilization slightly elevated'
      ]
    }
    
    const messages = failureMessages[severity]
    const message = messages[Math.floor(Math.random() * messages.length)]
    
    const newAlert = {
      id: crypto.randomUUID(),
      clusterName: `Cluster-${clusterNum}`,
      switchId: `SW-${Math.floor(Math.random() * 100) + 1}`,
      severity: severity,
      status: 'Open',
      timestamp: new Date().toISOString(),
      acknowledgedState: false,
      message: message
    }

    alerts.push(newAlert)
    await saveArrayToRedis(REDIS_KEYS.ALERTS, alerts)

    // Trigger email if Critical or High (truly non-blocking)
    if (newAlert.severity === 'Critical' || newAlert.severity === 'High') {
      setImmediate(async () => {
        const users = await getArrayFromRedis(REDIS_KEYS.USERS)
        const admins = users.filter((u) => u.role === 'Admin')
        for (const admin of admins) {
          await sendClusterAlertEmail(admin.email, newAlert)
            .then(() => console.log('✅ Alert email sent successfully to:', admin.email))
            .catch((err) => console.error('❌ Alert email failed for', admin.email, ':', err.message))
        }
      })
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
