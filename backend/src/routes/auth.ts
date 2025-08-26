import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

router.post('/register', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Registration endpoint - to be implemented',
  })
}))

router.post('/login', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Login endpoint - to be implemented',
  })
}))

router.post('/logout', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Logout endpoint - to be implemented',
  })
}))

router.post('/refresh', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Token refresh endpoint - to be implemented',
  })
}))

export { router as authRoutes }