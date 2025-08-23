import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'List accounts endpoint - to be implemented',
  })
}))

router.post('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Create account endpoint - to be implemented',
  })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Get account endpoint - to be implemented',
  })
}))

router.put('/:id', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Update account endpoint - to be implemented',
  })
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Delete account endpoint - to be implemented',
  })
}))

export { router as accountRoutes }