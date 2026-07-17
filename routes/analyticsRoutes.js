const express = require('express')
const router = express.Router()
const { getAnalytics, getCpuUsage } = require('../controllers/analyticsController')
const { protect } = require('../middleware/auth')

router.route('/')
  .get(protect, getAnalytics)

router.route('/cpu-usage')
  .get(protect, getCpuUsage)

module.exports = router
