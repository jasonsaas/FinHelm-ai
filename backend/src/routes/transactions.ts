import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'List transactions endpoint - to be implemented',
  })
}))

router.post('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Create transaction endpoint - to be implemented',
  })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Get transaction endpoint - to be implemented',
  })
}))

router.put('/:id', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Update transaction endpoint - to be implemented',
  })
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Delete transaction endpoint - to be implemented',
  })
}))

export { router as transactionRoutes }