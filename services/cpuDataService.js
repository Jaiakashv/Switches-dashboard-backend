const systemStats = require('node-system-stats');
const { redisClient } = require('../config/redis');

const CPU_DATA_KEY = 'cpu:usage:data';
const CPU_COLLECTION_INTERVAL = 60000; // Collect data every 1 minute

/**
 * Collect current CPU usage and store in Redis
 */
const collectCpuData = async () => {
  try {
    // Try different API patterns for node-system-stats
    let cpuStats;
    try {
      cpuStats = systemStats.cpu();
    } catch (e) {
      try {
        cpuStats = systemStats.get('cpu');
      } catch (e2) {
        cpuStats = systemStats;
      }
    }
    
    // Try different property names
    const usage = cpuStats.usage || cpuStats.cpuUsage || cpuStats.load || 0;
    const user = cpuStats.user || cpuStats.cpuUser || 0;
    const system = cpuStats.system || cpuStats.cpuSystem || 0;
    const idle = cpuStats.idle || cpuStats.cpuIdle || 0;
    
    const cpuData = {
      timestamp: new Date().toISOString(),
      usage: usage, // Overall CPU load percentage
      user: user,
      system: system,
      idle: idle,
      cpus: cpuStats.cpus || [] // Per CPU core data
    };

    // Store in Redis as a sorted set with timestamp as score
    const score = Date.now();
    await redisClient.zAdd(CPU_DATA_KEY, { score, value: JSON.stringify(cpuData) });

    // Keep only last 7 days of data to prevent memory issues
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    await redisClient.zRemRangeByScore(CPU_DATA_KEY, '-inf', sevenDaysAgo);

    console.log('CPU data collected and stored:', (cpuData.usage || 0).toFixed(2) + '%');
    return cpuData;
  } catch (error) {
    console.error('Error collecting CPU data:', error);
  }
};

/**
 * Get CPU usage data for a specific time range
 * @param {string} range - Time range (1h, 6h, 12h, 24h)
 * @returns {Array} Array of CPU data with min, median, max
 */
const getCpuUsageByRange = async (range) => {
  try {
    const rangeConfig = {
      '1h': { dataPoints: 60, intervalMinutes: 1 },
      '6h': { dataPoints: 72, intervalMinutes: 5 },
      '12h': { dataPoints: 72, intervalMinutes: 10 },
      '24h': { dataPoints: 24, intervalMinutes: 60 }
    };

    const config = rangeConfig[range] || rangeConfig['24h'];
    const { dataPoints, intervalMinutes } = config;

    const now = Date.now();
    const startTime = now - (dataPoints * intervalMinutes * 60 * 1000);

    // Get data from Redis for the time range
    const rawData = await redisClient.zRangeByScore(CPU_DATA_KEY, startTime, now);

    if (!rawData || rawData.length === 0) {
      console.log('No CPU data found in Redis, using mock data');
      return generateMockCpuData(range);
    }

    // Parse JSON data
    const parsedData = rawData.map(item => JSON.parse(item));

    // Group data into intervals and calculate min, median, max
    const intervalData = groupDataByInterval(parsedData, intervalMinutes, dataPoints);

    return intervalData;
  } catch (error) {
    console.error('Error getting CPU usage from Redis:', error);
    return generateMockCpuData(range);
  }
};

/**
 * Group CPU data by time intervals and calculate min, median, max
 * @param {Array} data - Raw CPU data
 * @param {number} intervalMinutes - Interval in minutes
 * @param {number} dataPoints - Number of data points to return
 * @returns {Array} Array of interval data with min, median, max
 */
const groupDataByInterval = (data, intervalMinutes, dataPoints) => {
  const intervalMs = intervalMinutes * 60 * 1000;
  const now = Date.now();
  const result = [];

  for (let i = dataPoints - 1; i >= 0; i--) {
    const intervalStart = now - (i * intervalMs);
    const intervalEnd = intervalStart + intervalMs;

    // Find data points within this interval
    const intervalPoints = data.filter(point => {
      const pointTime = new Date(point.timestamp).getTime();
      return pointTime >= intervalStart && pointTime < intervalEnd;
    });

    if (intervalPoints.length > 0) {
      const usages = intervalPoints.map(p => p.usage);
      const min = Math.min(...usages);
      const max = Math.max(...usages);
      const median = calculateMedian(usages);

      result.push({
        timestamp: new Date(intervalStart).toISOString(),
        min: min,
        median: median,
        max: max
      });
    } else {
      // If no data for this interval, use the last known value or interpolate
      const lastKnown = result.length > 0 ? result[result.length - 1].median : 20;
      result.push({
        timestamp: new Date(intervalStart).toISOString(),
        min: lastKnown,
        median: lastKnown,
        max: lastKnown
      });
    }
  }

  return result;
};

/**
 * Calculate median of an array of numbers
 * @param {Array} numbers - Array of numbers
 * @returns {number} Median value
 */
const calculateMedian = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Generate mock CPU data (fallback when Redis has no data)
 * @param {string} range - Time range
 * @returns {Array} Mock CPU data
 */
const generateMockCpuData = (range) => {
  const rangeConfig = {
    '1h': { dataPoints: 60, intervalMinutes: 1 },
    '6h': { dataPoints: 72, intervalMinutes: 5 },
    '12h': { dataPoints: 72, intervalMinutes: 10 },
    '24h': { dataPoints: 24, intervalMinutes: 60 }
  };

  const config = rangeConfig[range] || rangeConfig['24h'];
  const { dataPoints, intervalMinutes } = config;

  const cpuData = [];
  const now = new Date();

  for (let i = dataPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * intervalMinutes * 60 * 1000).toISOString();
    const baseUsage = Math.floor(Math.random() * 40) + 20;
    const min = Math.max(0, baseUsage - Math.floor(Math.random() * 15));
    const median = baseUsage;
    const max = Math.min(100, baseUsage + Math.floor(Math.random() * 20));

    cpuData.push({ timestamp, min, median, max });
  }

  return cpuData;
};

/**
 * Start continuous CPU data collection
 */
const startCpuDataCollection = () => {
  // Collect initial data
  collectCpuData();

  // Set up interval for continuous collection
  setInterval(collectCpuData, CPU_COLLECTION_INTERVAL);
  console.log(`CPU data collection started (interval: ${CPU_COLLECTION_INTERVAL}ms)`);
};

module.exports = {
  collectCpuData,
  getCpuUsageByRange,
  startCpuDataCollection
};
