const express = require('express')
const router = express.Router()
const { getAlerts, generateMockAlert, acknowledgeAlert } = require('../controllers/alertsController')
const { protect } = require('../middleware/auth')

router.route('/')
  .get(protect, getAlerts)
  .post(protect, generateMockAlert)

router.route('/:id/acknowledge')
  .patch(protect, acknowledgeAlert)

module.exports = router
