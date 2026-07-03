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

module.exports = {
  getAnalytics
}
