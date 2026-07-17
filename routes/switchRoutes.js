const express = require('express')
const router = express.Router()
const { getSwitches, createSwitch, updateSwitchStatus, updateSwitch, deleteSwitch } = require('../controllers/switchController')
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

router.route('/:id')
  .patch(
    protect,
    [
      body('model').optional().notEmpty().withMessage('Model is required'),
      body('physicalDevice').optional().notEmpty().withMessage('Physical Device is required'),
      body('id').optional().notEmpty().withMessage('ID is required'),
      body('config').optional().notEmpty().withMessage('Config is required'),
      body('status').optional().notEmpty().withMessage('Status is required'),
    ],
    validatePayload,
    updateSwitch
  )
  .delete(protect, deleteSwitch)

module.exports = router
