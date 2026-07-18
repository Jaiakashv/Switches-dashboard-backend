const os = require("os");
const { redisClient } = require("../config/redis");

const CPU_DATA_KEY = "cpu:usage:data";
const CPU_COLLECTION_INTERVAL = 60000; // 1 minute

/**
 * Get average CPU times
 */
function cpuAverage() {
  const cpus = os.cpus();

  let idle = 0;
  let total = 0;

  cpus.forEach(cpu => {
    idle += cpu.times.idle;

    Object.values(cpu.times).forEach(time => {
      total += time;
    });
  });

  return {
    idle: idle / cpus.length,
    total: total / cpus.length
  };
}

/**
 * Calculate CPU usage over 500ms
 */
async function getCpuUsage() {
  const start = cpuAverage();

  await new Promise(resolve => setTimeout(resolve, 500));

  const end = cpuAverage();

  const idle = end.idle - start.idle;
  const total = end.total - start.total;

  if (total <= 0) return 0;

  return Number((100 - (idle / total) * 100).toFixed(2));
}

/**
 * Collect CPU usage and store in Redis
 */
const collectCpuData = async () => {
  try {
    const usage = await getCpuUsage();

    const cpuData = {
      timestamp: new Date().toISOString(),
      usage,
      user: 0,
      system: 0,
      idle: Number((100 - usage).toFixed(2)),
      cpus: []
    };

    await redisClient.zAdd(CPU_DATA_KEY, {
      score: Date.now(),
      value: JSON.stringify(cpuData)
    });

    // Keep only last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    await redisClient.zRemRangeByScore(
      CPU_DATA_KEY,
      "-inf",
      sevenDaysAgo
    );

    console.log(`CPU Usage: ${usage}%`);

    return cpuData;
  } catch (err) {
    console.error("CPU collection error:", err);
  }
};

/**
 * Calculate median
 */
const calculateMedian = numbers => {
  if (!numbers.length) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);

  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * Group into intervals
 */
const groupDataByInterval = (data, intervalMinutes, dataPoints) => {
  const intervalMs = intervalMinutes * 60 * 1000;
  const now = Date.now();

  const result = [];

  for (let i = dataPoints - 1; i >= 0; i--) {
    const start = now - i * intervalMs;
    const end = start + intervalMs;

    const values = data.filter(item => {
      const t = new Date(item.timestamp).getTime();
      return t >= start && t < end;
    });

    if (values.length) {
      const usages = values.map(v => v.usage);

      result.push({
        timestamp: new Date(start).toISOString(),
        min: Math.min(...usages),
        median: calculateMedian(usages),
        max: Math.max(...usages)
      });
    } else {
      const last = result.length ? result[result.length - 1].median : 0;

      result.push({
        timestamp: new Date(start).toISOString(),
        min: last,
        median: last,
        max: last
      });
    }
  }

  return result;
};

/**
 * Mock data if Redis empty
 */
const generateMockCpuData = range => {
  const config = {
    "1h": { dataPoints: 60, intervalMinutes: 1 },
    "6h": { dataPoints: 72, intervalMinutes: 5 },
    "12h": { dataPoints: 72, intervalMinutes: 10 },
    "24h": { dataPoints: 24, intervalMinutes: 60 }
  };

  const { dataPoints, intervalMinutes } =
    config[range] || config["24h"];

  const result = [];

  for (let i = dataPoints - 1; i >= 0; i--) {
    const base = Math.random() * 40 + 20;

    result.push({
      timestamp: new Date(
        Date.now() - i * intervalMinutes * 60000
      ).toISOString(),
      min: Math.max(base - 10, 0),
      median: Number(base.toFixed(2)),
      max: Math.min(base + 10, 100)
    });
  }

  return result;
};

/**
 * Read CPU history
 */
const getCpuUsageByRange = async range => {
  try {
    const config = {
      "1h": { dataPoints: 60, intervalMinutes: 1 },
      "6h": { dataPoints: 72, intervalMinutes: 5 },
      "12h": { dataPoints: 72, intervalMinutes: 10 },
      "24h": { dataPoints: 24, intervalMinutes: 60 }
    };

    const { dataPoints, intervalMinutes } =
      config[range] || config["24h"];

    const start =
      Date.now() -
      dataPoints * intervalMinutes * 60000;

    const raw = await redisClient.zRangeByScore(
      CPU_DATA_KEY,
      start,
      Date.now()
    );

    if (!raw.length) {
      return generateMockCpuData(range);
    }

    const parsed = raw.map(JSON.parse);

    return groupDataByInterval(
      parsed,
      intervalMinutes,
      dataPoints
    );
  } catch (err) {
    console.error(err);
    return generateMockCpuData(range);
  }
};

/**
 * Start collector
 */
const startCpuDataCollection = () => {
  collectCpuData();

  setInterval(collectCpuData, CPU_COLLECTION_INTERVAL);

  console.log(
    `CPU collector started (${CPU_COLLECTION_INTERVAL} ms)`
  );
};

module.exports = {
  collectCpuData,
  getCpuUsageByRange,
  startCpuDataCollection
};