const express = require('express')
const router = express.Router()
const { getSwitches, createSwitch, updateSwitchStatus } = require('../controllers/switchController')
const { protect } = require('../middleware/auth')
const { body } = require('express-validator')
const { validationResult } = require('express-validator')

const validatePayload = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400)
    return next(new Error(errors.array()[0].msg))
  }
  next()
}

router.route('/')
  .get(protect, getSwitches)
  .post(
    protect,
    [
      body('model').notEmpty().withMessage('Model is required'),
      body('physicalDevice').notEmpty().withMessage('Physical Device is required'),
      body('id').notEmpty().withMessage('ID is required'),
      body('config').notEmpty().withMessage('Config is required'),
      body('status').notEmpty().withMessage('Status is required'),
    ],
    validatePayload,
    createSwitch
  )

router.route('/:id/status')
  .patch(
    protect,
    [
      body('status').notEmpty().withMessage('Status is required')
    ],
    validatePayload,
    updateSwitchStatus
  )

module.exports = router
