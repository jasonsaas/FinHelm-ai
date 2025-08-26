import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

router.get('/profile', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Get user profile endpoint - to be implemented',
  })
}))

router.put('/profile', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Update user profile endpoint - to be implemented',
  })
}))

export { router as userRoutes }