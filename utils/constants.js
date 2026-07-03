// Redis Keys
const REDIS_KEYS = {
  SWITCHES: 'switches',
  USERS: 'users',
  ALERTS: 'alerts',
  AUDIT_LOGS: 'audit_logs',
  SESSIONS: 'sessions',
  RESET_TOKENS: 'reset_tokens',
}

const STATUS_OPTIONS = ['Online', 'Maintenance', 'Offline']
const ALERT_SEVERITY = ['Low', 'Medium', 'High', 'Critical']
const ALERT_STATUS = ['Open', 'Resolved', 'Ignored']

module.exports = {
  REDIS_KEYS,
  STATUS_OPTIONS,
  ALERT_SEVERITY,
  ALERT_STATUS,
}
