import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const TransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  amount: z.number(),
  description: z.string(),
  category: z.string(),
  date: z.date(),
  type: z.enum(['income', 'expense']),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const AccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1),
  type: z.enum(['checking', 'savings', 'credit', 'investment']),
  balance: z.number(),
  currency: z.string().default('USD'),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type User = z.infer<typeof UserSchema>
export type Transaction = z.infer<typeof TransactionSchema>
export type Account = z.infer<typeof AccountSchema>

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}