import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '@finhelm-ai/shared'

export interface ApiError extends Error {
  statusCode?: number
  code?: string
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500
  const message = error.message || 'Internal Server Error'

  console.error(`Error ${statusCode}: ${message}`)
  console.error(error.stack)

  res.status(statusCode).json({
    success: false,
    error: message,
    message: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  })
}

export const createError = (message: string, statusCode: number = 500): ApiError => {
  const error = new Error(message) as ApiError
  error.statusCode = statusCode
  return error
}

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}