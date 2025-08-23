#!/usr/bin/env node

/**
 * FinHelm.ai Backend Foundation
 * Entry point for the AI-powered ERP co-pilot system
 */

import { config } from 'dotenv';

// Load environment variables
config();

interface AppConfig {
  port: number;
  convexDeployment: string | undefined;
  nodeEnv: string;
}

const getConfig = (): AppConfig => {
  return {
    port: parseInt(process.env['PORT'] || '3000', 10),
    convexDeployment: process.env['CONVEX_DEPLOYMENT'],
    nodeEnv: process.env['NODE_ENV'] || 'development',
  };
};

const main = async (): Promise<void> => {
  const config = getConfig();
  
  console.log('🚀 FinHelm.ai Backend Foundation starting...');
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Convex Deployment: ${config.convexDeployment || 'Not configured'}`);
  
  if (!config.convexDeployment && config.nodeEnv !== 'development') {
    console.warn('⚠️  Warning: CONVEX_DEPLOYMENT not configured for production environment');
  }
  
  console.log('✅ Backend foundation initialized successfully');
  console.log('🔧 Ready for Convex schema generation and ERP integration');
};

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n👋 FinHelm.ai backend shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 FinHelm.ai backend shutting down gracefully...');
  process.exit(0);
});

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Failed to start FinHelm.ai backend:', error);
    process.exit(1);
  });
}

export { main, getConfig, AppConfig };