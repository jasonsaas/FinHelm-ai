import mongoose from 'mongoose'

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/finhelm-ai'
    
    await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || 'finhelm_ai',
    })

    console.log('✅ MongoDB connected successfully')
    
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected')
    })

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error)
    throw error
  }
}