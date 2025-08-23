import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { connectDatabase } from './config/database'
import { errorHandler } from './middleware/errorHandler'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { accountRoutes } from './routes/accounts'
import { transactionRoutes } from './routes/transactions'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
})

app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}))
app.use(morgan('combined'))
app.use(limiter)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/transactions', transactionRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.use(errorHandler)

const startServer = async () => {
  try {
    await connectDatabase()
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📊 Environment: ${process.env.NODE_ENV}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()