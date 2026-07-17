// Mock analytics data generator
const getAnalytics = async (req, res, next) => {
  try {
    const dataPoints = 24 // 24 hours of data
    
    const timeSeriesData = []
    const now = new Date()

    for (let i = dataPoints; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString()
      
      timeSeriesData.push({
        timestamp,
        cpuUsage: Math.floor(Math.random() * 40) + 20, // 20-60%
        memoryUsage: Math.floor(Math.random() * 50) + 30, // 30-80%
        temperature: Math.floor(Math.random() * 30) + 40, // 40-70C
        latency: Math.floor(Math.random() * 50) + 10, // 10-60ms
        packetLoss: parseFloat((Math.random() * 2).toFixed(2)), // 0-2%
        switchHealth: Math.floor(Math.random() * 10) + 90, // 90-100%
      })
    }

    // Status distribution
    const statusDistribution = {
      Online: Math.floor(Math.random() * 100) + 200,
      Maintenance: Math.floor(Math.random() * 20) + 10,
      Offline: Math.floor(Math.random() * 10) + 2,
    }

    res.json({
      timeSeries: timeSeriesData,
      statusDistribution
    })

  } catch (error) {
    next(error)
  }
}

// CPU usage endpoint with time range support
const getCpuUsage = async (req, res, next) => {
  try {
    const { range = '24h' } = req.query

    // Determine data points and interval based on range
    const rangeConfig = {
      '1h': { dataPoints: 60, intervalMinutes: 1 }, // 1 minute intervals for 1 hour
      '6h': { dataPoints: 72, intervalMinutes: 5 }, // 5 minute intervals for 6 hours
      '12h': { dataPoints: 72, intervalMinutes: 10 }, // 10 minute intervals for 12 hours
      '24h': { dataPoints: 24, intervalMinutes: 60 } // 1 hour intervals for 24 hours
    }

    const config = rangeConfig[range] || rangeConfig['24h']
    const { dataPoints, intervalMinutes } = config

    const cpuData = []
    const now = new Date()

    for (let i = dataPoints - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMinutes * 60 * 1000).toISOString()
      
      // Generate realistic CPU usage with min, median, max
      const baseUsage = Math.floor(Math.random() * 40) + 20
      const min = Math.max(0, baseUsage - Math.floor(Math.random() * 15))
      const median = baseUsage
      const max = Math.min(100, baseUsage + Math.floor(Math.random() * 20))

      cpuData.push({
        timestamp,
        min,
        median,
        max
      })
    }

    res.json(cpuData)

  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAnalytics,
  getCpuUsage
}
